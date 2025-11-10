import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import wellknown from 'wellknown';

export const createTerritory = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { name, description, geoJson } = req.body;
    const user = req.user!;

    if (!name || !geoJson) {
      return res.status(400).json({ error: 'Name and geoJson are required' });
    }

    // Convert GeoJSON to WKT for PostGIS
    const wkt = wellknown.stringify(geoJson);
    
    const result = await pool.query(
      `INSERT INTO territories (organization_id, name, description, boundary, created_by)
       VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5)
       RETURNING id, name, description, created_at`,
      [user.organization_id, name, description, wkt, user.id]
    );

    const territory = result.rows[0];

    res.status(201).json({
      id: territory.id,
      name: territory.name,
      description: territory.description,
      boundary: geoJson,
      createdAt: territory.created_at
    });
  } catch (error) {
    console.error('Create territory error:', error);
    next(new Error('Failed to create territory due to a server error.'));
  }
};

export const getTerritories = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = req.user!;

    const result = await pool.query(
      `SELECT 
         t.id, 
         t.name, 
         t.description, 
         ST_AsGeoJSON(t.boundary) as boundary,
         t.created_at,
         u.first_name as created_by_first_name,
         u.last_name as created_by_last_name
       FROM territories t
       JOIN users u ON t.created_by = u.id
       WHERE t.organization_id = $1
       ORDER BY t.created_at DESC`,
      [user.organization_id]
    );

    const territories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      boundary: JSON.parse(row.boundary),
      createdAt: row.created_at,
      createdBy: `${row.created_by_first_name} ${row.created_by_last_name}`
    }));

    res.json(territories);
  } catch (error) {
    console.error('Get territories error:', error);
    next(new Error('Failed to retrieve territories.'));
  }
};

export const deleteTerritory = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { territoryId } = req.params;
    const user = req.user!;

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'You are not authorized to delete territories.' });
    }

    // Verify territory belongs to organization
    const territoryResult = await pool.query(
      'SELECT id FROM territories WHERE id = $1 AND organization_id = $2',
      [territoryId, user.organization_id]
    );

    if (territoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Territory not found or you do not have permission to delete it.' });
    }

    // Delete leads within the territory to prevent orphaned data
    await pool.query(
      `DELETE FROM leads
       WHERE ST_Within(location, (SELECT boundary FROM territories WHERE id = $1))`,
      [territoryId]
    );

    // Delete territory assignments first
    await pool.query('DELETE FROM territory_assignments WHERE territory_id = $1', [territoryId]);
    
    // Delete territory
    await pool.query('DELETE FROM territories WHERE id = $1', [territoryId]);

    res.json({ message: 'Territory deleted successfully' });
  } catch (error) {
    console.error('Delete territory error:', error);
    next(new Error('Failed to delete territory.'));
  }
};

export const assignTerritory = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { territoryId } = req.params;
    const { userId } = req.body;
    const assignedBy = req.user!;

    if (assignedBy.role !== 'ADMIN' && assignedBy.role !== 'MANAGER') {
      return res.status(403).json({ error: 'You are not authorized to assign territories.' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify territory belongs to organization
    const territoryResult = await pool.query(
      'SELECT id FROM territories WHERE id = $1 AND organization_id = $2',
      [territoryId, assignedBy.organization_id]
    );

    if (territoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Territory not found or you do not have permission to assign it.' });
    }

    // Verify user belongs to organization
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
      [userId, assignedBy.organization_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your organization.' });
    }

    // Create assignment (ON CONFLICT DO NOTHING to handle duplicates)
    await pool.query(
      `INSERT INTO territory_assignments (user_id, territory_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, territory_id) DO NOTHING`,
      [userId, territoryId, assignedBy.id]
    );

    res.json({ message: 'Territory assigned successfully' });
  } catch (error) {
    console.error('Assign territory error:', error);
    next(new Error('Failed to assign territory.'));
  }
};

export const getUserTerritories = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = req.user!;

    const result = await pool.query(
      `SELECT 
         t.id,
         t.name,
         t.description,
         ST_AsGeoJSON(t.boundary) as boundary,
         ta.assigned_at
       FROM territories t
       JOIN territory_assignments ta ON t.id = ta.territory_id
       WHERE ta.user_id = $1
       ORDER BY ta.assigned_at DESC`,
      [user.id]
    );

    const territories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      boundary: JSON.parse(row.boundary),
      assignedAt: row.assigned_at
    }));

    res.json(territories);
  } catch (error) {
    console.error('Get user territories error:', error);
    next(new Error('Failed to retrieve user territories.'));
  }
};

export const getAvailableReps = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = req.user!;

    const result = await pool.query(
      `SELECT 
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         COUNT(ta.id) as assigned_territories
       FROM users u
       LEFT JOIN territory_assignments ta ON u.id = ta.user_id
       WHERE u.organization_id = $1 
         AND u.role = 'REP'
         AND u.is_active = true
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY u.first_name, u.last_name`,
      [user.organization_id]
    );

    const reps = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      assignedTerritories: parseInt(row.assigned_territories)
    }));

    res.json(reps);
  } catch (error) {
    console.error('Get available reps error:', error);
    next(new Error('Failed to retrieve available reps.'));
  }
};