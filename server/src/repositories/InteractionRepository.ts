import { pool } from '../config/database.js';
import aximClient from '../services/aximService.js';
import logger from '../utils/logger.js';

export const createInteractions = async (
  interactionsData: any[],
  user: any
) => {
  const useCoreStorage = process.env.USE_AXIM_CORE_STORAGE === 'true';

  if (useCoreStorage) {
    // Fire and forget
    aximClient.post('/interactions/sync', { interactions: interactionsData, user })
      .catch((err) => logger.error('Error syncing interactions to AXiM Core:', err));
    return { asyncMode: true };
  }

  // Batch insert interactions using UNNEST for optimal performance
  const len = interactionsData.length;
  const leadIdsArr: string[] = new Array(len);
  const userIdsArr: string[] = new Array(len);
  const outcomesArr: string[] = new Array(len);
  const notesArr: (string | null)[] = new Array(len);
  const datesArr: Date[] = new Array(len);
  const lonsArr: (number | null)[] = new Array(len);
  const latsArr: (number | null)[] = new Array(len);
  const surveysArr: (any | null)[] = new Array(len);

  for (let i = 0; i < len; i++) {
    const interaction = interactionsData[i];
    leadIdsArr[i] = interaction.leadId;
    userIdsArr[i] = user.id;
    outcomesArr[i] = interaction.outcome;
    notesArr[i] = interaction.notes || null;
    datesArr[i] = interaction.interactionDate || new Date();
    lonsArr[i] = interaction.location ? interaction.location.longitude : null;
    latsArr[i] = interaction.location ? interaction.location.latitude : null;
    surveysArr[i] = interaction.surveyData ? JSON.stringify(interaction.surveyData) : null;
  }

  const results = await pool.query(
    `INSERT INTO interactions
     (lead_id, user_id, outcome, notes, interaction_date, location, synced_at, survey_data)
     SELECT
       t.lead_id, t.user_id, t.outcome, t.notes, t.interaction_date,
       CASE WHEN t.lon IS NOT NULL AND t.lat IS NOT NULL THEN ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326) ELSE NULL END,
       CURRENT_TIMESTAMP,
       t.survey_data::jsonb
     FROM unnest(
       $1::uuid[],
       $2::uuid[],
       $3::varchar[],
       $4::text[],
       $5::timestamp[],
       $6::float8[],
       $7::float8[],
       $8::text[]
     ) AS t(lead_id, user_id, outcome, notes, interaction_date, lon, lat, survey_data)
     RETURNING id, interaction_date`,
    [
      leadIdsArr,
      userIdsArr,
      outcomesArr,
      notesArr,
      datesArr,
      lonsArr,
      latsArr,
      surveysArr,
    ],
  );

  // Update lead status based on interaction outcome
  const updateValues: string[] = new Array(len);
  const updateParams: any[] = new Array(len * 2);

  for (let i = 0; i < len; i++) {
    const interaction = interactionsData[i];
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
    const updateParamsWithOrg = [...updateParams, user.organization_id];
    await pool.query(
      `UPDATE leads
       SET status = v.status, updated_at = CURRENT_TIMESTAMP
       FROM (VALUES ${updateValues.join(", ")}) AS v(id, status)
       WHERE leads.id = v.id AND leads.organization_id = $${updateParams.length + 1}`,
      updateParamsWithOrg,
    );
  }

  return { asyncMode: false, rows: results.rows };
};

export const getInteractions = async (
  queryOptions: { leadId?: any, startDate?: any, endDate?: any, page?: any, limit?: any },
  user: any
) => {
  const useCoreStorage = process.env.USE_AXIM_CORE_STORAGE === 'true';

  if (useCoreStorage) {
    const response = await aximClient.get('/interactions', {
      params: { ...queryOptions, organizationId: user.organization_id, userId: user.id }
    });
    return { asyncMode: true, data: response.data };
  }

  const { leadId, startDate, endDate, page = 1, limit = 50 } = queryOptions;

  const conditions: string[] = ["l.organization_id = $1"];
  const params: any[] = [user.organization_id];
  let paramIndex = 2;

  if (user.role === 'REP') {
    conditions.push(`i.user_id = ${paramIndex}`);
    params.push(user.id);
    paramIndex++;
  }

  if (leadId) {
    conditions.push(`i.lead_id = $${paramIndex}`);
    params.push(leadId);
    paramIndex++;
  }

  if (startDate && endDate) {
    conditions.push(
      `i.interaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
    );
    params.push(startDate, endDate);
    paramIndex += 2;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

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
       i.survey_data,

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
    surveyData: row.survey_data,
    lead: {
      firstName: row.first_name,
      lastName: row.last_name,
      streetAddress: row.street_address,
      city: row.city,
      state: row.state,
      zip: row.zip,
    },
  }));

  return {
    asyncMode: false,
    data: {
      interactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].count),
        pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
      },
    }
  };
};
