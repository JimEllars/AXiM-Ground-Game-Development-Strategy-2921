import request from 'supertest';
import app from '../../app.js';
import { pool } from '../../config/database.js';

describe('Security Headers and Limits', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should apply strict security headers', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('should have rate limit headers for synchronization endpoint', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .send({});

    // Expected to get a 401 Unauthorized but rate limit headers should be present
    expect(res.headers['ratelimit-limit']).toBe('100');
  });
});
