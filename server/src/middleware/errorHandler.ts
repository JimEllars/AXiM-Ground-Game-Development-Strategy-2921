import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error for debugging purposes
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Handle specific error types for better client feedback
  let error = { ...err, statusCode, message };

  // PostgreSQL unique violation
  if (err.code === '23505') {
    error = new AppError('Duplicate field value entered.', 400);
  }

  // Generic database error (e.g., invalid data format)
  if (err.code && typeof err.code === 'string' && err.code.startsWith('22')) {
    error = new AppError('Invalid data provided.', 400);
  }

  // Send a user-friendly error response
  res.status(error.statusCode).json({
    status: error.status || 'error',
    statusCode: error.statusCode,
    message: error.isOperational ? error.message : 'An unexpected error occurred.',
    error: error.isOperational ? error.message : 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
