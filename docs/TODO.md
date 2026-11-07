# TipTable Task Backlog

This backlog tracks all development tasks across milestones. Work must be executed strictly **one task at a time** from this list following the plan -> approval -> execution -> documentation update protocol.

Status values:

- `Backlog`: Not yet scheduled or approved.
- `Approved`: Plan approved by user; ready for execution.
- `In progress`: Currently being worked on by the owner agent.
- `Done`: Implemented, tested, typechecked, linted, and documentation updated.

---

## Milestone 0: Foundation, Tooling, Docs & Environment Setup (M0)

| ID         | Task Description                                                                                                      | Status | Owner              | Date Completed | Ref / Notes                 |
| :--------- | :-------------------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :-------------------------- |
| **M0-T01** | Create project governance and shared memory documentation suite (`AGENTS.md` and `docs/*`).                           | `Done` | Senior Staff Agent | 2026-11-05     | 10 governance files created |
| **M0-T02** | Initialize pnpm monorepo root: workspace file, package.json, tooling scripts, and `.gitignore`.                       | `Done` | Senior Staff Agent | 2026-11-05     | Monorepo root initialized   |
| **M0-T03** | Configure shared tooling packages: `@tiptable/config` (TSConfig base, ESLint, Prettier presets).                      | `Done` | Senior Staff Agent | 2026-11-05     | Config package created      |
| **M0-T04** | Setup Git hooks with Husky and lint-staged (conventional commits, prettier, eslint, gitleaks).                        | `Done` | Senior Staff Agent | 2026-11-05     | Husky and commitlint active |
| **M0-T05** | Setup Docker Compose environment (PostgreSQL 16, Redis 7, MinIO local S3 storage).                                    | `Done` | Senior Staff Agent | 2026-11-05     | Docker compose configured   |
| **M0-T06** | Initialize `@tiptable/shared` package with initial domain schemas, types, and UPI helpers.                            | `Done` | Senior Staff Agent | 2026-11-05     | Shared schemas & UPI tested |
| **M0-T07** | Scaffold `apps/api` with strict Zod environment config parsing (fail-fast), Pino logging, and RFC 7807 error handler. | `Done` | Senior Staff Agent | 2026-11-05     | API foundation & RFC 7807   |
| **M0-T08** | Implement `/healthz` and `/readyz` endpoints with DB and Redis ping checks in `apps/api`.                             | `Done` | Senior Staff Agent | 2026-11-05     | Health & readiness probes   |
| **M0-T09** | Setup GitHub Actions CI workflow (lint, typecheck, test, build, audit, gitleaks check).                               | `Done` | Senior Staff Agent | 2026-11-05     | CI workflow active          |

---

## Milestone 1: Database Schema, Security Middleware & Authentication Engine (M1)

| ID         | Task Description                                                                                                                  | Status | Owner              | Date Completed | Ref / Notes                |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :------------------------- |
| **M1-T01** | Define Drizzle ORM schema for all entities (restaurants, staff, tables, qr_tokens, tip_intents, etc.).                            | `Done` | Senior Staff Agent | 2026-11-05     | All 16 tables defined      |
| **M1-T02** | Configure `drizzle-kit` migrations, execution scripts, and local development seeders.                                             | `Done` | Senior Staff Agent | 2026-11-05     | Migrations & seeders ready |
| **M1-T03** | Implement AES-256-GCM encryption service for VPA at-rest protection and key rotation support.                                     | `Done` | Senior Staff Agent | 2026-11-05     | AES-256-GCM crypto service |
| **M1-T04** | Implement tenant-scoped repository abstraction and PostgreSQL Row-Level Security (RLS) policies.                                  | `Done` | Senior Staff Agent | 2026-11-05     | Tenancy isolation verified |
| **M1-T05** | Implement Argon2id password hashing and secure token generation utilities.                                                        | `Done` | Senior Staff Agent | 2026-11-05     | Argon2id & token utils     |
| **M1-T06** | Implement dual-realm authentication (Restaurant Admin & Company Portal) with JWT and rotating refresh tokens in httpOnly cookies. | `Done` | Senior Staff Agent | 2026-11-05     | Dual auth engine & tokens  |
| **M1-T07** | Implement TOTP MFA onboarding, validation, and recovery codes for Admin and Portal users.                                         | `Done` | Senior Staff Agent | 2026-11-05     | Multi-factor auth          |
| **M1-T08** | Implement RBAC middleware (Owner, Manager, Super Admin, Support, Finance) and tenancy validation.                                 | `Done` | Senior Staff Agent | 2026-11-05     | Authorization              |
| **M1-T09** | Implement security middleware suite: Helmet CSP, CORS allowlist, Redis rate limiter, and CSRF protection.                         | `Done` | Senior Staff Agent | 2026-11-05     | Edge security              |
| **M1-T10** | Implement append-only audit logging engine capturing actor, IP, action, before/after states.                                      | `Done` | Senior Staff Agent | 2026-11-05     | Compliance & audit         |

---

## Milestone 2: Public API & Customer Mobile App (M2)

| ID         | Task Description                                                                                                           | Status | Owner              | Date Completed | Ref / Notes             |
| :--------- | :------------------------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :---------------------- |
| **M2-T01** | Implement public API endpoints: QR token resolver (`GET /public/restaurants/token/:token`) and active staff directory.     | `Done` | Senior Staff Agent | 2026-11-05     | Public API              |
| **M2-T02** | Implement tip intent creation endpoint (`POST /public/tips/intent`) with strict rate limiting and VPA decryption.          | `Done` | Senior Staff Agent | 2026-11-05     | Intent & UPI generation |
| **M2-T03** | Implement review click tracking endpoint (`POST /public/restaurants/:id/review-tap`).                                      | `Done` | Senior Staff Agent | 2026-11-05     | Review telemetry        |
| **M2-T04** | Scaffold `apps/customer` (Vite + React + TS strict, Tailwind CSS, self-hosted Newsreader/Fraunces fonts).                  | `Done` | Senior Staff Agent | 2026-11-05     | Customer app setup      |
| **M2-T05** | Build Customer Screen 1 (Home): Serif greeting, restaurant branding, "Review us" & "Make people happy" cards.              | `Done` | Senior Staff Agent | 2026-11-05     | Screen 1                |
| **M2-T06** | Build Customer Screen 2 (Staff Directory): Debounced search, 2-column grid, lazy photos with avatar fallback.              | `Done` | Senior Staff Agent | 2026-11-05     | Screen 2                |
| **M2-T07** | Build Customer Screen 3 (Amount): Quick-pick chips (configurable), custom numeric input, validation (min/max).             | `Done` | Senior Staff Agent | 2026-11-05     | Screen 3                |
| **M2-T08** | Build Customer Screen 4 (Pay): "Spread happiness" action, intent API call, UPI deep link redirection & fallback UI.        | `Done` | Senior Staff Agent | 2026-11-05     | Screen 4                |
| **M2-T09** | Build Customer Screen 5 ("You came so far"): Visibility listener return detection, thank-you note, Google review redirect. | `Done` | Senior Staff Agent | 2026-11-05     | Screen 5                |
| **M2-T10** | Setup i18n support in customer app (English & Hindi) with `react-i18next`.                                                 | `Done` | Senior Staff Agent | 2026-11-05     | Localization            |

---

## Milestone 3: Restaurant Admin App (M3)

| ID         | Task Description                                                                                                | Status | Owner              | Date Completed | Ref / Notes        |
| :--------- | :-------------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :----------------- |
| **M3-T01** | Scaffold `apps/admin` (Vite + React + TS strict, Tailwind CSS, `beUI` motion primitives, Hugeicons).            | `Done` | Senior Staff Agent | 2026-11-05     | Admin app setup    |
| **M3-T02** | Implement Admin Authentication: Email/password, TOTP MFA challenge, session management, logout all sessions.    | `Done` | Senior Staff Agent | 2026-11-05     | Admin auth UI      |
| **M3-T03** | Build Staff Management: Add, edit, soft delete, active toggle, photo crop/compression, role display labels.     | `Done` | Senior Staff Agent | 2026-11-05     | Staff CRUD & VPA   |
| **M3-T04** | Build VPA Capture & QR Scanner: QR code parser extracting `pa=`, VPA regex validation, typo safeguard warnings. | `Done` | Senior Staff Agent | 2026-11-05     | VPA scanner & QR   |
| **M3-T05** | Build Restaurant Settings: Name, logo upload, Google review URL validator, tip preset amounts, min/max limits.  | `Done` | Senior Staff Agent | 2026-11-05     | Settings UI & API  |
| **M3-T06** | Build Table QR Code Generator: Downloadable PNG/SVG/Printable PDF with table numbers and token rotation.        | `Done` | Senior Staff Agent | 2026-11-05     | QR generator & PDF |
| **M3-T07** | Build Admin Analytics Dashboard: Scans, staff views, tip intents, review taps, waiter breakdown, CSV export.    | `Done` | Senior Staff Agent | 2026-11-06     | Analytics UI & CSV |
| **M3-T08** | Build Audit Log Viewer: History of changes made within the tenant account.                                      | `Done` | Senior Staff Agent | 2026-11-06     | Tenant audit UI    |

---

## Milestone 4: Company Portal (M4)

| ID         | Task Description                                                                                                        | Status | Owner              | Date Completed | Ref / Notes        |
| :--------- | :---------------------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :----------------- |
| **M4-T01** | Scaffold `apps/portal` (Platform staff app, isolated auth realm, IP allowlist middleware).                              | `Done` | Senior Staff Agent | 2026-11-06     | Portal app setup   |
| **M4-T02** | Build Restaurant Management: List, create, onboard, suspend, reactivate, and soft-delete restaurants.                   | `Done` | Senior Staff Agent | 2026-11-06     | Restaurant admin   |
| **M4-T03** | Build Support Impersonation Mode: Session delegation with persistent banner and strict audit logging.                   | `Done` | Senior Staff Agent | 2026-11-06     | Support tooling    |
| **M4-T04** | Build Platform Dashboard: Global metrics, active restaurants, aggregate scans, intents, churn indicators.               | `Done` | Senior Staff Agent | 2026-11-06     | Platform analytics |
| **M4-T05** | Build Billing & Subscription Management: Flat monthly fee tracker, invoice records, payment status, auto-suspend rules. | `Done` | Senior Staff Agent | 2026-11-06     | Billing tracker    |
| **M4-T06** | Build Leads Management: Submissions pipeline from landing site demo request form.                                       | `Done` | Senior Staff Agent | 2026-11-06     | Lead CRM           |
| **M4-T07** | Build System Health & Feature Flags: API status, error rates, BullMQ worker status, per-restaurant flags.               | `Done` | Senior Staff Agent | 2026-11-06     | System ops         |

---

## Milestone 5: Landing Site & Lead Funnel (M5)

| ID         | Task Description                                                                                            | Status | Owner              | Date Completed | Ref / Notes     |
| :--------- | :---------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :-------------- |
| **M5-T01** | Scaffold `apps/landing` (SEO-optimized SSG/pre-rendered React landing site).                                | `Done` | Senior Staff Agent | 2026-11-06     | Landing setup   |
| **M5-T02** | Build Landing Sections: Hero pitch & CTA, 3-step explainer, restaurant benefits, interactive flow demo.     | `Done` | Senior Staff Agent | 2026-11-06     | Landing content |
| **M5-T03** | Build Pricing & FAQ sections: Flat monthly fee breakdown, zero tip cut clarity, no money custody guarantee. | `Done` | Senior Staff Agent | 2026-11-06     | Pricing & FAQ   |
| **M5-T04** | Build Demo Request Form: Rate-limited submission, Turnstile/hCaptcha verification, lead creation API.       | `Done` | Senior Staff Agent | 2026-11-06     | Lead capture    |
| **M5-T05** | Build Privacy Policy & Terms of Service pages (DPDP Act compliance & Google Review policy alignment).       | `Done` | Senior Staff Agent | 2026-11-06     | Legal pages     |

---

## Milestone 6: Hardening, Testing, Performance & Launch Readiness (M6)

| ID         | Task Description                                                                                                    | Status | Owner              | Date Completed | Ref / Notes              |
| :--------- | :------------------------------------------------------------------------------------------------------------------ | :----- | :----------------- | :------------- | :----------------------- |
| **M6-T01** | Write Supertest API test suite: Cross-tenant isolation verification, auth flows, rate limiting, validation.         | `Done` | Senior Staff Agent | 2026-11-06     | API test coverage        |
| **M6-T02** | Implement Playwright E2E tests: Customer scan-to-intent flow, Admin staff & QR flow, Portal onboarding flow.        | `Done` | Senior Staff Agent | 2026-11-06     | End-to-end testing       |
| **M6-T03** | Execute automated accessibility audit (axe-core / Lighthouse) ensuring WCAG 2.1 AA compliance (48px tap targets).   | `Done` | Senior Staff Agent | 2026-11-06     | A11y verification        |
| **M6-T04** | Perform k6 load testing on public endpoints (`/token/:token`, `/staff`, `/tips/intent`) and document p95 latencies. | `Done` | Senior Staff Agent | 2026-11-06     | Performance verification |
| **M6-T05** | Finalize runbooks: Disaster recovery, database backup/restore, key rotation, incident response checklist.           | `Done` | Senior Staff Agent | 2026-11-06     | Operational readiness    |

---

## Milestone 7: Architectural Streamlining & Auth Modernization (M7)

| ID         | Task Description                                                                                                            | Status | Owner              | Date Completed | Ref / Notes                   |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------- | :----- | :----------------- | :------------- | :---------------------------- |
| **M7-T01** | Enforce Anonymous Diner Tipping Architecture (Zero diner PII collection/storage in `tip_intents` & UI).                     | `Done` | Senior Staff Agent | 2026-11-07     | Diner privacy invariant       |
| **M7-T02** | Restructure Restaurant Admin Model to Single User per Tenant (`UNIQUE(restaurant_id)` & unified `admin` role).              | `Done` | Senior Staff Agent | 2026-11-07     | Single admin per tenant       |
| **M7-T03** | Overhaul Admin Login & Sign-Up UI with Modern Split-Screen Glassmorphic Hero Panel (Inspiration UI).                        | `Done` | Senior Staff Agent | 2026-11-07     | Auth UI overhaul              |
| **M7-T04** | Admin Auth UI Refinements (4-corner alignment, email-only label, hero cleanup) & Forgot Password with beUI Motion.          | `Done` | Senior Staff Agent | 2026-11-07     | beUI motion components        |
| **M7-T05** | Editorial Sign-In Page with beUI Input, StatefulButton, Touched Validation & Landscape Artwork.                             | `Done` | Senior Staff Agent | 2026-11-07     | Editorial auth page           |
| **M7-T06** | Admin Header Streamlining: Removed "Remember your password" label and "Save" button.                                        | `Done` | Senior Staff Agent | 2026-11-07     | Top-right header cleanup      |
| **M7-T07** | Custom Hero Artwork Integration: Deployed uploaded 1536×1024 `bg.png` asset for Sign In/Sign Up screen.                     | `Done` | Senior Staff Agent | 2026-11-07     | Custom hero image             |
| **M7-T08** | Multi-Step Interactive Sign-Up Flow with SharedLayoutBg & Right Tree Image Framing.                                         | `Done` | Senior Staff Agent | 2026-11-07     | Onboarding & framing          |
| **M7-T09** | Brand Logo Integration: Official stylized `rwrd.png` asset deployed across Admin Login & App Shell.                         | `Done` | Senior Staff Agent | 2026-11-07     | Brand logo integration        |
| **M7-T10** | Spring-Physics Gliding Motion in Onboarding Step 2: Integrated `SPRING_LAYOUT` & `SharedLayoutBg` hover indicator.          | `Done` | Senior Staff Agent | 2026-11-07     | Smooth hover animation        |
| **M7-T11** | Dashboard Aesthetic Overhaul & Auth Interaction Polish (Zero button outline, smooth input focus, no-scroll onboarding).     | `Done` | Senior Staff Agent | 2026-11-07     | Dashboard & auth polish       |
| **M7-T12** | Live Telemetry Integration & Seed Data Elimination (Dynamic greetings, real analytics, clean empty states, zero demo seed). | `Done` | Senior Staff Agent | 2026-11-07     | Hardcoded & seed data removed |
