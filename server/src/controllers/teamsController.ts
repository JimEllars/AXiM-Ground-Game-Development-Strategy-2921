import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { teamSchema } from '../utils/validationSchemas.js';

export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // Get all teams for the organization
    const result = await pool.query(
      `SELECT
        t.id, t.name, t.description, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) as member_count
      FROM teams t
      WHERE t.organization_id = $1
      ORDER BY t.name ASC`,
      [user.organization_id]
    );

    const teams = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      memberCount: parseInt(row.member_count)
    }));

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const validation = teamSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }

    const { name, description } = validation.data;

    const result = await pool.query(
      `INSERT INTO teams (organization_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.organization_id, name, description]
    );

    const newTeam = result.rows[0];

    res.status(201).json({
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description,
      createdAt: newTeam.created_at,
      updatedAt: newTeam.updated_at,
      memberCount: 0
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const validation = teamSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }

    const { name, description } = validation.data;

    // Check if team exists and belongs to org
    const teamCheck = await pool.query(
      'SELECT id FROM teams WHERE id = $1 AND organization_id = $2',
      [id, user.organization_id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedTeam = result.rows[0];

    // Fetch member count separately or just return the team
    const countResult = await pool.query(
        'SELECT COUNT(*) as member_count FROM users WHERE team_id = $1',
        [id]
    );
    const memberCount = parseInt(countResult.rows[0].member_count);

    res.json({
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      createdAt: updatedTeam.created_at,
      updatedAt: updatedTeam.updated_at,
      memberCount
    });

  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Check ownership
    const result = await pool.query(
      'DELETE FROM teams WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, user.organization_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Users who were in this team will have team_id set to NULL automatically due to ON DELETE SET NULL

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const assignUserToTeam = async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params; // teamId
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify team belongs to organization
    const teamCheck = await pool.query(
      'SELECT id FROM teams WHERE id = $1 AND organization_id = $2',
      [id, currentUser.organization_id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Verify target user belongs to organization
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
      [userId, currentUser.organization_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    await pool.query(
      'UPDATE users SET team_id = $1 WHERE id = $2',
      [id, userId]
    );

    res.json({ message: 'User assigned to team successfully' });
  } catch (error) {
    console.error('Assign user to team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
