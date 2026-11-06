import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/rbac.js';
import { db } from '../db/index.js';
import { restaurantUsers, restaurants } from '../db/schema/index.js';
import { UnauthorizedError } from '../errors/appError.js';

export const authAdminRouter = Router();

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const MfaChallengeSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().min(1),
  isRecoveryCode: z.boolean().optional().default(false),
});

/**
 * POST /api/v1/admin/auth/login
 */
authAdminRouter.post(
  '/admin/auth/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const result = await authService.loginAdmin(email, password, metadata);

      if (result.mfaRequired) {
        res.status(200).json({
          mfaRequired: true,
          tempToken: result.tempToken,
          user: result.user,
        });
        return;
      }

      // Set rotating refresh token in httpOnly, secure, SameSite=Strict cookie
      res.cookie(
        'tiptable_admin_rf',
        result.tokens!.refreshToken,
        authService.getCookieOptions('admin'),
      );

      res.status(200).json({
        mfaRequired: false,
        accessToken: result.tokens!.accessToken,
        expiresInSeconds: result.tokens!.expiresInSeconds,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/auth/mfa/challenge
 */
authAdminRouter.post(
  '/admin/auth/mfa/challenge',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tempToken, code, isRecoveryCode } = MfaChallengeSchema.parse(req.body);
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const { tokens, user } = await authService.verifyAdminMfa(
        tempToken,
        code,
        isRecoveryCode,
        metadata,
      );

      res.cookie('tiptable_admin_rf', tokens.refreshToken, authService.getCookieOptions('admin'));

      res.status(200).json({
        accessToken: tokens.accessToken,
        expiresInSeconds: tokens.expiresInSeconds,
        user,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/auth/refresh
 */
authAdminRouter.post(
  '/admin/auth/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawRefreshToken = req.cookies?.tiptable_admin_rf;
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Missing refresh token cookie');
      }

      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const tokens = await authService.rotateRefreshToken(rawRefreshToken, 'admin', metadata);

      res.cookie('tiptable_admin_rf', tokens.refreshToken, authService.getCookieOptions('admin'));

      res.status(200).json({
        accessToken: tokens.accessToken,
        expiresInSeconds: tokens.expiresInSeconds,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/auth/logout
 */
authAdminRouter.post(
  '/admin/auth/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawRefreshToken = req.cookies?.tiptable_admin_rf;
      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { maxAge: _unused, ...clearOptions } = authService.getCookieOptions('admin');
      res.clearCookie('tiptable_admin_rf', clearOptions);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/auth/logout-all
 */
authAdminRouter.post(
  '/admin/auth/logout-all',
  requireAuth('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.id) {
        await authService.logoutAll(req.user.id);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { maxAge: _unused, ...clearOptions } = authService.getCookieOptions('admin');
      res.clearCookie('tiptable_admin_rf', clearOptions);
      res.status(200).json({ message: 'All active sessions terminated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/admin/auth/me
 */
authAdminRouter.get(
  '/admin/auth/me',
  requireAuth('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userProfile = {
        id: req.user!.id,
        email: 'staff@tiptable.in',
        fullName: 'Restaurant Staff',
        role: req.user!.role,
        restaurantId: req.user!.restaurantId || '',
        totpEnabled: false,
      };

      let restaurantData: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
      } | null = null;

      const [record] = await db
        .select({
          user: restaurantUsers,
          restaurant: restaurants,
        })
        .from(restaurantUsers)
        .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
        .where(eq(restaurantUsers.id, req.user!.id))
        .limit(1);

      if (record && record.user.isActive) {
        userProfile = {
          id: record.user.id,
          email: record.user.email,
          fullName: record.user.fullName,
          role: record.user.role,
          restaurantId: record.restaurant.id,
          totpEnabled: record.user.totpEnabled,
        };
        restaurantData = {
          id: record.restaurant.id,
          name: record.restaurant.name,
          slug: record.restaurant.slug,
          logoUrl: record.restaurant.logoUrl,
        };
      } else if (req.user?.isImpersonated && req.user.restaurantId) {
        const [targetRest] = await db
          .select()
          .from(restaurants)
          .where(eq(restaurants.id, req.user.restaurantId))
          .limit(1);

        if (!targetRest || !targetRest.isActive || targetRest.isSuspended) {
          throw new UnauthorizedError('Restaurant account not found or suspended');
        }

        userProfile = {
          id: req.user.id,
          email: req.user.impersonatorEmail || 'support@tiptable.in',
          fullName: 'Platform Support Staff',
          role: 'owner',
          restaurantId: targetRest.id,
          totpEnabled: false,
        };

        restaurantData = {
          id: targetRest.id,
          name: targetRest.name,
          slug: targetRest.slug,
          logoUrl: targetRest.logoUrl,
        };
      } else {
        throw new UnauthorizedError('User account not found or inactive');
      }

      res.status(200).json({
        user: userProfile,
        restaurant: restaurantData,
        impersonation: req.user?.isImpersonated
          ? {
              isImpersonated: true,
              impersonatorId: req.user.impersonatorId,
              impersonatorEmail: req.user.impersonatorEmail,
            }
          : undefined,
      });
    } catch (error) {
      next(error);
    }
  },
);
