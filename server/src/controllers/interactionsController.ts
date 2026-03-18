import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import catchAsync from "../utils/catchAsync.js";

export const createInteractions = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const interactions = req.body;

    if (!Array.isArray(interactions) || interactions.length === 0) {
      return res
        .status(400)
        .json({ error: "Array of interactions is required" });
    }

    // Validate each interaction
    const validInteractions = interactions.filter((interaction) => {
      return interaction.leadId && interaction.outcome;
    });

    if (validInteractions.length === 0) {
      return res.status(400).json({ error: "No valid interactions provided" });
    }

    // Batch insert interactions using UNNEST for optimal performance
    const len = validInteractions.length;
    const leadIdsArr: string[] = new Array(len);
    const userIdsArr: string[] = new Array(len);
    const outcomesArr: string[] = new Array(len);
    const notesArr: (string | null)[] = new Array(len);
    const datesArr: Date[] = new Array(len);
    const locationsArr: (string | null)[] = new Array(len);

    for (let i = 0; i < len; i++) {
      const interaction = validInteractions[i];
      leadIdsArr[i] = interaction.leadId;
      userIdsArr[i] = user.id;
      outcomesArr[i] = interaction.outcome;
      notesArr[i] = interaction.notes || null;
      datesArr[i] = interaction.interactionDate || new Date();
      locationsArr[i] = interaction.location
        ? `POINT(${interaction.location.longitude} ${interaction.location.latitude})`
        : null;
    }

    const results = await pool.query(
      `INSERT INTO interactions
       (lead_id, user_id, outcome, notes, interaction_date, location, synced_at)
       SELECT
         t.lead_id, t.user_id, t.outcome, t.notes, t.interaction_date,
         CASE WHEN t.loc IS NOT NULL THEN ST_GeomFromText(t.loc, 4326) ELSE NULL END,
         CURRENT_TIMESTAMP
       FROM unnest(
         $1::uuid[],
         $2::uuid[],
         $3::varchar[],
         $4::text[],
         $5::timestamp[],
         $6::text[]
       ) AS t(lead_id, user_id, outcome, notes, interaction_date, loc)
       RETURNING id, interaction_date`,
      [leadIdsArr, userIdsArr, outcomesArr, notesArr, datesArr, locationsArr],
    );

    // Update lead status based on interaction outcome
    const updateValues: string[] = new Array(len);
    const updateParams: any[] = new Array(len * 2);

    for (let i = 0; i < len; i++) {
      const interaction = validInteractions[i];
      let newStatus = "Contacted";

      // Map outcomes to statuses
      switch (interaction.outcome.toLowerCase()) {
        case "interested":
        case "follow-up required":
          newStatus = "Hot Lead";
          break;
        case "not interested":
          newStatus = "Not Interested";
          break;
        case "not home":
          newStatus = "Not Home";
          break;
        case "completed":
        case "sold":
          newStatus = "Completed";
          break;
        default:
          newStatus = "Contacted";
      }

      const paramCount = i * 2 + 1;
      updateValues[i] = `($${paramCount}::uuid, $${paramCount + 1}::varchar)`;
      updateParams[paramCount - 1] = interaction.leadId;
      updateParams[paramCount] = newStatus;
    }

    if (len > 0) {
      await pool.query(
        `UPDATE leads
         SET status = v.status, updated_at = CURRENT_TIMESTAMP
         FROM (VALUES ${updateValues.join(", ")}) AS v(id, status)
         WHERE leads.id = v.id`,
        updateParams,
      );
    }

    res.json({
      message: "Interactions created successfully",
      count: results.rows.length,
      interactions: results.rows.map((row) => ({
        id: row.id,
        interactionDate: row.interaction_date,
      })),
    });
  },
);

export const getInteractions = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { leadId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const conditions: string[] = ["i.user_id = $1"];
    const params: any[] = [user.id];
    let paramIndex = 2;

    if (leadId) {
      conditions.push(`i.lead_id = $${paramIndex}`);
      params.push(leadId);
      paramIndex++;
    }

    if (startDate && endDate) {
      conditions.push(`i.interaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
      [...params, Number(limit), offset],
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM interactions i ${whereClause}`,
      params,
    );

    const interactions = result.rows.map((row) => ({
      id: row.id,
      outcome: row.outcome,
      notes: row.notes,
      interactionDate: row.interaction_date,
      location:
        row.longitude && row.latitude
          ? {
              type: "Point" as const,
              coordinates: [row.longitude, row.latitude],
            }
          : null,
      syncedAt: row.synced_at,
      lead: {
        firstName: row.first_name,
        lastName: row.last_name,
        streetAddress: row.street_address,
        city: row.city,
        state: row.state,
        zip: row.zip,
      },
    }));

    res.json({
      interactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].count),
        pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
      },
    });
  },
);
