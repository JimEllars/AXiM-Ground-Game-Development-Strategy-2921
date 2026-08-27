import { syncToNexusCRM } from "../services/nexusService.js";
import { getLeads as repoGetLeads } from "../repositories/LeadRepository.js";
import logger from '../utils/logger.js';
import { enrollInEmailItNurture } from '../services/emailitService.js';
import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import { leadSchema } from "../utils/validationSchemas.js";
import { geocodeAddress, batchGeocode } from "../services/geocoding.js";
import { syncLeadToCore, getLeadEnrichment } from "../services/aximService.js";
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
       WHERE l.id = $1 AND l.organization_id = $2`,
        [id, user.organization_id],
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
        logger.warn("Failed to sync updated lead to AXiM Core:", syncError);
        // We don't fail the request if sync fails, but we should log it
      }

      // Sync with Nexus CRM
      syncToNexusCRM({
        first_name: updatedLead.firstName || null,
        last_name: updatedLead.lastName || null,
        street_address: updatedLead.streetAddress,
        city: updatedLead.city || null,
        state: updatedLead.state || null,
        zip: updatedLead.zip || null,
        phone: updatedLead.phone || null,
        email: updatedLead.email || null,
        latitude: updatedLead.location ? updatedLead.location.coordinates[1] : null,
        longitude: updatedLead.location ? updatedLead.location.coordinates[0] : null,
        disposition: updatedLead.status,
        organization_id: user.organization_id,
      });

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

export const getLeadInsights = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const result = await pool.query(
    `SELECT pii.street_address, pii.city, pii.state, pii.zip
     FROM leads l
     JOIN lead_pii pii ON l.id = pii.lead_id
     WHERE l.id = $1 AND l.organization_id = $2`,
    [id, user.organization_id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const row = result.rows[0];
  const fullAddress = [row.street_address, row.city, row.state, row.zip].filter(Boolean).join(", ");

  const enrichmentData = await getLeadEnrichment(fullAddress);

  res.status(200).json({ insights: enrichmentData });
});

import { Parser } from 'json2csv';
import QueryStream from 'pg-query-stream';
import { stringify } from 'csv-stringify';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'stream';

export const exportLeads = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  const s3Client = new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: process.env.R2_ENDPOINT_URL || 'https://default.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dummy',
    },
  });

  const bucketName = process.env.R2_BUCKET_NAME || 'axim-exports';
  const fileName = `exports/${user.organization_id}/axim_export_${Date.now()}.csv`;

  const query = new QueryStream(`
    SELECT
      l.id,
      pii.first_name as "First Name",
      pii.last_name as "Last Name",
      pii.street_address as "Street Address",
      pii.city as "City",
      pii.state as "State",
      pii.zip as "Zip",
      pii.phone as "Phone",
      pii.email as "Email",
      l.status as "Status",
      l.notes as "Notes",
      ST_X(l.location) as "Longitude",
      ST_Y(l.location) as "Latitude",
      l.created_at as "Created At",
      l.updated_at as "Updated At",
      i.outcome as "Latest Outcome",
      i.notes as "Latest Interaction Notes",
      i.interaction_date as "Latest Interaction Date",
      i.survey_data as "Survey Data"
    FROM leads l
    LEFT JOIN lead_pii pii ON l.id = pii.lead_id
    LEFT JOIN LATERAL (
      SELECT outcome, notes, interaction_date, survey_data
      FROM interactions
      WHERE lead_id = l.id
      ORDER BY interaction_date DESC
      LIMIT 1
    ) i ON true
    WHERE l.organization_id = $1
    ORDER BY l.created_at DESC
  `, [user.organization_id]);

  const client = await pool.connect();

  try {
    const stream = client.query(query);
    const passThrough = new PassThrough();

    const stringifier = stringify({
      header: true,
      columns: [
        'id', 'First Name', 'Last Name', 'Street Address', 'City', 'State', 'Zip',
        'Phone', 'Email', 'Status', 'Notes', 'Longitude', 'Latitude',
        'Created At', 'Updated At', 'Latest Outcome', 'Latest Interaction Notes',
        'Latest Interaction Date', 'Survey Data'
      ],
      cast: {
        object: (value: any) => {
          if (value && typeof value === 'object') {
             try {
                return JSON.stringify(value);
             } catch (e) {
                return String(value);
             }
          }
          return value;
        }
      }
    });

    stream.pipe(stringifier).pipe(passThrough);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: fileName,
        Body: passThrough,
        ContentType: 'text/csv',
      },
    });

    await upload.done();
  } finally {
    client.release();
  }

  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });

  res.json({ url });
});

import { reverseGeocode } from "../services/geocoding.js";
import { broadcastToOrg } from "../utils/sse.js";

export const quickDropLead = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { latitude, longitude, status = 'NOT_HOME', notes = '' } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    // PostGIS deductive proxy check (~15 meters -> 0.00015 degrees)
    const existingLead = await pool.query(
      `SELECT id, status FROM leads
       WHERE organization_id = $1
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $3), 4326), 0.00015)
       LIMIT 1`,
      [user.organization_id, longitude, latitude]
    );

    let leadId;
    let isNew = false;
    let addressData = null;

    if (existingLead.rows.length > 0) {
      leadId = existingLead.rows[0].id;
      await pool.query(
        `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, leadId]
      );
    } else {
      isNew = true;
      addressData = await reverseGeocode(latitude, longitude);

      const insertResult = await pool.query(
        `INSERT INTO leads (organization_id, status, location)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
         RETURNING id`,
        [user.organization_id, status, longitude, latitude]
      );
      leadId = insertResult.rows[0].id;

      if (addressData) {
         await pool.query(
           `INSERT INTO lead_pii (lead_id, street_address, city, state, zip)
            VALUES ($1, $2, $3, $4, $5)`,
           [leadId, addressData.street || addressData.formatted_address, addressData.city, addressData.state, addressData.zip]
         );
      }
    }

    // Append interaction record
    await pool.query(
      `INSERT INTO interactions (lead_id, user_id, outcome, notes, organization_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [leadId, user.id, status, notes, user.organization_id]
    );

    // Sync if new
    if (isNew) {
       syncToNexusCRM(leadId, user.organization_id).catch(err => {
         logger.error('Background sync to Nexus CRM failed for quick drop:', err);
       });
       broadcastToOrg(user.organization_id, 'TERRITORY_PINS_MUTATED', { leadId, longitude, latitude, status, isNew });
    }

    res.status(200).json({ message: "Lead processed via quick drop", leadId, isNew, addressData });
  }
);
