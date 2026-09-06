import { jest } from '@jest/globals';
import { requireCloudflareIP } from '../cloudflare.js';
import { Request, Response, NextFunction } from 'express';

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
      originalUrl: '/api/test',
      get: jest.fn((headerName: string) => {
        const val = mockRequest.headers![headerName.toLowerCase()];
        return val as any;
      }) as any
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
    delete process.env.ORIGIN_AUTH_TOKEN;
    delete process.env.AXIM_INTERNAL_API_KEY;
  });

  it('should return 403 if CF-Connecting-IP is missing', () => {
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden: Direct access not allowed' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if CF-Ray is missing', () => {
    mockRequest.headers = { 'cf-connecting-ip': '1.2.3.4' };
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden: Direct access not allowed' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next if CF-Connecting-IP and CF-Ray are present', () => {
    mockRequest.headers = { 'cf-connecting-ip': '1.2.3.4', 'cf-ray': 'abcd123' };
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next if AXIM_INTERNAL_API_KEY matches', () => {
    process.env.AXIM_INTERNAL_API_KEY = 'secret';
    mockRequest.headers = { 'x-axim-internal-api-key': 'secret' };
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next if ORIGIN_AUTH_TOKEN matches', () => {
    process.env.ORIGIN_AUTH_TOKEN = 'token';
    mockRequest.headers = { 'x-axim-origin-token': 'token' };
    requireCloudflareIP(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });
});
