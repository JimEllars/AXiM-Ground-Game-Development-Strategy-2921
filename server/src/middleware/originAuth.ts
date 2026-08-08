import { timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger.js";

const matchesOriginToken = (provided: string, expected: string): boolean => {
  const providedToken = Buffer.from(provided);
  const expectedToken = Buffer.from(expected);

  return (
    providedToken.length === expectedToken.length &&
    timingSafeEqual(providedToken, expectedToken)
  );
};

export const requireOriginToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const expectedToken = process.env.ORIGIN_AUTH_TOKEN;

  if (!expectedToken) {
    if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }

    logger.error("ORIGIN_AUTH_TOKEN is required in production.");
    res.status(503).json({ error: "API origin authentication is unavailable" });
    return;
  }

  const providedToken = req.get("x-axim-origin-token");
  if (!providedToken || !matchesOriginToken(providedToken, expectedToken)) {
    logger.warn("Request rejected by API origin authentication.", {
      path: req.originalUrl,
      ip: req.ip,
    });
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
};
