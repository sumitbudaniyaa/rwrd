# TipTable Security Architecture & Threat Model

This document outlines the threat model, technical security controls, data protection policies, and incident response procedures for the TipTable platform.

---

## 1. STRIDE Threat Model

| Threat Category | Potential Attack Vector | TipTable Architectural Defense |
| :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates an admin user or generates fake QR tokens. | - Argon2id password hashing + mandatory TOTP MFA.<br/>- Cryptographic high-entropy QR lookup tokens (`qr_tokens`).<br/>- Dual isolated auth realms for Admin and Portal users.<br/>- Token rotation and session family tracking. |
| **Tampering** | Attacker substitutes a waiter's VPA with their own, or alters table QR codes. | - AES-256-GCM authenticated encryption on VPAs at rest.<br/>- Strict VPA change authorization, optional cooling-off period, and immutable audit logs.<br/>- Physical QR tamper protection: restaurant branding and table verification code displayed prominently in customer app. |
| **Repudiation** | An admin claims they did not delete staff, or a platform agent denies changing billing. | - Immutable, append-only `audit_logs` table capturing `actor_id`, `actor_type`, `action`, IP address, user agent, and full before/after JSON state snapshots. |
| **Information Disclosure** | Scraping the entire staff roster and their bank VPAs; leaking cross-tenant data. | - Staff VPAs are **never** returned in the public staff list.<br/>- VPA is only decrypted transiently during an individual, rate-limited tip intent (`POST /public/tips/intent`).<br/>- Strict tenant repository scoping + PostgreSQL RLS. |
| **Denial of Service** | Flooding public endpoints (`/token/:token`, `/tips/intent`, `/leads`). | - Redis-backed sliding-window rate limiters per IP and per waiter.<br/>- Cloudflare Turnstile / hCaptcha on lead forms.<br/>- Body size caps, HTTP parameter pollution protection (`hpp`), and timeout guards. |
| **Elevation of Privilege** | A restaurant manager escalates to owner, or an admin accesses portal routes. | - Rigid RBAC middleware enforced at both route and domain service layers.<br/>- Separate JWT secrets, audiences, and cookie paths for Admin (`/api/v1/admin`) vs Portal (`/api/v1/portal`). |

---

## 2. Security Controls Matrix

### Implemented & Architecture Controls
- [x] **Zero Money Custody**: Deep-link architecture eliminates financial aggregator licensing requirements and fund-handling risks.
- [x] **Column-Level VPA Encryption**: AES-256-GCM encryption with 12-byte IV and 16-byte authentication tag for all stored VPAs.
- [x] **Session Family Invalidation**: Refresh token reuse detection automatically invalidates the entire session family in Redis/Postgres.
- [x] **Multi-Tenancy Defense-in-Depth**: Strict tenant scoping in Drizzle repositories complemented by PostgreSQL Row-Level Security (RLS).
- [x] **No Customer PII**: Zero customer accounts, zero phone/email collection, zero banking credentials stored.
- [x] **Server-Side Image Sanitization**: All uploaded staff photos stripped of EXIF metadata and re-encoded using `sharp`.
- [x] **HTTP Security Headers**: Strict Content-Security-Policy (CSP), HSTS, `no-sniff`, `frame-ancestors 'none'`, and stripped `X-Powered-By`.
- [x] **Strict CORS & Origin Whitelisting**: Explicit origin checking driven by validated environment config.
- [x] **Automated Secret Scanning**: Pre-commit hooks and GitHub Actions CI pipelines scanning with `gitleaks`.

### Controls Pending Implementation in M1-M6
- [ ] **M1**: Automated account lockout with exponential backoff on repeated failed logins.
- [ ] **M1**: CSRF protection for cookie-based state-changing endpoints.
- [ ] **M3**: Waiter VPA change approval cooling-off period.
- [ ] **M5**: Cloudflare Turnstile / hCaptcha integration on public demo request forms.
- [ ] **M6**: Automated penetration testing and dependency vulnerability scanning in CI (`pnpm audit`).

---

## 3. India DPDP Act (2023) Compliance

TipTable is engineered to comply fully with India's **Digital Personal Data Protection Act, 2023 (DPDP)**:

1. **Waitstaff Data Consent**:
   - Waitstaff display names, photos, and VPAs constitute personal data.
   - When an admin adds a staff member, the system mandates recording an explicit consent timestamp (`consent_recorded_at`).
   - Staff have the right to request deletion; upon deletion, staff records are soft-deleted, photos purged from storage, and VPAs cleared.
2. **Customer Data Minimization**:
   - Diners scanning QR codes are never asked to register, log in, or provide phone numbers or email addresses.
   - Tip intents record only timestamp, waiter ID, amount, and coarse device metadata (OS and browser family). No IP addresses or fingerprint hashes are persisted in `tip_intents`.
3. **Data Retention & Pruning**:
   - `tip_intents` and `page_events` are retained for a rolling 180 days for analytics and then aggregated into monthly rollups. Raw records older than 180 days are pruned by background jobs.
   - `audit_logs` are retained for 3 years for regulatory compliance.

---

## 4. Incident Response Checklist

In the event of a suspected security event (e.g. credential compromise, rogue VPA change, or scraping spike):

1. **Triage & Containment**:
   - If an admin account is compromised: revoke all sessions immediately via Portal (`POST /portal/restaurants/:id/sessions/revoke-all`).
   - If a waiter VPA was tampered with: deactivate the staff member immediately (`PATCH /admin/staff/:id { is_active: false }`).
   - If a QR code is compromised or vandalized: rotate the QR token immediately (`POST /admin/qr/rotate`). The old token becomes instantly invalid.
2. **Investigation**:
   - Inspect `audit_logs` filtering by `restaurant_id` and action types (`STAFF_VPA_UPDATED`, `QR_ROTATED`, `LOGIN_FAILED`).
   - Review Pino structured error logs in Sentry / stdout correlating with `request_id`.
3. **Remediation & Notification**:
   - If encryption keys are exposed: trigger the master key re-encryption job (documented in `docs/RUNBOOK.md`).
   - Notify affected restaurant owners within 24 hours in accordance with DPDP breach disclosure norms.

