import { Request, Response, NextFunction } from 'express';

export const setEdgeCache = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  next();
};

export const bypassEdgeCache = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
};
