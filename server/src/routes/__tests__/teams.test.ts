import request from 'supertest';
import app from '../../app.js';
import { pool } from '../../config/database.js';
import bcrypt from 'bcrypt';

describe('Teams Routes', () => {
  let adminToken: string;
  let organizationId: string;
  let adminId: string;
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    // 1. Create Organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
      ['Teams Test Org']
    );
    organizationId = orgResult.rows[0].id;

    // 2. Create Admin User
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminResult = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, 'Admin', 'User', 'ADMIN', true)
       RETURNING id`,
      [organizationId, 'admin_teams_test@axim.com', passwordHash]
    );
    adminId = adminResult.rows[0].id;

    // 3. Create Regular User
    const userResult = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, 'Regular', 'User', 'REP', true)
       RETURNING id`,
      [organizationId, 'user_teams_test@axim.com', passwordHash]
    );
    userId = userResult.rows[0].id;

    // 4. Login as Admin to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin_teams_test@axim.com',
        password: 'password123',
      });
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM teams WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Team Alpha',
          description: 'A test team'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Team Alpha');
      teamId = res.body.id;
    });

    it('should fail if name is missing', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'No name provided'
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/teams', () => {
    it('should list teams for the organization', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const team = res.body.find((t: any) => t.id === teamId);
      expect(team).toBeDefined();
      expect(team.name).toBe('Test Team Alpha');
    });
  });

  describe('POST /api/teams/:id/assign', () => {
    it('should assign a user to the team', async () => {
      const res = await request(app)
        .post(`/api/teams/${teamId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: userId
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('User assigned to team successfully');

      // Verify in DB
      const userCheck = await pool.query('SELECT team_id FROM users WHERE id = $1', [userId]);
      expect(userCheck.rows[0].team_id).toBe(teamId);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete the team and unassign users', async () => {
      const res = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);

      // Verify Team is gone
      const teamCheck = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
      expect(teamCheck.rows.length).toBe(0);

      // Verify User is unassigned
      const userCheck = await pool.query('SELECT team_id FROM users WHERE id = $1', [userId]);
      expect(userCheck.rows[0].team_id).toBeNull();
    });
  });
});
