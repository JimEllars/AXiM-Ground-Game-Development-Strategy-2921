import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../utils/logger.js';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'client-exceptions.log');
const AXIM_CORE_API_URL = process.env.AXIM_CORE_API_URL || 'http://localhost:4000/api';
const INGEST_URL = `${AXIM_CORE_API_URL}/telemetry/ingest`;

let isProcessing = false;

export const processTelemetry = async () => {
  if (isProcessing) return;

  if (!fs.existsSync(logFile)) {
    return;
  }

  try {
    isProcessing = true;
    const stats = fs.statSync(logFile);
    if (stats.size === 0) {
      isProcessing = false;
      return;
    }

    // Rename file to process it safely without missing new logs
    const processingFile = path.join(logDir, `client-exceptions-${Date.now()}.processing.log`);
    fs.renameSync(logFile, processingFile);

    const fileContent = fs.readFileSync(processingFile, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      fs.unlinkSync(processingFile);
      isProcessing = false;
      return;
    }

    const payload = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { error: 'Parse Error', raw: line };
      }
    });

    const compressedPayload = await gzip(JSON.stringify({ logs: payload }));

    // Dispatch telemetry egress
    try {
      const response = await axios.post(INGEST_URL, compressedPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'Authorization': `Bearer ${process.env.AXIM_CORE_API_KEY || 'dev-key'}`
        },
        timeout: 10000
      });

      if (response.status === 202 || response.status === 200) {
        logger.info(`Successfully dispatched ${payload.length} telemetry logs.`);
        fs.unlinkSync(processingFile);
      } else {
        // Handle backpressure or unexpected status (like busy code)
        logger.warn(`Central telemetry API returned status ${response.status}. Re-queuing logs.`);
        fs.appendFileSync(logFile, fileContent);
        fs.unlinkSync(processingFile);
      }
    } catch (apiError: any) {
      const isBusy = apiError.response && (apiError.response.status === 429 || apiError.response.status === 503);
      logger.warn(`Failed to dispatch telemetry logs. ${isBusy ? 'API Busy (Backpressure).' : 'Network Error.'} Re-queuing logs.`);
      // Return logs to main file to try again later
      fs.appendFileSync(logFile, fileContent);
      fs.unlinkSync(processingFile);
    }
  } catch (err) {
    logger.error('Error processing telemetry logs:', err);
  } finally {
    isProcessing = false;
  }
};

// Run every 15 minutes (900,000 ms)
const TELEMETRY_INTERVAL = 15 * 60 * 1000;
setInterval(processTelemetry, TELEMETRY_INTERVAL);

logger.info('Telemetry worker initialized. Scheduling egress every 15 minutes.');
