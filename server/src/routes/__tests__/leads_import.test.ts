import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock dependencies
jest.unstable_mockModule('../../services/geocoding.js', () => ({
  batchGeocode: jest.fn().mockResolvedValue([
    { longitude: -122.4194, latitude: 37.7749, formatted_address: '123 Main St, San Francisco, CA' },
    { longitude: -118.2437, latitude: 34.0522, formatted_address: '456 Oak Ave, Los Angeles, CA' }
  ]),
  geocodeAddress: jest.fn()
}));

// Import after mocking
const { batchGeocode } = await import('../../services/geocoding.js');

describe('Leads Import Route', () => {
  let token: string;
  let organizationId: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['import_test@example.com']);
    await pool.query('DELETE FROM organizations WHERE name = $1', ['Import Test Org']);

    // Create Org
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Import Test Org']
    );
    organizationId = orgResult.rows[0].id;

    // Create User
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role`,
      ['import_test@example.com', 'hashedpassword', 'Import', 'Tester', 'MANAGER', organizationId]
    );
    userId = userResult.rows[0].id;
    const role = userResult.rows[0].role;

    // Generate Token
    token = jwt.sign(
      { userId, email: 'import_test@example.com', role, organizationId },
      JWT_SECRET
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up leads created during tests
    await pool.query('DELETE FROM leads WHERE organization_id = $1', [organizationId]);
    jest.clearAllMocks();
  });

  it('should successfully import leads from CSV', async () => {
    const csvContent =
`first_name,last_name,street_address,city,state,zip,status
John,Doe,123 Main St,San Francisco,CA,94105,New
Jane,Smith,456 Oak Ave,Los Angeles,CA,90001,Contacted`;

    const buffer = Buffer.from(csvContent, 'utf-8');

    const res = await request(app)
      .post('/api/leads/bulk-import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'leads.csv');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('totalLeads', 2);
    expect(res.body).toHaveProperty('geocodedLeads', 2); // Assuming mock returns coords for both
    expect(res.body).toHaveProperty('duplicates', 0);

    // Verify DB
    const leadsResult = await pool.query(
      `SELECT l.status, pii.first_name, pii.last_name
       FROM leads l
       JOIN lead_pii pii ON l.id = pii.lead_id
       WHERE l.organization_id = $1`,
      [organizationId]
    );
    expect(leadsResult.rows).toHaveLength(2);
    expect(leadsResult.rows.find(r => r.first_name === 'John')).toBeTruthy();
    expect(leadsResult.rows.find(r => r.first_name === 'Jane')).toBeTruthy();
  });

  it('should handle duplicates correctly', async () => {
     // Seed one lead first
     const seedCsv = `first_name,last_name,street_address,city,state,zip,status
John,Doe,123 Main St,San Francisco,CA,94105,New`;

     await request(app)
      .post('/api/leads/bulk-import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(seedCsv, 'utf-8'), 'seed.csv');

     // Try to upload the same lead again along with a new one
     const importCsv = `first_name,last_name,street_address,city,state,zip,status
John,Doe,123 Main St,San Francisco,CA,94105,New
Bob,Builder,789 Pine Ln,Seattle,WA,98101,New`;

    // Update mock for the 3rd address call (2 from first import, then 2 from this import)
    // Actually batchGeocode is called with the full batch.
    // First call: ['...']
    // Second call: ['...', '...']
    (batchGeocode as jest.Mock).mockResolvedValueOnce([
        { longitude: -122.4194, latitude: 37.7749, formatted_address: '...' }
    ])
    .mockResolvedValueOnce([
        { longitude: -122.4194, latitude: 37.7749, formatted_address: '...' },
        { longitude: -122.3321, latitude: 47.6062, formatted_address: '...' }
    ]);

     const res = await request(app)
      .post('/api/leads/bulk-import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(importCsv, 'utf-8'), 'import.csv');

    expect(res.statusCode).toEqual(200);
    // Should verify that duplicates were detected.
    // Note: The controller logic counts "duplicates" as `leadsToProcess.length - successCount`.
    // The query excludes existing ones based on street_address.
    expect(res.body.totalLeads).toBe(1); // Only Bob should be added
    expect(res.body.duplicates).toBe(1); // John is a duplicate

    const countResult = await pool.query('SELECT COUNT(*) FROM leads WHERE organization_id = $1', [organizationId]);
    expect(parseInt(countResult.rows[0].count)).toBe(2); // Total 2 unique leads
  });

  it('should validate CSV format', async () => {
      const invalidCsv = `first_name,last_name
John,Doe`; // Missing required street_address

      const res = await request(app)
        .post('/api/leads/bulk-import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(invalidCsv, 'utf-8'), 'invalid.csv');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'CSV validation failed');
      expect(res.body.details).toHaveLength(1);
  });
});
