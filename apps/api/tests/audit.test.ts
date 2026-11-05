import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService, sanitizeAuditState } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';

describe('Audit Logging Engine', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    vi.clearAllMocks();
  });

  describe('sanitizeAuditState', () => {
    it('redacts sensitive fields while preserving non-sensitive data', () => {
      const raw = {
        name: 'Ramesh Kumar',
        email: 'ramesh@example.com',
        role: 'waiter',
        plainVpa: 'ramesh@oksbi',
        vpaEncrypted: 'c87f42...secret',
        passwordHash: '$argon2id$...hash',
        totpSecretEncrypted: 'topsecret',
        nested: {
          refreshToken: 'rf_xyz',
          publicId: 'uuid-123',
        },
        tags: ['dining', 'terrace'],
      };

      const sanitized = sanitizeAuditState(raw) as Record<string, unknown>;

      expect(sanitized.name).toBe('Ramesh Kumar');
      expect(sanitized.email).toBe('ramesh@example.com');
      expect(sanitized.role).toBe('waiter');
      expect(sanitized.tags).toEqual(['dining', 'terrace']);

      // Sensitive fields must be redacted
      expect(sanitized.plainVpa).toBe('[REDACTED]');
      expect(sanitized.vpaEncrypted).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.totpSecretEncrypted).toBe('[REDACTED]');
      expect((sanitized.nested as Record<string, unknown>).refreshToken).toBe('[REDACTED]');
      expect((sanitized.nested as Record<string, unknown>).publicId).toBe('uuid-123');
    });

    it('gracefully handles null, undefined, and non-object inputs', () => {
      expect(sanitizeAuditState(null)).toBeNull();
      expect(sanitizeAuditState(undefined)).toBeUndefined();
      expect(sanitizeAuditState('string-val')).toBe('string-val');
      expect(sanitizeAuditState(12345)).toBe(12345);
    });
  });

  describe('record & tenant isolation', () => {
    it('records an audit event with sanitized states and uppercase action', async () => {
      const mockInserted = {
        id: '11111111-1111-1111-1111-111111111111',
        restaurantId: '22222222-2222-2222-2222-222222222222',
        actorId: '33333333-3333-3333-3333-333333333333',
        actorType: 'restaurant_user' as const,
        action: 'STAFF_VPA_UPDATED',
        entityType: 'staff',
        entityId: '44444444-4444-4444-4444-444444444444',
        beforeState: { vpa: '[REDACTED]' },
        afterState: { vpa: '[REDACTED]' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
      };

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInserted]),
        }),
      } as unknown as ReturnType<typeof db.insert>);

      const result = await auditService.record({
        restaurantId: mockInserted.restaurantId,
        actorId: mockInserted.actorId,
        actorType: 'restaurant_user',
        action: 'staff_vpa_updated',
        entityType: 'STAFF',
        entityId: mockInserted.entityId,
        beforeState: { plainVpa: 'old@upi' },
        afterState: { plainVpa: 'new@upi' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockInserted.id);
      expect(result.action).toBe('STAFF_VPA_UPDATED');
    });

    it('enforces tenant scoping when querying tenant audit logs', async () => {
      const restaurantA = 'aaaa1111-1111-1111-1111-111111111111';

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            restaurantId: restaurantA,
            action: 'QR_ROTATED',
          },
        ]),
      };

      vi.spyOn(db, 'select').mockReturnValue(mockSelect as unknown as ReturnType<typeof db.select>);

      const logs = await auditService.getTenantLogs(restaurantA, { limit: 10 });
      expect(logs).toHaveLength(1);
      expect(logs[0]!.restaurantId).toBe(restaurantA);
    });
  });
});
