import { Request, Response, NextFunction } from 'express';
import { checkIdempotency, saveIdempotency } from '../utils/idempotency.js';
import logger from '../utils/logger.js';

export const idempotencyMiddleware = async (req: any, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  if (!idempotencyKey) {
    return next();
  }

  try {
    const user = req.user;
    const orgId = user?.organization_id;

    if (!orgId) {
      return next();
    }

    const existingResponse = await checkIdempotency(idempotencyKey, orgId);

    if (existingResponse) {
      logger.info(`Idempotency hit for key ${idempotencyKey}`);
      return res.status(existingResponse.response_status).json(existingResponse.response_body);
    }

    // Intercept response to save it
    const originalSend = res.json;
    res.json = function (body: any) {
      saveIdempotency(idempotencyKey, orgId, res.statusCode, body).catch(err => {
         logger.error('Failed to save idempotency asynchronously:', err);
      });
      return originalSend.call(this, body);
    };

    next();
  } catch (error) {
    logger.error('Idempotency middleware error:', error);
    next(error);
  }
};
