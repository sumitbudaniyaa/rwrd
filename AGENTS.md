# TipTable AI Agent Protocol & Engineering Standards

Welcome to the TipTable codebase. This document defines the mandatory protocol and engineering standards that **all AI agents and human contributors** must adhere to when working on this repository.

---

## 1. The Core Protocol (Non-Negotiable)

1. **Plan First & Wait for Approval**:
   - Before executing any task, you must post a short plan:
     - What you will do.
     - Which files you will create or change.
     - The architectural/technical approach.
     - Potential risks and trade-offs.
     - Definition of Done (DoD).
   - **STOP and wait for user approval.** Do not create or edit code until explicit approval is granted.
2. **One Task at a Time**:
   - Work strictly on one discrete task at a time taken from `docs/TODO.md`.
   - Never combine unrelated tasks or jump ahead into future milestones.
3. **Continuous Documentation Updates & Git Cadence**:
   - After completing a task, update all relevant documentation files (`docs/CHANGELOG.md`, `docs/TODO.md`, and any affected architecture/API/security/data model docs) in the **same change**.
   - Git remote is configured to `https://github.com/sumitbudaniyaa/rwrd.git`.
   - Push to `origin main` systematically **every 5 completed tasks** (or at key milestone boundaries).
   - Summarize what was accomplished and ask which task should be tackled next.
4. **Zero Hardcoded Secrets & Config**:
   - Never hardcode URLs, ports, secrets, API keys, origins, business limits, or domain parameters.
   - Everything must be loaded through the validated environment configuration system (`@tiptable/config` / `src/config/env.ts`) using Zod.
   - If an environment variable is introduced, it must be documented immediately in `docs/ENV.md` and added with dummy values to `.env.example`.
5. **No Speculation on Ambiguity**:
   - If security, payments, data isolation, or product flows are ambiguous, ask the user. Never guess.
6. **Honest Verification**:
   - Never claim code works unless you have personally executed the typecheck, lint, and test suites. Report exact command outputs and status.

---

## 2. Shared Memory Architecture

All context across sessions and agents is preserved in the following files:

| File                   | Purpose                                              | Rule                                                                             |
| :--------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------- |
| `AGENTS.md`            | Protocol, coding standards, definition of done       | Keep up-to-date with developer conventions.                                      |
| `docs/ARCHITECTURE.md` | System overview, folder boundaries, Mermaid diagrams | Update whenever architectural patterns or data flows evolve.                     |
| `docs/TODO.md`         | Single source of truth backlog with task states      | Update state (`Backlog` -> `Approved` -> `In Progress` -> `Done`) synchronously. |
| `docs/CHANGELOG.md`    | Reverse chronological log of completed tasks         | Append an entry for every finished task.                                         |
| `docs/DECISIONS.md`    | Lightweight Architectural Decision Records (ADRs)    | Record all design decisions, alternatives, and consequences.                     |
| `docs/API.md`          | API contracts, route groups, RFC 7807 error formats  | Document all public, admin, and portal endpoints.                                |
| `docs/DATA_MODEL.md`   | PostgreSQL schemas, indexes, multi-tenancy rules     | Document every table, foreign key, and constraint before migration.              |
| `docs/SECURITY.md`     | Threat model (STRIDE), controls, DPDP compliance     | Maintain implemented vs pending security controls.                               |
| `docs/ENV.md`          | Exhaustive dictionary of all environment variables   | Every env variable must have a description, type, and dummy example.             |
| `docs/RUNBOOK.md`      | Local bootstrap, Docker commands, migrations, ops    | Maintain verified step-by-step developer and operator instructions.              |

---

## 3. Engineering & Code Standards

### 3.1 Technology Stack

- **Monorepo**: `pnpm` workspaces with strict package isolation.
- **Backend**: Node.js, Express, TypeScript (strict mode, zero `any`), Drizzle ORM, PostgreSQL 16, Redis 7 (BullMQ & rate limiting).
- **Frontends**: React 18/19, Vite, TypeScript (strict mode), React Router v6+, TanStack Query v5, React Hook Form + Zod.
- **UI & Motion**: `beUI` motion primitives (`motion/react`), `@hugeicons/react` + `@hugeicons/core-free-icons`, Tailwind CSS.
- **Testing**: Vitest, React Testing Library, Supertest (integration), Playwright (E2E), axe-core (accessibility).
- **Tooling**: ESLint, Prettier, Husky, lint-staged, Conventional Commits, Docker & Docker Compose.

### 3.2 Backend Layering Rules

Backend code in `apps/api` must strictly follow a 4-tier layered architecture:

```text
Routes -> Controllers -> Services -> Repositories (Drizzle ORM)
```

- **Routes**: Define paths, HTTP methods, route-level rate limits, and middleware (authentication, authorization, request validation).
- **Controllers**: Parse and validate requests via shared Zod schemas, invoke services, and return typed DTO responses or standard RFC 7807 problem envelopes. **No business logic or database queries in controllers.**
- **Services**: Execute domain and business logic, handle transactions, enforce tenant scoping, trigger audit logs, and throw domain errors.
- **Repositories**: Encapsulate all database interaction using Drizzle ORM. **All tenant queries must mandate `restaurant_id` parameterization.**

### 3.3 Multi-Tenancy Invariant

- **Rule**: A restaurant must never, under any circumstance, read, modify, or leak data belonging to another restaurant.
- **Application Level**: Every repository query on tenant-scoped tables must include `WHERE restaurant_id = :restaurant_id`.
- **Database Level (Defense-in-Depth)**: PostgreSQL Row-Level Security (RLS) is enabled on tenant tables with `SET LOCAL app.current_restaurant_id`.
- **Tests**: Every repository and API endpoint must have automated tests proving cross-tenant access returns 404 or 403.

### 3.4 Payment & UPI Invariant

- **We never touch customer funds.** We generate standardized UPI deep links:
  `upi://pay?pa=<VPA>&pn=<name>&am=<amount>&cu=INR&tn=<note>`
- VPAs must be stored encrypted at rest using AES-256-GCM.
- Staff VPAs are never exposed in bulk listings. They are only fetched via rate-limited, signed intent requests (`POST /api/v1/public/tips/intent`).
- UI copy must state "Tips initiated", never "Tips received" or "Payment successful", because UPI deep links execute out-of-band in third-party UPI apps.

### 3.5 Frontend Conventions

- **Mobile First**: Customer app is designed for 375px viewport first.
- **Typography**: Customer greeting uses self-hosted Newsreader / Fraunces serif; system uses Inter for sans-serif.
- **Iconography**: Use `@hugeicons/react` components with `HugeiconsIcon` or direct named exports with `strokeWidth={1.5}`.
- **State Management**: Server state via TanStack Query; minimal local UI state with React hooks.
- **Forms**: React Hook Form with Zod resolvers importing schemas from `@tiptable/shared`.
- **Zero Raw Secrets**: Only public non-sensitive config prefixed with `VITE_` allowed in client code.

---

## 4. Definition of Done (DoD)

A task in `docs/TODO.md` is considered **Done** only when:

1. All code changes adhere to TypeScript strict mode (no `any` types, zero build warnings).
2. Unit and integration tests cover happy paths, edge cases, and cross-tenant failure scenarios.
3. ESLint and Prettier passes with zero errors.
4. All new or modified endpoints conform to RFC 7807 problem responses.
5. All new configuration variables are documented in `docs/ENV.md` and added with dummy values to `.env.example`.
6. Associated documentation files (`docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATA_MODEL.md`, `docs/SECURITY.md`, `docs/RUNBOOK.md`) are updated.
7. `docs/CHANGELOG.md` is updated with a summary of changes.
8. `docs/TODO.md` status is updated to `Done` with date and notes.
