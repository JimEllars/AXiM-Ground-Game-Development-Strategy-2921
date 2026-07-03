import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const requireCloudflareIP = (req: Request, res: Response, next: NextFunction) => {
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  if (!cfConnectingIp) {
    logger.warn('[cloudflare] Request rejected: Missing CF-Connecting-IP header', {
      ip: req.ip,
      path: req.originalUrl,
      headers: req.headers
    });
    return res.status(403).json({ error: 'Forbidden: Direct access not allowed' });
  }

  next();
};
