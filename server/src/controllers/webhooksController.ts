import { Request, Response } from 'express';
import logger, { clientExceptionStream } from '../utils/logger.js';
import { pool } from '../config/database.js';
import { batchGeocode } from '../services/geocoding.js';
import { broadcastToOrg } from '../utils/sse.js';

export const handleEmailItWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.EMAILIT_WEBHOOK_SECRET;
    const authHeader = req.headers['authorization'] || req.headers['x-emailit-signature'];

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}` && authHeader !== webhookSecret) {
      logger.warn('Unauthorized webhook attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    const eventType = payload.event;
    const emailAddress = payload.email || payload.recipient;
    const leadId = payload.lead_id;

    if (!eventType) {
      return res.status(400).json({ error: 'Missing event field' });
    }

    // Append a structured event log to logs/client-exceptions.log
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'webhook_telemetry',
      event: eventType,
      email: emailAddress,
      lead_id: leadId,
      payload
    });
    clientExceptionStream.write(logEntry + '\n');
    logger.info(`Webhook event tracked: ${eventType}`);

    // If an email bounces, update the lead's email status flag in Supabase to prevent future invalid dispatches.
    if (eventType === 'email.bounced' || eventType === 'bounced') {
       if (leadId) {
          // Add bounced status or similar to lead notes
          await pool.query(
            `UPDATE leads SET notes = CONCAT(notes, '\n[EMAIL BOUNCED]') WHERE id = $1`,
            [leadId]
          );
       } else if (emailAddress) {
          await pool.query(
            `UPDATE leads SET notes = CONCAT(notes, '\n[EMAIL BOUNCED]') FROM lead_pii WHERE leads.id = lead_pii.lead_id AND lead_pii.email = $1`,
            [emailAddress]
          );
       }
    }

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    logger.error('Webhook processing error', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleDeskeraIngestWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.DESKERA_WEBHOOK_SECRET;
    const authHeader = req.headers['authorization'] || req.headers['x-deskera-signature'];

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}` && authHeader !== webhookSecret) {
      logger.warn('Unauthorized Deskera webhook attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    // Expected structure: DeskeraContact (with organization_id or similar custom field to tie to org)
    // Validate that it has at least contact info
    if (!payload.contact || !payload.contact.address) {
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    const { contact } = payload;

    // Determine organization_id. Assume it's provided in custom_fields or payload root
    const organizationId = payload.organization_id || contact.custom_fields?.organization_id;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organization_id' });
    }

    const address = contact.address;
    const fullAddress = `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip_code || ''}`;

    // Geocode address
    const geocodeResults = await batchGeocode([fullAddress]);
    const geocode = geocodeResults[0];

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const leadResult = await client.query(
        `INSERT INTO leads (organization_id, status, location, notes)
         VALUES ($1, 'New',
         CASE WHEN $2::float IS NOT NULL AND $3::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($2, $3), 4326) ELSE NULL END,
         $4) RETURNING id`,
        [organizationId, geocode?.longitude || null, geocode?.latitude || null, contact.custom_fields?.field_notes || 'Imported from Deskera']
      );

      const leadId = leadResult.rows[0].id;

      await client.query(
        `INSERT INTO lead_pii (lead_id, first_name, last_name, street_address, city, state, zip, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          leadId,
          contact.first_name || null,
          contact.last_name || null,
          address.street || '',
          address.city || null,
          address.state || null,
          address.zip_code || null,
          contact.phone_number || null,
          contact.email || null
        ]
      );

      await client.query('COMMIT');

      // Broadcast SSE event
      broadcastToOrg(organizationId, 'TERRITORY_PINS_MUTATED', { leadId, action: 'CREATE' });

      res.status(200).json({ status: 'OK', leadId });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Deskera webhook processing error', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
