import { Request, Response, NextFunction } from 'express';
import errorHandler from '../errorHandler.js';
import AppError from '../../utils/AppError.js';
import { jest } from '@jest/globals';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorMock: any;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    mockReq = {
      originalUrl: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('should handle generic errors with default 500 status and message', () => {
    const error = new Error('Some random error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'An unexpected error occurred.',
    });
  });

  it('should handle AppError correctly', () => {
    const error = new AppError('Operational error', 400);

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 400,
      message: 'Operational error',
    });
  });

  it('should handle PostgreSQL unique violation error (code 23505)', () => {
    const error = new Error('Database error') as any;
    error.code = '23505';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 400,
      message: 'Duplicate field value entered.',
    });
  });

  it('should handle generic database error (code starting with 22)', () => {
    const error = new Error('Database error') as any;
    error.code = '22P02';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 400,
      message: 'Invalid data provided.',
    });
  });

  it('should skip database error matching if code is not a string', () => {
    const error = new Error('Unknown error') as any;
    error.code = 12345;
    error.isOperational = true;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'Unknown error',
    });
  });

  it('should fall back to 500 status if error object has no statusCode', () => {
    const error = new Error('Database error') as any;
    // Test code branch where err.code exists but doesn't match and statusCode is undefined
    error.code = 'UNKNOWN';
    error.isOperational = true;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'Database error',
    });
  });

  it('should fallback to 500 if error.statusCode evaluates to falsy after assignments', () => {
    const error = new Error('Unknown error') as any;
    error.statusCode = 0; // Falsy
    error.isOperational = true;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'Unknown error',
    });
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Dev error');
    error.stack = 'Error stack trace here';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'An unexpected error occurred.',
      stack: 'Error stack trace here',
    });

    // In development environment it should log to console.error
    expect(consoleErrorMock).toHaveBeenCalledTimes(2);
  });

  it('should omit stack trace in non-development environment', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Production error');
    error.stack = 'Error stack trace here';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 500,
      message: 'An unexpected error occurred.',
    });

    // In production environment it should still log to console.error
    expect(consoleErrorMock).toHaveBeenCalledTimes(2);
  });

  it('should not log to console.error in test environment', () => {
    process.env.NODE_ENV = 'test';
    const error = new Error('Test error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorMock).not.toHaveBeenCalled();
  });
});
