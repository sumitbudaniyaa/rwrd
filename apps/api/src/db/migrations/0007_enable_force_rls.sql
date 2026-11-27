-- Enable and enforce PostgreSQL Row-Level Security (RLS) on all tenant-scoped tables.
-- Fail-closed default: without `app.current_restaurant_id` or explicit `app.rls_bypass = 'on'`,
-- queries return 0 rows and mutations are rejected by PostgreSQL (SQLSTATE 42501).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tiptable_app') THEN
    CREATE ROLE tiptable_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOLOGIN;
  END IF;
END
$$;--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO tiptable_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tiptable_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tiptable_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tiptable_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tiptable_app;--> statement-breakpoint

ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "restaurants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "restaurants";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "restaurants"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "restaurant_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "restaurant_users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "restaurant_users";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "restaurant_users"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "staff";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "staff"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tables" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "tables";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "tables"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "qr_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qr_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "qr_tokens";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "qr_tokens"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "tip_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tip_intents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "tip_intents";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "tip_intents"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "review_taps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_taps" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "review_taps";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "review_taps"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "page_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "page_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "page_events";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "page_events"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "subscriptions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "subscriptions"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "invoices";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "invoices"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feature_flags" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "feature_flags";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "feature_flags"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "impersonation_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "impersonation_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "impersonation_requests";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "impersonation_requests"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_tickets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "support_tickets";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "support_tickets"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "audit_logs";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "audit_logs"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "sessions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "sessions"
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR restaurant_id = NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid
  );
