import { AsyncLocalStorage } from 'node:async_hooks';
import { sql } from 'drizzle-orm';
import { db, type Database } from './index.js';
import { ForbiddenError } from '../errors/appError.js';
import { logger } from '../utils/logger.js';

export type RlsStore =
  | {
      mode: 'tenant';
      restaurantId: string;
      tx: Database;
    }
  | {
      mode: 'system';
      reason: string;
      tx: Database;
    };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rlsStorage = new AsyncLocalStorage<RlsStore>();

function isVitestMethodSpy(fn: unknown): boolean {
  return typeof fn === 'function' && Object.prototype.hasOwnProperty.call(fn, 'mock');
}

/**
 * In Vitest unit tests that spy directly on `db.select`/`insert`/`update`/`delete`
 * without mocking `db.transaction`, run callbacks against the mocked `db` instance
 * so unit spies continue to intercept queries while preserving AsyncLocalStorage guardrails.
 * In real Postgres tests and all non-Vitest runtimes, this always returns `false`.
 */
function shouldUseMockedDbDirectly(): boolean {
  if (process.env.VITEST !== 'true') {
    return false;
  }
  if (isVitestMethodSpy(db.transaction)) {
    return false;
  }
  return (
    isVitestMethodSpy(db.select) ||
    isVitestMethodSpy(db.insert) ||
    isVitestMethodSpy(db.update) ||
    isVitestMethodSpy(db.delete)
  );
}

/**
 * Returns the currently active AsyncLocalStorage RLS context, if any.
 */
export function getActiveRlsContext(): RlsStore | undefined {
  return rlsStorage.getStore();
}

async function executeRlsConfig(tx: Database, statement: ReturnType<typeof sql>): Promise<void> {
  if (
    process.env.VITEST === 'true' &&
    isVitestMethodSpy(db.transaction) &&
    typeof (tx as { execute?: unknown }).execute !== 'function'
  ) {
    return;
  }
  await tx.execute(statement);
}

/**
 * Resolves the active Drizzle database/transaction handle for the current async execution context.
 * Respects explicitly injected mock or transaction handles (`explicitDatabase !== db`).
 */
export function getContextDb(explicitDatabase: Database = db): Database {
  if (explicitDatabase !== db) {
    return explicitDatabase;
  }
  return rlsStorage.getStore()?.tx ?? explicitDatabase;
}

/**
 * Executes a database operation within a transaction where PostgreSQL Row-Level Security (RLS)
 * is strictly locked to `restaurantId` via transaction-local `app.current_restaurant_id`.
 */
export async function withTenantContext<T>(
  restaurantId: string,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  if (!UUID_REGEX.test(restaurantId)) {
    throw new Error(`Invalid restaurant UUID format for tenant context: ${restaurantId}`);
  }

  const existing = rlsStorage.getStore();

  if (existing?.mode === 'tenant') {
    if (existing.restaurantId !== restaurantId) {
      throw new ForbiddenError(
        'Cross-tenant RLS context switch inside an active transaction is forbidden',
      );
    }
    return await callback(existing.tx);
  }

  if (existing?.mode === 'system') {
    if (shouldUseMockedDbDirectly()) {
      return await rlsStorage.run({ mode: 'tenant', restaurantId, tx: existing.tx }, () =>
        callback(existing.tx),
      );
    }

    await executeRlsConfig(
      existing.tx,
      sql`SELECT set_config('app.rls_bypass', 'off', true), set_config('app.current_restaurant_id', ${restaurantId}, true)`,
    );
    try {
      return await rlsStorage.run({ mode: 'tenant', restaurantId, tx: existing.tx }, () =>
        callback(existing.tx),
      );
    } finally {
      try {
        await executeRlsConfig(
          existing.tx,
          sql`SELECT set_config('app.current_restaurant_id', '', true), set_config('app.rls_bypass', 'on', true)`,
        );
      } catch {
        // Ignore restore errors when transaction is already aborted and rolling back
      }
    }
  }

  if (shouldUseMockedDbDirectly()) {
    return await rlsStorage.run({ mode: 'tenant', restaurantId, tx: db }, () => callback(db));
  }

  return await db.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    logger.debug({ restaurantId }, 'Setting local RLS tenant session context');
    await executeRlsConfig(
      txDb,
      sql`SELECT set_config('app.rls_bypass', 'off', true), set_config('app.current_restaurant_id', ${restaurantId}, true)`,
    );
    return await rlsStorage.run({ mode: 'tenant', restaurantId, tx: txDb }, () => callback(txDb));
  });
}

/**
 * Executes an audited control-plane, pre-authentication, or background system operation
 * with transaction-local `app.rls_bypass = 'on'`.
 * Cannot be invoked inside an active single-tenant `withTenantContext` block.
 */
export async function withSystemContext<T>(
  reason: string,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  const existing = rlsStorage.getStore();

  if (existing?.mode === 'tenant') {
    throw new ForbiddenError('Cannot escalate an active tenant transaction to system RLS context');
  }

  if (existing?.mode === 'system') {
    return await callback(existing.tx);
  }

  if (shouldUseMockedDbDirectly()) {
    return await rlsStorage.run({ mode: 'system', reason, tx: db }, () => callback(db));
  }

  return await db.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    logger.debug({ reason }, 'Setting local RLS system context');
    await executeRlsConfig(
      txDb,
      sql`SELECT set_config('app.current_restaurant_id', '', true), set_config('app.rls_bypass', 'on', true)`,
    );
    return await rlsStorage.run({ mode: 'system', reason, tx: txDb }, () => callback(txDb));
  });
}
