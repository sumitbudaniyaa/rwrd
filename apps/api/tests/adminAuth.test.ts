import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { UnauthorizedError } from '../src/errors/appError.js';

function getSetCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return [raw];
  return [];
}

describe('Restaurant Admin Authentication & MFA Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/admin/auth/login returns tempToken when MFA is required', async () => {
    vi.spyOn(authService, 'loginAdmin').mockResolvedValueOnce({
      mfaRequired: true,
      tempToken: 'sample.mfa.temp.token',
      user: {
        id: 'user-111',
        email: 'owner@bombaycanteen.com',
        fullName: 'Sameer Seth',
        role: 'owner',
        restaurantId: 'rest-222',
      },
    });

    const res = await request(app).post('/api/v1/admin/auth/login').send({
      email: 'owner@bombaycanteen.com',
      password: 'CorrectPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.tempToken).toBe('sample.mfa.temp.token');

    // Should NOT issue admin refresh token cookie when MFA is pending
    const setCookies = getSetCookies(res);
    const hasAdminRf = setCookies.some((c: string) => c.includes('tiptable_admin_rf'));
    expect(hasAdminRf).toBe(false);
  });

  it('POST /api/v1/admin/auth/login returns accessToken & sets cookie when MFA is not required', async () => {
    vi.spyOn(authService, 'loginAdmin').mockResolvedValueOnce({
      mfaRequired: false,
      tokens: {
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.token.value',
        expiresInSeconds: 900,
      },
      user: {
        id: 'user-111',
        email: 'manager@bombaycanteen.com',
        fullName: 'Anita Roy',
        role: 'manager',
        restaurantId: 'rest-222',
      },
    });

    const res = await request(app).post('/api/v1/admin/auth/login').send({
      email: 'manager@bombaycanteen.com',
      password: 'CorrectPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBe(false);
    expect(res.body.accessToken).toBe('access.jwt.token');

    const setCookies = getSetCookies(res);
    const hasAdminRf = setCookies.some((c: string) => c.includes('tiptable_admin_rf'));
    expect(hasAdminRf).toBe(true);
  });

  it('POST /api/v1/admin/auth/mfa/challenge validates code and issues tokens', async () => {
    vi.spyOn(authService, 'verifyAdminMfa').mockResolvedValueOnce({
      tokens: {
        accessToken: 'mfa.verified.jwt',
        refreshToken: 'mfa.refresh.token',
        expiresInSeconds: 900,
      },
      user: {
        id: 'user-111',
        email: 'owner@bombaycanteen.com',
        fullName: 'Sameer Seth',
        role: 'owner',
        restaurantId: 'rest-222',
      },
    });

    const res = await request(app).post('/api/v1/admin/auth/mfa/challenge').send({
      tempToken: 'sample.mfa.temp.token',
      code: '123456',
      isRecoveryCode: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('mfa.verified.jwt');

    const setCookies = getSetCookies(res);
    const hasAdminRf = setCookies.some((c: string) => c.includes('tiptable_admin_rf'));
    expect(hasAdminRf).toBe(true);
  });

  it('POST /api/v1/admin/auth/mfa/challenge returns 401 on invalid verification code', async () => {
    vi.spyOn(authService, 'verifyAdminMfa').mockRejectedValueOnce(
      new UnauthorizedError('Invalid TOTP verification code'),
    );

    const res = await request(app).post('/api/v1/admin/auth/mfa/challenge').send({
      tempToken: 'sample.mfa.temp.token',
      code: '000000',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(res.body.detail).toBe('Invalid TOTP verification code');
  });

  it('POST /api/v1/admin/auth/logout clears cookie and revokes refresh token', async () => {
    const logoutSpy = vi.spyOn(authService, 'logout').mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/v1/admin/auth/logout')
      .set('Cookie', ['tiptable_admin_rf=valid_refresh_token'])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(logoutSpy).toHaveBeenCalledWith('valid_refresh_token');

    const setCookies = getSetCookies(res);
    const clearedCookie = setCookies.some((c: string) => c.includes('tiptable_admin_rf=;'));
    expect(clearedCookie).toBe(true);
  });

  it('POST /api/v1/admin/auth/logout-all requires auth and terminates all user sessions', async () => {
    const validToken = authService.generateAccessToken({
      sub: 'user-111',
      role: 'owner',
      realm: 'admin',
      restaurantId: 'rest-222',
    });
    const logoutAllSpy = vi.spyOn(authService, 'logoutAll').mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/v1/admin/auth/logout-all')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(logoutAllSpy).toHaveBeenCalledWith('user-111');
    expect(res.body.message).toContain('All active sessions terminated');
  });
});
