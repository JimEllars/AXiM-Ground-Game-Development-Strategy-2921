import 'server/src/tests/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { login } from '../controllers/authController';
import { pool } from '../config/database';

// Setup express app for testing
const app = express();
app.use(express.json());
app.post('/login', login);

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /login', () => {
    it('should return a token for valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        role: 'REP',
        organization_id: 'org-1',
        first_name: 'Test',
        last_name: 'User',
      };

      vi.mocked(pool.query).mockResolvedValue({ rows: [mockUser] });

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET as string);
      expect((decoded as any).userId).toBe('user-1');
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('password123', 10),
      };

      vi.mocked(pool.query).mockResolvedValue({ rows: [mockUser] });

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/login')
        .send({ email: 'nouser@example.com', password: 'password' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 500 for database errors', async () => {
        vi.mocked(pool.query).mockRejectedValue(new Error('DB Error'));

        const response = await request(app)
          .post('/login')
          .send({ email: 'test@example.com', password: 'password123' });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Internal server error');
      });
  });
});
