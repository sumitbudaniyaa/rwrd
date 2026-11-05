import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { ForbiddenError } from '../errors/appError.js';
import { env } from '../config/env.js';

export const CSRF_COOKIE_NAME = 'tiptable_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Ensures a double-submit CSRF token cookie is present for browser clients.
 */
export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Client JavaScript reads this to attach x-csrf-token header
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
  next();
}

/**
 * Validates CSRF protection for state-changing requests (POST, PUT, PATCH, DELETE)
 * when browser cookies are involved.
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const hasAuthCookies = req.cookies?.['tiptable_admin_rf'] || req.cookies?.['tiptable_portal_rf'];

  // Pure non-cookie requests (e.g. Bearer token curl, server-to-server) without cookies are not subject to CSRF
  if (!hasAuthCookies && !cookieToken) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers['x-requested-with'];

  if (!headerToken) {
    throw new ForbiddenError('CSRF validation failed: missing anti-forgery token or header');
  }

  if (cookieToken && headerToken !== cookieToken && headerToken !== 'XMLHttpRequest') {
    throw new ForbiddenError('CSRF validation failed: token mismatch');
  }

  next();
}
