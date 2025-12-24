import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { pool } from '../../config/database.js';

// Mock dependencies
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
      email: 'admin@test.com',
      role: 'ADMIN',
      organization_id: '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
    };
    next();
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
    next();
  }
}));

// Import the module dynamically after mocking
const usersRouter = (await import('../users.js')).default;

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users Route', () => {
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  const adminId = '550e8400-e29b-41d4-a716-446655440001';
  let createdUserId: string;

  beforeAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);

    // Create Org
    await pool.query(
      'INSERT INTO organizations (id, name) VALUES ($1, $2)',
      [organizationId, 'Test Users Org']
    );

    // Create Admin User
    await pool.query(
      `INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, organizationId, 'admin@test.com', 'hash', 'Admin', 'User', 'ADMIN']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: 'REP'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('newuser@test.com');
      createdUserId = res.body.id;
    });

    it('should fail if user already exists', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: 'REP'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('GET /api/users', () => {
    it('should get all users for the organization', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThanOrEqual(2); // Admin + New User
    });
  });

  describe('PUT /api/users/:userId', () => {
    it('should update user details', async () => {
      const res = await request(app)
        .put(`/api/users/${createdUserId}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.firstName).toBe('Updated');
      expect(res.body.lastName).toBe('Name');
    });

    it('should not allow deactivating self', async () => {
      const res = await request(app)
        .put(`/api/users/${adminId}`)
        .send({
          isActive: false
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Cannot deactivate yourself');
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('should delete a user', async () => {
      const res = await request(app).delete(`/api/users/${createdUserId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('User deleted successfully');
    });

    it('should not allow deleting self', async () => {
      const res = await request(app).delete(`/api/users/${adminId}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Cannot delete yourself');
    });
  });
});
