import { jest } from '@jest/globals';

jest.unstable_mockModule('../../config/database.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.unstable_mockModule('../../config/queue.js', () => ({
  leadImportQueue: { add: jest.fn() },
  telemetryQueue: { add: jest.fn() },
  routeOptimizationQueue: { add: jest.fn() }
}));

describe('Webhooks', () => {
  let request: any;
  let app: any;
  let pool: any;

  beforeAll(async () => {
    request = (await import('supertest')).default;
    app = (await import('../../app.js')).default;
    pool = (await import('../../config/database.js')).pool;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject unauthorized request if secret is set', async () => {
    process.env.EMAILIT_WEBHOOK_SECRET = 'secret';
    const res = await request(app)
      .post('/api/v1/webhooks/emailit')
      .send({ event: 'email.delivered' });

    expect(res.status).toBe(401);
  });

  it('should accept valid request and log telemetry', async () => {
    process.env.EMAILIT_WEBHOOK_SECRET = 'secret';
    const res = await request(app)
      .post('/api/v1/webhooks/emailit')
      .set('authorization', 'Bearer secret')
      .send({ event: 'email.delivered', email: 'test@example.com' });

    expect(res.status).toBe(200);
  });

  it('should update lead notes if bounced', async () => {
    process.env.EMAILIT_WEBHOOK_SECRET = 'secret';
    const res = await request(app)
      .post('/api/v1/webhooks/emailit')
      .set('authorization', 'secret')
      .send({ event: 'email.bounced', email: 'bounced@example.com' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leads SET notes'),
        ['bounced@example.com']
    );
  });
});
