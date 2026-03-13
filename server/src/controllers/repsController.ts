import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import catchAsync from "../utils/catchAsync.js";

export const getMyTurf = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  // Get user's assigned territories and leads within those territories
  const result = await pool.query(
    `SELECT
         -- Territory data
         t.id as territory_id,
         t.name as territory_name,
         t.description as territory_description,
         t.created_at as territory_created_at,
         ST_AsGeoJSON(t.boundary) as territory_boundary,
         
         -- Lead data (if within territory)
         l.id as lead_id,
         lp.first_name,
         lp.last_name,
         lp.street_address,
         lp.city,
         lp.state,
         lp.zip,
         lp.phone,
         lp.email,
         l.status,
         l.notes,
         ST_X(l.location) as longitude,
         ST_Y(l.location) as latitude,
         l.created_at as lead_created_at,
         
         -- Latest interaction data
         i.outcome as last_outcome,
         i.notes as last_notes,
         i.interaction_date as last_interaction_date
         
       FROM territories t
       JOIN territory_assignments ta ON t.id = ta.territory_id
       LEFT JOIN leads l ON l.organization_id = t.organization_id 
                        AND ST_Contains(t.boundary, l.location)
       LEFT JOIN lead_pii lp ON l.id = lp.lead_id
       LEFT JOIN LATERAL (
         SELECT outcome, notes, interaction_date
         FROM interactions 
         WHERE lead_id = l.id 
         ORDER BY interaction_date DESC 
         LIMIT 1
       ) i ON true
       
       WHERE ta.user_id = $1
       ORDER BY t.name, lp.street_address`,
    [user.id],
  );

  // Group results by territory
  const territoriesMap = new Map();

  result.rows.forEach((row) => {
    const territoryId = row.territory_id;

    if (!territoriesMap.has(territoryId)) {
      territoriesMap.set(territoryId, {
        id: territoryId,
        name: row.territory_name,
        description: row.territory_description,
        createdAt: row.territory_created_at,
        boundary: JSON.parse(row.territory_boundary),
        leads: [],
      });
    }

    // Add lead if it exists
    if (row.lead_id) {
      const territory = territoriesMap.get(territoryId);
      territory.leads.push({
        id: row.lead_id,
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
        location:
          row.longitude && row.latitude
            ? {
                type: "Point" as const,
                coordinates: [row.longitude, row.latitude],
              }
            : null,
        createdAt: row.lead_created_at,
        lastInteraction: row.last_outcome
          ? {
              outcome: row.last_outcome,
              notes: row.last_notes,
              date: row.last_interaction_date,
            }
          : null,
      });
    }
  });

  const territories = Array.from(territoriesMap.values());

  // Calculate summary statistics
  const totalLeads = territories.reduce((sum, t) => sum + t.leads.length, 0);
  const completedLeads = territories.reduce(
    (sum, t) => sum + t.leads.filter((l: any) => l.lastInteraction).length,
    0,
  );

  res.json({
    territories,
    summary: {
      totalTerritories: territories.length,
      totalLeads,
      completedLeads,
      completionRate:
        totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0,
    },
  });
});

export const getRepStats = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    const params = [user.id];

    if (startDate && endDate) {
      dateFilter = "AND i.interaction_date BETWEEN $2 AND $3";
      params.push(startDate as string, endDate as string);
    }

    const result = await pool.query(
      `SELECT 
         COUNT(i.id) as total_interactions,
         COUNT(DISTINCT i.lead_id) as unique_leads_contacted,
         COUNT(DISTINCT DATE(i.interaction_date)) as active_days,
         outcome,
         COUNT(*) as outcome_count
       FROM interactions i
       WHERE i.user_id = $1 ${dateFilter}
       GROUP BY ROLLUP(outcome)
       ORDER BY outcome NULLS FIRST`,
      params,
    );

    const stats = result.rows;
    const summary = stats.find((s) => s.outcome === null) || {
      total_interactions: 0,
      unique_leads_contacted: 0,
      active_days: 0,
    };

    const outcomeBreakdown = stats
      .filter((s) => s.outcome !== null)
      .map((s) => ({
        outcome: s.outcome,
        count: parseInt(s.outcome_count),
      }));

    res.json({
      totalInteractions: parseInt(summary.total_interactions),
      uniqueLeadsContacted: parseInt(summary.unique_leads_contacted),
      activeDays: parseInt(summary.active_days),
      outcomeBreakdown,
    });
  },
);
