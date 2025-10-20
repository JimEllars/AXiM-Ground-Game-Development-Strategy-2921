import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import bcrypt from 'bcrypt';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { role, isActive } = req.query;

    let whereClause = 'WHERE organization_id = $1';
    const params: any[] = [user.organization_id];
    let paramIndex = 2;

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT 
        id, email, first_name, last_name, role, is_active, created_at,
        (SELECT COUNT(*) FROM territory_assignments ta WHERE ta.user_id = users.id) as assigned_territories
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC`,
      params
    );

    const users = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      assignedTerritories: parseInt(row.assigned_territories)
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { email, password, firstName, lastName, role = 'REP' } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [user.organization_id, email, passwordHash, firstName, lastName, role]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      isActive: newUser.is_active,
      createdAt: newUser.created_at
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, role, password, isActive } = req.body;
    const currentUser = req.user!;

    // Verify user belongs to organization
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND organization_id = $2',
      [userId, currentUser.organization_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userResult.rows[0];

    // Prevent users from modifying their own role or deactivating themselves
    if (userId === currentUser.id) {
      if (role && role !== targetUser.role) {
        return res.status(400).json({ error: 'Cannot modify your own role' });
      }
      if (isActive !== undefined && !isActive) {
        return res.status(400).json({ error: 'Cannot deactivate yourself' });
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      params.push(firstName);
      paramIndex++;
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      params.push(lastName);
      paramIndex++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (password && password.trim()) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updates.push(`password_hash = $${paramIndex}`);
      params.push(passwordHash);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedUser = result.rows[0];

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      isActive: updatedUser.is_active,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Prevent users from deleting themselves
    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Verify user belongs to organization
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND organization_id = $2',
      [userId, currentUser.organization_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userResult.rows[0];

    // Prevent deletion of admin users unless current user is also admin
    if (targetUser.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Delete user (this will cascade to territory_assignments due to foreign key constraint)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const result = await pool.query(
      `SELECT 
        role,
        COUNT(*) as count
      FROM users 
      WHERE organization_id = $1 AND is_active = true
      GROUP BY role`,
      [user.organization_id]
    );

    const stats = {
      total: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      byRole: result.rows.reduce((acc: any, row) => {
        acc[row.role] = parseInt(row.count);
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};