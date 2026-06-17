import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

const mockPost = jest.fn().mockResolvedValue({ data: 'ok' });
jest.unstable_mockModule('../../services/aximService.js', () => ({
  default: {
    post: mockPost
  }
}));

const mockLoggerError = jest.fn();
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    error: mockLoggerError,
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('errorHandler middleware', () => {
  let errorHandler: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeAll(async () => {
    const module = await import('../errorHandler.js');
    errorHandler = module.default;
  });

  beforeEach(() => {
    mockReq = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: {},
      user: { id: 'rep-123' } as any
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;
    mockNext = jest.fn();
    mockPost.mockClear();
    mockLoggerError.mockClear();
  });

  it('should handle non-operational errors by calling telemetry and masking message', () => {
    const error = new Error('Super secret DB crash');
    (error as any).statusCode = 500;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockPost).toHaveBeenCalledWith('/telemetry/rca_trigger', expect.objectContaining({
      rep_id: 'rep-123',
      error: expect.objectContaining({
        message: 'Super secret DB crash'
      })
    }));

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'An unexpected error occurred. Our team has been notified.',
    });
  });

  it('should handle operational errors without masking', () => {
    const error = new Error('Operational error');
    (error as any).statusCode = 400;
    (error as any).isOperational = true;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 400,
      message: 'Operational error',
    });
  });

  it('should handle PostgreSQL unique violation error (code 23505)', () => {
    const error = new Error('DB Error');
    (error as any).code = '23505';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 400,
      message: 'Duplicate field value entered.',
    });
  });

  it('should handle generic database error (code starting with 22)', () => {
    const error = new Error('DB Error');
    (error as any).code = '22P02';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 400,
      message: 'Invalid data provided.',
    });
  });
});
