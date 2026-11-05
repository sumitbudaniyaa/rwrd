# TipTable Operational Runbook

This runbook provides step-by-step procedures for local development setup, database migrations, seeding, production operations, disaster recovery, and key rotation.

---

## 1. Local Development Bootstrap

### 1.1 Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **Package Manager**: `pnpm` (v9.x)
- **Container Engine**: Docker Desktop or Colima with `docker-compose`

### 1.2 Initial Setup
1. **Clone the repository**:
   ```bash
   git clone <repo-url> rwrd
   cd rwrd
   ```
2. **Install all workspace dependencies**:
   ```bash
   pnpm install
   ```
3. **Configure environment files**:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/customer/.env.example apps/customer/.env
   cp apps/admin/.env.example apps/admin/.env
   cp apps/portal/.env.example apps/portal/.env
   cp apps/landing/.env.example apps/landing/.env
   ```
4. **Start local backing services**:
   ```bash
   docker-compose up -d
   ```
   *Services launched:*
   - PostgreSQL 16 on `localhost:5432` (db: `tiptable_dev`, user: `postgres`, pass: `postgres`)
   - Redis 7 on `localhost:6379`
   - MinIO Object Storage on `localhost:9000` (Console: `localhost:9001`)

5. **Execute database migrations**:
   ```bash
   pnpm --filter @tiptable/api db:migrate
   ```

6. **Seed development fixtures (dev only)**:
   ```bash
   pnpm --filter @tiptable/api db:seed
   ```
   *Creates a demo restaurant, test tables, active waitstaff, and admin/portal test accounts.*

7. **Start all services in development mode**:
   ```bash
   pnpm dev
   ```
   - API: `http://localhost:4000`
   - Customer App: `http://localhost:3000`
   - Restaurant Admin: `http://localhost:3001`
   - Company Portal: `http://localhost:3002`
   - Landing Site: `http://localhost:3003`

---

## 2. Verification Commands

Run these checks before submitting any commit:

```bash
# 1. Typecheck all workspaces
pnpm typecheck

# 2. Run linter across all workspaces
pnpm lint

# 3. Format check
pnpm format:check

# 4. Run unit and integration test suite
pnpm test

# 5. Secret audit
pnpm audit:secrets
```

---

## 3. Database Migration Procedures

We use **Drizzle Kit** for schema versioning.

### 3.1 Generating a New Migration
When modifying schema definitions in `apps/api/src/db/schema/`:
```bash
pnpm --filter @tiptable/api db:generate
```
Review the generated SQL file in `apps/api/src/db/migrations/` before committing.

### 3.2 Applying Migrations
- **Local / CI**:
  ```bash
  pnpm --filter @tiptable/api db:migrate
  ```
- **Production**:
  Executed as a pre-deploy release job in CI/CD before rolling out new application containers. Never run dev seed scripts in production.

---

## 4. Production Health & Observability

### 4.1 Health Check Endpoints
- **Liveness (`GET /healthz`)**:
  Returns `200 OK` if the Express process is accepting HTTP traffic.
- **Readiness (`GET /readyz`)**:
  Verifies active connections to PostgreSQL (`SELECT 1;`) and Redis (`PING`). Returns `200 OK` only when both backing services respond within 2000ms. Returns `503 Service Unavailable` otherwise.

### 4.2 Logging Standards
- All logs are formatted as single-line JSON via **Pino**.
- Every request carries a unique `x-request-id` header which is injected into all log entries and child loggers.
- Sensitive fields (`password`, `vpa`, `token`, `totpSecret`, `authorization`) are automatically redacted before stream output.

---

## 5. Disaster Recovery & Backups

### 5.1 Automated PostgreSQL Backup
Create a compressed binary dump of the production database:
```bash
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -F c -b -v -f /backups/tiptable_$(date +%Y%m%d_%H%M%S).dump
```

### 5.2 Restoration Procedure
In the event of database corruption or hardware failure:
1. Ensure the API is in maintenance mode.
2. Terminate existing client connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'tiptable_prod' AND pid <> pg_backend_pid();
   ```
3. Restore from the latest verified snapshot:
   ```bash
   pg_restore -h $PGHOST -U $PGUSER -d tiptable_prod -v --clean --if-exists /backups/verified_backup.dump
   ```
4. Verify data integrity and run `GET /readyz` before re-enabling traffic.

---

## 6. Security Runbook: Master VPA Key Rotation

When rotating the `VPA_ENCRYPTION_KEY`:

1. Generate a new 32-byte hexadecimal key:
   ```bash
   openssl rand -hex 32
   ```
2. Update the environment variables:
   - Set `VPA_ENCRYPTION_KEY` to the **new key**.
   - Set `VPA_ENCRYPTION_KEY_PREV` to the **old key**.
3. Deploy the application with both keys configured. The encryption service will:
   - Decrypt existing records using `VPA_ENCRYPTION_KEY_PREV`.
   - Encrypt any new or updated records using `VPA_ENCRYPTION_KEY`.
4. Trigger the background re-encryption job via CLI:
   ```bash
   pnpm --filter @tiptable/api cli:re-encrypt-vpas
   ```
5. Once all records are re-encrypted under the new key, remove `VPA_ENCRYPTION_KEY_PREV`.

