import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { db } from '../src/db/index.js';
import { portalIpAllowlist } from '../src/middleware/ipAllowlist.js';

describe('Portal Authentication Routes & IP Allowlist', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';

  const portalToken = authService.generateAccessToken({
    sub: superAdminId,
    role: 'super_admin',
    realm: 'portal',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/portal/auth/login logs in platform user and sets refresh cookie', async () => {
    vi.spyOn(authService, 'loginPortal').mockResolvedValueOnce({
      tokens: {
        accessToken: portalToken,
        refreshToken: 'dummy-portal-refresh-token',
        expiresInSeconds: 900,
      },
      user: {
        id: superAdminId,
        email: 'admin@tiptable.in',
        fullName: 'Platform Super Admin',
        role: 'super_admin',
      },
    });

    const res = await request(app)
      .post('/api/v1/portal/auth/login')
      .send({ email: 'admin@tiptable.in', password: 'SuperSecretPassword123!' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe(portalToken);
    expect(res.body.user.email).toBe('admin@tiptable.in');
    expect(res.body.user.role).toBe('super_admin');
    const cookies = res.headers['set-cookie'];
    const cookieList = Array.isArray(cookies) ? cookies : [cookies || ''];
    expect(cookieList.some((c) => c.includes('tiptable_portal_rf'))).toBe(true);
  });

  it('GET /api/v1/portal/auth/me returns currently authenticated platform staff', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => [
            {
              id: superAdminId,
              email: 'admin@tiptable.in',
              fullName: 'Platform Super Admin',
              role: 'super_admin',
              isActive: true,
            },
          ],
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/api/v1/portal/auth/me')
      .set('Authorization', `Bearer ${portalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(superAdminId);
    expect(res.body.user.role).toBe('super_admin');
  });

  it('portalIpAllowlist blocks unauthorized IP when configured', () => {
    const middleware = portalIpAllowlist(['192.168.1.100']);
    const mockReq: any = { ip: '10.0.0.1' };
    const mockRes: any = {};
    const next = vi.fn();

    expect(() => middleware(mockReq, mockRes, next)).toThrowError(
      /is not authorized for Company Portal access/i,
    );
  });

  it('portalIpAllowlist permits authorized IP when configured', () => {
    const middleware = portalIpAllowlist(['192.168.1.100']);
    const mockReq: any = { ip: '::ffff:192.168.1.100' };
    const mockRes: any = {};
    const next = vi.fn();

    middleware(mockReq, mockRes, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
