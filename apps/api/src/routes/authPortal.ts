import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { platformUsers } from '../db/schema/index.js';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { UnauthorizedError, NotFoundError } from '../errors/appError.js';

export const authPortalRouter = Router();

// Apply IP allowlist protection to all Company Portal auth endpoints
authPortalRouter.use(portalIpAllowlist());

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

/**
 * POST /api/v1/portal/auth/login
 */
authPortalRouter.post(
  '/portal/auth/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const { tokens, user } = await authService.loginPortal(email, password, metadata);

      res.cookie('tiptable_portal_rf', tokens.refreshToken, authService.getCookieOptions('portal'));

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
 * POST /api/v1/portal/auth/refresh
 */
authPortalRouter.post(
  '/portal/auth/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawRefreshToken = req.cookies?.tiptable_portal_rf;
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Missing refresh token cookie');
      }

      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const tokens = await authService.rotateRefreshToken(rawRefreshToken, 'portal', metadata);

      res.cookie('tiptable_portal_rf', tokens.refreshToken, authService.getCookieOptions('portal'));

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
 * GET /api/v1/portal/auth/me
 * Restores session profile for authenticated platform users.
 */
authPortalRouter.get(
  '/portal/auth/me',
  requireAuth('portal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const [user] = await db
        .select({
          id: platformUsers.id,
          email: platformUsers.email,
          fullName: platformUsers.fullName,
          role: platformUsers.role,
          isActive: platformUsers.isActive,
        })
        .from(platformUsers)
        .where(eq(platformUsers.id, userId))
        .limit(1);

      if (!user) {
        throw new NotFoundError('Platform user account not found');
      }

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/portal/auth/logout
 */
authPortalRouter.post(
  '/portal/auth/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawRefreshToken = req.cookies?.tiptable_portal_rf;
      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }

      res.clearCookie('tiptable_portal_rf', authService.getCookieOptions('portal'));
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },
);
