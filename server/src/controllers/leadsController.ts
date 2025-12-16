import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { leadSchema } from '../utils/validationSchemas.js';
import { geocodeAddress, batchGeocode } from '../services/geocoding.js';
import { syncLeadToCore } from '../services/aximService.js';
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

    await client.query(`
      CREATE TEMP TABLE temp_leads_staging (
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        street_address TEXT NOT NULL,
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

    // Use unnest for efficient bulk insertion into the temporary table
    if (leadsToProcess.length > 0) {
      const columns = [ 'first_name', 'last_name', 'street_address', 'city', 'state', 'zip', 'phone', 'email', 'status', 'notes', 'longitude', 'latitude' ];
      const params = columns.map(col => leadsToProcess.map(lead => (lead as any)[col]));
      const types = [ 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'float8[]', 'float8[]' ];

      const tempInsertQuery = `
        INSERT INTO temp_leads_staging (${columns.join(', ')})
        SELECT * FROM unnest(${types.map((type, i) => `$${i + 1}::${type}`).join(', ')})
      `;
      await client.query(tempInsertQuery, params);
    }

    // Identify leads that are not duplicates for the current organization
    const nonDuplicateLeadsQuery = `
      SELECT t.* FROM temp_leads_staging t
      WHERE NOT EXISTS (
        SELECT 1 FROM leads l
        JOIN lead_pii pii ON l.id = pii.lead_id
        WHERE l.organization_id = $1 AND pii.street_address = t.street_address
      );
    `;
    const newLeadsResult = await client.query(nonDuplicateLeadsQuery, [user.organization_id]);
    const newLeadsData = newLeadsResult.rows;

    let leadInsertResult: { rows: any[]; rowCount: number | null } = { rows: [], rowCount: 0 };

    if (newLeadsData.length > 0) {
      // Insert into the main 'leads' table
      const leadValues = newLeadsData.flatMap(lead => [
        user.organization_id,
        lead.status,
        lead.notes,
        lead.longitude,
        lead.latitude,
      ]);

      const leadPlaceholders = newLeadsData.map((_, i) => {
        const base = i * 5;
        const location = `CASE WHEN $${base + 4}::float8 IS NOT NULL AND $${base + 5}::float8 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($${base + 4}::float8, $${base + 5}::float8), 4326) ELSE NULL END`;
        return `($${base + 1}::uuid, $${base + 2}::text, $${base + 3}::text, ${location})`;
      }).join(', ');

      const insertLeadsQuery = `
        INSERT INTO leads (organization_id, status, notes, location)
        VALUES ${leadPlaceholders}
        RETURNING id, location;
      `;
      leadInsertResult = await client.query(insertLeadsQuery, leadValues);

      // Prepare data for the PII table insertion using unnest
      const piiColumns = ['lead_id', 'first_name', 'last_name', 'street_address', 'city', 'state', 'zip', 'phone', 'email'];
      const piiParams = [
        leadInsertResult.rows.map(row => row.id),
        ...piiColumns.slice(1).map(col => newLeadsData.map(lead => (lead as any)[col]))
      ];
      const piiTypes = ['uuid[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]'];

      const piiInsertQuery = `
        INSERT INTO lead_pii (${piiColumns.join(', ')})
        SELECT * FROM unnest(${piiTypes.map((type, i) => `$${i + 1}::${type}`).join(', ')})
      `;
      await client.query(piiInsertQuery, piiParams);
    }

    await client.query('COMMIT');

    const successCount = leadInsertResult.rowCount || 0;
    const geocodedCount = leadInsertResult.rows.filter(row => row.location).length;
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

export const updateLead = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, notes, firstName, lastName, phone, email, streetAddress, city, state, zip } = req.body;

    await client.query('BEGIN');

    // 1. Check if lead exists and belongs to the user's organization
    const leadCheck = await client.query(
      'SELECT l.id FROM leads l WHERE l.id = $1 AND l.organization_id = $2',
      [id, user.organization_id]
    );

    if (leadCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lead not found' });
    }

    // 2. Update 'leads' table (status, notes)
    if (status || notes !== undefined) {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (status) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(status);
        paramIndex++;
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(notes);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        await client.query(
          `UPDATE leads SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateValues
        );
      }
    }

    // 3. Update 'lead_pii' table (personal info)
    const piiFields: string[] = [];
    const piiValues: any[] = [];
    let piiParamIndex = 1;

    const piiMap: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      street_address: streetAddress,
      city,
      state,
      zip
    };

    for (const [column, value] of Object.entries(piiMap)) {
      if (value !== undefined) {
        piiFields.push(`${column} = $${piiParamIndex}`);
        piiValues.push(value);
        piiParamIndex++;
      }
    }

    if (piiFields.length > 0) {
      piiValues.push(id);
      await client.query(
        `UPDATE lead_pii SET ${piiFields.join(', ')} WHERE lead_id = $${piiParamIndex}`,
        piiValues
      );
    }

    await client.query('COMMIT');

    // 4. Fetch updated lead to return
    const updatedLeadResult = await pool.query(
      `SELECT
         l.id,
         pii.first_name,
         pii.last_name,
         pii.street_address,
         pii.city,
         pii.state,
         pii.zip,
         pii.phone,
         pii.email,
         l.status,
         l.notes,
         ST_X(l.location) as longitude,
         ST_Y(l.location) as latitude,
         l.created_at,
         l.updated_at
       FROM leads l
       JOIN lead_pii pii ON l.id = pii.lead_id
       WHERE l.id = $1`,
      [id]
    );

    const row = updatedLeadResult.rows[0];
    const updatedLead = {
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
    };

    // 5. Sync with AXiM Core
    try {
      await syncLeadToCore(updatedLead);
    } catch (syncError) {
      console.warn('Failed to sync updated lead to AXiM Core:', syncError);
      // We don't fail the request if sync fails, but we should log it
    }

    res.status(200).json({ message: 'Lead updated successfully', lead: updatedLead });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
        pii.first_name ILIKE $${paramIndex} OR
        pii.last_name ILIKE $${paramIndex} OR
        pii.street_address ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT
         l.id,
         pii.first_name,
         pii.last_name,
         pii.street_address,
         pii.city,
         pii.state,
         pii.zip,
         pii.phone,
         pii.email,
         l.status,
         l.notes,
         ST_X(l.location) as longitude,
         ST_Y(l.location) as latitude,
         l.created_at,
         l.updated_at
       FROM leads l
       JOIN lead_pii pii ON l.id = pii.lead_id
       ${whereClause}
       ORDER BY ${sort === 'last_name' ? 'pii.last_name' : `l.${sort}`} ${orderDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM leads l
       JOIN lead_pii pii ON l.id = pii.lead_id
       ${whereClause}`,
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
