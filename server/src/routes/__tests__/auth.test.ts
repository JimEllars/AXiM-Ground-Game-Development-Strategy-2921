import request from 'supertest';
import app from '../../app.js';
import { pool } from '../../config/database.js';
import bcrypt from 'bcrypt';

describe('Auth Routes', () => {
  const testUser = {
    email: 'auth_test_user@axim.com',
    password: 'password123',
    firstName: 'Auth',
    lastName: 'Test',
    role: 'ADMIN'
  };
  let organizationId: string;
  let userId: string;

  beforeAll(async () => {
    // Create Org
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Auth Test Org']
    );
    organizationId = orgResult.rows[0].id;

    // Create User
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(testUser.password, saltRounds);

    const userResult = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [organizationId, testUser.email, passwordHash, testUser.firstName, testUser.lastName, testUser.role]
    );
    userId = userResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    it('should not login a user with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });
  });
});
