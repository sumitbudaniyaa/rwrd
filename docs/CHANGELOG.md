# TipTable Changelog

All completed development tasks are recorded in this file in reverse chronological order. Each entry details the milestone, task ID, date, agent, and specific changes made across code, tests, and documentation.

---

## [Unreleased] - Documentation & Monorepo Foundation

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
