import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { CookieOptions } from 'express';
import { db } from '../db/index.js';
import { restaurantUsers, platformUsers, restaurants, sessions } from '../db/schema/index.js';
import { env } from '../config/env.js';
import { verifyPassword, generateSecureToken, hashToken } from '../utils/authCrypto.js';
import { UnauthorizedError } from '../errors/appError.js';
import { logger } from '../utils/logger.js';

export type AuthRealm = 'admin' | 'portal';

export interface TokenPayload {
  sub: string; // userId
  role: string;
  realm: AuthRealm;
  restaurantId?: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  restaurantId?: string;
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
   * Authenticates Restaurant Admin (Owner / Manager).
   */
  async loginAdmin(
    email: string,
    plainPassword: string,
    metadata?: { ipAddress?: string | undefined; userAgent?: string | undefined } | undefined,
  ): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    const [user] = await db
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
        ),
      )
      .limit(1);

    if (!user || user.restaurant.isSuspended || !user.restaurant.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await verifyPassword(plainPassword, user.user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create session family & tokens
    const familyId = randomUUID();
    const rawRefreshToken = generateSecureToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      userType: 'restaurant_user',
      userId: user.user.id,
      restaurantId: user.restaurant.id,
      refreshTokenHash,
      familyId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt,
    });

    const accessToken = this.generateAccessToken({
      sub: user.user.id,
      role: user.user.role,
      realm: 'admin',
      restaurantId: user.restaurant.id,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: 900, // 15 mins
      },
      user: {
        id: user.user.id,
        email: user.user.email,
        fullName: user.user.fullName,
        role: user.user.role,
        restaurantId: user.restaurant.id,
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
    const [user] = await db
      .select()
      .from(platformUsers)
      .where(
        and(eq(platformUsers.email, email.toLowerCase().trim()), eq(platformUsers.isActive, true)),
      )
      .limit(1);

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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(sessions).values({
      userType: 'platform_user',
      userId: user.id,
      refreshTokenHash,
      familyId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt,
    });

    const accessToken = this.generateAccessToken({
      sub: user.id,
      role: user.role,
      realm: 'portal',
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: 900,
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

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, tokenHash))
      .limit(1);

    if (!session) {
      throw new UnauthorizedError('Invalid refresh session');
    }

    // Token Reuse Detection: If revoked token is used, invalidate entire family!
    if (session.isRevoked) {
      logger.warn(
        { familyId: session.familyId, userId: session.userId },
        'Token reuse detected! Revoking entire session family.',
      );

      await db
        .update(sessions)
        .set({ isRevoked: true })
        .where(eq(sessions.familyId, session.familyId));

      throw new UnauthorizedError('Session revoked due to token reuse');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Refresh session expired');
    }

    // Revoke current refresh token
    await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id));

    // Get user details for new access token
    let role = 'user';
    let restaurantId: string | undefined = session.restaurantId ?? undefined;

    if (session.userType === 'restaurant_user') {
      const [u] = await db
        .select()
        .from(restaurantUsers)
        .where(eq(restaurantUsers.id, session.userId))
        .limit(1);
      if (!u || !u.isActive) throw new UnauthorizedError('User account inactive');
      role = u.role;
      restaurantId = u.restaurantId;
    } else {
      const [u] = await db
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.id, session.userId))
        .limit(1);
      if (!u || !u.isActive) throw new UnauthorizedError('User account inactive');
      role = u.role;
    }

    // Generate new refresh token in the same family
    const newRawRefreshToken = generateSecureToken(32);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const ttlDays = realm === 'admin' ? 7 : 1;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
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
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresInSeconds: 900,
    };
  }

  /**
   * Revokes a single refresh session (Logout).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.refreshTokenHash, tokenHash));
  }

  /**
   * Revokes all active sessions for a user across all devices (Logout All).
   */
  async logoutAll(userId: string): Promise<void> {
    await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.userId, userId));
  }

  /**
   * Standard secure cookie configuration for refresh tokens.
   */
  getCookieOptions(realm: AuthRealm): CookieOptions {
    const isProd = env.NODE_ENV === 'production';
    const ttlDays = realm === 'admin' ? 7 : 1;

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: realm === 'admin' ? '/api/v1/admin' : '/api/v1/portal',
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    };
  }
}

export const authService = new AuthService();
