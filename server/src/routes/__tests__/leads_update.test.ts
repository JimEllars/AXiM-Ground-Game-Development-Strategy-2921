import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 1. Mock aximService BEFORE importing modules that use it
jest.unstable_mockModule('../../services/aximService.js', () => ({
  syncLeadToCore: jest.fn(),
}));

// 2. Import modules dynamically AFTER mocking
const { syncLeadToCore } = await import('../../services/aximService.js');
const { default: app } = await import('../../app.js');
const { pool } = await import('../../config/database.js');

describe('Lead Update Route', () => {
  let token: string;
  let organizationId: string;
  let userId: string;
  let leadId: string;

  beforeAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['test_update@example.com']);
    await pool.query('DELETE FROM organizations WHERE name = $1', ['Test Update Org']);

    // Create Org
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Test Update Org']
    );
    organizationId = orgResult.rows[0].id;

    // Create User
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role`,
      ['test_update@example.com', 'hashedpassword', 'Test', 'User', 'MANAGER', organizationId]
    );
    userId = userResult.rows[0].id;
    const role = userResult.rows[0].role;

    // Generate Token Manually
    token = jwt.sign(
      { userId, email: 'test_update@example.com', role, organizationId },
      JWT_SECRET
    );
  });

  beforeEach(async () => {
    // Reset mock
    // Using explicit unknown cast to bypass TS type check for this test file
    (syncLeadToCore as unknown as jest.Mock).mockResolvedValue({ success: true } as never);

     // Create a lead to update
    const leadResult = await pool.query(
        `INSERT INTO leads (organization_id, status, notes, location)
         VALUES ($1, 'New', 'Initial Note', ST_SetSRID(ST_MakePoint(-73.935242, 40.730610), 4326))
         RETURNING id`,
        [organizationId]
    );
    leadId = leadResult.rows[0].id;

    await pool.query(
        `INSERT INTO lead_pii (lead_id, first_name, last_name, street_address, city, state, zip, phone, email)
         VALUES ($1, 'John', 'Doe', '123 Main St', 'New York', 'NY', '10001', '555-1234', 'john@example.com')`,
        [leadId]
    );
  });

  afterEach(async () => {
      await pool.query('DELETE FROM leads WHERE id = $1', [leadId]);
      jest.clearAllMocks();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  it('should update lead status and notes and sync to core', async () => {
    const res = await request(app)
      .put(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'Contacted',
        notes: 'Updated Note'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.lead.status).toBe('Contacted');
    expect(res.body.lead.notes).toBe('Updated Note');

    // Verify sync was called
    expect(syncLeadToCore).toHaveBeenCalledTimes(1);
    expect(syncLeadToCore).toHaveBeenCalledWith(expect.objectContaining({
      id: leadId,
      status: 'Contacted',
      notes: 'Updated Note'
    }));
  });

  it('should update lead PII and sync to core', async () => {
    const res = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
            firstName: 'Jane',
            email: 'jane@example.com'
        });

    expect(res.statusCode).toEqual(200);
    expect(res.body.lead.firstName).toBe('Jane');
    expect(res.body.lead.email).toBe('jane@example.com');

    // Verify sync was called
    expect(syncLeadToCore).toHaveBeenCalledTimes(1);
    expect(syncLeadToCore).toHaveBeenCalledWith(expect.objectContaining({
      id: leadId,
      firstName: 'Jane',
      email: 'jane@example.com'
    }));
  });

  it('should return 404 for non-existent lead', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .put(`/api/leads/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Contacted' });

      expect(res.statusCode).toEqual(404);
      expect(syncLeadToCore).not.toHaveBeenCalled();
  });
});
