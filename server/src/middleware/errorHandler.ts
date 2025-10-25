import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';

const errorHandler = (err: Error & Partial<AppError>, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log the error for debugging purposes
  console.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  console.error(err.stack);

  // Send a user-friendly error response
  res.status(err.statusCode).json({
    status: 'error',
    statusCode: err.statusCode,
    message: err.isOperational ? err.message : 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
