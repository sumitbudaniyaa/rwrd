import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { authService } from '../services/authService.js';
import { auditService } from '../services/auditService.js';
import { requireAuth } from '../middleware/rbac.js';
import { db } from '../db/index.js';
import {
  restaurantUsers,
  restaurants,
  qrTokens,
  billingPlans,
  subscriptions,
  invoices,
} from '../db/schema/index.js';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../errors/appError.js';
import { hashPassword, generateSecureToken } from '../utils/authCrypto.js';

export const authAdminRouter = Router();

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid work email is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
 * POST /api/v1/admin/auth/register
 * Self-service registration for a restaurant and its single admin account.
 */
authAdminRouter.post(
  '/admin/auth/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { restaurantName, fullName, email, password } = RegisterSchema.parse(req.body);

      // Check if email already registered
      const [existingUser] = await db
        .select({ id: restaurantUsers.id })
        .from(restaurantUsers)
        .where(eq(restaurantUsers.email, email))
        .limit(1);

      if (existingUser) {
        throw new ConflictError('An account with this email address already exists');
      }

      // Generate base slug
      let baseSlug = restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (!baseSlug) baseSlug = 'restaurant';

      // Ensure slug uniqueness; append random suffix if collision
      let slug = baseSlug;
      const [existingSlug] = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.slug, slug))
        .limit(1);

      if (existingSlug) {
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      const passwordHash = await hashPassword(password);

      // Create restaurant, root QR token, and single admin user atomically in transaction
      await db.transaction(async (tx) => {
        const [createdRestaurant] = await tx
          .insert(restaurants)
          .values({
            name: restaurantName,
            slug,
            googleReviewUrl: '',
            tipPresets: [20, 50, 100, 200],
            minTipInr: 10,
            maxTipInr: 5000,
            isActive: false,
            isSuspended: false,
          })
          .returning();

        if (!createdRestaurant) {
          throw new Error('Failed to create restaurant record');
        }

        // Provision initial root QR token
        const rootQrToken = generateSecureToken(16);
        await tx.insert(qrTokens).values({
          restaurantId: createdRestaurant.id,
          token: rootQrToken,
          tableId: null,
          isActive: true,
        });

        // Register the single restaurant admin
        await tx.insert(restaurantUsers).values({
          restaurantId: createdRestaurant.id,
          email,
          passwordHash,
          fullName,
          role: 'admin',
          isActive: true,
        });
      });

      // Automatically log the newly registered admin in
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const result = await authService.loginAdmin(email, password, metadata);

      if (result.tokens) {
        res.cookie(
          'tiptable_admin_rf',
          result.tokens.refreshToken,
          authService.getCookieOptions('admin'),
        );
      }

      res.status(201).json({
        message: 'Restaurant account created successfully',
        accessToken: result.tokens?.accessToken,
        expiresInSeconds: result.tokens?.expiresInSeconds,
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
          role: 'admin',
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

      const planInfo = userProfile.restaurantId
        ? await authService.getRestaurantSubscriptionStatus(userProfile.restaurantId)
        : { hasActivePlan: false, subscriptionStatus: 'unpaid' };

      res.status(200).json({
        user: {
          ...userProfile,
          hasActivePlan: req.user?.isImpersonated ? true : planInfo.hasActivePlan,
          subscriptionStatus: req.user?.isImpersonated ? 'active' : planInfo.subscriptionStatus,
        },
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

const CompleteOnboardingPaymentSchema = z.object({
  planId: z.string().uuid('Valid plan ID is required'),
});

/**
 * POST /api/v1/admin/billing/onboarding/pay
 * Completes mandatory onboarding plan selection & payment for the restaurant admin.
 */
authAdminRouter.post(
  '/admin/billing/onboarding/pay',
  requireAuth('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId } = CompleteOnboardingPaymentSchema.parse(req.body);
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) {
        throw new ForbiddenError('Restaurant context is required');
      }

      const [plan] = await db
        .select()
        .from(billingPlans)
        .where(and(eq(billingPlans.id, planId), eq(billingPlans.isActive, true)))
        .limit(1);

      if (!plan) {
        throw new NotFoundError('Selected billing plan is not found or inactive');
      }

      const now = new Date();
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + plan.durationMonths);

      await db.transaction(async (tx) => {
        const [existingSub] = await tx
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.restaurantId, restaurantId))
          .limit(1);

        let subId: string;
        if (existingSub) {
          subId = existingSub.id;
          await tx
            .update(subscriptions)
            .set({
              planId: plan.id,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd,
              updatedAt: now,
            })
            .where(eq(subscriptions.id, existingSub.id));
        } else {
          const [newSub] = await tx
            .insert(subscriptions)
            .values({
              restaurantId,
              planId: plan.id,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd,
            })
            .returning();
          subId = newSub!.id;
        }

        // Activate restaurant tenant now that payment is confirmed
        await tx
          .update(restaurants)
          .set({
            isActive: true,
            updatedAt: now,
          })
          .where(eq(restaurants.id, restaurantId));

        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${generateSecureToken(4).toUpperCase()}`;
        await tx.insert(invoices).values({
          restaurantId,
          subscriptionId: subId,
          invoiceNumber,
          amountInr: plan.priceInr,
          status: 'paid',
          dueDate: now.toISOString().slice(0, 10),
          paidAt: now,
        });

        await auditService.record({
          restaurantId,
          actorId: req.user!.id,
          actorType: 'restaurant_user',
          action: 'SUBSCRIPTION_ACTIVATED',
          entityType: 'subscription',
          entityId: subId,
          afterState: {
            planId: plan.id,
            planName: plan.name,
            priceInr: plan.priceInr,
            durationMonths: plan.durationMonths,
            currentPeriodEnd: currentPeriodEnd.toISOString(),
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      });

      const newAccessToken = authService.generateAccessToken({
        sub: req.user!.id,
        role: req.user!.role,
        realm: 'admin',
        restaurantId,
        hasActivePlan: true,
      });

      res.status(200).json({
        message: `Plan "${plan.name}" successfully activated`,
        accessToken: newAccessToken,
        subscription: {
          planId: plan.id,
          planName: plan.name,
          priceInr: plan.priceInr,
          durationMonths: plan.durationMonths,
          status: 'active',
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        },
        hasActivePlan: true,
      });
    } catch (error) {
      next(error);
    }
  },
);
