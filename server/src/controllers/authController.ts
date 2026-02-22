import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { User, AuthRequest } from '../types/index.js';
import AppError from '../utils/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Optional debug flag for auth troubleshooting (set DEBUG_AUTH=true in .env.test only)
const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Explicitly ignore 'role' from req.body to prevent privilege escalation
    const { email, password, firstName, lastName, organizationId } = req.body;
    const role = 'REP'; // Force default role for public registration

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !organizationId) {
      return next(new AppError('Email, password, first name, last name, and organization ID are required', 400));
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, organization_id, email, first_name, last_name, role, created_at`,
      [organizationId, email, passwordHash, firstName, lastName, role]
    );

    const user = result.rows[0];

    if (!JWT_SECRET) {
      return next(new AppError('JWT secret not configured', 500));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    // Find user by email (must be active)
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      if (DEBUG_AUTH) console.debug('[auth] login: user not found or inactive', { email });
      return next(new AppError('Invalid email or password', 401));
    }

    const user = result.rows[0] as User;

    // Ensure there is a password hash stored
    if (!user.password_hash) {
      if (DEBUG_AUTH) console.debug('[auth] login: missing password_hash for user', { userId: user.id });
      return next(new AppError('Invalid email or password', 401));
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (DEBUG_AUTH) console.debug('[auth] login: bcrypt.compare result', { email, isValidPassword });

    if (!isValidPassword) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!JWT_SECRET) {
      return next(new AppError('JWT secret not configured', 500));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const decodedUser = req.user;

    if (!decodedUser) {
      return next(new AppError('Authentication error', 401));
    }

    // Re-fetch user from the database to ensure data is fresh
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, organization_id FROM users WHERE id = $1 AND is_active = true',
      [decodedUser.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('User not found or is inactive', 404));
    }

    const freshUser = result.rows[0];

    res.json({
      id: freshUser.id,
      email: freshUser.email,
      firstName: freshUser.first_name,
      lastName: freshUser.last_name,
      role: freshUser.role,
      organizationId: freshUser.organization_id,
    });
  } catch (error) {
    next(error);
  }
};
