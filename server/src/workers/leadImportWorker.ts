import { Worker, Job } from 'bullmq';
import { connection } from '../config/queue.js';
import Papa from 'papaparse';
import { leadSchema } from '../utils/validationSchemas.js';
import { batchGeocode } from '../services/geocoding.js';
import { pool } from '../config/database.js';

interface LeadImportJobData {
  csvText: string;
  organizationId: string;
}

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

export const leadImportWorker = new Worker<LeadImportJobData>(
  'lead-import-queue',
  async (job: Job) => {
    const { csvText, organizationId } = job.data;

    // 1. Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parseResult.errors.map((err) => `Error on row ${err.row}: ${err.message}`).join(', ')}`);
    }

    const rows = parseResult.data as any[];
    if (rows.length === 0) {
      throw new Error('CSV file is empty');
    }

    // 2. Validate Rows
    const validationErrors: any[] = [];
    const validatedRows = rows
      .map((row, index) => {
        const result = leadSchema.safeParse(row);
        if (!result.success) {
          validationErrors.push({
            row: index + 2,
            errors: result.error.flatten(),
          });
          return null;
        }
        return result.data;
      })
      .filter(Boolean);

    if (validationErrors.length > 0) {
      throw new Error(`CSV validation failed: ${JSON.stringify(validationErrors)}`);
    }

    // 3. Geocode Addresses
    const addresses = validatedRows.map((row) => {
      if (!row) return '';
      const parts = [row.street_address, row.city, row.state, row.zip].filter(Boolean);
      return parts.join(', ');
    });

    const geocodeResults = await batchGeocode(addresses);

    // 4. Prepare Leads for DB
    const leadsToProcess: ProcessedLead[] = validatedRows.map((row, index) => {
      const geocode = geocodeResults[index];
      return {
        first_name: row!.first_name || null,
        last_name: row!.last_name || null,
        street_address: row!.street_address,
        city: row!.city || null,
        state: row!.state || null,
        zip: row!.zip || null,
        phone: row!.phone || null,
        email: row!.email || null,
        status: row!.status || 'New',
        notes: row!.notes || null,
        longitude: geocode?.longitude || null,
        latitude: geocode?.latitude || null,
      };
    });

    // 5. Database Transaction with Temp Table
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TEMP TABLE temp_leads_staging (
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          street_address TEXT NOT NULL,
          city VARCHAR(100),
          state VARCHAR(50),
          zip VARCHAR(20),
          phone VARCHAR(20),
          email VARCHAR(255),
          status VARCHAR(50),
          notes TEXT,
          longitude DOUBLE PRECISION,
          latitude DOUBLE PRECISION
        ) ON COMMIT DROP;
      `);

      // Use unnest for efficient bulk insertion into the temporary table
      if (leadsToProcess.length > 0) {
        const columns: (keyof ProcessedLead)[] = [
          'first_name',
          'last_name',
          'street_address',
          'city',
          'state',
          'zip',
          'phone',
          'email',
          'status',
          'notes',
          'longitude',
          'latitude',
        ];
        const params = columns.map((col) => leadsToProcess.map((lead) => lead[col]));
        const types = [
          'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'float8[]', 'float8[]',
        ];

        const tempInsertQuery = `
          INSERT INTO temp_leads_staging (${columns.join(', ')})
          SELECT * FROM unnest(${types.map((type, i) => `$${i + 1}::${type}`).join(', ')})
        `;
        await client.query(tempInsertQuery, params);
      }

      // Identify leads that are not duplicates for the current organization
      const nonDuplicateLeadsQuery = `
        SELECT t.* FROM temp_leads_staging t
        WHERE NOT EXISTS (
          SELECT 1 FROM leads l
          JOIN lead_pii pii ON l.id = pii.lead_id
          WHERE l.organization_id = $1 AND pii.street_address = t.street_address
        );
      `;
      const newLeadsResult = await client.query(nonDuplicateLeadsQuery, [organizationId]);
      const newLeadsData = newLeadsResult.rows as ProcessedLead[];

      let leadInsertResult: { rows: any[]; rowCount: number | null } = { rows: [], rowCount: 0 };

      if (newLeadsData.length > 0) {
        // Insert into the main 'leads' table
        const leadValues = newLeadsData.flatMap((lead) => [
          organizationId,
          lead.status,
          lead.notes,
          lead.longitude,
          lead.latitude,
        ]);

        const leadPlaceholders = newLeadsData
          .map((_, i) => {
            const base = i * 5;
            const location = `CASE WHEN $${base + 4}::float8 IS NOT NULL AND $${base + 5}::float8 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($${base + 4}::float8, $${base + 5}::float8), 4326) ELSE NULL END`;
            return `($${base + 1}::uuid, $${base + 2}::text, $${base + 3}::text, ${location})`;
          })
          .join(', ');

        const insertLeadsQuery = `
          INSERT INTO leads (organization_id, status, notes, location)
          VALUES ${leadPlaceholders}
          RETURNING id, location;
        `;
        leadInsertResult = await client.query(insertLeadsQuery, leadValues);

        // Prepare data for the PII table insertion using unnest
        const piiColumns = [
          'lead_id', 'first_name', 'last_name', 'street_address', 'city', 'state', 'zip', 'phone', 'email',
        ];
        const piiParams = [
          leadInsertResult.rows.map((row) => row.id),
          ...piiColumns.slice(1).map((col) => newLeadsData.map((lead) => lead[col as keyof ProcessedLead])),
        ];
        const piiTypes = [
          'uuid[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]', 'text[]',
        ];

        const piiInsertQuery = `
          INSERT INTO lead_pii (${piiColumns.join(', ')})
          SELECT * FROM unnest(${piiTypes.map((type, i) => `$${i + 1}::${type}`).join(', ')})
        `;
        await client.query(piiInsertQuery, piiParams);
      }

      await client.query('COMMIT');

      const successCount = leadInsertResult.rowCount || 0;
      const geocodedCount = leadInsertResult.rows.filter((row) => row.location).length;
      const duplicates = leadsToProcess.length - successCount;

      return {
        message: 'Leads uploaded successfully',
        totalLeads: successCount,
        geocodedLeads: geocodedCount,
        geocodingRate: successCount > 0 ? `${Math.round((geocodedCount / successCount) * 100)}%` : 'N/A',
        duplicates: duplicates,
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  { connection }
);

leadImportWorker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} completed with result:`, returnvalue);
});

leadImportWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed with error:`, error.message);
});
