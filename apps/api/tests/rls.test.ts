import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { db, type Database } from '../src/db/index.js';
import {
  withTenantContext,
  withSystemContext,
  getActiveRlsContext,
  getContextDb,
} from '../src/db/rls.js';
import { StaffRepository } from '../src/repositories/staffRepository.js';
import { ForbiddenError } from '../src/errors/appError.js';

describe('PostgreSQL FORCE RLS & Context Guardrails (M7-T94)', () => {
  const tenantAId = '11111111-1111-1111-1111-111111111111';
  const tenantBId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-UUID tenant identifiers before touching the database', async () => {
    const txSpy = vi.spyOn(db, 'transaction');

    await expect(
      withTenantContext("'; SELECT set_config('app.rls_bypass', 'on', true); --", async () => 'x'),
    ).rejects.toThrow('Invalid restaurant UUID format');

    await expect(withTenantContext('not-a-uuid', async () => 'x')).rejects.toThrow(
      'Invalid restaurant UUID format',
    );

    expect(txSpy).not.toHaveBeenCalled();
  });

  it('sets transaction-local app.rls_bypass=off and app.current_restaurant_id via set_config', async () => {
    const executedStatements: string[] = [];
    const mockTx = {
      execute: vi.fn().mockImplementation(async (query: unknown) => {
        executedStatements.push(JSON.stringify(query));
        return [];
      }),
      select: vi.fn().mockReturnThis(),
    } as unknown as Database;

    const txSpy = vi
      .spyOn(db, 'transaction')
      .mockImplementation(async (callback: any) => callback(mockTx));

    const result = await withTenantContext(tenantAId, async (tx) => {
      const store = getActiveRlsContext();
      expect(store?.mode).toBe('tenant');
      if (store?.mode === 'tenant') {
        expect(store.restaurantId).toBe(tenantAId);
      }
      expect(getContextDb()).toBe(tx);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(txSpy).toHaveBeenCalledTimes(1);
    expect(executedStatements).toHaveLength(1);
    expect(executedStatements[0]).toContain('app.rls_bypass');
    expect(executedStatements[0]).toContain('app.current_restaurant_id');
    expect(executedStatements[0]).toContain(tenantAId);
    expect(getActiveRlsContext()).toBeUndefined();
  });

  it('reuses the active transaction when nested with the same restaurantId', async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockReturnValue({
        from: () => ({
          where: () => ({
            orderBy: () => [],
          }),
        }),
      }),
    } as unknown as Database;

    const txSpy = vi
      .spyOn(db, 'transaction')
      .mockImplementation(async (callback: any) => callback(mockTx));

    await withTenantContext(tenantAId, async () => {
      const staffRepo = new StaffRepository();
      const rows = await staffRepo.findAllByRestaurant(tenantAId);
      expect(rows).toEqual([]);
    });

    // Only one outer transaction opened; repository reused the active AsyncLocalStorage tx
    expect(txSpy).toHaveBeenCalledTimes(1);
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
  });

  it('blocks nested cross-tenant context switches inside an active tenant transaction', async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as Database;

    vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => callback(mockTx));

    await withTenantContext(tenantAId, async () => {
      await expect(withTenantContext(tenantBId, async () => 'should-never-run')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  it('blocks privilege escalation from active tenant context into withSystemContext', async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as Database;

    vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => callback(mockTx));

    await withTenantContext(tenantAId, async () => {
      await expect(
        withSystemContext('malicious_escalation', async () => 'should-never-run'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  it('narrows an outer system context when entering withTenantContext and restores it in finally', async () => {
    const calls: string[] = [];
    const mockTx = {
      execute: vi.fn().mockImplementation(async (query: unknown) => {
        calls.push(JSON.stringify(query));
        return [];
      }),
    } as unknown as Database;

    const txSpy = vi
      .spyOn(db, 'transaction')
      .mockImplementation(async (callback: any) => callback(mockTx));

    await withSystemContext('batch_job', async () => {
      expect(getActiveRlsContext()?.mode).toBe('system');

      await expect(
        withTenantContext(tenantAId, async () => {
          expect(getActiveRlsContext()?.mode).toBe('tenant');
          throw new Error('simulated_inner_failure');
        }),
      ).rejects.toThrow('simulated_inner_failure');

      // Outer context remains system and restore set_config executed
      expect(getActiveRlsContext()?.mode).toBe('system');
    });

    expect(txSpy).toHaveBeenCalledTimes(1);
    // 1) system ON, 2) tenant narrow OFF + tenantAId, 3) restore ON
    expect(calls).toHaveLength(3);
    expect(calls[0]).toContain("'on'");
    expect(calls[1]).toContain("'off'");
    expect(calls[1]).toContain(tenantAId);
    expect(calls[2]).toContain("'on'");
  });

  it('respects explicitly injected database instances in getContextDb', async () => {
    const customDb = { select: vi.fn() } as unknown as Database;
    const mockTx = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as Database;

    vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => callback(mockTx));

    await withTenantContext(tenantAId, async () => {
      expect(getContextDb(customDb)).toBe(customDb);
      expect(getContextDb()).toBe(mockTx);
    });
  });

  it('enforces ENABLE + FORCE ROW LEVEL SECURITY across all 15 tenant tables in migration 0007', () => {
    const migrationPath = path.resolve(__dirname, '../src/db/migrations/0007_enable_force_rls.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    const tenantTables = [
      'restaurants',
      'restaurant_users',
      'staff',
      'tables',
      'qr_tokens',
      'tip_intents',
      'review_taps',
      'page_events',
      'subscriptions',
      'invoices',
      'feature_flags',
      'impersonation_requests',
      'support_tickets',
      'audit_logs',
      'sessions',
    ];

    for (const table of tenantTables) {
      expect(migrationSql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      expect(migrationSql).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      expect(migrationSql).toContain(`CREATE POLICY "tenant_isolation_policy" ON "${table}"`);
    }

    expect(migrationSql).toContain(
      "NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid",
    );
    expect(migrationSql).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOLOGIN');
  });
});
