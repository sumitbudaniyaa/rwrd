import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ProblemDetails } from '@tiptable/shared';
import { AppError } from '../errors/appError.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = String(req.id || 'unknown_req');
  let statusCode = 500;
  let title = 'Internal Server Error';
  let detail = 'An unexpected internal error occurred.';
  let code = 'INTERNAL_SERVER_ERROR';
  let type = 'https://tiptable.in/errors/internal-server-error';
  let invalidParams: { name: string; reason: string }[] | undefined;

  if (err instanceof ZodError) {
    statusCode = 422;
    title = 'Unprocessable Entity';
    detail = 'The request payload failed validation constraints.';
    code = 'VALIDATION_FAILED';
    type = 'https://tiptable.in/errors/validation-failed';
    invalidParams = err.issues.map((issue) => ({
      name: issue.path.join('.'),
      reason: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    title = getTitleForStatus(statusCode);
    detail = err.message;
    code = err.code;
    type = err.type;
    invalidParams = err.invalidParams;
  } else if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    statusCode = 400;
    title = 'Bad Request';
    detail = 'Malformed JSON payload received in request body.';
    code = 'MALFORMED_JSON';
    type = 'https://tiptable.in/errors/malformed-json';
  } else {
    // Log unexpected errors
    req.log
      ? req.log.error({ err }, 'Unhandled exception in request')
      : // eslint-disable-next-line no-console
        console.error('Unhandled error:', err);

    if (env.NODE_ENV !== 'production' && err instanceof Error) {
      detail = err.message;
    }
  }

  const problem: ProblemDetails = {
    type,
    title,
    status: statusCode,
    detail,
    instance: req.originalUrl,
    code,
    requestId,
  };

  if (invalidParams && invalidParams.length > 0) {
    problem.invalidParams = invalidParams;
  }

  res.status(statusCode).contentType('application/problem+json').json(problem);
}

function getTitleForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}
