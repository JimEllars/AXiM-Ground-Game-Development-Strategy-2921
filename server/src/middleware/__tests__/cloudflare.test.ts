import { jest } from '@jest/globals';
import { requireCloudflareIP } from '../cloudflare.js';
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger.js';

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    warn: jest.fn(),
  }
}));

describe('Cloudflare Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      originalUrl: '/api/test'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next if CF-Connecting-IP is present', () => {
    mockRequest.headers = { 'cf-connecting-ip': '1.2.3.4' };
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 403 if CF-Connecting-IP is missing', () => {
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden: Direct access not allowed' });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
