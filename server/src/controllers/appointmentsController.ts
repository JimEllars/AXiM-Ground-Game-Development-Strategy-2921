import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import catchAsync from "../utils/catchAsync.js";

export const getAppointments = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { startDate, endDate, status } = req.query;

    const conditions: string[] = ["a.organization_id = $1"];
    const params: any[] = [user.organization_id];
    let paramIndex = 2;

    if (startDate && endDate) {
      conditions.push(
        `a.scheduled_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await pool.query(
      `SELECT
         a.id,
         a.lead_id,
         a.user_id,
         a.scheduled_at,
         a.status,
         a.notes,

         -- Lead information
         lp.first_name as lead_first_name,
         lp.last_name as lead_last_name,
         lp.street_address as lead_street_address,
         lp.city as lead_city,
         lp.state as lead_state,
         lp.zip as lead_zip,
         lp.phone as lead_phone,

         -- User information
         u.first_name as user_first_name,
         u.last_name as user_last_name

       FROM appointments a
       JOIN leads l ON a.lead_id = l.id
       LEFT JOIN lead_pii lp ON l.id = lp.lead_id
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.scheduled_at ASC`,
      params,
    );

    const appointments = result.rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      userId: row.user_id,
      scheduledAt: row.scheduled_at,
      status: row.status,
      notes: row.notes,
      lead: {
        firstName: row.lead_first_name,
        lastName: row.lead_last_name,
        streetAddress: row.lead_street_address,
        city: row.lead_city,
        state: row.lead_state,
        zip: row.lead_zip,
        phone: row.lead_phone,
      },
      user: {
        firstName: row.user_first_name,
        lastName: row.user_last_name,
      },
    }));

    res.json({
      appointments,
    });
  }
);

export const createAppointment = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { leadId, userId, scheduledAt, notes } = req.body;

    if (!leadId || !userId || !scheduledAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify lead belongs to org
      const leadCheck = await client.query(
        "SELECT id FROM leads WHERE id = $1 AND organization_id = $2",
        [leadId, user.organization_id]
      );

      if (leadCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Lead not found" });
      }

      // Verify assigned user belongs to org
      const userCheck = await client.query(
        "SELECT id FROM users WHERE id = $1 AND organization_id = $2",
        [userId, user.organization_id]
      );

      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const result = await client.query(
        `INSERT INTO appointments (organization_id, lead_id, user_id, scheduled_at, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'Scheduled')
         RETURNING *`,
        [user.organization_id, leadId, userId, scheduledAt, notes]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Appointment scheduled successfully",
        appointment: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
);

export const updateAppointment = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { id } = req.params;
    const { scheduledAt, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE appointments
       SET scheduled_at = COALESCE($1, scheduled_at),
           status = COALESCE($2, status),
           notes = COALESCE($3, notes)
       WHERE id = $4 AND organization_id = $5
       RETURNING *`,
      [scheduledAt, status, notes, id, user.organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({
      message: "Appointment updated successfully",
      appointment: result.rows[0],
    });
  }
);

export const deleteAppointment = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM appointments WHERE id = $1 AND organization_id = $2 RETURNING id",
      [id, user.organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({ message: "Appointment deleted successfully" });
  }
);
