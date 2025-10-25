import { beforeAll, vi } from 'vitest';

// Mock the database pool to prevent actual DB connections during tests
vi.mock('../config/database', () => ({
  pool: {
    query: vi.fn(),
    on: vi.fn(),
    end: vi.fn(),
  },
}));

beforeAll(() => {
  // Set a dummy JWT secret for tests
  process.env.JWT_SECRET = 'test-secret';
});
