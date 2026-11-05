# TipTable Changelog

All completed development tasks are recorded in this file in reverse chronological order. Each entry details the milestone, task ID, date, agent, and specific changes made across code, tests, and documentation.

---

## [Unreleased] - Documentation & Monorepo Foundation

### 2026-11-05 - Table & QR Management, PNG/SVG Download, Token Rotation & Print Placards (M3-T06)

- **Milestone**: M3 (Restaurant Admin App)
- **Task**: `M3-T06`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented backend QR code and table management routes in `apps/api/src/routes/adminQr.ts`:
    - `GET /api/v1/admin/restaurants/:restaurantId/qr`: Fetches active QR tokens and dining tables; provisions the universal/standing root QR token automatically if none exists.
    - `POST /api/v1/admin/restaurants/:restaurantId/qr/rotate`: Cryptographically rotates a target QR token, invalidating previous tokens and recording `QR_TOKEN_ROTATED` in audit logs.
    - `POST /api/v1/admin/restaurants/:restaurantId/tables`: Adds dining table with auto-provisioned unique table QR token and records `TABLE_CREATED` in audit logs.
  - Implemented frontend QR management interface in `apps/admin`:
    - Added API client methods (`getQrList`, `rotateQrToken`, `createTable`) in `apps/admin/src/services/api.ts`.
    - Built `QrManagementScreen` (`apps/admin/src/screens/QrManagementScreen.tsx`):
      - Renders General Restaurant QR card and table placards grid with live canvas preview via `qrcode`.
      - High-resolution PNG download (`toDataURL(1024x1024)`) and scalable SVG vector download.
      - "Add Dining Table" modal capturing table number (e.g. Table 4) and section (e.g. Terrace).
      - "Rotate Token" confirmation dialog alerting the user that previous printed placards are immediately invalidated.
      - Printable Table Placard modal with bilingual copy (English & Hindi) and print preview calling `window.print()` for physical acrylic/cardboard table displays.
  - Added comprehensive test suites:
    - `apps/api/tests/adminQr.test.ts` (4 tests covering token listing, tenant isolation, token rotation, and table creation).
    - `apps/admin/tests/qrManagement.test.tsx` (5 tests covering QR listing, PNG/SVG download generation, table addition, token rotation, and printable placard modal).
  - 100% clean typecheck and all 156 tests passing across monorepo packages.

### 2026-11-05 - Restaurant Settings, Google Review URL Validation & Tipping Bounds (M3-T05)

- **Milestone**: M3 (Restaurant Admin App)
- **Task**: `M3-T05`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented backend tenant settings endpoints in `apps/api/src/routes/adminRestaurant.ts`:
    - `GET /api/v1/admin/restaurants/:restaurantId/settings`: Returns restaurant identity, branding logo, Google review link, tip presets, and bounds under strict tenant isolation.
    - `PUT /api/v1/admin/restaurants/:restaurantId/settings`: Validates inputs using `UpdateRestaurantSettingsSchema` from `@tiptable/shared` (validating Google review URL domain and `minTip <= maxTip`).
    - Enforced role boundaries: Managers are strictly forbidden from modifying the restaurant's legal name (`403 Forbidden`), while Owners maintain full operational authority.
    - Auditing: Records `RESTAURANT_SETTINGS_UPDATED` with before/after state diffs via `auditService`.
  - Implemented frontend configuration interface in `apps/admin`:
    - Added `getRestaurantSettings` and `updateRestaurantSettings` in `apps/admin/src/services/api.ts`.
    - Built `SettingsScreen` (`apps/admin/src/screens/SettingsScreen.tsx`):
      - Brand & Legal Entity: name input (disabled for Manager role with explanation), logo square crop and compression (256x256), and remove logo action.
      - Google Review Integration: real-time validation ensuring review link belongs to `maps.app.goo.gl`, `g.page/r/`, or `google.com`. Explanatory banner reinforcing un-gated review compliance.
      - Tip Presets & Bounds: interactive chip manager supporting 1-6 quick-pick chip amounts with duplicate protection, plus minimum and maximum tip limits in INR.
      - Save Settings trigger with error alerts and success banner.
  - Added comprehensive test suites:
    - `apps/api/tests/adminRestaurant.test.ts` (7 tests covering retrieval, cross-tenant isolation, Google URL validation, min/max limits, manager role restriction, and audit logging).
    - `apps/admin/tests/settings.test.tsx` (5 tests covering profile rendering, manager role disablement, live URL validation, chip add/remove, and successful submission).
  - 100% clean typecheck and 147 tests passing across monorepo packages.

### 2026-11-05 - Waitstaff UPI VPA Capture, Live Camera & Image QR Scanner (M3-T04)

- **Milestone**: M3 (Restaurant Admin App)
- **Task**: `M3-T04`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Built `VpaQrScannerModal` (`apps/admin/src/components/VpaQrScannerModal.tsx`) for frictionless waitstaff onboarding without typos:
    - Live camera scanning with `navigator.mediaDevices.getUserMedia` (`facingMode: 'environment'`) and real-time canvas decoding via `jsQR` with target viewfinder reticle.
    - Image upload fallback supporting drag-and-drop / file upload of QR code screenshots exported from consumer UPI apps (GPay, PhonePe, Paytm, BHIM).
    - Extracted VPA parser (`extractVpaFromQrText`): supports standard UPI URIs (`upi://pay?pa=...&pn=...`), URI query parameter strings, and bare `handle@psp` formats with Zod schema validation.
    - Typo safeguard alert banner: _"Double-check the VPA. A wrong VPA sends diner tips directly to the wrong person. TipTable does not hold or mediate funds."_
    - Automatically transfers decoded VPA and optional Payee Name into the staff member creation/edit modal.
  - Integrated into `StaffManagementScreen` with dedicated "Scan UPI QR" action trigger.
  - Added unit test suite in `apps/admin/tests/vpaScanner.test.tsx` (10 tests covering deep link parsing, query extraction, raw string validation, modal tab switching, canvas decoding, and VPA capture callbacks).
  - 100% clean typecheck and all 21 admin tests passing.

### 2026-11-05 - Restaurant Admin Waitstaff Roster Management, VPA Encryption & Photo Crop (M3-T03)

- **Milestone**: M3 (Restaurant Admin App)
- **Task**: `M3-T03`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented backend administrative staff management API endpoints in `apps/api/src/routes/adminStaff.ts`:
    - `GET /api/v1/admin/restaurants/:restaurantId/staff`: Lists tenant waitstaff with masked VPAs (`r***a@okaxis`), protected by `requireAuth('admin')` and `requireTenant('restaurantId')`.
    - `POST /api/v1/admin/restaurants/:restaurantId/staff`: Validates input with Zod, validates UPI VPA format, encrypts VPA at rest via AES-256-GCM authenticated encryption, computes masked VPA, records DPDP consent timestamp, and records `STAFF_CREATED` audit log.
    - `PUT /api/v1/admin/restaurants/:restaurantId/staff/:staffId`: Updates display name, role label, and optional photo or VPA; re-encrypts VPA and triggers `STAFF_VPA_UPDATED` or `STAFF_UPDATED` audit events with before/after state diffs.
    - `DELETE /api/v1/admin/restaurants/:restaurantId/staff/:staffId`: Soft deletes staff member within tenant isolation boundary, setting `deletedAt` and `isActive = false`, and records `STAFF_DELETED` audit log.
    - `POST /api/v1/admin/restaurants/:restaurantId/staff/:staffId/toggle-active`: Toggles active status on/off and records `STAFF_STATUS_CHANGED` audit log.
  - Implemented frontend waitstaff management UI in `apps/admin`:
    - Added API client methods (`getStaffList`, `createStaff`, `updateStaff`, `deleteStaff`, `toggleStaffActive`) in `apps/admin/src/services/api.ts`.
    - Built `StaffManagementScreen` (`apps/admin/src/screens/StaffManagementScreen.tsx`):
      - Live search filtering by staff member name and role label.
      - Staff roster table with photo/initials fallback avatar, masked VPAs, active/inactive badge toggles, and edit/delete actions.
      - Add/Edit Team Member modal with explicit VPA safeguard alert: _"Double-check the VPA. A wrong VPA sends diner tips directly to the wrong person. TipTable does not hold or mediate funds."_
      - Client-side photo upload with square center-crop and JPEG compression (256x256).
      - Role label quick-tag chips ('Server', 'Head Waiter', 'Bartender', 'Host').
      - Soft-delete confirmation dialog explaining historical intent data retention.
  - Added comprehensive tests:
    - `apps/api/tests/adminStaff.test.ts`: 7 tests verifying CRUD operations, tenant isolation (cross-tenant 403 Forbidden), VPA validation and encryption.
    - `apps/admin/tests/staffManagement.test.tsx`: 5 tests covering roster rendering, masked VPA display, search query filtering, VPA warning presentation, create submission, status toggling, and soft deletion.
  - 100% clean typecheck and 125 tests passing across monorepo packages.

### 2026-11-05 - Restaurant Admin Authentication Flow, TOTP MFA Challenge & Session Management (M3-T02)

- **Milestone**: M3 (Restaurant Admin App)
- **Task**: `M3-T02`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented complete backend authentication flow for Restaurant Admin in `apps/api`:
    - Updated `POST /api/v1/admin/auth/login` to inspect `user.totpEnabled`. If enabled, issues an ephemeral signed JWT `tempToken` (5-minute expiry, `type: 'mfa_pending'`) without setting session cookies.
    - Implemented `POST /api/v1/admin/auth/mfa/challenge` validating 6-digit TOTP codes (via otplib with AES-256 decrypted secrets) or single-use recovery codes, promoting the session to fully authenticated with rotating `tiptable_admin_rf` refresh cookie.
    - Implemented `POST /api/v1/admin/auth/logout-all` revoking all active sessions across devices for the authenticated admin user.
    - Implemented `GET /api/v1/admin/auth/me` returning current user profile and tenant details.
  - Implemented frontend authentication architecture in `apps/admin`:
    - Created API client (`apps/admin/src/services/api.ts`) with silent 401 token refresh interceptor and double-submit CSRF headers.
    - Created `AuthContext` (`apps/admin/src/context/AuthContext.tsx`) managing in-memory access tokens, user state, silent session restoration, and login/MFA/logout actions.
    - Created `ProtectedRoute` (`apps/admin/src/components/ProtectedRoute.tsx`) gating `/admin/*` views behind active sessions.
    - Built minimal `LoginScreen` (`apps/admin/src/screens/LoginScreen.tsx`) with work email and password inputs, show/hide toggle, and RFC 7807 error problem detail alerts.
    - Built `MfaChallengeScreen` (`apps/admin/src/screens/MfaChallengeScreen.tsx`) supporting 6-digit TOTP input with auto-formatting and single-use emergency recovery code fallback.
    - Updated `AdminLayout` with real user initials, role badges, single-session logout, and "Log out of all devices" actions.
  - Added unit and integration tests:
    - `apps/api/tests/adminAuth.test.ts` (6 tests covering login, MFA challenge, invalid TOTP, cookie revocation, and logout-all).
    - `apps/admin/tests/auth.test.tsx` (4 tests covering login rendering, protected route redirection, direct authentication, and MFA challenge).
  - All 113 tests passing across the monorepo with 100% clean typecheck.

### 2026-11-05 - Restaurant Admin App Scaffolding & Minimal Design System (M3-T01)

- **Milestone**: M3 (Restaurant Admin App)
- **Task**: `M3-T01`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Created shared UI and motion primitives package `@tiptable/ui` in `packages/ui`:
    - Implemented `beUI` motion primitives (`FadeIn`, `SlideUp`, `ScaleIn`, `StaggerList`, `MotionButton`, `MotionCard`, `Badge`) with `prefers-reduced-motion` detection hook (`useReducedMotion`).
    - Standardized minimal design tokens: pure white background (`#FFFFFF`), single secondary accent (`#4F46E5`), solid light surface tints (`#F9FAFB`), subtle borders (`#E5E7EB`), and zero heavy shadows or gradients.
  - Scaffolded `@tiptable/admin` in `apps/admin`:
    - Setup Vite 6, React 18, TypeScript strict mode, Tailwind CSS, TanStack Query v5, and React Router v6.
    - Implemented `AdminLayout` (`apps/admin/src/layouts/AdminLayout.tsx`) featuring brand navigation, live tenant indicator, route tabs (Overview, Staff Roster, QR Management, Analytics, Settings, Audit Log), owner profile footer, and Hugeicons iconography.
    - Implemented `DashboardOverview` (`apps/admin/src/screens/DashboardOverview.tsx`) with metric cards (QR Scans, Staff Views, Tips Initiated, Google Review Taps) strictly adhering to the "tips initiated, never tips received" business invariant.
    - Setup Zod-validated environment configuration in `apps/admin/src/config/env.ts`.
  - Added unit test suite in `apps/admin/tests/scaffold.test.tsx` (2 tests verifying shell rendering, navigation, and invariant copy).
  - Monorepo typecheck 100% clean across all 5 workspace projects (`@tiptable/config`, `@tiptable/shared`, `@tiptable/ui`, `@tiptable/api`, `@tiptable/customer`, `@tiptable/admin`).

### 2026-11-05 - Customer App Internationalization: English & Hindi Support (M2-T10)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T10`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented internationalization (i18n) across `@tiptable/customer` using `i18next`, `react-i18next`, and `i18next-browser-languagedetector`:
    - Created localization dictionaries for English (`apps/customer/src/i18n/locales/en.json`) and Hindi (`apps/customer/src/i18n/locales/hi.json`).
    - Initialized i18n instance in `apps/customer/src/i18n/index.ts` with local storage caching (`tiptable_lang`), navigator detection, and fallback to `en`.
    - Created accessible, mobile-first `LanguageSwitcher` pill component (`apps/customer/src/components/LanguageSwitcher.tsx`) toggling between English and Hindi with active state indicators.
    - Updated Screens 1 through 5 (`HomeScreen`, `StaffScreen`, `AmountScreen`, `PayScreen`, `ThanksScreen`) and `ErrorScreen` to eliminate all hardcoded copy in favor of `useTranslation().t(...)`.
  - Added unit and localization test suite in `apps/customer/tests/i18n.test.tsx` (3 tests verifying default English rendering, dynamic Hindi toggle, and parameter interpolation).
  - All 18 customer tests and 101 monorepo tests passing with 0 errors.

### 2026-11-05 - Customer Screen 5: Post-Payment "You Came So Far" & Visibility Return Listener (M2-T09)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T09`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Customer Screen 5 in `apps/customer/src/screens/ThanksScreen.tsx`:
    - Gracious post-payment confirmation with serif typography ("You came so far...") thanking diners for supporting waitstaff.
    - Explicit non-confirmation payment messaging: acknowledges peer-to-peer UPI transfer initiation without erroneously declaring bank settlement completed.
    - Google Review call-to-action card with gold star rating display, opening restaurant review links in a new window with fire-and-forget telemetry (`source: 'post_tip_reminder'`).
    - Direct table home navigation to reset session.
  - Implemented automatic return detection in `RestaurantLayout` (`apps/customer/src/App.tsx`):
    - Subscribes to `document.visibilitychange` and `window.pageshow` events.
    - Senses when customer resumes focus from an external UPI payment application, retrieving cached `tiptable_active_tip` from `sessionStorage` and automatically advancing to the Thanks screen.
  - Added unit test suite in `apps/customer/tests/thanks.test.tsx` (3 tests, 100% pass rate).

### 2026-11-05 - Customer Screen 4: Pay Flow, UPI Deep Link & Fallback UI (M2-T08)

- **Milestone**: M2 (Public Customer Flow & UPI Deep-Link Engine)
- **Task**: `M2-T08`
- **Author**: Senior Staff Engineer (AI Agent)
- **Summary**:
  - Implemented Customer Screen 4 (Pay) in `apps/customer/src/screens/PayScreen.tsx`:
    - Dispatches intent creation request to `POST /api/v1/public/tips/intent` with waiter identifier, amount, and client platform hints.
    - Persists active tip session snapshot to `sessionStorage` (`tiptable_active_tip`) for visibility return detection.
    - Automates deep link navigation via `window.location.href = upiLink` to launch the device's native UPI app (Google Pay, PhonePe, Paytm, BHIM, CRED).
    - Comprehensive fallback UI for devices without registered UPI apps or within restricted in-app WebViews (Instagram, WhatsApp):
      - Recipient UPI ID display with 1-click clipboard copy and visual confirmation.
      - "Try Opening UPI App Again" trigger.
      - "I have completed payment" button for advancing to post-payment screen.
  - Added unit test suite in `apps/customer/tests/pay.test.tsx` (100% pass rate).

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
