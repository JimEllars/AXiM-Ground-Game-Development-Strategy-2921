import { jest } from '@jest/globals';

describe('Database Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use environment variables for connection config', async () => {
    process.env.DB_HOST = 'test-host';
    process.env.DB_PORT = '1234';
    process.env.DB_NAME = 'test-db';
    process.env.DB_USER = 'test-user';
    process.env.DB_PASSWORD = 'test-password';

    const mockPoolInstance = {
      on: jest.fn(),
    };
    const MockPool = jest.fn(() => mockPoolInstance);

    await jest.unstable_mockModule('pg', () => ({
      default: { Pool: MockPool },
      Pool: MockPool,
    }));

    await import('../database.js');

    expect(MockPool).toHaveBeenCalledWith(expect.objectContaining({
      host: 'test-host',
      port: 1234,
      database: 'test-db',
      user: 'test-user',
      password: 'test-password',
    }));
  });

  it('should NOT default password to "password" if DB_PASSWORD is missing', async () => {
    delete process.env.DB_PASSWORD;
    process.env.NODE_ENV = 'development';

    const mockPoolInstance = {
      on: jest.fn(),
    };
    const MockPool = jest.fn(() => mockPoolInstance);

    await jest.unstable_mockModule('pg', () => ({
      default: { Pool: MockPool },
      Pool: MockPool,
    }));

    await import('../database.js');

    const callArgs = MockPool.mock.calls[0][0];
    expect(callArgs.password).toBeUndefined();
  });

  it('should throw error if DB_PASSWORD is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_PASSWORD;

    const mockPoolInstance = {
      on: jest.fn(),
    };
    const MockPool = jest.fn(() => mockPoolInstance);

    await jest.unstable_mockModule('pg', () => ({
      default: { Pool: MockPool },
      Pool: MockPool,
    }));

    await expect(import('../database.js')).rejects.toThrow('DB_PASSWORD environment variable is required in production');
  });
});
