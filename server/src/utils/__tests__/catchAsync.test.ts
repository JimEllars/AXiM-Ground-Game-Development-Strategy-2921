import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import catchAsync from '../catchAsync.js';

describe('catchAsync', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn() as NextFunction;
  });

  it('should call the asynchronous function and not call next with an error if it resolves', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue('success');
    const wrappedFunction = catchAsync(mockAsyncFunction as any);

    await wrappedFunction(mockReq as Request, mockRes as Response, mockNext);

    expect(mockAsyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with the error if the asynchronous function rejects', async () => {
    const testError = new Error('Test error');
    const mockAsyncFunction = jest.fn().mockRejectedValue(testError);
    const wrappedFunction = catchAsync(mockAsyncFunction as any);

    await wrappedFunction(mockReq as Request, mockRes as Response, mockNext);

    expect(mockAsyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it('should call next with the error if the function throws synchronously', async () => {
    const testError = new Error('Synchronous error');
    const mockSyncFunction = jest.fn().mockImplementation(() => {
      throw testError;
    });
    const wrappedFunction = catchAsync(mockSyncFunction as any);

    await wrappedFunction(mockReq as Request, mockRes as Response, mockNext);

    expect(mockSyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });
});
