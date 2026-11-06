# TipTable REST API Specification

This document defines the REST API architecture, authentication schemas, error envelopes, and endpoint contracts for the TipTable backend (`apps/api`). All versioned endpoints live under `/api/v1`.

---

## 1. Error Envelope: RFC 7807 Problem Details

All error responses from the API strictly adhere to **RFC 7807 (`application/problem+json`)**:

```json
{
  "type": "https://tiptable.in/errors/validation-error",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "The request body failed validation constraints.",
  "instance": "/api/v1/public/tips/intent",
  "code": "VALIDATION_FAILED",
  "requestId": "req_01j7q3b2x8e30k5j4v",
  "invalidParams": [
    {
      "name": "amountInr",
      "reason": "Tip amount must be between ₹1 and ₹10,000."
    }
  ]
}
```

### Standard Error Codes

| HTTP Status | Code                    | Meaning                                                         |
| :---------: | :---------------------- | :-------------------------------------------------------------- |
|    `400`    | `BAD_REQUEST`           | Malformed JSON or invalid parameter syntax.                     |
|    `401`    | `UNAUTHORIZED`          | Missing, expired, or invalid access token.                      |
|    `403`    | `FORBIDDEN`             | Insufficient role permissions or cross-tenant access violation. |
|    `404`    | `NOT_FOUND`             | Requested entity, restaurant token, or route does not exist.    |
|    `409`    | `CONFLICT`              | Resource conflict (e.g. duplicate email or table number).       |
|    `422`    | `VALIDATION_FAILED`     | Request schema validation failure (details in `invalidParams`). |
|    `429`    | `RATE_LIMITED`          | Rate limit threshold exceeded. Includes `Retry-After` header.   |
|    `500`    | `INTERNAL_SERVER_ERROR` | Unhandled internal exception (redacted in non-development).     |
|    `503`    | `SERVICE_UNAVAILABLE`   | Database or Redis readiness probe failed.                       |

---

## 2. Authentication Realms

The API supports three distinct authentication contexts:

1. **Public Context**: No auth header required. Protected by strict sliding-window Redis rate limiters.
2. **Restaurant Admin Realm (`/api/v1/admin`)**:
   - `Authorization: Bearer <access_token>` (15-minute JWT).
   - Rotating refresh token stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie (`tiptable_admin_rf`).
3. **Company Portal Realm (`/api/v1/portal`)**:
   - Isolated JWT secret, audience, and cookie name (`tiptable_portal_rf`).
   - Mandatory TOTP MFA validation. Optional IP CIDR allowlist enforcement.

---

## 3. Public Endpoints (`/api/v1/public`)

### 3.1 Resolve QR Token

- **Method**: `GET /api/v1/public/restaurants/token/:token`
- **Rate Limit**: 60 requests / minute / IP
- **Description**: Resolves a customer table QR code token to retrieve restaurant branding and table info.
- **Response `200 OK`**:

```json
{
  "restaurant": {
    "id": "018f2d5e-9a2c-7b1e-92b5-123456789abc",
    "name": "Bombay Brasserie",
    "slug": "bombay-brasserie",
    "logoUrl": "https://media.tiptable.in/restaurants/logo.png",
    "googleReviewUrl": "https://g.page/r/Cb_example/review",
    "tipPresets": [20, 50, 100, 200],
    "minTipInr": 1,
    "maxTipInr": 10000
  },
  "table": {
    "id": "018f2d5e-9a2c-7b1e-92b5-987654321def",
    "tableNumber": "T-12",
    "section": "Terrace"
  }
}
```

### 3.2 List Active Waitstaff

- **Method**: `GET /api/v1/public/restaurants/:id/staff`
- **Rate Limit**: 60 requests / minute / IP
- **Description**: Returns the active waitstaff roster for a restaurant. **VPAs are strictly excluded.**
- **Response `200 OK`**:

```json
{
  "staff": [
    {
      "id": "018f2d5e-9a2c-7b1e-92b5-333333333333",
      "displayName": "Ramesh Kumar",
      "roleLabel": "Senior Server",
      "photoUrl": "https://media.tiptable.in/staff/ramesh.webp"
    }
  ]
}
```

### 3.3 Create Tip Intent & Build UPI Link

- **Method**: `POST /api/v1/public/tips/intent`
- **Rate Limit**: 10 requests / minute / IP; 5 requests / minute / waiter
- **Description**: Validates tip amount, decrypts waiter VPA, logs intent, and returns formatted UPI deep link.
- **Request Body**:

```json
{
  "token": "qr_tok_9b2c7b1e92b5...",
  "staffId": "018f2d5e-9a2c-7b1e-92b5-333333333333",
  "amountInr": 100
}
```

- **Response `201 Created`**:

```json
{
  "intentId": "018f2d5e-9a2c-7b1e-92b5-444444444444",
  "upiLink": "upi://pay?pa=ramesh%40okaxis&pn=Ramesh+Kumar&am=100&cu=INR&tn=Tip+for+Ramesh+at+Bombay+Brasserie",
  "payeeName": "Ramesh Kumar",
  "amountInr": 100
}
```

### 3.4 Track Google Review Tap

- **Method**: `POST /api/v1/public/restaurants/:id/review-tap`
- **Rate Limit**: 30 requests / minute / IP
- **Request Body**:

```json
{
  "token": "qr_tok_9b2c7b1e92b5...",
  "source": "home_card"
}
```

- **Response `204 No Content`**

### 3.5 Submit Landing Demo Lead

- **Method**: `POST /api/v1/public/leads`
- **Rate Limit**: 5 requests / hour / IP
- **Request Body**:

```json
{
  "contactName": "Vikram Malhotra",
  "email": "vikram@malhotrahospitality.in",
  "phone": "+919876543210",
  "restaurantName": "Spice Court",
  "city": "Bengaluru",
  "notes": "Interested in 3 branches.",
  "turnstileToken": "0.cf-dummy-token"
}
```

- **Response `201 Created`**

---

## 4. Restaurant Admin Endpoints (`/api/v1/admin`)

| Method   | Path                                                |      Auth      | Description                                                                    |
| :------- | :-------------------------------------------------- | :------------: | :----------------------------------------------------------------------------- |
| `POST`   | `/admin/auth/login`                                 |      None      | Initial email + password authentication; triggers MFA if enabled.              |
| `POST`   | `/admin/auth/mfa/verify`                            |   Temp Token   | Verify 6-digit TOTP code and issue session cookies + JWT.                      |
| `POST`   | `/admin/auth/refresh`                               |     Cookie     | Rotate refresh token and issue new 15m access token.                           |
| `POST`   | `/admin/auth/logout`                                |     Bearer     | Revoke current session.                                                        |
| `POST`   | `/admin/auth/logout-all`                            |     Bearer     | Revoke all active sessions for this admin user.                                |
| `GET`    | `/admin/restaurant`                                 |     Bearer     | Get current tenant profile and configurations.                                 |
| `PATCH`  | `/admin/restaurant`                                 | Bearer (Owner) | Update name, logo, Google review link, and tip presets.                        |
| `GET`    | `/admin/staff`                                      |     Bearer     | List all staff members (includes masked VPAs like `r***@okaxis`).              |
| `POST`   | `/admin/staff`                                      |     Bearer     | Add staff member (display name, role, photo upload, VPA).                      |
| `PATCH`  | `/admin/staff/:id`                                  |     Bearer     | Update staff details, active status, or VPA.                                   |
| `DELETE` | `/admin/staff/:id`                                  |     Bearer     | Soft delete staff member.                                                      |
| `GET`    | `/admin/tables`                                     |     Bearer     | List all physical tables and assigned QR tokens.                               |
| `POST`   | `/admin/tables`                                     |     Bearer     | Create a new table.                                                            |
| `POST`   | `/admin/qr/rotate`                                  | Bearer (Owner) | Invalidate current QR token and issue a new high-entropy token.                |
| `GET`    | `/admin/restaurants/:restaurantId/analytics`        |     Bearer     | Aggregated metrics: scans, staff views, tips initiated, review taps, timeline. |
| `GET`    | `/admin/restaurants/:restaurantId/analytics/export` |     Bearer     | RFC 4180 CSV export of tip intents and telemetry.                              |
| `GET`    | `/admin/audit-logs`                                 | Bearer (Owner) | Query immutable audit logs for this restaurant.                                |

### Admin Analytics (`GET /api/v1/admin/restaurants/:restaurantId/analytics`)

- **Query Parameters**:
  - `startDate` (optional, ISO-8601 or YYYY-MM-DD): defaults to 30 days prior.
  - `endDate` (optional, ISO-8601 or YYYY-MM-DD): defaults to now.
- **Response `200 OK`**:

```json
{
  "dateRange": {
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2026-10-31T23:59:59.999Z"
  },
  "metrics": {
    "scans": 1429,
    "staffViews": 984,
    "tipsInitiatedCount": 432,
    "tipsInitiatedVolumeInr": 34850,
    "reviewTaps": 187
  },
  "dailyTimeline": [
    {
      "date": "2026-10-30",
      "scans": 48,
      "staffViews": 32,
      "tipsInitiatedCount": 15,
      "tipsInitiatedVolumeInr": 1250,
      "reviewTaps": 7
    }
  ],
  "staffBreakdown": [
    {
      "staffId": "33333333-3333-3333-3333-333333333333",
      "displayName": "Rahul Sharma",
      "roleLabel": "Head Captain",
      "tipsInitiatedCount": 180,
      "tipsInitiatedVolumeInr": 16500,
      "averageTipInr": 92
    }
  ]
}
```

### Admin Analytics CSV Export (`GET /api/v1/admin/restaurants/:restaurantId/analytics/export`)

- **Query Parameters**: `startDate`, `endDate`
- **Response `200 OK`**: `Content-Type: text/csv; charset=utf-8` stream adhering to RFC 4180.
- **Headers**: `Content-Disposition: attachment; filename="tiptable-tips-initiated-<restaurantId>-<date>.csv"`

### Tenant Audit Logs (`GET /api/v1/admin/restaurants/:restaurantId/audit`)

- **Query Parameters**:
  - `limit` (optional, default 50, max 100)
  - `offset` (optional, default 0)
  - `entityType` (optional): `staff`, `restaurant`, `qr_token`, `table`
- **Response `200 OK`**:

```json
{
  "logs": [
    {
      "id": "99999999-9999-9999-9999-999999999999",
      "restaurantId": "11111111-1111-1111-1111-111111111111",
      "actorId": "33333333-3333-3333-3333-333333333333",
      "actorType": "restaurant_user",
      "actorName": "Sameer Seth",
      "actorEmail": "owner@bombaycanteen.com",
      "action": "STAFF_CREATED",
      "entityType": "staff",
      "entityId": "44444444-4444-4444-4444-444444444444",
      "beforeState": null,
      "afterState": {
        "displayName": "Aarav Patel",
        "roleLabel": "Captain"
      },
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0",
      "createdAt": "2026-11-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 1
  }
}
```

---

## 5. Company Portal Endpoints (`/api/v1/portal`)

| Method   | Path                                  |         Auth         | Description                                                        |
| :------- | :------------------------------------ | :------------------: | :----------------------------------------------------------------- |
| `POST`   | `/portal/auth/login`                  |         None         | Platform staff email + password login (IP allowlist checked).      |
| `POST`   | `/portal/auth/refresh`                |        Cookie        | Rotate portal refresh token and return new 15m access token.       |
| `GET`    | `/portal/auth/me`                     |   Bearer (Portal)    | Retrieve currently authenticated platform staff profile.           |
| `POST`   | `/portal/auth/logout`                 |   Bearer (Portal)    | Invalidate portal session and clear refresh cookie.                |
| `POST`   | `/portal/auth/mfa/verify`             |      Temp Token      | Mandatory TOTP MFA challenge.                                      |
| `GET`    | `/portal/restaurants`                 |   Bearer (Portal)    | Search and filter all restaurants across the platform.             |
| `POST`   | `/portal/restaurants`                 | Bearer (Super Admin) | Onboard and provision a new restaurant tenant with owner & QR.     |
| `GET`    | `/portal/restaurants/:id`             |   Bearer (Portal)    | Retrieve full restaurant profile with staff and tables count.      |
| `PATCH`  | `/portal/restaurants/:id/status`      | Bearer (Super Admin) | Suspend or reactivate restaurant account with audit reason.        |
| `DELETE` | `/portal/restaurants/:id`             | Bearer (Super Admin) | Soft-delete restaurant and invalidate access.                      |
| `POST`   | `/portal/restaurants/:id/impersonate` |   Bearer (Support)   | Generate temporary support delegation token with full audit trail. |
| `GET`    | `/portal/metrics`                     |        Bearer        | Global system metrics, MRR, active scans, and health aggregates.   |
| `GET`    | `/portal/leads`                       |        Bearer        | Review incoming landing demo requests and update pipeline status.  |
| `PATCH`  | `/portal/leads/:id`                   |        Bearer        | Update lead status (`contacted`, `won`, `lost`).                   |
| `GET`    | `/portal/audit-logs`                  | Bearer (Super Admin) | Search immutable platform-wide audit log.                          |

### Platform Restaurant Management Contracts

#### Search & List Restaurants (`GET /api/v1/portal/restaurants`)

- **Query Parameters**:
  - `search` (optional string): Case-insensitive match on name or slug.
  - `status` (optional): `all` (default), `active`, `suspended`, `deleted`.
  - `limit` (optional integer, default 20, max 100).
  - `offset` (optional integer, default 0).
- **Response `200 OK`**:

```json
{
  "restaurants": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "The Bombay Canteen",
      "slug": "the-bombay-canteen",
      "googleReviewUrl": "https://maps.app.goo.gl/tbc123",
      "isSuspended": false,
      "suspensionReason": null,
      "deletedAt": null,
      "createdAt": "2026-11-01T10:00:00.000Z",
      "updatedAt": "2026-11-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

#### Onboard Restaurant (`POST /api/v1/portal/restaurants`)

- **Role Requirement**: `super_admin` (`403 Forbidden` for support role).
- **Request Body**:

```json
{
  "name": "The Bombay Canteen",
  "slug": "the-bombay-canteen",
  "googleReviewUrl": "https://maps.app.goo.gl/tbc123",
  "ownerFullName": "Sameer Seth",
  "ownerEmail": "sameer@thebombaycanteen.com",
  "ownerPassword": "SecurePassword123!"
}
```

- **Response `201 Created`**:

```json
{
  "restaurant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "The Bombay Canteen",
    "slug": "the-bombay-canteen",
    "googleReviewUrl": "https://maps.app.goo.gl/tbc123",
    "isSuspended": false,
    "createdAt": "2026-11-06T10:00:00.000Z"
  },
  "owner": {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "sameer@thebombaycanteen.com",
    "fullName": "Sameer Seth",
    "role": "owner"
  },
  "rootQrToken": "9a7f3b8c2d1e0f4a..."
}
```

#### Update Restaurant Status (`PATCH /api/v1/portal/restaurants/:id/status`)

- **Role Requirement**: `super_admin`.
- **Request Body**:

```json
{
  "action": "suspend",
  "reason": "Overdue monthly subscription invoice"
}
```

- **Response `200 OK`**:

```json
{
  "restaurant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "isSuspended": true,
    "suspensionReason": "Overdue monthly subscription invoice",
    "updatedAt": "2026-11-06T10:00:00.000Z"
  }
}
```

#### Soft-Delete Restaurant (`DELETE /api/v1/portal/restaurants/:id`)

- **Role Requirement**: `super_admin`.
- **Response `200 OK`**:

```json
{
  "message": "Restaurant soft-deleted successfully",
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

#### Support Impersonation Session (`POST /api/v1/portal/restaurants/:id/impersonate`)

- **Role Requirement**: `super_admin`, `support` (`403 Forbidden` for finance).
- **Security & Audit**: Generates a 1-hour ephemeral Admin JWT with `isImpersonated: true` and logs `IMPERSONATION_STARTED` event with actor and target context.
- **Request Body** (optional):

```json
{
  "reason": "Live customer support onboarding assistance (Ticket #4021)"
}
```

- **Response `200 OK`**:

```json
{
  "impersonationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresInSeconds": 3600,
  "restaurant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "The Bombay Canteen",
    "slug": "the-bombay-canteen",
    "isSuspended": false
  },
  "impersonator": {
    "id": "99999999-9999-9999-9999-999999999999",
    "email": "support@tiptable.in",
    "role": "support"
  }
}
```
