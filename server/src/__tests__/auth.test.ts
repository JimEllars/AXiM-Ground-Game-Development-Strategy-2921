
import request from 'supertest';
import app from '../app.js';
import { pool } from '../config/database.js';

describe('Auth Endpoints', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should login a user with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@axim.com',
        password: 'password',
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should not login a user with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@axim.com',
        password: 'wrongpassword',
      });
    expect(res.statusCode).toEqual(401);
  });
});
