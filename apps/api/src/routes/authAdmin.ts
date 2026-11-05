import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { UnauthorizedError } from '../errors/appError.js';

export const authAdminRouter = Router();

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
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

      const { tokens, user } = await authService.loginAdmin(email, password, metadata);

      // Set rotating refresh token in httpOnly, secure, SameSite=Strict cookie
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

      res.clearCookie('tiptable_admin_rf', authService.getCookieOptions('admin'));
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },
);
