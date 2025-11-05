import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { leadSchema } from '../utils/validationSchemas.js';
import { geocodeAddress, batchGeocode } from '../services/geocoding.js';
import Papa from 'papaparse';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const uploadMiddleware = upload.single('file');

export const bulkImportLeads = async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  // 1. Parse CSV
  const csvText = file.buffer.toString('utf-8');
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  });

  if (parseResult.errors.length > 0) {
    return res.status(400).json({
      error: 'CSV parsing error',
      details: parseResult.errors.map(err => `Error on row ${err.row}: ${err.message}`),
    });
  }

  const rows = parseResult.data as any[];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'CSV file is empty' });
  }

  // 2. Validate Rows
  const validationErrors: any[] = [];
  const validatedRows = rows.map((row, index) => {
    const result = leadSchema.safeParse(row);
    if (!result.success) {
      validationErrors.push({ row: index + 2, errors: result.error.flatten() });
      return null;
    }
    return result.data;
  }).filter(Boolean);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'CSV validation failed',
      details: validationErrors,
    });
  }

  // 3. Geocode Addresses
  const addresses = validatedRows.map(row => {
    if (!row) return '';
    const parts = [row.street_address, row.city, row.state, row.zip].filter(Boolean);
    return parts.join(', ');
  });

  const geocodeResults = await batchGeocode(addresses);

  // 4. Prepare Leads for DB
  const leadsToProcess = validatedRows.map((row, index) => {
    const geocode = geocodeResults[index];
    return {
      first_name: row!.first_name || null,
      last_name: row!.last_name || null,
      street_address: row!.street_address,
      city: row!.city || null,
      state: row!.state || null,
      zip: row!.zip || null,
      phone: row!.phone || null,
      email: row!.email || null,
      status: row!.status || 'New',
      notes: row!.notes || null,
      longitude: geocode?.longitude || null,
      latitude: geocode?.latitude || null,
    };
  });

  // 5. Database Transaction with Temp Table
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create a temporary table for staging
    await client.query(`
      CREATE TEMP TABLE temp_leads_staging (
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        street_address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        status VARCHAR(50),
        notes TEXT,
        longitude DOUBLE PRECISION,
        latitude DOUBLE PRECISION
      ) ON COMMIT DROP;
    `);

    // Efficiently insert all leads into the temporary table
    if (leadsToProcess.length > 0) {
      const values: any[] = [];
      const valueStrings: string[] = [];
      let paramIndex = 1;
      const columns = [
        'first_name', 'last_name', 'street_address', 'city', 'state', 'zip',
        'phone', 'email', 'status', 'notes', 'longitude', 'latitude'
      ];

      for (const lead of leadsToProcess) {
        const leadValues = columns.map(col => lead[col as keyof typeof lead]);
        const placeholders = leadValues.map(() => `$${paramIndex++}`);
        valueStrings.push(`(${placeholders.join(', ')})`);
        values.push(...leadValues);
      }

      const tempInsertQuery = `INSERT INTO temp_leads_staging (${columns.join(', ')}) VALUES ${valueStrings.join(', ')}`;
      await client.query(tempInsertQuery, values);
    }

    // Insert from temp table into leads, skipping duplicates based on street_address and organization_id
    const insertQuery = `
      INSERT INTO leads (
        organization_id, first_name, last_name, street_address, city, state, zip, phone, email, status, notes, location
      )
      SELECT
        $1, -- organization_id
        t.first_name, t.last_name, t.street_address, t.city, t.state, t.zip,
        t.phone, t.email, t.status, t.notes,
        CASE
          WHEN t.longitude IS NOT NULL AND t.latitude IS NOT NULL
          THEN ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)
          ELSE NULL
        END
      FROM temp_leads_staging t
      LEFT JOIN leads l ON l.street_address = t.street_address AND l.organization_id = $1
      WHERE l.id IS NULL
      RETURNING location;
    `;

    const results = await client.query(insertQuery, [user.organization_id]);
    await client.query('COMMIT');

    const successCount = results.rowCount || 0;
    const geocodedCount = results.rows.filter(row => row.location !== null).length;
    const duplicates = leadsToProcess.length - successCount;

    res.json({
      message: 'Leads uploaded successfully',
      totalLeads: successCount,
      geocodedLeads: geocodedCount,
      geocodingRate: successCount > 0 ? `${Math.round((geocodedCount / successCount) * 100)}%` : 'N/A',
      duplicates: duplicates,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload leads transaction error:', error);
    res.status(500).json({ error: 'Failed to import leads due to a database error.' });
  } finally {
    client.release();
  }
};

export const deleteLeads = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lead IDs must be a non-empty array' });
    }

    const result = await pool.query(
      'DELETE FROM leads WHERE id = ANY($1::uuid[]) AND organization_id = $2',
      [ids, user.organization_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No matching leads found to delete' });
    }

    res.status(200).json({ message: `${result.rowCount} leads deleted successfully` });
  } catch (error) {
    console.error('Delete leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      page = 1,
      limit = 100,
      status,
      search,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const allowedSortColumns = ['created_at', 'last_name', 'status'];
    if (!allowedSortColumns.includes(sort as string)) {
      return res.status(400).json({ error: 'Invalid sort column' });
    }

    const orderDirection = (order as string).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE l.organization_id = $1';
    const params: any[] = [user.organization_id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        l.first_name ILIKE $${paramIndex} OR 
        l.last_name ILIKE $${paramIndex} OR 
        l.street_address ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT 
         l.id,
         l.first_name,
         l.last_name,
         l.street_address,
         l.city,
         l.state,
         l.zip,
         l.phone,
         l.email,
         l.status,
         l.notes,
         ST_X(l.location) as longitude,
         ST_Y(l.location) as latitude,
         l.created_at,
         l.updated_at
       FROM leads l
       ${whereClause}
       ORDER BY l.${sort} ${orderDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );

    const leads = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      streetAddress: row.street_address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      phone: row.phone,
      email: row.email,
      status: row.status,
      notes: row.notes,
      location: row.longitude && row.latitude ? {
        type: 'Point' as const,
        coordinates: [row.longitude, row.latitude]
      } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.status(200).json({
      leads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].count),
        pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};