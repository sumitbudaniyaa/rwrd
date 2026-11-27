import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { CookieOptions } from 'express';
import { withSystemContext, withTenantContext } from '../db/rls.js';
import {
  restaurantUsers,
  platformUsers,
  restaurants,
  sessions,
  subscriptions,
} from '../db/schema/index.js';
import { env } from '../config/env.js';
import { verifyPassword, generateSecureToken, hashToken } from '../utils/authCrypto.js';
import { mfaService } from './mfaService.js';
import { decryptSecret } from './crypto.js';
import { RateLimitError, UnauthorizedError } from '../errors/appError.js';
import { logger } from '../utils/logger.js';
import { accountLifecycleService } from './accountLifecycleService.js';

export type AuthRealm = 'admin' | 'portal';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MS = 15 * 60 * 1000;

export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = value.trim().match(/^(\d+)(s|m|h|d)?$/i);
  if (!match || !match[1]) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 1000);
}

export function parseDurationSeconds(value: string, fallbackSeconds: number): number {
  return Math.max(1, Math.floor(parseDurationMs(value, fallbackSeconds * 1000) / 1000));
}

export interface TokenPayload {
  sub: string; // userId
  role: string;
  realm: AuthRealm;
  restaurantId?: string | undefined;
  hasActivePlan?: boolean | undefined;
  isImpersonated?: boolean | undefined;
  impersonationRequestId?: string | undefined;
  impersonatorId?: string | undefined;
  impersonatorEmail?: string | undefined;
  jti?: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AdminLoginResult {
  mfaRequired: boolean;
  tempToken?: string | undefined;
  tokens?: AuthTokens | undefined;
  user: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  restaurantId?: string;
  hasActivePlan?: boolean;
  subscriptionStatus?: string;
}

export class AuthService {
  /**
   * Issues a short-lived access JWT (15 minutes).
   */
  generateAccessToken(payload: TokenPayload): string {
    const secret: Secret = payload.realm === 'admin' ? env.ADMIN_JWT_SECRET : env.PORTAL_JWT_SECRET;
    const audience = payload.realm === 'admin' ? 'tiptable-admin' : 'tiptable-portal';
    const expiresIn =
      payload.realm === 'admin' ? env.ADMIN_JWT_EXPIRES_IN : env.PORTAL_JWT_EXPIRES_IN;

    const options: SignOptions = {
      audience,
      issuer: 'tiptable-api',
      expiresIn: expiresIn as unknown as NonNullable<SignOptions['expiresIn']>,
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Verifies an access token and returns its decoded payload.
   */
  verifyAccessToken(token: string, realm: AuthRealm): TokenPayload {
    const secret: Secret = realm === 'admin' ? env.ADMIN_JWT_SECRET : env.PORTAL_JWT_SECRET;
    const audience = realm === 'admin' ? 'tiptable-admin' : 'tiptable-portal';

    try {
      const decoded = jwt.verify(token, secret, {
        audience,
        issuer: 'tiptable-api',
      }) as TokenPayload;

      if (decoded.realm !== realm) {
        throw new UnauthorizedError('Token realm mismatch');
      }

      return decoded;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  /**
   * Evaluates if a restaurant has an active paid subscription (with 2-day grace period).
   */
  async getRestaurantSubscriptionStatus(restaurantId: string): Promise<{
    hasActivePlan: boolean;
    subscriptionStatus: string;
  }> {
    const [sub] = await withTenantContext(restaurantId, (executor) =>
      executor
        .select({
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
        })
        .from(subscriptions)
        .where(eq(subscriptions.restaurantId, restaurantId))
        .limit(1),
    );

    if (!sub) {
      return { hasActivePlan: false, subscriptionStatus: 'unpaid' };
    }

    if (sub.status === 'cancelled' || sub.status === 'unpaid') {
      return { hasActivePlan: false, subscriptionStatus: sub.status };
    }

    const PLAN_GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;
    const graceEnd = new Date(sub.currentPeriodEnd).getTime() + PLAN_GRACE_PERIOD_MS;
    const isWithinGrace = Date.now() <= graceEnd;

    const hasActivePlan = isWithinGrace && (sub.status === 'active' || sub.status === 'trial');
    return {
      hasActivePlan,
      subscriptionStatus: hasActivePlan ? sub.status : 'past_due',
    };
  }

  /**
   * Authenticates Restaurant Admin (Owner / Manager).
   */
  async loginAdmin(
    email: string,
    plainPassword: string,
    metadata?: { ipAddress?: string | undefined; userAgent?: string | undefined } | undefined,
  ): Promise<AdminLoginResult> {
    const [user] = await withSystemContext('admin_login_lookup', (executor) =>
      executor
        .select({
          user: restaurantUsers,
          restaurant: restaurants,
        })
        .from(restaurantUsers)
        .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
        .where(
          and(
            eq(restaurantUsers.email, email.toLowerCase().trim()),
            eq(restaurantUsers.isActive, true),
            isNull(restaurantUsers.deletedAt),
          ),
        )
        .limit(1),
    );

    if (!user || user.restaurant.isSuspended || !user.restaurant.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.user.lockedUntil && new Date(user.user.lockedUntil).getTime() > Date.now()) {
      throw new RateLimitError(
        'Account temporarily locked due to multiple failed login attempts. Please try again later.',
      );
    }

    const isValidPassword = await verifyPassword(plainPassword, user.user.passwordHash);
    if (!isValidPassword) {
      const nextAttempts = (user.user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil =
        nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(Date.now() + ACCOUNT_LOCKOUT_MS)
          : null;
      await withTenantContext(user.restaurant.id, (executor) =>
        executor
          .update(restaurantUsers)
          .set({
            failedLoginAttempts: nextAttempts,
            lockedUntil,
            updatedAt: new Date(),
          })
          .where(eq(restaurantUsers.id, user.user.id)),
      );

      if (lockedUntil) {
        throw new RateLimitError(
          'Account temporarily locked due to multiple failed login attempts. Please try again later.',
        );
      }
      throw new UnauthorizedError('Invalid email or password');
    }

    if ((user.user.failedLoginAttempts ?? 0) > 0 || user.user.lockedUntil) {
      await withTenantContext(user.restaurant.id, (executor) =>
        executor
          .update(restaurantUsers)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            updatedAt: new Date(),
          })
          .where(eq(restaurantUsers.id, user.user.id)),
      );
    }

    const planInfo = await this.getRestaurantSubscriptionStatus(user.restaurant.id);

    // Evaluate 14-day unpaid expiration policy
    if (!planInfo.hasActivePlan) {
      const isExpired = await accountLifecycleService.isRestaurantExpiredUnpaid(user.restaurant.id);
      if (isExpired) {
        await accountLifecycleService.purgeSingleRestaurant(
          user.restaurant.id,
          'Unpaid account attempted login after 14-day expiration threshold',
        );
        throw new UnauthorizedError(
          'Your 14-day unpaid trial has expired and this account has been deleted.',
        );
      }
    }

    // If user has MFA enabled, return temporary token for 2FA challenge
    if (user.user.totpEnabled) {
      const tempToken = jwt.sign(
        {
          sub: user.user.id,
          type: 'mfa_pending',
          realm: 'admin',
          restaurantId: user.restaurant.id,
        },
        env.ADMIN_JWT_SECRET,
        {
          expiresIn: '5m',
          issuer: 'tiptable-api',
          audience: 'tiptable-admin-mfa',
        },
      );

      return {
        mfaRequired: true,
        tempToken,
        user: {
          id: user.user.id,
          email: user.user.email,
          fullName: user.user.fullName,
          role: user.user.role,
          restaurantId: user.restaurant.id,
          hasActivePlan: planInfo.hasActivePlan,
          subscriptionStatus: planInfo.subscriptionStatus,
        },
      };
    }

    // Create session family & tokens
    const familyId = randomUUID();
    const rawRefreshToken = generateSecureToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const adminRefreshMs = parseDurationMs(env.ADMIN_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);
    const adminAccessSecs = parseDurationSeconds(env.ADMIN_JWT_EXPIRES_IN, 900);
    const expiresAt = new Date(Date.now() + adminRefreshMs);

    await withTenantContext(user.restaurant.id, (executor) =>
      executor.insert(sessions).values({
        userType: 'restaurant_user',
        userId: user.user.id,
        restaurantId: user.restaurant.id,
        refreshTokenHash,
        familyId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        expiresAt,
      }),
    );

    const accessToken = this.generateAccessToken({
      sub: user.user.id,
      role: user.user.role,
      realm: 'admin',
      restaurantId: user.restaurant.id,
      hasActivePlan: planInfo.hasActivePlan,
    });

    return {
      mfaRequired: false,
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: adminAccessSecs,
      },
      user: {
        id: user.user.id,
        email: user.user.email,
        fullName: user.user.fullName,
        role: user.user.role,
        restaurantId: user.restaurant.id,
        hasActivePlan: planInfo.hasActivePlan,
        subscriptionStatus: planInfo.subscriptionStatus,
      },
    };
  }

  /**
   * Verifies an MFA TOTP or single-use recovery code challenge for Restaurant Admin.
   */
  async verifyAdminMfa(
    tempToken: string,
    code: string,
    isRecoveryCode = false,
    metadata?: { ipAddress?: string | undefined; userAgent?: string | undefined } | undefined,
  ): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    let decoded: { sub: string; type: string; realm: string; restaurantId: string };
    try {
      decoded = jwt.verify(tempToken, env.ADMIN_JWT_SECRET, {
        issuer: 'tiptable-api',
        audience: 'tiptable-admin-mfa',
      }) as { sub: string; type: string; realm: string; restaurantId: string };
    } catch {
      throw new UnauthorizedError('Invalid or expired MFA session token');
    }

    if (decoded.type !== 'mfa_pending' || decoded.realm !== 'admin') {
      throw new UnauthorizedError('Invalid MFA token payload');
    }

    const [record] = await withTenantContext(decoded.restaurantId, (executor) =>
      executor
        .select({
          user: restaurantUsers,
          restaurant: restaurants,
        })
        .from(restaurantUsers)
        .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
        .where(
          and(
            eq(restaurantUsers.id, decoded.sub),
            eq(restaurantUsers.isActive, true),
            isNull(restaurantUsers.deletedAt),
          ),
        )
        .limit(1),
    );

    if (!record || record.restaurant.isSuspended || !record.restaurant.isActive) {
      throw new UnauthorizedError('User account not found or suspended');
    }

    if (isRecoveryCode) {
      const recoveryResult = mfaService.verifyAndConsumeRecoveryCode(
        code,
        record.user.totpRecoveryCodesHash || [],
      );
      if (!recoveryResult.isValid) {
        throw new UnauthorizedError('Invalid recovery code');
      }

      await withTenantContext(decoded.restaurantId, (executor) =>
        executor
          .update(restaurantUsers)
          .set({ totpRecoveryCodesHash: recoveryResult.remainingHashedCodes })
          .where(eq(restaurantUsers.id, record.user.id)),
      );
    } else {
      if (!record.user.totpSecretEncrypted) {
        throw new UnauthorizedError('MFA is not configured for this user');
      }

      const secret = decryptSecret(record.user.totpSecretEncrypted);
      const isValid = mfaService.verifyTotpCode(code, secret);
      if (!isValid) {
        throw new UnauthorizedError('Invalid TOTP verification code');
      }
    }

    const familyId = randomUUID();
    const rawRefreshToken = generateSecureToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const adminRefreshMs = parseDurationMs(env.ADMIN_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);
    const adminAccessSecs = parseDurationSeconds(env.ADMIN_JWT_EXPIRES_IN, 900);
    const expiresAt = new Date(Date.now() + adminRefreshMs);

    await withTenantContext(decoded.restaurantId, (executor) =>
      executor.insert(sessions).values({
        userType: 'restaurant_user',
        userId: record.user.id,
        restaurantId: record.restaurant.id,
        refreshTokenHash,
        familyId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        expiresAt,
      }),
    );

    const planInfo = await this.getRestaurantSubscriptionStatus(record.restaurant.id);

    const accessToken = this.generateAccessToken({
      sub: record.user.id,
      role: record.user.role,
      realm: 'admin',
      restaurantId: record.restaurant.id,
      hasActivePlan: planInfo.hasActivePlan,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: adminAccessSecs,
      },
      user: {
        id: record.user.id,
        email: record.user.email,
        fullName: record.user.fullName,
        role: record.user.role,
        restaurantId: record.restaurant.id,
        hasActivePlan: planInfo.hasActivePlan,
        subscriptionStatus: planInfo.subscriptionStatus,
      },
    };
  }

  /**
   * Authenticates Platform Staff (Super Admin / Support / Finance).
   */
  async loginPortal(
    email: string,
    plainPassword: string,
    metadata?: { ipAddress?: string | undefined; userAgent?: string | undefined } | undefined,
  ): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    const [user] = await withSystemContext('portal_login_auth', (executor) =>
      executor
        .select()
        .from(platformUsers)
        .where(
          and(
            eq(platformUsers.email, email.toLowerCase().trim()),
            eq(platformUsers.isActive, true),
            isNull(platformUsers.deletedAt),
          ),
        )
        .limit(1),
    );

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(plainPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const familyId = randomUUID();
    const rawRefreshToken = generateSecureToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const portalRefreshMs = parseDurationMs(env.PORTAL_REFRESH_EXPIRES_IN, 24 * 60 * 60 * 1000);
    const portalAccessSecs = parseDurationSeconds(env.PORTAL_JWT_EXPIRES_IN, 900);
    const expiresAt = new Date(Date.now() + portalRefreshMs);

    await withSystemContext('portal_login_session', (executor) =>
      executor.insert(sessions).values({
        userType: 'platform_user',
        userId: user.id,
        refreshTokenHash,
        familyId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        expiresAt,
      }),
    );

    const accessToken = this.generateAccessToken({
      sub: user.id,
      role: user.role,
      realm: 'portal',
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: portalAccessSecs,
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Rotates a refresh token with token reuse detection.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    realm: AuthRealm,
    metadata?: { ipAddress?: string | undefined; userAgent?: string | undefined } | undefined,
  ): Promise<AuthTokens> {
    const tokenHash = hashToken(rawRefreshToken);

    return withSystemContext('refresh_token_rotation', async (executor) => {
      const [session] = await executor
        .select()
        .from(sessions)
        .where(eq(sessions.refreshTokenHash, tokenHash))
        .limit(1);

      if (!session) {
        throw new UnauthorizedError('Invalid refresh session');
      }

      // Token Reuse Detection: If revoked token is used, check grace window before invalidating family
      if (session.isRevoked) {
        // Check if this was a recent rotation within a 30-second grace window (RFC 6819 OAuth 2.0 BCP)
        // Triggered by concurrent requests, rapid reloads, or React StrictMode double mounts
        const [latestActiveSession] = await executor
          .select()
          .from(sessions)
          .where(and(eq(sessions.familyId, session.familyId), eq(sessions.isRevoked, false)))
          .orderBy(desc(sessions.createdAt))
          .limit(1);

        const ROTATION_GRACE_PERIOD_MS = 30_000;
        if (
          latestActiveSession &&
          Date.now() - latestActiveSession.createdAt.getTime() < ROTATION_GRACE_PERIOD_MS
        ) {
          logger.info(
            { familyId: session.familyId, userId: session.userId },
            'Refresh token re-submitted within 30s grace window. Re-issuing active session tokens without revoking family.',
          );

          let role = 'user';
          let restaurantId: string | undefined = latestActiveSession.restaurantId ?? undefined;
          let hasActivePlan: boolean | undefined;

          if (latestActiveSession.userType === 'restaurant_user') {
            const [u] = await executor
              .select({
                user: restaurantUsers,
                restaurant: restaurants,
              })
              .from(restaurantUsers)
              .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
              .where(eq(restaurantUsers.id, latestActiveSession.userId))
              .limit(1);
            if (
              !u ||
              !u.user.isActive ||
              u.user.deletedAt ||
              !u.restaurant.isActive ||
              u.restaurant.isSuspended
            ) {
              throw new UnauthorizedError('Restaurant account inactive or suspended');
            }
            role = u.user.role;
            restaurantId = u.restaurant.id;
            const planInfo = await this.getRestaurantSubscriptionStatus(u.restaurant.id);
            hasActivePlan = planInfo.hasActivePlan;
          } else {
            const [u] = await executor
              .select()
              .from(platformUsers)
              .where(eq(platformUsers.id, latestActiveSession.userId))
              .limit(1);
            if (!u || !u.isActive || u.deletedAt) {
              throw new UnauthorizedError('User account inactive');
            }
            role = u.role;
          }

          // Rotate into a new active session
          await executor
            .update(sessions)
            .set({ isRevoked: true })
            .where(eq(sessions.id, latestActiveSession.id));

          const newRawRefreshToken = generateSecureToken(32);
          const newRefreshTokenHash = hashToken(newRawRefreshToken);
          const refreshMs =
            realm === 'admin'
              ? parseDurationMs(env.ADMIN_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)
              : parseDurationMs(env.PORTAL_REFRESH_EXPIRES_IN, 24 * 60 * 60 * 1000);
          const accessSecs =
            realm === 'admin'
              ? parseDurationSeconds(env.ADMIN_JWT_EXPIRES_IN, 900)
              : parseDurationSeconds(env.PORTAL_JWT_EXPIRES_IN, 900);
          const expiresAt = new Date(Date.now() + refreshMs);

          await executor.insert(sessions).values({
            userType: latestActiveSession.userType,
            userId: latestActiveSession.userId,
            restaurantId: latestActiveSession.restaurantId,
            refreshTokenHash: newRefreshTokenHash,
            familyId: latestActiveSession.familyId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
            expiresAt,
          });

          const accessToken = this.generateAccessToken({
            sub: latestActiveSession.userId,
            role,
            realm,
            restaurantId,
            hasActivePlan,
          });

          return {
            accessToken,
            refreshToken: newRawRefreshToken,
            expiresInSeconds: accessSecs,
          };
        }

        logger.warn(
          { familyId: session.familyId, userId: session.userId },
          'Token reuse detected! Revoking entire session family.',
        );

        await executor
          .update(sessions)
          .set({ isRevoked: true })
          .where(eq(sessions.familyId, session.familyId));

        throw new UnauthorizedError('Session revoked due to token reuse');
      }

      if (session.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedError('Refresh session expired');
      }

      // Revoke current refresh token
      await executor.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id));

      // Get user details for new access token
      let role = 'user';
      let restaurantId: string | undefined = session.restaurantId ?? undefined;
      let hasActivePlan: boolean | undefined;

      if (session.userType === 'restaurant_user') {
        const [u] = await executor
          .select({
            user: restaurantUsers,
            restaurant: restaurants,
          })
          .from(restaurantUsers)
          .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
          .where(eq(restaurantUsers.id, session.userId))
          .limit(1);

        if (
          !u ||
          !u.user.isActive ||
          u.user.deletedAt ||
          !u.restaurant.isActive ||
          u.restaurant.isSuspended
        ) {
          throw new UnauthorizedError('Restaurant account inactive or suspended');
        }
        role = u.user.role;
        restaurantId = u.restaurant.id;
        const planInfo = await this.getRestaurantSubscriptionStatus(u.restaurant.id);
        hasActivePlan = planInfo.hasActivePlan;
      } else {
        const [u] = await executor
          .select()
          .from(platformUsers)
          .where(eq(platformUsers.id, session.userId))
          .limit(1);
        if (!u || !u.isActive || u.deletedAt) {
          throw new UnauthorizedError('User account inactive');
        }
        role = u.role;
      }

      // Generate new refresh token in the same family
      const newRawRefreshToken = generateSecureToken(32);
      const newRefreshTokenHash = hashToken(newRawRefreshToken);
      const refreshMs =
        realm === 'admin'
          ? parseDurationMs(env.ADMIN_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)
          : parseDurationMs(env.PORTAL_REFRESH_EXPIRES_IN, 24 * 60 * 60 * 1000);
      const accessSecs =
        realm === 'admin'
          ? parseDurationSeconds(env.ADMIN_JWT_EXPIRES_IN, 900)
          : parseDurationSeconds(env.PORTAL_JWT_EXPIRES_IN, 900);
      const expiresAt = new Date(Date.now() + refreshMs);

      await executor.insert(sessions).values({
        userType: session.userType,
        userId: session.userId,
        restaurantId: session.restaurantId,
        refreshTokenHash: newRefreshTokenHash,
        familyId: session.familyId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        expiresAt,
      });

      const accessToken = this.generateAccessToken({
        sub: session.userId,
        role,
        realm,
        restaurantId,
        hasActivePlan,
      });

      return {
        accessToken,
        refreshToken: newRawRefreshToken,
        expiresInSeconds: accessSecs,
      };
    });
  }

  /**
   * Revokes a single refresh session (Logout).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await withSystemContext('session_logout', (executor) =>
      executor
        .update(sessions)
        .set({ isRevoked: true })
        .where(eq(sessions.refreshTokenHash, tokenHash)),
    );
  }

  /**
   * Revokes all active sessions for a user across all devices (Logout All).
   */
  async logoutAll(userId: string): Promise<void> {
    await withSystemContext('session_logout_all', (executor) =>
      executor.update(sessions).set({ isRevoked: true }).where(eq(sessions.userId, userId)),
    );
  }

  /**
   * Standard secure cookie configuration for refresh tokens.
   */
  getCookieOptions(realm: AuthRealm): CookieOptions {
    const isProd = env.NODE_ENV === 'production';
    const maxAge =
      realm === 'admin'
        ? parseDurationMs(env.ADMIN_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)
        : parseDurationMs(env.PORTAL_REFRESH_EXPIRES_IN, 24 * 60 * 60 * 1000);

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: realm === 'admin' ? '/api/v1/admin' : '/api/v1/portal',
      maxAge,
    };
  }
}

export const authService = new AuthService();
