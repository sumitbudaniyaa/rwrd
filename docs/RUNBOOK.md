# TipTable Operational Runbook & SRE Manual

This runbook defines the verified, step-by-step procedures for local development, production operations, database backups, disaster recovery, cryptographic key rotation, and 24/7 incident response.

---

## 1. Local Development Bootstrap

### 1.1 Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS)
- **Package Manager**: `pnpm` (v9.x or v12.x)
- **Container Engine**: Docker Desktop, OrbStack, or Colima with `docker-compose`
- **Testing Runtimes**: Playwright Chromium (`pnpm exec playwright install chromium`), k6 (`brew install k6`)

### 1.2 Initial Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/sumitbudaniyaa/rwrd.git
   cd rwrd
   ```

   _Remote Cadence:_ Push to `origin main` systematically every 5 completed tasks.

2. **Install all workspace dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure environment files from templates**:

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

   _Services launched:_
   - PostgreSQL 16 on `localhost:5432` (db: `tiptable_dev`, user: `postgres`, pass: `postgres`)
   - Redis 7 on `localhost:6379`
   - MinIO Object Storage on `localhost:9000` (Console: `localhost:9001`)

5. **Execute database migrations & seed fixtures**:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   _Provisions standard SaaS billing tiers and the Super Admin account (`sumit@rwrd.live` / `12345678`) with zero tenant demo clutter._

6. **Start all services in development mode**:
   ```bash
   pnpm dev
   ```
   - Customer App: `http://localhost:3000`
   - Restaurant Admin: `http://localhost:3001`
   - Company Portal: `http://localhost:3002`
   - Landing Site: `http://localhost:3003`
   - API Backend: `http://localhost:4000/api/v1`

---

## 2. Verification Commands & CI Pipeline

Run these commands prior to committing any change:

```bash
# 1. Strict TypeScript compilation across all 7 packages
pnpm typecheck

# 2. ESLint across all packages with zero warnings
pnpm lint

# 3. Code formatting verification
pnpm format:check

# 4. Full Vitest unit & integration test suite (57+ files, 288+ tests)
pnpm test

# 5. Playwright E2E test suite (Customer mobile, Admin desktop, Portal)
pnpm test:e2e

# 6. k6 performance smoke test
pnpm test:load
```

---

## 3. Database Migration Procedures

We use **Drizzle ORM & Drizzle Kit** for schema versioning.

### 3.1 Creating a Schema Migration

When updating PostgreSQL schemas in `apps/api/src/db/schema/`:

```bash
pnpm db:generate
```

Review the resulting SQL migration file in `apps/api/src/db/migrations/` before committing.

### 3.2 Applying Migrations

- **Local Development**:
  ```bash
  pnpm db:migrate
  ```
  _Mandatory Invariant:_ Schema migrations must always be applied to the active database immediately following `pnpm db:generate`. Never commit schema TypeScript updates without running and verifying `pnpm db:migrate` against the active PostgreSQL database.
- **Production Deployment**:
  Executed as an immutable pre-deploy task in the CI/CD pipeline. Application containers do not start until the migration exit code is `0`.

---

## 4. Production Health, Telemetry & Observability

### 4.1 Health Check Probes

- **Liveness (`GET /healthz`)**:
  Returns `200 OK` as long as Node.js HTTP event loop is responsive.
- **Readiness (`GET /readyz`)**:
  Probes active PostgreSQL (`SELECT 1;`) and Redis (`PING`) connections. If either dependency exceeds 2000ms, returns `503 Service Unavailable`.
- **System Diagnostics (`GET /api/v1/portal/system/health`)**:
  Provides platform operators with memory RSS/heap breakdown, DB connection pool health, and Redis latency. Protected by portal IP allowlist.

### 4.2 Logging Standards

- Single-line JSON formatted via **Pino**.
- Every request is tagged with a UUID `x-request-id` passed downstream.
- Sensitive fields (`password`, `vpaEncrypted`, `totpSecret`, `authorization`) are automatically redacted at serialization.

---

## 5. Disaster Recovery (DR) Plan & Business Continuity

### 5.1 Objectives & Architecture

- **Recovery Time Objective (RTO)**: &le; 15 minutes (time to restore service).
- **Recovery Point Objective (RPO)**: &le; 5 minutes (maximum permissible data loss window).
- **Primary Region**: AWS `ap-south-1` (Mumbai).
- **Standby DR Region**: AWS `ap-south-2` (Hyderabad).

### 5.2 Automated Continuous Backup Architecture

1. **WAL Archiving**: PostgreSQL Write-Ahead Logs (WAL) are streamed continuously to an Amazon S3 bucket with Object Lock (WORM compliance) in `ap-south-2`:
   ```bash
   archive_command = 'aws s3 cp %p s3://tiptable-wal-archives-hyd/%f'
   ```
2. **Daily Logical Dumps**: Compressed database snapshots taken daily at 02:00 IST:
   ```bash
   pg_dump -h $PGHOST -U $PGUSER -d tiptable_prod -F c -b -v -f /backups/tiptable_$(date +%Y%m%d_%H%M%S).dump
   ```

### 5.3 Point-in-Time Recovery (PITR) Procedure

In the event of accidental data deletion or hardware failure:

1. Place the public API in maintenance mode:
   ```bash
   fly scale count 0 --app tiptable-api-prod
   ```
2. Identify the target timestamp prior to the incident (e.g. `2026-11-06 14:15:00 IST`).
3. Restore base backup to standby server:
   ```bash
   pg_restore -h $DR_PGHOST -U $PGUSER -d tiptable_prod --clean --if-exists /backups/base_backup.dump
   ```
4. Configure `recovery.signal` and `postgresql.conf`:
   ```ini
   restore_command = 'aws s3 cp s3://tiptable-wal-archives-hyd/%f %p'
   recovery_target_time = '2026-11-06 14:15:00+05:30'
   recovery_target_action = 'promote'
   ```
5. Start PostgreSQL and verify logs confirm target replay reached:
   ```bash
   tail -n 100 /var/log/postgresql/postgresql.log
   ```
6. Update application connection string `DATABASE_URL` and restart API instances.

---

## 6. Security Runbook: Master VPA & Secret Rotation

### 6.1 AES-256-GCM Master VPA Key Rotation (Zero Downtime)

When rotating the staff VPA encryption key (`VPA_ENCRYPTION_KEY`):

1. **Generate a new 32-byte cryptographically secure hex key**:
   ```bash
   openssl rand -hex 32
   ```
2. **Configure dual-key fallback in environment**:
   - `VPA_ENCRYPTION_KEY`: Set to the **newly generated key**.
   - `VPA_ENCRYPTION_KEY_PREV`: Set to the **current active key**.
3. **Deploy API backend**:
   - New staff records and updates will immediately encrypt using the new key.
   - Decryption transparently falls back to `VPA_ENCRYPTION_KEY_PREV` if the auth tag fails on the new key.
4. **Execute background batch re-encryption script**:
   ```bash
   pnpm --filter @tiptable/api cli:re-encrypt-vpas
   ```
5. **Verify zero records remain under previous key**, then remove `VPA_ENCRYPTION_KEY_PREV` and redeploy.

### 6.2 JWT Secret Rotation

1. Deploy updated JWT verification middleware supporting both `JWT_SECRET_NEW` and `JWT_SECRET_CURRENT`.
2. Issue all new tokens using `JWT_SECRET_NEW`.
3. Allow 24 hours for short-lived access tokens (15m expiry) and refresh tokens (7d) to cycle naturally.
4. Promote `JWT_SECRET_NEW` to primary `JWT_SECRET` and deprecate old secret.

---

## 7. 24/7 Incident Response Checklist & Playbook

### 7.1 Severity Matrix

| Severity | Definition                                                           | Initial Response | Escalation Target       |
| :------- | :------------------------------------------------------------------- | :--------------- | :---------------------- |
| **P1**   | Diners unable to scan or generate UPI links; API down; DB failure.   | &le; 5 minutes   | On-call Lead + VP Eng   |
| **P2**   | Restaurant Admin or Portal inaccessible; elevated error rate (> 2%). | &le; 15 minutes  | SRE On-call + Tech Lead |
| **P3**   | Analytics delay; non-critical UI bug; minor portal reporting glitch. | &le; 2 hours     | Next business sprint    |

### 7.2 Immediate Incident Checklist (P1 / P2)

```text
[ ] 1. TRIAGE: Confirm incident status via /healthz, /readyz, and CloudWatch/Pino logs.
[ ] 2. ROLES: Designate Incident Commander (IC) and Communications Lead.
[ ] 3. WAR ROOM: Open dedicated Slack/Meet channel #incident-YYYYMMDD-triage.
[ ] 4. MITIGATE:
      - If rogue deployment: Roll back to previous Git SHA immediately.
      - If DB connection exhaustion: Increase pool or reboot read replica.
      - If UPI deep link generation failure: Check VPA encryption key integrity.
[ ] 5. NOTIFY: Post public status update at status.tiptable.in ("Investigating QR link latency").
[ ] 6. POST-INCIDENT: Draft Blameless RCA within 24 hours (root cause, timeline, action items).
```

### 7.3 Restaurant Partner Communication Template

> **Subject**: [Resolved] TipTable Service Update - Table QR Placard Resolution
>
> Dear Restaurant Partner,
>
> Between 19:42 IST and 19:54 IST today, our table QR resolution system experienced intermittent latency affecting diner scan redirects.
>
> **Impact on Funds**: Because TipTable is 100% non-custodial and never holds diner funds, no staff tips were held, diverted, or lost. All completed UPI transfers settled directly into your waitstaff's bank accounts.
>
> Our engineering team has resolved the underlying dependency issue and full performance has been restored.
>
> Warm regards,  
> TipTable Operations Team
