import { Request, Response, NextFunction } from 'express';
import { requireRole, authenticateToken } from '../auth.js';
import { jest } from '@jest/globals';
import { AuthRequest } from '../../types/index.js';

describe('auth middleware - requireRole', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    mockNext = jest.fn();
  });

  it('should return 401 if req.user is missing', () => {
    const middleware = requireRole(['ADMIN']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Authentication required',
      statusCode: 401
    }));
  });

  it('should return 403 if user role is not in the allowed roles list', () => {
    mockReq.user = { role: 'REP' } as any;
    const middleware = requireRole(['ADMIN', 'MANAGER']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Insufficient permissions',
      statusCode: 403
    }));
  });

  it('should call next() if user role is in the allowed roles list', () => {
    mockReq.user = { role: 'MANAGER' } as any;
    const middleware = requireRole(['ADMIN', 'MANAGER']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should return 403 if allowed roles list is empty', () => {
    mockReq.user = { role: 'ADMIN' } as any;
    const middleware = requireRole([]);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Insufficient permissions',
      statusCode: 403
    }));
  });

  it('should return 403 if user role is empty or undefined', () => {
    mockReq.user = { role: '' } as any;
    const middleware = requireRole(['ADMIN']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Insufficient permissions',
      statusCode: 403
    }));
  });
});

describe('auth middleware - authenticateToken internal key bypass', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    process.env.AXIM_INTERNAL_API_KEY = 'test-secret';
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    delete process.env.AXIM_INTERNAL_API_KEY;
  });

  it('should bypass auth and set system user if valid x-axim-internal-api-key provided', async () => {
    mockReq.headers!['x-axim-internal-api-key'] = 'test-secret';
    await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user!.role).toBe('ADMIN');
    expect(mockReq.user!.id).toBe('system');
  });

  it('should require token if x-axim-internal-api-key is invalid', async () => {
    mockReq.headers!['x-axim-internal-api-key'] = 'wrong-secret';
    await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Access token required',
      statusCode: 401
    }));
  });
});
