import logger from '../utils/logger.js';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import { pool } from '../config/database.js';
import { User, AuthRequest } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  if (!JWT_SECRET) {
    logger.error('[auth] JWT_SECRET is not configured');
    return next(new AppError('Internal server error', 500));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as JWTPayload;
    
    // Fetch user from database to ensure they still exist and are active
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Invalid token', 401));
    }

    req.user = result.rows[0] as User;

    if (!req.user.organization_id) {
      return next(new AppError('User missing organization context', 403));
    }
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 403));
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};