import { Request, Response } from 'express';
import logger, { clientExceptionStream } from '../utils/logger.js';
import { pool } from '../config/database.js';

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
