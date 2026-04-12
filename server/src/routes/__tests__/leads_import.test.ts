import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const JWT_SECRET = process.env.JWT_SECRET!;

// Define the mock type
type BatchGeocodeMock = jest.Mock<() => Promise<{ longitude: number; latitude: number; formatted_address: string; }[]>>;

// 1. Mock dependencies BEFORE importing modules that use them
jest.unstable_mockModule('../../services/geocoding.js', () => ({
  batchGeocode: jest.fn(),
  geocodeAddress: jest.fn()
}));

jest.unstable_mockModule('../../config/queue.js', () => ({
  leadImportQueue: {
    add: jest.fn().mockResolvedValue({ id: 'test-job-123' }),
  },
}));

// 2. Import modules dynamically AFTER mocking
const { batchGeocode } = await import('../../services/geocoding.js');
const { default: app } = await import('../../app.js');
const { pool } = await import('../../config/database.js');

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

  it('should accept CSV and return a jobId', async () => {
    (batchGeocode as unknown as BatchGeocodeMock).mockResolvedValue([
      { longitude: -122.4194, latitude: 37.7749, formatted_address: '123 Main St, San Francisco, CA' },
      { longitude: -118.2437, latitude: 34.0522, formatted_address: '456 Oak Ave, Los Angeles, CA' }
    ]);

    const csvContent =
`first_name,last_name,street_address,city,state,zip,status
John,Doe,123 Main St,San Francisco,CA,94105,New
Jane,Smith,456 Oak Ave,Los Angeles,CA,90001,Contacted`;

    const buffer = Buffer.from(csvContent, 'utf-8');

    const res = await request(app)
      .post('/api/leads/bulk-import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'leads.csv');

    expect(res.statusCode).toEqual(202);
    expect(res.body).toHaveProperty('jobId');
    expect(res.body).toHaveProperty('message', 'Lead import started successfully. Processing in background.');
  });
});
