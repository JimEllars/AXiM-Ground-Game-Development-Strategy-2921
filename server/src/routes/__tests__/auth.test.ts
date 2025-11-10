import request from 'supertest';
import app from '../../app.js';
import { pool } from '../../config/database.js';

describe('Auth Routes', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@axim.com',
          password: 'password',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login a user with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@axim.com',
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });
  });
});
