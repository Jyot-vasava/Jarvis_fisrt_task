import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../exceptions/httpException';
import { logger } from '../Utils/logger';

export const ErrorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    logger.error(
      `[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${message}`
    );

    res.status(statusCode).json({
      status: false,
      statusCode,
      message,
    });
  } catch (err) {
    next(err);
  }
};