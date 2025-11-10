import request from 'supertest';
import app from '../app.js';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import { User } from '../types/index.js';

describe('Leads Endpoints', () => {
  let token: string;

  beforeAll(() => {
    const payload = {
      userId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@axim.com',
      role: 'ADMIN',
    };
    token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should reject a CSV with validation errors and return detailed error messages', async () => {
    const csvData = `first_name,last_name,street_address,city,state,zip
a,b,123 Main St,Anytown,CA,12345
John,Doe,456 Oak Ave,Othertown,NY,54321`;

    const res = await request(app)
      .post('/api/leads/bulk-import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvData), 'test.csv');

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('CSV validation failed');
    expect(res.body.details).toHaveLength(1);
    expect(res.body.details[0].row).toEqual(2);
    expect(res.body.details[0].messages).toEqual([
        'first name: First name must be at least 2 characters',
        'last name: Last name must be at least 2 characters',
    ]);
  });
});
