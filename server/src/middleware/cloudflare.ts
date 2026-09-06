import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { timingSafeEqual } from "node:crypto";

const matchesOriginToken = (provided: string, expected: string): boolean => {
  const providedToken = Buffer.from(provided);
  const expectedToken = Buffer.from(expected);

  return (
    providedToken.length === expectedToken.length &&
    timingSafeEqual(providedToken, expectedToken)
  );
};

export const requireCloudflareIP = (req: Request, res: Response, next: NextFunction) => {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const expectedToken = process.env.ORIGIN_AUTH_TOKEN;
  const providedToken = req.get("x-axim-origin-token");

  // Allow internal service key overrides
  const providedInternalKey = req.get("x-axim-internal-api-key");
  const internalKey = process.env.AXIM_INTERNAL_API_KEY;
  if (internalKey && providedInternalKey === internalKey) {
     return next();
  }

  if (expectedToken && providedToken && matchesOriginToken(providedToken, expectedToken)) {
      return next();
  }

  if (!cfConnectingIp) {
    logger.warn('[cloudflare] Request rejected: Missing CF-Connecting-IP header', {
      ip: req.ip,
      path: req.originalUrl,
      headers: req.headers
    });
    return res.status(403).json({ error: 'Forbidden: Direct access not allowed' });
  }

  // Verify headers passed from edge
  const cfRay = req.headers['cf-ray'];
  if (!cfRay) {
    logger.warn('[cloudflare] Request rejected: Missing CF-Ray header', {
      ip: req.ip,
      path: req.originalUrl
    });
    return res.status(403).json({ error: 'Forbidden: Direct access not allowed' });
  }

  next();
};
