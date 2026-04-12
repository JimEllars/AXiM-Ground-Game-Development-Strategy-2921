import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import { leadSchema } from "../utils/validationSchemas.js";
import { geocodeAddress, batchGeocode } from "../services/geocoding.js";
import { syncLeadToCore } from "../services/aximService.js";
import Papa from "papaparse";
import multer from "multer";
import catchAsync from '../utils/catchAsync.js';
import { leadImportQueue } from '../config/queue.js';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const uploadMiddleware = upload.single("file");

interface ProcessedLead {
  first_name: string | null;
  last_name: string | null;
  street_address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  longitude: number | null;
  latitude: number | null;
}

export const bulkImportLeads = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const csvText = file.buffer.toString("utf-8");

    // Add job to the queue
    const job = await leadImportQueue.add('import-leads', {
      csvText,
      organizationId: user.organization_id,
    });

    res.status(202).json({
      message: "Lead import started successfully. Processing in background.",
      jobId: job.id,
    });
  },
);

export const getImportJobStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ error: "Job ID is required" });
  }

  const job = await leadImportQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const state = await job.getState();
  const progress = job.progress;
  const result = job.returnvalue;
  const failedReason = job.failedReason;

  res.status(200).json({
    id: job.id,
    state,
    progress,
    result,
    failedReason,
  });
});

export const deleteLeads = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Lead IDs must be a non-empty array" });
    }

    const result = await pool.query(
      "DELETE FROM leads WHERE id = ANY($1::uuid[]) AND organization_id = $2",
      [ids, user.organization_id],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "No matching leads found to delete" });
    }

    res
      .status(200)
      .json({ message: `${result.rowCount} leads deleted successfully` });
  },
);

export const updateLead = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;
      const { id } = req.params;
      const {
        status,
        notes,
        firstName,
        lastName,
        phone,
        email,
        streetAddress,
        city,
        state,
        zip,
      } = req.body;

      await client.query("BEGIN");

      // 1. Check if lead exists and belongs to the user's organization
      const leadCheck = await client.query(
        "SELECT l.id FROM leads l WHERE l.id = $1 AND l.organization_id = $2",
        [id, user.organization_id],
      );

      if (leadCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Lead not found" });
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
            `UPDATE leads SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
            updateValues,
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
        zip,
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
          `UPDATE lead_pii SET ${piiFields.join(", ")} WHERE lead_id = $${piiParamIndex}`,
          piiValues,
        );
      }

      await client.query("COMMIT");

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
        [id],
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
        location:
          row.longitude && row.latitude
            ? {
                type: "Point" as const,
                coordinates: [row.longitude, row.latitude] as [number, number],
              }
            : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // 5. Sync with AXiM Core
      try {
        await syncLeadToCore(updatedLead);
      } catch (syncError) {
        console.warn("Failed to sync updated lead to AXiM Core:", syncError);
        // We don't fail the request if sync fails, but we should log it
      }

      res
        .status(200)
        .json({ message: "Lead updated successfully", lead: updatedLead });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

export const getLeads = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const {
    page = 1,
    limit = 100,
    status,
    search,
    sort = "created_at",
    order = "desc",
  } = req.query;

  const allowedSortColumns = ["created_at", "last_name", "status"];
  if (!allowedSortColumns.includes(sort as string)) {
    return res.status(400).json({ error: "Invalid sort column" });
  }

  const orderDirection =
    (order as string).toLowerCase() === "asc" ? "ASC" : "DESC";

  // Structured Query Building to prevent SQL injection and improve maintainability
  const conditions: string[] = ["l.organization_id = $1"];
  const params: any[] = [user.organization_id];
  let paramIndex = 2;

  if (status) {
    conditions.push(`l.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (search) {
    conditions.push(`(
        pii.first_name ILIKE $${paramIndex} OR
        pii.last_name ILIKE $${paramIndex} OR
        pii.street_address ILIKE $${paramIndex}
      )`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Whitelist mapping for sort columns to avoid direct interpolation of possibly unsafe strings
  const sortMap: Record<string, string> = {
    created_at: "l.created_at",
    last_name: "pii.last_name",
    status: "l.status",
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

  res.status(200).json({
    leads,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count),
      pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
    },
  });
});
