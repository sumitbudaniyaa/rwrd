import type { ValidationIssue } from '@tiptable/shared';

export interface AppErrorOptions {
  message: string;
  statusCode: number;
  code: string;
  type?: string | undefined;
  invalidParams?: ValidationIssue[] | undefined;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly type: string;
  public readonly invalidParams?: ValidationIssue[] | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.type =
      options.type ?? `https://tiptable.in/errors/${options.code.toLowerCase().replace(/_/g, '-')}`;
    this.invalidParams = options.invalidParams;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super({ statusCode: 404, message, code });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super({ statusCode: 401, message, code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super({ statusCode: 403, message, code });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super({ statusCode: 409, message, code });
  }
}

export class PaymentRequiredError extends AppError {
  constructor(
    message = 'Active subscription required. Please complete plan payment to unlock the console.',
    code = 'PAYMENT_REQUIRED',
  ) {
    super({ statusCode: 402, message, code });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', invalidParams?: ValidationIssue[]) {
    super({
      statusCode: 422,
      message,
      code: 'VALIDATION_FAILED',
      invalidParams,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please retry later.') {
    super({ statusCode: 429, message, code: 'RATE_LIMITED' });
  }
}
