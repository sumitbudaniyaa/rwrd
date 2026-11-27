import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authService, type AuthRealm } from '../services/authService.js';
import { impersonationSessionService } from '../services/impersonationSessionService.js';
import { UnauthorizedError, ForbiddenError, PaymentRequiredError } from '../errors/appError.js';

export type AdminRole = 'admin';
export type PortalRole = 'super_admin' | 'support' | 'finance';
export type AppRole = AdminRole | PortalRole;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthUser {
  id: string;
  role: string;
  realm: AuthRealm;
  restaurantId?: string | undefined;
  hasActivePlan?: boolean | undefined;
  isImpersonated?: boolean | undefined;
  impersonationRequestId?: string | undefined;
  impersonatorId?: string | undefined;
  impersonatorEmail?: string | undefined;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Validates JWT Bearer access token for specified realm ('admin' or 'portal').
 * Attaches validated user claims to `req.user` and verifies live revocation for impersonated sessions.
 */
export function requireAuth(realm: AuthRealm): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication token is missing or malformed');
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        throw new UnauthorizedError('Authentication token is missing');
      }

      const payload = authService.verifyAccessToken(token, realm);

      if (payload.isImpersonated) {
        if (!payload.impersonationRequestId || !UUID_REGEX.test(payload.impersonationRequestId)) {
          throw new UnauthorizedError('Invalid impersonation session token');
        }
        const isActive = await impersonationSessionService.verifyActive(
          payload.impersonationRequestId,
        );
        if (!isActive) {
          throw new UnauthorizedError('Support impersonation session has been revoked or expired');
        }
      }

      req.user = {
        id: payload.sub,
        role: payload.role,
        realm: payload.realm,
        restaurantId: payload.restaurantId,
        hasActivePlan: payload.hasActivePlan,
        isImpersonated: payload.isImpersonated,
        impersonationRequestId: payload.impersonationRequestId,
        impersonatorId: payload.impersonatorId,
        impersonatorEmail: payload.impersonatorEmail,
      };
      next();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        next(err);
        return;
      }
      next(new UnauthorizedError('Invalid or expired authentication credentials'));
    }
  };
}

/**
 * Requires the authenticated user to possess one of the allowed roles.
 * Must be preceded by `requireAuth()`.
 */
export function requireRole(allowedRoles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Role '${req.user.role}' is not authorized to access this resource. Allowed: ${allowedRoles.join(', ')}`,
      );
    }

    next();
  };
}

/**
 * Validates that the authenticated user belongs to the requested restaurant tenant.
 * - For admin realm users: parameter restaurantId (from params or query) must match req.user.restaurantId.
 * - Portal users with 'super_admin' or 'support' can access any tenant.
 * - Invariant: Prevents cross-tenant access and stores tenant ID in res.locals.restaurantId.
 */
export function requireTenant(paramKey = 'restaurantId'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Portal super_admin / support can inspect any tenant
    if (req.user.realm === 'portal') {
      if (req.user.role === 'super_admin' || req.user.role === 'support') {
        const targetTenantId = (req.params[paramKey] ||
          req.headers['x-restaurant-id'] ||
          '') as string;
        if (targetTenantId) {
          res.locals.restaurantId = targetTenantId;
        }
        return next();
      }
      throw new ForbiddenError('Portal role not authorized for restaurant tenant data');
    }

    // Admin realm users MUST have a restaurantId
    if (!req.user.restaurantId) {
      throw new ForbiddenError('User is not associated with an active restaurant tenant');
    }

    const targetTenantId = (req.params[paramKey] ||
      req.headers['x-restaurant-id'] ||
      req.user.restaurantId) as string;

    if (targetTenantId && targetTenantId !== req.user.restaurantId) {
      throw new ForbiddenError('Cross-tenant data access is strictly prohibited');
    }

    res.locals.restaurantId = req.user.restaurantId;
    next();
  };
}

/**
 * Requires the restaurant to have an active paid subscription.
 * Unpaid or expired accounts are rejected with 402 Payment Required.
 */
export function requireActiveSubscription(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.realm !== 'admin') {
      return next();
    }
    if (req.user.isImpersonated) {
      return next();
    }
    if (req.user.hasActivePlan === false) {
      throw new PaymentRequiredError();
    }
    next();
  };
}
