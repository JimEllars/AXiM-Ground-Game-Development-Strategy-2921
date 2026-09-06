import { pool } from "../config/database.js";
import logger from "./logger.js";

export const checkIdempotency = async (key: string, organizationId: string) => {
  try {
    const result = await pool.query(
      `SELECT response_status, response_body FROM idempotency_keys WHERE key_value = $1 AND organization_id = $2 LIMIT 1`,
      [key, organizationId]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error: any) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
};

export const saveIdempotency = async (key: string, organizationId: string, status: number, body: any) => {
  try {
    await pool.query(
      `INSERT INTO idempotency_keys (key_value, organization_id, response_status, response_body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key_value) DO NOTHING`,
      [key, organizationId, status, body]
    );
  } catch (error: any) {
    if (error.code === '42P01') {
      logger.warn('idempotency_keys table not found, skipping idempotency save');
      return;
    }
    logger.error('Failed to save idempotency key:', error);
  }
};
