import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request | any, res: Response, next: NextFunction) => Promise<any>;

const catchAsync = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      return Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      return next(err);
    }
  };
};

export default catchAsync;
