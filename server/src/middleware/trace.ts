import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loggerStorage } from '../utils/logger.js';

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  loggerStorage.run(traceId, () => {
    next();
  });
};
