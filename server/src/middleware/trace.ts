import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loggerStorage } from '../utils/logger.js';
import logger from '../utils/logger.js';

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  const startTime = Date.now();
  const payloadSize = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

  loggerStorage.run(traceId, () => {
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`API Trace: ${req.method} ${req.originalUrl}`, {
        traceId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        payloadSize,
        type: 'api_trace'
      });
    });
    next();
  });
};
