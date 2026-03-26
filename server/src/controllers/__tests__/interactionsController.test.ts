import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

const { default: app } = await import('../../app.js');
const { pool } = await import('../../config/database.js');

describe('Interactions Controller', () => {
  let token: string;
  let organizationId: string;
  let userId: string;
  let leadIds: string[] = [];

  beforeAll(async () => {
    // Setup test data
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Test Interactions Org']
    );
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role`,
      ['test_interactions@example.com', 'hashedpassword', 'Test', 'User', 'REP', organizationId]
    );
    userId = userResult.rows[0].id;
    const role = userResult.rows[0].role;

    token = jwt.sign(
      { userId, email: 'test_interactions@example.com', role, organizationId },
      JWT_SECRET
    );

    // Create 100 leads for bulk test
    const insertValues = Array.from({ length: 100 }, (_, i) => `('${organizationId}', 'New')`).join(',');
    const leadResult = await pool.query(
      `INSERT INTO leads (organization_id, status) VALUES ${insertValues} RETURNING id`
    );
    leadIds = leadResult.rows.map(row => row.id);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  it('should measure baseline performance of creating 100 interactions', async () => {
    const interactions = leadIds.map((leadId, i) => ({
      leadId,
      outcome: i % 2 === 0 ? 'interested' : 'not home',
      notes: `Note ${i}`,
    }));

    const startTime = Date.now();
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${token}`)
      .send(interactions);
    const duration = Date.now() - startTime;

    console.log(`Baseline creation time for 100 interactions: ${duration}ms`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.count).toEqual(100);

    // Verify statuses
    const updatedLeads = await pool.query(`SELECT id, status FROM leads WHERE id = ANY($1)`, [leadIds]);
    expect(updatedLeads.rows.length).toEqual(100);
    const hotLeads = updatedLeads.rows.filter(l => l.status === 'Hot Lead');
    const notHomeLeads = updatedLeads.rows.filter(l => l.status === 'Not Home');
    expect(hotLeads.length).toEqual(50);
    expect(notHomeLeads.length).toEqual(50);
  });

  it('should reject interactions with non-numeric coordinates (SQL Injection prevention)', async () => {
    const maliciousInteractions = [{
      leadId: leadIds[0],
      outcome: 'interested',
      location: {
        longitude: "45.0) ; DROP TABLE leads; --",
        latitude: 90.0
      }
    }];

    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${token}`)
      .send(maliciousInteractions);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Invalid location coordinates provided');
  });
});
