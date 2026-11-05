# Architectural Decision Records (ADRs)

This document records the architectural and design decisions made for **TipTable**, their context, evaluated alternatives, and consequences.

---

## ADR-001: Monorepo Architecture with pnpm Workspaces

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  The TipTable platform includes 4 client frontends (Customer, Restaurant Admin, Company Portal, Landing) and 1 API backend, along with shared Zod schemas, UI components, and TypeScript configurations. Managing multiple repositories would cause schema drift, duplicated code, and fragmented CI.
- **Alternatives Considered**:
  1. _Polyrepo (separate Git repo per app/package)_: High overhead in synchronizing Zod schemas and publishing internal npm packages.
  2. _npm / yarn workspaces_: Slower dependency resolution and less reliable symlink deduplication than pnpm.
  3. _Nx / Turborepo_: Added configuration complexity for early-stage development; pnpm workspaces provide native workspace filtering (`pnpm --filter`) with minimal boilerplate.
- **Decision**:
  Adopt **pnpm workspaces** in a single monorepo (`apps/api`, `apps/customer`, `apps/admin`, `apps/portal`, `apps/landing`, `packages/shared`, `packages/ui`, `packages/config`).
- **Consequences**:
  - Positive: Instant sharing of Zod validation schemas and TypeScript types between client and server.
  - Positive: Atomic cross-app commits and unified CI/CD pipelines.
  - Negative: Requires disciplined workspace boundaries to avoid inadvertent coupling between unrelated apps.

---

## ADR-002: Direct UPI Deep-Linking Without Intermediary Custody of Funds

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  TipTable enables diners to tip restaurant staff directly. In India, handling third-party funds requires Reserve Bank of India (RBI) Payment Aggregator (PA) licensing, nodal accounts, escrow management, and complex KYC obligations.
- **Alternatives Considered**:
  1. _Integrated Payment Gateway (Razorpay / Cashfree / Stripe)_: High transaction fees (1.5% - 2.5%), regulatory PA liability, delayed payouts to staff, and payout escrow management.
  2. _Direct UPI Deep-Linking (`upi://pay`)_: Zero transaction fees for diners and staff, zero platform custody, instantaneous money transfer from diner bank account to waiter bank account.
- **Decision**:
  Generate standardized UPI deep links (`upi://pay?pa=<VPA>&pn=<name>&am=<amount>&cu=INR&tn=<note>`) delivered via a rate-limited intent API (`POST /api/v1/public/tips/intent`). The diner's native UPI app handles authentication and settlement. TipTable never holds or touches the money.
- **Consequences**:
  - Positive: Zero financial liability or regulatory licensing required.
  - Positive: Zero payment processing fees deducted from staff tips.
  - Negative: TipTable cannot automatically verify if a transaction was completed or failed in the diner's bank app. The UI must clearly label metrics as "Tips initiated", never "Tips received".

---

## ADR-003: UI Motion Framework (beUI) & Iconography (Hugeicons)

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  The restaurant admin and company portal require a clean, minimal design aesthetic (pure white background, single accent color, light solid tints, generous whitespace, zero heavy shadows or gradients) with polished micro-interactions and accessible motion.
- **Alternatives Considered**:
  1. _shadcn/ui + Lucide_: Functional, but lacks specialized motion primitives and spring physics.
  2. _Ant Design / MUI_: Heavy runtime bundles, rigid styling conventions that clash with custom minimal design tokens.
  3. _beUI (`https://beui.dev`) + `@hugeicons/react`_: Built on React + Tailwind CSS + `motion` (`motion/react`), provides accessible reduced-motion support, spring tokens, and clean rounded stroke icons.
- **Decision**:
  Standardize on **beUI** motion primitives and `@hugeicons/react` (`@hugeicons/core-free-icons`, Stroke Rounded style) across all apps via `@tiptable/ui`.
- **Consequences**:
  - Positive: Consistent motion tokens, spring physics, and accessible keyboard/screen reader navigation.
  - Positive: Complete type safety and tree-shakeable SVG icons.
  - Negative: Requires maintaining vendored beUI primitives within the monorepo.

---

## ADR-004: Redis for Rate Limiting & BullMQ Async Queue

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  The public endpoints (`/token/:token`, `/staff`, `/tips/intent`) are exposed to the public internet and must resist abuse, automated scraping of staff VPAs, and DDoS spikes. Additionally, asynchronous tasks (email digests, CSV exports, billing reminders) require dependable background execution.
- **Alternatives Considered**:
  1. _In-memory rate limiting + node-cron_: Fails in multi-process/multi-instance deployments.
  2. _pg-boss (PostgreSQL-based queue)_: Avoids Redis dependency, but adds locking load to the primary relational database and does not provide atomic sliding-window rate limiting.
  3. _Redis 7 (rate-limit-redis + BullMQ)_: Sub-millisecond atomic counter increments, distributed sliding-window rate limiting, and robust job queueing with retry semantics.
- **Decision**:
  Deploy **Redis 7** as the shared memory store for rate limiting (`rate-limit-redis`), JWT refresh token family revocation, and BullMQ worker queues.
- **Consequences**:
  - Positive: Reliable distributed rate limiting across API replicas.
  - Positive: Dedicated background worker execution without database lock contention.
  - Negative: Requires running and monitoring a Redis service in local Docker and production.

---

## ADR-005: AES-256-GCM Column-Level Encryption for Waiter VPAs

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  Virtual Payment Addresses (VPAs) represent financial handles tied to staff bank accounts. Leaking a database dump or unauthorized SQL access must not expose raw financial addresses.
- **Alternatives Considered**:
  1. _Plaintext in DB with TLS in transit_: Inadequate if the database backup or replica is compromised.
  2. _Asymmetric encryption (RSA)_: Slower performance and higher ciphertext size without operational benefits for internal service decryption.
  3. _Symmetric AES-256-GCM with authentication tag_: Industry gold standard for authenticated encryption at rest. Protects confidentiality and detects tampering.
- **Decision**:
  Encrypt all `vpa` values in PostgreSQL at the application layer using **AES-256-GCM** before writing to disk. The initialization vector (IV) and authentication tag are stored alongside the ciphertext. Decryption keys are loaded strictly from validated environment variables with key rotation support.
- **Consequences**:
  - Positive: Absolute data protection for waitstaff financial identifiers at rest.
  - Negative: Cannot perform arbitrary SQL `LIKE` queries on raw VPAs in the database; search must be indexed via HMAC blind indexes if ever needed.

---

## ADR-006: Self-Hosted Customer Typography (Newsreader & Inter)

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  The customer greeting ("You are here for...") requires a warm, sophisticated serif matching Claude's aesthetic. Google Fonts CDN calls cause layout shifts (CLS), inject external tracking cookies/requests, and fail when connections are spotty.
- **Alternatives Considered**:
  1. _Google Fonts CDN runtime link_: Adds 150-300ms DNS/TLS handshake delay on mobile 4G networks; privacy leak.
  2. _System serif (`Times New Roman`, `Georgia`)_: Inconsistent rendering across Android and iOS devices.
  3. _Self-hosted Newsreader WOFF2_: Zero runtime external dependencies, fast preloading, consistent cross-device typographic quality.
- **Decision**:
  Bundle self-hosted **Newsreader** WOFF2 files directly in `apps/customer/public/fonts/` with CSS `@font-face` declarations using `font-display: swap`. Use system/self-hosted **Inter** for all sans-serif UI copy.
- **Consequences**:
  - Positive: Eliminates external third-party requests, guarantees privacy compliance, and achieves Lighthouse performance 95+.
  - Negative: Adds ~60KB to initial static asset distribution.

---

## ADR-007: Separation of Auth Realms (Restaurant Admin vs Company Portal)

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  TipTable has two privileged interfaces: the Restaurant Admin App (used by external restaurant owners and managers) and the Company Portal (used by internal platform staff, support, and super admins). Conflating user tables or JWT secrets presents an enormous privilege escalation risk.
- **Alternatives Considered**:
  1. _Single `users` table with a `role` column_: High risk of horizontal or vertical privilege escalation due to programming oversights in RBAC middleware.
  2. _Completely separate databases_: Operational overhead and unnecessary data fragmentation.
  3. _Dedicated database entities and separate auth realms_: Distinct tables (`restaurant_users` vs `platform_users`), distinct JWT secrets/audiences, distinct session stores, and isolated cookie paths.
- **Decision**:
  Implement two distinct authentication realms in the API (`/api/v1/auth/admin` vs `/api/v1/auth/portal`) with separate database tables, separate JWT secrets/audiences, and mandatory TOTP MFA for platform staff.
- **Consequences**:
  - Positive: Complete isolation between internal operators and external customers.
  - Positive: Support impersonation is modeled cleanly as an explicit, auditable delegation session.

---

## ADR-008: UPI App Fallback & Browser Visibility Return Detection

- **Status**: Accepted
- **Date**: 2026-11-05
- **Context**:
  When a diner taps "Spread happiness", the browser opens a native UPI application via `upi://` URI scheme. The diner will either complete or cancel the payment, then switch back to the browser.
- **Alternatives Considered**:
  1. _Polling backend for payment completion_: Impossible because UPI deep links settle outside our infrastructure without webhook callbacks.
  2. _Blind static delay/timer_: Poor UX; may fire before the user even opens their UPI app.
  3. _Page visibility and `pageshow` event listeners with sessionStorage_: When the browser switches back into focus after the deep link trigger, the event listener detects the return and transitions the customer view to the "You came so far" screen.
- **Decision**:
  Track deep link activation in `sessionStorage`. Register both `visibilitychange` and `pageshow` listeners to reliably detect when the diner returns to the customer app, displaying the thank-you screen and the Google review prompt. Include a copy-to-clipboard VPA fallback for devices without registered UPI apps.
- **Consequences**:
  - Positive: Seamless post-payment transition without fragile polling.
  - Negative: Cannot know if the diner paid or cancelled; copy must graciously say "Thank you for spreading happiness" and "Don't forget to review us".
