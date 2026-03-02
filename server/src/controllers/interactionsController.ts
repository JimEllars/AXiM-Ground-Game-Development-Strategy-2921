import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';

export const createInteractions = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const interactions = req.body;

    if (!Array.isArray(interactions) || interactions.length === 0) {
      return res.status(400).json({ error: 'Array of interactions is required' });
    }

    // Validate each interaction
    const validInteractions = interactions.filter(interaction => {
      return interaction.leadId && interaction.outcome;
    });

    if (validInteractions.length === 0) {
      return res.status(400).json({ error: 'No valid interactions provided' });
    }

    // Batch insert interactions
    const insertPromises = validInteractions.map(interaction => {
      const locationWKT = interaction.location 
        ? `POINT(${interaction.location.longitude} ${interaction.location.latitude})`
        : null;

      return pool.query(
        `INSERT INTO interactions 
         (lead_id, user_id, outcome, notes, interaction_date, location, synced_at)
         VALUES ($1, $2, $3, $4, $5, ${locationWKT ? 'ST_GeomFromText($6, 4326)' : 'NULL'}, CURRENT_TIMESTAMP)
         RETURNING id, interaction_date`,
        locationWKT 
          ? [interaction.leadId, user.id, interaction.outcome, interaction.notes || null, 
             interaction.interactionDate || new Date(), locationWKT]
          : [interaction.leadId, user.id, interaction.outcome, interaction.notes || null,
             interaction.interactionDate || new Date()]
      );
    });

    const results = await Promise.all(insertPromises);

    // Update lead status based on interaction outcome
    const updateValues: string[] = [];
    const updateParams: any[] = [];
    let paramCount = 1;

    validInteractions.forEach((interaction) => {
      let newStatus = 'Contacted';
      
      // Map outcomes to statuses
      switch (interaction.outcome.toLowerCase()) {
        case 'interested':
        case 'follow-up required':
          newStatus = 'Hot Lead';
          break;
        case 'not interested':
          newStatus = 'Not Interested';
          break;
        case 'not home':
          newStatus = 'Not Home';
          break;
        case 'completed':
        case 'sold':
          newStatus = 'Completed';
          break;
        default:
          newStatus = 'Contacted';
      }

      updateValues.push(`($${paramCount}::uuid, $${paramCount + 1}::varchar)`);
      updateParams.push(interaction.leadId, newStatus);
      paramCount += 2;
    });

    if (updateValues.length > 0) {
      await pool.query(
        `UPDATE leads
         SET status = v.status, updated_at = CURRENT_TIMESTAMP
         FROM (VALUES ${updateValues.join(', ')}) AS v(id, status)
         WHERE leads.id = v.id`,
        updateParams
      );
    }

    res.json({
      message: 'Interactions created successfully',
      count: results.length,
      interactions: results.map(result => ({
        id: result.rows[0].id,
        interactionDate: result.rows[0].interaction_date
      }))
    });
  } catch (error) {
    console.error('Create interactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInteractions = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { leadId, startDate, endDate, page = 1, limit = 50 } = req.query;

    let whereClause = 'WHERE i.user_id = $1';
    const params: any[] = [user.id];
    let paramIndex = 2;

    if (leadId) {
      whereClause += ` AND i.lead_id = $${paramIndex}`;
      params.push(leadId);
      paramIndex++;
    }

    if (startDate && endDate) {
      whereClause += ` AND i.interaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT 
         i.id,
         i.outcome,
         i.notes,
         i.interaction_date,
         ST_X(i.location) as longitude,
         ST_Y(i.location) as latitude,
         i.synced_at,
         
         -- Lead information
         lp.first_name,
         lp.last_name,
         lp.street_address,
         lp.city,
         lp.state,
         lp.zip
         
       FROM interactions i
       JOIN leads l ON i.lead_id = l.id
       LEFT JOIN lead_pii lp ON l.id = lp.lead_id
       ${whereClause}
       ORDER BY i.interaction_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM interactions i ${whereClause}`,
      params
    );

    const interactions = result.rows.map(row => ({
      id: row.id,
      outcome: row.outcome,
      notes: row.notes,
      interactionDate: row.interaction_date,
      location: row.longitude && row.latitude ? {
        type: 'Point' as const,
        coordinates: [row.longitude, row.latitude]
      } : null,
      syncedAt: row.synced_at,
      lead: {
        firstName: row.first_name,
        lastName: row.last_name,
        streetAddress: row.street_address,
        city: row.city,
        state: row.state,
        zip: row.zip
      }
    }));

    res.json({
      interactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].count),
        pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};