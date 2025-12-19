import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Territories Route', () => {
  let token: string;
  let organizationId: string;
  let userId: string;
  let territoryId: string;

  beforeAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['territory_test@example.com']);
    await pool.query('DELETE FROM organizations WHERE name = $1', ['Territory Test Org']);

    // Create Org
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Territory Test Org']
    );
    organizationId = orgResult.rows[0].id;

    // Create User (Admin/Manager role required)
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role`,
      ['territory_test@example.com', 'hashedpassword', 'Territory', 'Tester', 'MANAGER', organizationId]
    );
    userId = userResult.rows[0].id;
    const role = userResult.rows[0].role;

    // Generate Token
    token = jwt.sign(
      { userId, email: 'territory_test@example.com', role, organizationId },
      JWT_SECRET
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  afterEach(async () => {
      // Clean up territories created
      if (territoryId) {
          // Manually cleanup in case delete test fails
          await pool.query('DELETE FROM territory_assignments WHERE territory_id = $1', [territoryId]);
          await pool.query('DELETE FROM territories WHERE id = $1', [territoryId]);
          territoryId = '';
      }
  });

  it('should create a new territory', async () => {
    const geoJson = {
      type: 'Polygon',
      coordinates: [[
        [-122.4, 37.7],
        [-122.4, 37.8],
        [-122.3, 37.8],
        [-122.3, 37.7],
        [-122.4, 37.7]
      ]]
    };

    const res = await request(app)
      .post('/api/territories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Territory',
        description: 'A test territory',
        geoJson
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Territory');
    territoryId = res.body.id;
  });

  it('should get all territories', async () => {
    // Ensure we have at least one
    if (!territoryId) {
        const geoJson = {
            type: 'Polygon',
            coordinates: [[[-122.4, 37.7], [-122.4, 37.8], [-122.3, 37.8], [-122.3, 37.7], [-122.4, 37.7]]]
        };
        const createRes = await request(app)
            .post('/api/territories')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Temp Territory', description: 'Temp', geoJson });
        territoryId = createRes.body.id;
    }

    const res = await request(app)
      .get('/api/territories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('boundary');
  });

  it('should assign a territory to a user', async () => {
      // Need a REP user to assign to
      const repResult = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          ['rep_test@example.com', 'hashed', 'Rep', 'Tester', 'REP', organizationId]
      );
      const repId = repResult.rows[0].id;

      // Ensure territory exists
      if (!territoryId) {
        const geoJson = {
            type: 'Polygon',
            coordinates: [[[-122.4, 37.7], [-122.4, 37.8], [-122.3, 37.8], [-122.3, 37.7], [-122.4, 37.7]]]
        };
        const createRes = await request(app)
            .post('/api/territories')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Assign Territory', description: 'Temp', geoJson });
        territoryId = createRes.body.id;
    }

      const res = await request(app)
        .post(`/api/territories/${territoryId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: repId });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Territory assigned successfully');

      // Cleanup Rep
      await pool.query('DELETE FROM territory_assignments WHERE user_id = $1', [repId]);
      await pool.query('DELETE FROM users WHERE id = $1', [repId]);
  });

  it('should delete a territory', async () => {
       // Create a specific territory to delete
       const geoJson = {
        type: 'Polygon',
        coordinates: [[[-122.4, 37.7], [-122.4, 37.8], [-122.3, 37.8], [-122.3, 37.7], [-122.4, 37.7]]]
    };
    const createRes = await request(app)
        .post('/api/territories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Me', description: 'Temp', geoJson });
    const idToDelete = createRes.body.id;

    const res = await request(app)
      .delete(`/api/territories/${idToDelete}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Territory deleted successfully');

    const check = await pool.query('SELECT * FROM territories WHERE id = $1', [idToDelete]);
    expect(check.rows.length).toBe(0);
  });
});
