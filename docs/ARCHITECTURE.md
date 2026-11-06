# TipTable System Architecture

This document provides a comprehensive architectural blueprint for **TipTable**, a multi-tenant SaaS platform empowering restaurant diners in India to tip waitstaff directly via UPI deep links and leave Google reviews without platform intermediary custody of funds.

---

## 1. System Overview

TipTable is organized as a unified monorepo with 4 client applications, 1 core API service, and 3 shared internal packages.

```mermaid
graph TD
    subgraph Clients["Front-End Applications"]
        CUST["Customer App (apps/customer)<br/>Mobile-first 375px, No Auth, QR-driven"]
        ADMIN["Restaurant Admin (apps/admin)<br/>Owner & Manager Portal, beUI + Hugeicons"]
        PORTAL["Company Portal (apps/portal)<br/>Platform Staff, Super Admin, Support"]
        LANDING["Public Landing (apps/landing)<br/>SEO-ready, Lead Capture, Turnstile/hCaptcha"]
    end

    subgraph Core["Core Backend & Shared Services"]
        API["Backend API (apps/api)<br/>Express + TypeScript (Strict), RFC 7807"]
        SHARED["@tiptable/shared<br/>Zod Schemas, Domain Types, DTOs, UPI Utils"]
        UI["@tiptable/ui<br/>beUI Motion Tokens, Hugeicons, CSS Tokens"]
        CFG["@tiptable/config<br/>ESLint, TSConfig, Prettier, Tailwind Presets"]
    end

    subgraph Data["Data & Infrastructure"]
        PG[("PostgreSQL 16<br/>Drizzle ORM, RLS Defense-in-Depth")]
        REDIS[("Redis 7<br/>Rate Limiting, Sessions, BullMQ")]
        S3[("S3 / MinIO<br/>Encrypted Staff Media, Signed URLs")]
    end

    subgraph External["External Ecosystem"]
        UPI["Diner UPI Apps<br/>(GPay, PhonePe, Paytm, BHIM)"]
        GOOGLE["Google Business Profile<br/>(Write Review URL)"]
    end

    CUST -->|"HTTPS REST (Rate Limited)"| API
    ADMIN -->|"HTTPS REST (JWT + Cookie)"| API
    PORTAL -->|"HTTPS REST (JWT + MFA + IP Allowlist)"| API
    LANDING -->|"Lead Submission"| API

    CUST -.->|"Deep link: upi://pay"| UPI
    CUST -.->|"Direct Navigation"| GOOGLE

    API --> PG
    API --> REDIS
    API --> S3

    CUST -.-> SHARED
    ADMIN -.-> SHARED
    ADMIN -.-> UI
    PORTAL -.-> SHARED
    PORTAL -.-> UI
    LANDING -.-> SHARED
```

---

## 2. Monorepo Structure

We use `pnpm` workspaces configured with strict package boundaries:

```text
rwrd/
├── apps/
│   ├── api/               # Express REST API (/api/v1)
│   ├── customer/          # Public diner flow (375px mobile-first)
│   ├── admin/             # Restaurant management portal (beUI + Hugeicons)
│   ├── portal/            # Platform internal management (Super Admin / Support)
│   └── landing/           # Public marketing & lead generation site
├── packages/
│   ├── shared/            # Shared Zod schemas, types, DTO contracts, UPI generators
│   ├── ui/                # Shared beUI motion components, design tokens, Hugeicons
│   └── config/            # Shared linting, formatting, and TypeScript configurations
├── docs/                  # Architecture, decisions, runbooks, schemas, security
└── docker-compose.yml     # Local infrastructure (Postgres, Redis, MinIO, API)
```

---

## 3. Detailed Data & Transaction Flows

### 3.1 Customer Scan to UPI Deep Link Flow

The customer flow never handles money directly. The backend validates the restaurant token, verifies the selected staff member, logs the tip intent, and provides a formatted UPI deep link.

```mermaid
sequenceDiagram
    autonumber
    actor Diner
    participant Browser as Diner Browser (375px)
    participant API as TipTable API (/api/v1)
    participant DB as PostgreSQL
    participant Redis as Redis Cache
    actor UPIApp as UPI App (GPay/PhonePe)
    participant Google as Google Review

    Diner->>Browser: Scans Table QR Code
    Browser->>API: GET /public/restaurants/token/:token
    API->>DB: Query active restaurant and table context
    DB-->>API: Restaurant details & theme
    API-->>Browser: 200 OK (Name, Logo, Review URL, Tip Presets)

    Diner->>Browser: Selects "Make the people who fed you happy"
    Browser->>API: GET /public/restaurants/:id/staff
    API->>DB: Query active staff (photo, display name, role)
    DB-->>API: Active staff list (VPAs excluded)
    API-->>Browser: 200 OK (Render Staff Grid)

    Diner->>Browser: Selects Staff + Selects Amount (e.g., ₹50)
    Diner->>Browser: Clicks "Spread happiness"
    Browser->>API: POST /public/tips/intent (staff_id, amount, restaurant_token)
    Note over API,Redis: Check rate limits per IP & per waiter
    API->>DB: Fetch staff record & decrypt VPA (AES-256-GCM)
    API->>DB: Insert record into tip_intents (status: initiated)
    API-->>Browser: 201 Created { upiLink: "upi://pay?pa=...&pn=...&am=50&cu=INR" }

    Browser->>UPIApp: window.location.href = upiLink
    Note over Browser: Page visibility event listener registered
    Diner->>UPIApp: Completes payment in UPI app
    Diner->>Browser: Returns to browser window
    Note over Browser: Detect return via pageshow / visibilitychange
    Browser->>Browser: Render "You came so far" Screen
    Diner->>Google: Clicks "Review us" -> Direct to Google Review URL
```

### 3.2 Staff VPA Onboarding & Encryption Flow

Waitstaff Virtual Payment Addresses (VPAs) are sensitive financial identifiers. They must be validated for proper format, encrypted at rest using AES-256-GCM, and protected against accidental typos or scrapers.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Restaurant Owner/Manager
    participant UI as Admin Dashboard
    participant API as TipTable API (/api/v1/admin)
    participant Crypto as Encryption Service
    participant DB as PostgreSQL
    participant Audit as Audit Log Service

    Admin->>UI: Uploads waiter photo & enters VPA (or scans waiter UPI QR)
    UI->>UI: Parse "pa=" parameter from QR & validate VPA regex
    Admin->>UI: Confirms staff creation
    UI->>API: POST /admin/staff (Multipart / JSON payload)
    API->>API: Validate input with Zod schema
    API->>API: Sanitize photo with sharp (strip EXIF, resize to 400x400)
    API->>Crypto: Encrypt VPA with AES-256-GCM (Tenant/Master Key)
    Crypto-->>API: { ciphertext, iv, authTag }
    API->>DB: INSERT INTO staff (restaurant_id, name, vpa_encrypted, photo_url)
    API->>Audit: Record action (action: "STAFF_CREATED", actor: user_id)
    API-->>UI: 201 Created (Staff DTO without raw VPA)
```

---

## 4. Backend Layered Architecture

To ensure strict separation of concerns, testability, and enterprise maintainability, `apps/api` adheres strictly to this structure:

```text
┌────────────────────────────────────────────────────────┐
│                     HTTP Routes                        │
│   (/api/v1/public, /api/v1/admin, /api/v1/portal)      │
│   - Route-level rate limiting (Redis)                  │
│   - Authentication & RBAC middleware                   │
│   - Request validation (Zod schema middleware)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                     Controllers                        │
│   - Extract validated params, query, body              │
│   - Delegate directly to Domain Services               │
│   - Map domain results to standard DTOs                │
│   - Format errors into RFC 7807 problem+json           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Domain Services                      │
│   - Business logic, invariants, and validation rules   │
│   - Orchestrate crypto, transactions, and audit logs   │
│   - Enforce tenant isolation logic                     │
│   - Emit background jobs (BullMQ)                      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Repositories                        │
│   - Direct Drizzle ORM queries                         │
│   - Mandatory restaurant_id parameterization           │
│   - Encapsulate SQL constraints and transactions       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               PostgreSQL 16 (with RLS)                 │
└────────────────────────────────────────────────────────┘
```

---

## 5. Technology Decisions & Rationale

| Layer                   | Choice                            | Rationale                                                                                                            |
| :---------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Monorepo Manager**    | `pnpm` workspaces                 | Fast, deterministic disk space savings, native workspace isolation, strict dependency graph.                         |
| **Database ORM**        | Drizzle ORM                       | High-performance, lightweight, SQL-like type safety, zero runtime overhead, native migration engine (`drizzle-kit`). |
| **Backend Framework**   | Node.js + Express + TS            | Industry standard, robust middleware ecosystem, enterprise observability support.                                    |
| **Cache & Queue**       | Redis 7 + BullMQ                  | Low-latency rate limiting, token family revocation, and reliable background job handling.                            |
| **Motion & UI**         | `beUI` + `@hugeicons/react`       | Product-grade micro-interactions, spring physics, accessibility (reduced-motion tokens), cohesive SVG stroke icons.  |
| **Customer Typography** | Self-hosted Newsreader / Fraunces | Warm, sophisticated editorial tone matching Claude's aesthetic without runtime CDN calls or third-party cookies.     |
| **Data Protection**     | AES-256-GCM + Argon2id            | Industry gold standard for column encryption (VPAs) and credential hashing.                                          |

---

## 6. Core Architectural Invariants

### 6.1 100% Anonymous Diner Tipping Flow

- **Zero Diner Identification**: Diners are completely anonymous. No customer name, email, phone number, or payment card data is ever requested, captured, or stored anywhere in the application or database.
- **Direct UPI Intent**: Diners interact solely with waiter selection and amount presets before launching out-of-band UPI deep links (`upi://pay`).

### 6.2 Single Restaurant Admin Model

- **Strictly One Admin User per Tenant**: A PostgreSQL unique constraint (`uq_restaurant_users_restaurant_id`) enforces that every restaurant has at most one administrator account.
- **Unified Role**: The previous two-tier `owner` vs `manager` role hierarchy is replaced with a single unified `admin` role with full administrative authority over their restaurant's profile, staff roster, and QR placements.
