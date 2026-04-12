import 'dotenv/config';
import app from './app.js';
import { pool } from './config/database.js';
import './workers/leadImportWorker.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 AXiM Ground Game API server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

let isShuttingDown = false;

// Graceful shutdown
process.on('SIGTERM', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    if (pool.totalCount > 0) {
      pool.end();
    }
  });
});

process.on('SIGINT', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    if (pool.totalCount > 0) {
      pool.end();
    }
  });
});
