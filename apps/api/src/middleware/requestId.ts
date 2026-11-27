import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      log: typeof logger;
    }
  }
}

const VALID_REQUEST_ID_REGEX = /^[A-Za-z0-9_.:-]{1,64}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  const trimmedId = typeof existingId === 'string' ? existingId.trim() : '';
  const requestId =
    trimmedId && VALID_REQUEST_ID_REGEX.test(trimmedId)
      ? trimmedId
      : `req_${randomUUID().replace(/-/g, '')}`;

  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  req.log = logger.child({ requestId });

  next();
}
