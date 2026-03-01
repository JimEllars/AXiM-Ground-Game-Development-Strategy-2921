import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../auth.js';
import { jest } from '@jest/globals';
import { AuthRequest } from '../../types/index.js';

describe('auth middleware - requireRole', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should return 401 if req.user is missing', () => {
    const middleware = requireRole(['ADMIN']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not in the allowed roles list', () => {
    mockReq.user = { role: 'REP' } as any;
    const middleware = requireRole(['ADMIN', 'MANAGER']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(mockNext).not.toHaveBeenCalled();
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

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is empty or undefined', () => {
    mockReq.user = { role: '' } as any;
    const middleware = requireRole(['ADMIN']);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
