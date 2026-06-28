import logger from '../utils/logger.js';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import { pool } from '../config/database.js';
import { User, AuthRequest } from '../types/index.js';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET;
const AXIM_CORE_API_URL = process.env.AXIM_CORE_API_URL || 'http://localhost:4000/api';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

// In-memory token validation cache with 5 minute TTL
const tokenCache = new Map<string, { valid: boolean; user?: User; expiry: number }>();

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  const now = Date.now();
  const cached = tokenCache.get(token);

  if (cached && cached.expiry > now) {
    if (cached.valid && cached.user) {
      req.user = cached.user;
      return next();
    } else {
      return next(new AppError('Invalid token', 401));
    }
  }

  try {
    let payload: JWTPayload | null = null;
    try {
      // 1. Centralized Identity Transition Middleware
      // Validate against the primary AXiM Core Identity Engine
      const coreResponse = await axios.post(`${AXIM_CORE_API_URL}/auth/validate`, { token }, { timeout: 3000 });
      if (coreResponse.data && coreResponse.data.valid) {
        payload = coreResponse.data.payload as JWTPayload;
      } else {
        tokenCache.set(token, { valid: false, expiry: now + 5 * 60 * 1000 });
        return next(new AppError('Invalid token', 401));
      }
    } catch (networkError) {
      // 2. Offline Fallback Validation
      // If network times out or core is unreachable, fallback to local JWT checking
      logger.warn('[auth] Central identity gateway unreachable, falling back to local JWT validation', networkError);
      if (!JWT_SECRET) {
        logger.error('[auth] JWT_SECRET is not configured for local fallback validation');
        return next(new AppError('Internal server error', 500));
      }
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    }

    if (!payload) {
      tokenCache.set(token, { valid: false, expiry: now + 5 * 60 * 1000 });
      return next(new AppError('Invalid token', 401));
    }

    // Fetch user from database to ensure they still exist and are active
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      tokenCache.set(token, { valid: false, expiry: now + 5 * 60 * 1000 });
      return next(new AppError('Invalid token', 401));
    }

    const user = result.rows[0] as User;

    if (!user.organization_id) {
      return next(new AppError('User missing organization context', 403));
    }

    // Cache the successful validation for 5 minutes
    tokenCache.set(token, { valid: true, user, expiry: now + 5 * 60 * 1000 });
    req.user = user;

    next();
  } catch (error) {
    tokenCache.set(token, { valid: false, expiry: now + 5 * 60 * 1000 });
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
