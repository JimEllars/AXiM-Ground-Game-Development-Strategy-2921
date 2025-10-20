import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { geocodeAddress, batchGeocode } from '../services/geocoding.js';
import Papa from 'papaparse';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const uploadMiddleware = upload.single('file');

export const uploadLeads = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    // Parse CSV
    const csvText = file.buffer.toString('utf-8');
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV parsing error',
        details: parseResult.errors
      });
    }

    const rows = parseResult.data as any[];
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Validate required columns
    const requiredColumns = ['street_address'];
    const headers = Object.keys(rows[0]);
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      });
    }

    // Prepare addresses for geocoding
    const addresses = rows.map(row => {
      const parts = [
        row.street_address,
        row.city,
        row.state,
        row.zip
      ].filter(Boolean);
      return parts.join(', ');
    });

    console.log(`Geocoding ${addresses.length} addresses...`);
    const geocodeResults = await batchGeocode(addresses);

    // Prepare leads for insertion
    const leads = rows.map((row, index) => {
      const geocode = geocodeResults[index];
      
      return {
        organization_id: user.organization_id,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        street_address: row.street_address,
        city: row.city || null,
        state: row.state || null,
        zip: row.zip || null,
        phone: row.phone || null,
        email: row.email || null,
        status: row.status || 'New',
        notes: row.notes || null,
        longitude: geocode?.longitude || null,
        latitude: geocode?.latitude || null
      };
    });

    // Bulk insert leads
    const insertPromises = leads.map(lead => {
      const locationWKT = lead.longitude && lead.latitude 
        ? `POINT(${lead.longitude} ${lead.latitude})`
        : null;

      return pool.query(
        `INSERT INTO leads 
         (organization_id, first_name, last_name, street_address, city, state, zip, phone, email, status, notes, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ${locationWKT ? 'ST_GeomFromText($12, 4326)' : 'NULL'})
         RETURNING id`,
        locationWKT 
          ? [lead.organization_id, lead.first_name, lead.last_name, lead.street_address, 
             lead.city, lead.state, lead.zip, lead.phone, lead.email, lead.status, lead.notes, locationWKT]
          : [lead.organization_id, lead.first_name, lead.last_name, lead.street_address,
             lead.city, lead.state, lead.zip, lead.phone, lead.email, lead.status, lead.notes]
      );
    });

    const results = await Promise.all(insertPromises);
    const successCount = results.length;
    const geocodedCount = geocodeResults.filter(r => r !== null).length;

    res.json({
      message: 'Leads uploaded successfully',
      totalLeads: successCount,
      geocodedLeads: geocodedCount,
      geocodingRate: `${Math.round((geocodedCount / successCount) * 100)}%`
    });
  } catch (error) {
    console.error('Upload leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { page = 1, limit = 100, status, search } = req.query;

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
       ORDER BY l.created_at DESC
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

    res.json({
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