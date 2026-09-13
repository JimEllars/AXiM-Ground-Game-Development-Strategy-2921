import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Need to mock using unstable_mockModule before imports in ESM context
jest.unstable_mockModule('../../utils/logger.js', () => ({
  loggerStorage: {
    run: jest.fn((id, cb) => (cb as any)()),
  },
  default: {
    info: jest.fn(),
  }
}));

const { traceMiddleware } = await import('../trace.js');
const { loggerStorage, default: logger } = await import('../../utils/logger.js');

describe('traceMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use cf-ray as traceId if present', () => {
    const req = {
      headers: {
        'cf-ray': 'ray-123'
      },
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1'
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      on: jest.fn((event: any, cb: any) => cb()),
      statusCode: 200
    } as unknown as Response;
    const next = jest.fn();

    traceMiddleware(req, res, next);

    expect(req.headers['x-trace-id']).toBe('ray-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', 'ray-123');
    expect(loggerStorage.run).toHaveBeenCalledWith('ray-123', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('API Trace: GET /test'), expect.objectContaining({
      traceId: 'ray-123'
    }));
  });

  it('should use x-request-id as traceId if cf-ray is missing', () => {
    const req = {
      headers: {
        'x-request-id': 'req-456'
      },
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1'
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      on: jest.fn((event: any, cb: any) => cb()),
      statusCode: 200
    } as unknown as Response;
    const next = jest.fn();

    traceMiddleware(req, res, next);

    expect(req.headers['x-trace-id']).toBe('req-456');
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', 'req-456');
    expect(loggerStorage.run).toHaveBeenCalledWith('req-456', expect.any(Function));
  });

  it('should generate a uuid if no headers are present', () => {
    const req = {
      headers: {},
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1'
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      on: jest.fn((event: any, cb: any) => cb()),
      statusCode: 200
    } as unknown as Response;
    const next = jest.fn();

    traceMiddleware(req, res, next);

    expect(req.headers['x-trace-id']).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', expect.any(String));
  });
});
