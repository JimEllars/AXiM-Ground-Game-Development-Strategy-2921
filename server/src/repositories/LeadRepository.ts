import { pool } from '../config/database.js';
import aximClient from '../services/aximService.js';
import logger from '../utils/logger.js';

export const getLeads = async (
  queryOptions: { status?: any, search?: any, sort?: any, order?: any, page?: any, limit?: any },
  user: any
) => {
  const useCoreStorage = process.env.USE_AXIM_CORE_STORAGE === 'true';

  if (useCoreStorage) {
    const response = await aximClient.get('/leads', {
      params: { ...queryOptions, organizationId: user.organization_id }
    });
    return { asyncMode: true, data: response.data };
  }

  const { status, search, sort = "created_at", order = "desc", page = 1, limit = 50 } = queryOptions;

  const conditions: string[] = ["l.organization_id = $1"];
  const params: any[] = [user.organization_id];
  let paramIndex = 2;

  if (status) {
    conditions.push(`l.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (search) {
    conditions.push(
      `(pii.first_name ILIKE $${paramIndex} OR pii.last_name ILIKE $${paramIndex} OR pii.street_address ILIKE $${paramIndex})`,
    );
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const orderDirection = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Strict whitelist for sorting columns to prevent SQL injection
  const sortMap: Record<string, string> = {
    created_at: "l.created_at",
    status: "l.status",
    last_name: "pii.last_name",
    city: "pii.city",
  };
  const sortColumn = sortMap[sort as string] || "l.created_at";

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
       ORDER BY ${sortColumn} ${orderDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, Number(limit), offset],
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)
       FROM leads l
       JOIN lead_pii pii ON l.id = pii.lead_id
       ${whereClause}`,
    params,
  );

  const leads = result.rows.map((row) => ({
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
    location:
      row.longitude && row.latitude
        ? {
            type: "Point" as const,
            coordinates: [row.longitude, row.latitude],
          }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    asyncMode: false,
    data: {
      leads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].count),
        pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
      },
    }
  };
};
