import { Worker, Job } from 'bullmq';
import { connection } from '../config/queue.js';
import logger from '../utils/logger.js';
import { pool } from '../config/database.js';

interface TelemetryJobData {
  events: any[]; // bulk array of events
}

export const telemetryWorkerProcessor = new Worker<TelemetryJobData>(
  'telemetry-queue',
  async (job: Job) => {
    const { events } = job.data;
    if (!events || events.length === 0) return;

    // Buffer writes to postgres using bulk insert queries
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const queryText = `
        INSERT INTO telemetry_events (device_id, operator_id, battery, latency, cf_ray, cf_ipcountry, cf_connecting_ip, incident_status, timestamp, path, duration_ms)
        SELECT * FROM unnest(
          $1::text[], $2::text[], $3::numeric[], $4::numeric[], $5::text[], $6::text[], $7::text[], $8::text[], $9::timestamp[], $10::text[], $11::numeric[]
        )
      `;

      const device_ids = events.map((e: any) => e.device_id || null);
      const operator_ids = events.map((e: any) => e.operator_id || null);
      const batteries = events.map((e: any) => e.battery != null ? e.battery : null);
      const latencies = events.map((e: any) => e.latency != null ? e.latency : null);
      const cf_rays = events.map((e: any) => e.cfRay || e.cf_ray || null);
      const cf_ipcountries = events.map((e: any) => e.cf_ipcountry || null);
      const cf_connecting_ips = events.map((e: any) => e.clientIp || e.cf_connecting_ip || null);
      const incident_statuses = events.map((e: any) => e.incident_status || null);
      const timestamps = events.map((e: any) => e.timestamp ? new Date(e.timestamp) : new Date());
      const paths = events.map((e: any) => e.path || null);
      const duration_ms = events.map((e: any) => e.durationMs != null ? e.durationMs : null);

      await client.query(queryText, [
        device_ids, operator_ids, batteries, latencies, cf_rays, cf_ipcountries, cf_connecting_ips, incident_statuses, timestamps, paths, duration_ms
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  { connection }
);

telemetryWorkerProcessor.on('completed', (job, returnvalue) => {
  logger.info(`Telemetry Worker Job ${job.id} completed.`);
});

telemetryWorkerProcessor.on('failed', (job, error) => {
  logger.error(`Telemetry Worker Job ${job?.id} failed:`, error.message);
});
