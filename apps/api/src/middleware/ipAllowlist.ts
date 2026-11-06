import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ForbiddenError } from '../errors/appError.js';

export function normalizeIp(ip: string | undefined): string {
  if (!ip) return '';
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }
  if (trimmed === '::1') {
    return '127.0.0.1';
  }
  return trimmed;
}

/**
 * Middleware that restricts access to requests originating from configured IP addresses.
 * Controlled by `PORTAL_ALLOWED_IPS` in the validated environment.
 */
export function portalIpAllowlist(allowedIpsOverride?: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allowedIps = allowedIpsOverride ?? env.PORTAL_ALLOWED_IPS;

    // If no allowlist is configured, permit request
    if (!allowedIps || allowedIps.length === 0 || allowedIps.includes('*')) {
      return next();
    }

    const clientIp = normalizeIp(req.ip);
    const normalizedAllowed = allowedIps.map(normalizeIp);

    if (!normalizedAllowed.includes(clientIp)) {
      throw new ForbiddenError(
        `Access denied: IP address ${clientIp || 'unknown'} is not authorized for Company Portal access.`,
      );
    }

    next();
  };
}
