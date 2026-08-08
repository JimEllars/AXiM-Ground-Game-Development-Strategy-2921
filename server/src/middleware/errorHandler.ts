import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log the error for debugging purposes locally
  logger.error(`${statusCode} - ${err.message || 'Internal Server Error'} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Handle specific error types for better client feedback (Operational errors)
  let error = { ...err, statusCode, message: err.message, isOperational };

  // PostgreSQL unique violation
  if (err.code === '23505') {
    error = { ...error, message: 'Duplicate field value entered.', statusCode: 400, isOperational: true };
  }

  // Generic database error (e.g., invalid data format)
  if (err.code && typeof err.code === 'string' && err.code.startsWith('22')) {
    error = { ...error, message: 'Invalid data provided.', statusCode: 400, isOperational: true };
  }

  // Tenant access violation / RLS rejection (42501 in Postgres is insufficient_privilege)
  if (err.code === '42501' || err.message === 'TENANT_MISMATCH') {
    const reqUser = (req as any).user;

    // Log structured tenant violation payload to local log file
    const violationPayload = JSON.stringify({
       type: 'TENANT_ACCESS_VIOLATION',
       user_id: reqUser?.id || 'UNKNOWN',
       organization_id: reqUser?.organization_id || 'UNKNOWN',
       target_url: req.originalUrl,
       method: req.method,
       timestamp: new Date().toISOString()
    });

    // Using node fs to append to logs/client-exceptions.log synchronously for simplicity (a dedicated worker could poll this)
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'logs', 'client-exceptions.log');
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, violationPayload + '\n');
    } catch(e) {}

    error = { ...error, message: 'Unauthorized data access attempt detected.', statusCode: 403, isOperational: false };
  }

  // Telemetry pipeline: Catch non-operational errors and send to Core for diagnostics
  if (!error.isOperational) {
    const reqUser = (req as any).user;
    axios.post((process.env.AXIM_CORE_API_URL || 'http://localhost:4000/api') + '/telemetry/rca_trigger', {
      rep_id: reqUser?.id || null,
      error: {
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      request: {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        body: req.body, // Be cautious with PII in production telemetry
      },
      timestamp: new Date().toISOString()
    }).catch(telemetryErr => {
      logger.error('Failed to send telemetry to AXiM Core:', telemetryErr);
    });

    // Mask internal server exception message to the frontend
    error.message = 'An unexpected error occurred. Our team has been notified.';
    error.statusCode = 500;
  }

  // Send a generic error response, masking details unless it's a safe operational error
  res.status(error.statusCode).json({
    status: 'error',
    statusCode: error.statusCode,
    message: error.message,
  });
};

export default errorHandler;
