import logger from '../utils/logger.js';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const leadImportQueue = new Queue('lead-import-queue', { connection });

// Initialize connection
connection.on('error', (error: Error) => {
  logger.error('Redis connection error:', error);
});

export { connection };
