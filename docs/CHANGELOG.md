# TipTable Changelog

All completed development tasks are recorded in this file in reverse chronological order. Each entry details the milestone, task ID, date, agent, and specific changes made across code, tests, and documentation.

---

## [Unreleased] - Documentation & Monorepo Foundation

### 2026-11-05 - Customer Screen 3: Tip Amount Selection & Bounds Validation (M2-T07)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T07`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Customer Screen 3 (Amount Selection) in `apps/customer/src/screens/AmountScreen.tsx`:
    - Waitstaff profile card showing photo (or initials fallback), display name, and role label.
    - Quick-pick preset chips dynamically derived from tenant configuration (`restaurant.tipPresets`).
    - Custom numeric input with rupee symbol prefix (₹) and sanitization against non-digit characters.
    - Strict reactive bounds validation enforcing `restaurant.minTipInr` and `restaurant.maxTipInr`, with inline error feedback.
    - "Spread happiness" call-to-action button displaying real-time formatted INR amount (`₹<amount>`), disabled on validation errors or zero balance.
  - Added unit test suite in `apps/customer/tests/amount.test.tsx` covering presets, custom inputs, and boundary enforcement (100% pass rate).

### 2026-11-05 - Customer Screen 2: Staff Directory & Search (M2-T06)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T06`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Customer Screen 2 (Staff Directory) in `apps/customer/src/screens/StaffScreen.tsx`:
    - Case-insensitive search bar filtering active waitstaff by display name or role with instant clearing.
    - Two-column responsive card grid optimized for a 375px mobile viewport.
    - Rounded-square lazy-loaded staff photos with automatic fallback to two-letter initials avatars on image failure or missing photo.
    - Seamless navigation to amount selection (`/t/:token/staff/:staffId`) and accessible back navigation to Home.
    - Friendly empty state when no search matches or when no staff are currently on shift.
  - Added unit test suite in `apps/customer/tests/staff.test.tsx` (3 tests, 100% pass rate).
  - Total monorepo tests: 90 passing across `@tiptable/shared`, `@tiptable/api`, and `@tiptable/customer`.
  - **Milestone Cadence Check**: Task 25 completed! Pushing 5-task commit batch to `origin main`.

### 2026-11-05 - Customer Screen 1: Home View & Action Cards (M2-T05)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T05`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Screen 1 (Home) in `apps/customer/src/screens/HomeScreen.tsx`:
    - Restaurant branding header with logo fallback initials and table location chip (`tableNumber` • `section`).
    - Claude-style centered serif greeting ("You are here for...") in self-hosted Newsreader typography.
    - Equal visual weight dual cards:
      a) "Make the people who fed you happy" navigating to the staff directory (`/t/:token/staff`).
      b) "Review us" opening Google review page in a new window with fire-and-forget telemetry via `trackReviewTap`.
    - Zero review gating: direct navigation to Google Reviews strictly complying with Google platform policies.
  - Built `RestaurantContext` and providers handling QR token validation with query caching and graceful error fallback.
  - Built `LoadingScreen` skeleton animation and friendly `ErrorScreen` for expired/suspended QR codes.
  - Added unit test suite in `apps/customer/tests/home.test.tsx` (100% pass rate).

### 2026-11-05 - Customer Mobile App Scaffolding (M2-T04)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T04`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Scaffolded mobile-first customer application (`@tiptable/customer`) in `apps/customer`:
    - Vite 6 + React 18 + TypeScript in strict mode.
    - Tailwind CSS configuration optimized for a 375px primary mobile viewport with warm hospitality palette (cream, sand, charcoal).
    - Self-hosted typography definitions for Newsreader (Claude-style elegant serif) and Inter (UI sans-serif) with system fallbacks in `src/styles/fonts.css`.
    - Integrated TanStack Query v5, React Router v6, and typed API service client (`src/services/api.ts`) consuming `@tiptable/shared` schemas and RFC 7807 error envelopes.
    - Zero secrets invariant enforced via strict `clientEnv` Zod validation in `src/config/env.ts`.
  - Added unit test in `apps/customer/tests/scaffold.test.tsx` verifying component tree rendering.
  - Production build verification: 62.1 kB gzipped bundle built in 512ms.

### 2026-11-05 - Google Review Tap Telemetry Endpoint (M2-T03)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T03`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented review tap telemetry endpoint `POST /api/v1/public/restaurants/:id/review-tap` in `apps/api/src/routes/public.ts`:
    - Validates target restaurant status and verifies provided QR token authenticity and tenant ownership.
    - Records diner interaction metadata in `review_taps` table (`tableId`, `source`: `home_card` or `post_tip_reminder`).
    - Compliant with Google review policies: zero gating or incentivization; records click telemetry and returns 204 No Content.
  - Added `ReviewTapRepository` in `apps/api/src/repositories/reviewTapRepository.ts`.
  - Added test suite in `apps/api/tests/public.test.ts` verifying telemetry recording, token mismatch rejection, and validation (14 tests, 100% pass rate).

### 2026-11-05 - Tip Intent Creation & On-the-Fly UPI Deep Link Generation (M2-T02)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T02`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented tip intent endpoint `POST /api/v1/public/tips/intent` in `apps/api/src/routes/public.ts`:
    - Validates QR token and tenant bounds (`minTipInr` and `maxTipInr`), raising RFC 7807 422 Unprocessable Entity if outside restaurant limits.
    - Resolves waitstaff within the tenant boundary, decrypts AES-256-GCM VPA transiently in memory, and generates standardized `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>` deep link.
    - Records immutable tip intent in `tip_intents` table with initial `initiated` status and device client hints.
    - Guarded by Redis-backed sliding-window rate limiting (`tipIntentRateLimiter`) to prevent scraping or bot abuse.
  - Added integration test suite in `apps/api/tests/public.test.ts` (10 tests, 100% pass rate).

### 2026-11-05 - Public QR Token Resolution & Staff Directory (M2-T01)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T01`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented public customer endpoints in `apps/api/src/routes/public.ts`:
    - `GET /api/v1/public/restaurants/token/:token`: Resolves table QR tokens with validation, returning restaurant public branding (name, slug, logo URL, Google review URL, tip presets, min/max tip bounds) and associated table metadata. Returns RFC 7807 404 when tokens are disabled or expired.
    - `GET /api/v1/public/restaurants/:id/staff`: Fetches active waitstaff roster for diner tipping.
    - **Crucial Security Invariant Enforced**: VPAs (`vpaEncrypted`, `plainVpa`, `vpaMasked`) are completely omitted from the public staff DTO, preventing bulk scraper exfiltration.
  - Added `RestaurantRepository` in `apps/api/src/repositories/restaurantRepository.ts`.
  - Added public integration test suite in `apps/api/tests/public.test.ts` (5 tests, 100% pass rate).
  - Monorepo test count: 74 passing tests across `@tiptable/shared` and `apps/api`.
  - **Milestone Cadence Check**: Task 20 completed! Pushing 5-task commit batch to `origin main`.

### 2026-11-05 - Append-Only Audit Logging Engine (M1-T10)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T10`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented append-only audit logging engine in `apps/api/src/services/auditService.ts`:
    - Immutable event recording capturing `actorId`, `actorType` (`restaurant_user`, `platform_user`, `system`), `action`, `entityType`, `entityId`, `ipAddress`, and `userAgent`.
    - Automated sensitive field sanitization (`sanitizeAuditState`) that permanently redacts plain VPAs, encrypted VPAs, password hashes, TOTP secrets, and session tokens before persisting snapshots.
    - Tenant-scoped audit querying (`getTenantLogs`) enforcing `restaurantId` boundary isolation, preventing cross-tenant audit log leakage.
    - Platform-level audit query interface (`getPlatformLogs`) for super admin forensic inspection.
  - Added unit and multi-tenant isolation tests in `apps/api/tests/audit.test.ts` (100% pass rate).

### 2026-11-05 - Edge Security Middleware Suite & Rate Limiting (M1-T09)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T09`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Redis-backed sliding-window rate limiter in `apps/api/src/middleware/rateLimiter.ts`:
    - Atomic Redis pipeline (`zremrangebyscore`, `zadd`, `zcard`, `pexpire`) with in-memory sliding window fallback for resilient local execution and test environments.
    - Emits standard `RateLimit-*` and `Retry-After` headers and raises RFC 7807 429 Too Many Requests problem details upon threshold breach.
    - Configured tailored limiters: `globalRateLimiter` (default 100 req/min), `authRateLimiter` (20 req/15min on credential endpoints), and `tipIntentRateLimiter` (10 req/min).
  - Implemented CSRF defense-in-depth middleware in `apps/api/src/middleware/csrf.ts`:
    - Double-submit CSRF cookie pattern (`tiptable_csrf`) coupled with `x-csrf-token` header validation for state-changing browser interactions with auth cookies.
    - Safe methods (`GET`, `HEAD`, `OPTIONS`) exempted.
  - Hardened Helmet configuration in `apps/api/src/app.ts`:
    - Strict Content Security Policy (CSP) with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`.
    - HSTS (`maxAge: 1 year`, preload), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
  - Added security test suite in `apps/api/tests/security.test.ts` (9 tests, 100% pass rate).

### 2026-11-05 - RBAC Middleware & Tenancy Authorization (M1-T08)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T08`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented role-based access control and multi-tenancy authorization middleware in `apps/api/src/middleware/rbac.ts`:
    - `requireAuth(realm)`: validates Bearer token claims matching the designated auth realm (`admin` vs `portal`), attaching `req.user` (`id`, `role`, `realm`, `restaurantId`).
    - `requireRole(allowedRoles)`: enforces discrete role gates across Restaurant Admin (`owner`, `manager`) and Company Portal (`super_admin`, `support`, `finance`), throwing RFC 7807 403 Forbidden on violations.
    - `requireTenant(paramKey)`: mandates restaurant tenant boundary isolation. Rejects cross-tenant administrative tampering with 403 Forbidden while permitting authorized portal administrative inspection.
  - Ambient type declarations extended for `Express.Request.user`.
  - Added unit and HTTP integration test suite in `apps/api/tests/rbac.test.ts` (11 tests, 100% pass rate).

### 2026-11-05 - TOTP MFA Onboarding, Verification & Recovery Codes (M1-T07)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T07`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented TOTP MFA service in `apps/api/src/services/mfaService.ts` powered by `otplib` v13:
    - High-entropy Base32 secret generation (`generateMfaSecret`).
    - Standard `otpauth://` URI generator (`generateTotpUri`) for authenticator apps (Google Authenticator, 1Password, etc.).
    - Strict window verification (`verifyTotpCode`) with clock skew tolerance of ±1 step.
    - Cryptographic recovery codes generation (`generateRecoveryCodes`) producing 8-character uppercase alphanumeric codes.
    - Single-use consumption verification (`verifyAndConsumeRecoveryCode`) using constant-time hash matching.
  - Added unit test suite in `apps/api/tests/mfa.test.ts` verifying secret generation, RFC 6238 TOTP verification, and recovery code single-use lifecycle (100% pass rate).

### 2026-11-05 - Dual-Realm Authentication Engine & Token Rotation (M1-T06)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T06`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented dual-realm authentication architecture in `apps/api/src/services/authService.ts`:
    - Realm `admin`: signs access tokens with `ADMIN_JWT_SECRET`, audience `tiptable-admin`, refresh cookie `tiptable_admin_rf`.
    - Realm `portal`: signs access tokens with `PORTAL_JWT_SECRET`, audience `tiptable-portal`, refresh cookie `tiptable_portal_rf`.
  - Implemented cryptographic token family rotation and token reuse detection:
    - Attempted reuse of an already-rotated refresh token instantly revokes the entire session family (`familyId`) to neutralize token theft attacks.
  - Implemented HTTP routes:
    - `POST /api/v1/admin/auth/login`, `POST /api/v1/admin/auth/refresh`, `POST /api/v1/admin/auth/logout`.
    - `POST /api/v1/portal/auth/login`, `POST /api/v1/portal/auth/refresh`, `POST /api/v1/portal/auth/logout`.
  - Configured `cookie-parser` with `httpOnly`, `Secure` (in prod), `SameSite=Strict` cookies.
  - Integration test suite added in `apps/api/tests/auth.test.ts` (100% pass rate).
  - Milestone Cadence: Task 15 completed! Pushing 15-task commit history to `origin main`.

### 2026-11-05 - Argon2id Password Hashing & Secure Tokens (M1-T05)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T05`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Argon2id password hashing and verification in `apps/api/src/utils/authCrypto.ts` using `@node-rs/argon2` following OWASP parameters (19 MiB memory, 2 iterations, 32 bytes output).
  - Built high-entropy cryptographically secure token generator (`generateSecureToken`) producing URL-safe base64 strings.
  - Implemented SHA-256 token hashing (`hashToken`) to protect refresh tokens before database storage.
  - Built constant-time string comparison (`timingSafeHashMatch`) using `crypto.timingSafeEqual` against timing side-channel attacks.
  - Added unit test suite in `apps/api/tests/authCrypto.test.ts` (100% pass rate).

### 2026-11-05 - Multi-Tenant Repositories & RLS Isolation (M1-T04)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T04`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented PostgreSQL Row-Level Security (RLS) session transaction wrapper (`apps/api/src/db/rls.ts`) setting `app.current_restaurant_id`.
  - Built tenant-scoped repository abstraction layer:
    - `StaffRepository`: enforces tenant scoping on all waitstaff queries, inserts, updates, and soft deletes.
    - `TableRepository`: enforces tenant scoping on physical tables.
    - `QrTokenRepository`: resolves public QR tokens and manages rotation within tenant boundaries.
    - `TipIntentRepository`: enforces tenant parameterization on tip intent creation and reporting.
  - Added multi-tenancy invariant test suite (`apps/api/tests/tenancy.test.ts`) proving cross-tenant access returns null and cannot modify foreign records (100% pass rate).

### 2026-11-05 - AES-256-GCM VPA Encryption Service (M1-T03)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T03`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented cryptographic service in `apps/api/src/services/crypto.ts` for waitstaff financial protection.
  - Utilized AES-256-GCM authenticated encryption with 12-byte random IVs and 16-byte authentication tags.
  - Implemented zero-downtime key rotation support with automatic fallback to `VPA_ENCRYPTION_KEY_PREV`.
  - Implemented tamper detection ensuring manipulated ciphertexts or tags throw immediate errors.
  - Implemented `maskVpa` utility for safe display in administrative portals without exposing bank details.
  - Implemented `reEncryptVpa` for background key migration workflows.
  - Unit test suite added in `apps/api/tests/crypto.test.ts` (100% pass rate).

### 2026-11-05 - Drizzle Migrations & Development Seeder (M1-T02)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T02`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Generated initial SQL schema migrations (`apps/api/src/db/migrations/0000_ordinary_aqueduct.sql`) covering all 16 core PostgreSQL tables.
  - Implemented programmatic migration runner (`apps/api/src/db/migrate.ts`) using `drizzle-orm/postgres-js/migrator`.
  - Built comprehensive development seeder (`apps/api/src/db/seed.ts`):
    - Default billing plans (`pro`).
    - Demo restaurant "The Bombay Canteen" with active subscription.
    - Owner and manager users with Argon2id hashed credentials (`@node-rs/argon2`).
    - Platform super admin account (`admin@tiptable.in`).
    - 4 dining tables with linked high-entropy QR lookup tokens.
    - 3 waitstaff records with encrypted VPA fixtures and India DPDP consent timestamps.
    - System audit log entries.
  - Added unit test suite in `apps/api/tests/db.test.ts` (100% pass rate).

### 2026-11-05 - Drizzle ORM Schema Definitions (M1-T01)

- **Milestone**: M1 (Database Schema, Security Middleware & Authentication Engine)
- **Task**: `M1-T01`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Installed and configured `drizzle-orm` and `drizzle-kit` (`apps/api/drizzle.config.ts`).
  - Defined all 16 PostgreSQL tables matching `docs/DATA_MODEL.md`:
    - `restaurants`: multi-tenant primary account entity with tip bounds and review links.
    - `restaurant_users`: admin accounts with Argon2id passwords, TOTP fields, and tenant FK.
    - `platform_users`: TipTable platform staff accounts with role hierarchy and IP allowlist.
    - `sessions`: rotating refresh token family store with user type discriminator.
    - `staff`: waitstaff roster storing AES-256-GCM encrypted VPAs, IV, tag, masked VPA, and DPDP consent timestamp.
    - `tables`: restaurant tables with unique number constraint per tenant.
    - `qr_tokens`: cryptographic table QR lookup tokens with rotation timestamps.
    - `tip_intents`: records of initiated tips with coarse device metadata (zero customer PII).
    - `review_taps`: telemetry on Google review clicks.
    - `page_events`: aggregate scans and view counts.
    - `leads`: landing page demo requests.
    - `billing_plans`, `subscriptions`, `invoices`: SaaS flat fee subscription ledger.
    - `audit_logs`: immutable append-only audit trail with before/after snapshots.
    - `feature_flags`: tenant-specific feature toggle configurations.
  - Added unit test suite in `apps/api/tests/schema.test.ts` (100% pass rate).
  - Milestone Cadence: Task 10 completed! Pushing 10-task commit history to `origin main`.

### 2026-11-05 - GitHub Actions CI Pipeline Setup (M0-T09)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T09`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Configured `.github/workflows/ci.yml` defining automated CI matrix:
    - `lint-and-typecheck`: Prettier check, ESLint, strict TypeScript typechecking.
    - `test`: Automated integration tests with backing PostgreSQL 16 and Redis 7 container services.
    - `security`: Gitleaks secret leak detection and dependency audit.
  - Completed Milestone 0 (M0)! All 9 tasks in Milestone 0 are now fully implemented, verified, and documented.

### 2026-11-05 - Health & Readiness Probes (M0-T08)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T08`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented lazy database client with ping verification (`checkDbConnection`) in `apps/api/src/db/client.ts`.
  - Implemented Redis client with ping verification (`checkRedisConnection`) in `apps/api/src/cache/redis.ts`.
  - Added `/healthz` liveness route returning 200 OK for process health.
  - Added `/readyz` readiness route concurrently probing PostgreSQL and Redis with graceful 503 RFC 7807 degradation on dependency failure.
  - Added Supertest integration test suite with mock degradation testing (100% pass rate).

### 2026-11-05 - Backend API Foundation & RFC 7807 Error Handling (M0-T07)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T07`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Scaffolded `apps/api` with Express and strict TypeScript.
  - Implemented fail-fast environment validation via Zod in `apps/api/src/config/env.ts`.
  - Configured structured Pino logger (`apps/api/src/utils/logger.ts`) with automated redaction for passwords, secrets, tokens, and VPAs.
  - Built `requestIdMiddleware` injecting unique correlation IDs and child loggers.
  - Implemented centralized RFC 7807 problem details error handler (`errorHandler.ts`) supporting `ZodError`, `AppError`, and syntax errors with `application/problem+json`.
  - Added Supertest integration test suite with 100% pass rate.

### 2026-11-05 - Shared Domain Schemas & UPI Helpers (M0-T06)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T06`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Initialized `@tiptable/shared` package in `packages/shared/`.
  - Implemented core business boundary constants (`CURRENCY = 'INR'`, `TIP_BOUNDS`, `VPA_REGEX`).
  - Authored RFC 7807 problem details Zod schema (`ProblemDetailsSchema`).
  - Built UPI deep link generator (`buildUpiDeepLink`) and QR text parser (`parseUpiQrString`).
  - Created domain schemas for restaurants, staff, tip intents, and landing leads.
  - Added unit test suite in `packages/shared/tests/upi.test.ts` with 100% pass rate.

### 2026-11-05 - Docker Compose Environment Setup (M0-T05)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T05`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Configured `docker-compose.yml` defining services:
    - `postgres:16-alpine`: PostgreSQL 16 with persistent volume `postgres_data` and `pg_isready` healthcheck.
    - `redis:7-alpine`: Redis 7 with persistent volume `redis_data` and `redis-cli ping` healthcheck.
    - `minio/minio`: MinIO S3-compatible object storage with API (`:9000`), Console (`:9001`), and live healthcheck.
    - `minio-init`: Automates bucket creation (`tiptable-media`) and public download policies for staff photos.
  - Authored `docker/postgres/init.sql` provisioning `uuid-ossp` and `pgcrypto` extensions.
  - Completed 5 tasks milestone check: pushing commit history to `origin main`.

### 2026-11-05 - Git Hooks & Commit Hygiene Setup (M0-T04)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T04`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Configured Git remote `origin` pointing to `https://github.com/sumitbudaniyaa/rwrd.git`.
  - Installed and initialized Husky `9.x` with executable hooks in `.husky/`.
  - Implemented `.husky/pre-commit` triggering `lint-staged` for automated Prettier formatting.
  - Implemented `.husky/commit-msg` enforcing Conventional Commits via `@commitlint/cli` and `@commitlint/config-conventional`.
  - Authored `.lintstagedrc.json` and `commitlint.config.js`.
  - Verified commit message validation and staged file formatting.

### 2026-11-05 - Shared Tooling Package Configuration (M0-T03)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T03`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Created `@tiptable/config` shared package in `packages/config/`.
  - Configured strict base TypeScript configuration (`tsconfig.base.json`) enforcing `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
  - Authored specialized configurations for Node.js (`tsconfig.node.json`) and React frontends (`tsconfig.react.json`).
  - Authored shared Prettier formatting preset (`prettier.config.js`) and root config.
  - Authored shared base ESLint flat configuration (`eslint.base.js`).
  - Created root `tsconfig.json` referencing `@tiptable/config`.

### 2026-11-05 - Monorepo Root Initialization (M0-T02)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T02`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Initialized Git repository with `main` branch.
  - Configured `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`.
  - Configured root `package.json` with orchestration scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `db:*`) and strict engine constraints.
  - Authored comprehensive `.gitignore` preventing leaks of `.env`, secrets, builds, and system files.
  - Authored `.editorconfig` for cross-platform whitespace and newline standards.
  - Authored root `.env.example` documenting all configuration keys with safe dummy values.

### 2026-11-05 - Initialization of Core Documentation Suite (M0-T01)

- **Milestone**: M0 (Foundation, Tooling, Docs & Environment Setup)
- **Task**: `M0-T01`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Established developer and agent governance rules in `AGENTS.md`.
  - Authored comprehensive system architecture in `docs/ARCHITECTURE.md` including component and sequence diagrams.
  - Authored complete prioritized backlog for Milestones M0 through M6 in `docs/TODO.md`.
  - Initialized Architectural Decision Records in `docs/DECISIONS.md` covering monorepo tooling, UPI deep links, beUI motion + Hugeicons, Redis rate limiting, and AES-256-GCM encryption.
  - Specified database schema, relations, constraints, and Row-Level Security in `docs/DATA_MODEL.md`.
  - Outlined STRIDE threat model, security controls, and India DPDP compliance in `docs/SECURITY.md`.
  - Documented exhaustive environment variable dictionary in `docs/ENV.md`.
  - Created operational bootstrap, migration, and incident recovery guide in `docs/RUNBOOK.md`.
  - Designed RFC 7807 error envelopes and public/admin/portal endpoint contracts in `docs/API.md`.
