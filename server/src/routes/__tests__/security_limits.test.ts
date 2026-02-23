import { jest } from '@jest/globals';
import request from 'supertest';

// Import modules dynamically
const { default: app } = await import('../../app.js');
const { pool } = await import('../../config/database.js');

describe('Security Payload Limits', () => {

  afterAll(async () => {
    await pool.end();
  });

  it('should reject a JSON payload larger than the limit on general routes', async () => {
    // Create a large payload > 100kb
    // 150kb
    const largeString = 'a'.repeat(150 * 1024);
    const payload = {
      data: largeString
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(payload)
      .set('Content-Type', 'application/json');

    // Expect 413 Payload Too Large
    expect(res.status).toBe(413);
  });

  it('should allow larger payloads for territory routes', async () => {
    // Create a large payload > 100kb but < 5mb
    // 200kb payload
    const largeString = 'a'.repeat(200 * 1024);
    const payload = {
      name: 'Test Territory',
      description: largeString // Just to make it large
    };

    const res = await request(app)
      .post('/api/territories')
      .send(payload)
      .set('Content-Type', 'application/json');

    // Should be 401 (Unauthorized) because token is missing, NOT 413.
    // If limit was 100kb, it would be 413.
    expect(res.status).toBe(401);
  });

  it('should accept a JSON payload within the limit on general routes', async () => {
    // 50kb payload
    const mediumString = 'a'.repeat(50 * 1024);
    const payload = {
      email: 'test@example.com',
      password: 'password',
      data: mediumString
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(payload)
      .set('Content-Type', 'application/json');

    // Should NOT be 413. It might be 401 or 400.
    expect(res.status).not.toBe(413);
  });
});
