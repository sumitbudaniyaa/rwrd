# TipTable Environment Variable Dictionary

This document specifies all environment variables utilized across the backend API and client applications. **Never commit actual secrets or production values.** All variables are validated at application boot using Zod; any missing required variable causes an immediate fail-fast termination.

---

## 1. Backend API (`apps/api`)

| Variable                      | Required | Type          | Purpose                                                    | Example Value (Dummy)                                                                     |
| :---------------------------- | :------: | :------------ | :--------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `NODE_ENV`                    |   Yes    | Enum          | Runtime environment (`development`, `test`, `production`)  | `development`                                                                             |
| `PORT`                        |   Yes    | Number        | Port on which the Express server listens                   | `4000`                                                                                    |
| `API_BASE_URL`                |   Yes    | String (URL)  | Fully qualified public URL of the backend API              | `http://localhost:4000`                                                                   |
| `DATABASE_URL`                |   Yes    | String (URL)  | PostgreSQL connection string                               | `postgresql://postgres:postgres@localhost:5432/tiptable_dev`                              |
| `REDIS_URL`                   |   Yes    | String (URL)  | Redis connection string for rate limiting & BullMQ         | `redis://localhost:6379`                                                                  |
| `CORS_ALLOWED_ORIGINS`        |   Yes    | CSV URLs      | Comma-delimited list of allowed client origins             | `http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003` |
| `TRUST_PROXY`                 |   Yes    | Boolean/Num   | Express trust proxy setting for reverse proxies            | `1`                                                                                       |
| `LOG_LEVEL`                   |   Yes    | Enum          | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) | `info`                                                                                    |
| `ADMIN_JWT_SECRET`            |   Yes    | String        | 256-bit signing secret for Restaurant Admin access tokens  | `secret_admin_jwt_dummy_key_minimum_32_chars!`                                            |
| `ADMIN_JWT_EXPIRES_IN`        |   Yes    | String        | TTL for Restaurant Admin access tokens                     | `15m`                                                                                     |
| `ADMIN_REFRESH_SECRET`        |   Yes    | String        | 256-bit signing secret for Restaurant Admin refresh tokens | `secret_admin_refresh_dummy_key_minimum_32_chars!`                                        |
| `ADMIN_REFRESH_EXPIRES_IN`    |   Yes    | String        | TTL for Restaurant Admin refresh tokens                    | `7d`                                                                                      |
| `PORTAL_JWT_SECRET`           |   Yes    | String        | 256-bit signing secret for Company Portal access tokens    | `secret_portal_jwt_dummy_key_minimum_32_chars!`                                           |
| `PORTAL_JWT_EXPIRES_IN`       |   Yes    | String        | TTL for Company Portal access tokens                       | `15m`                                                                                     |
| `PORTAL_REFRESH_SECRET`       |   Yes    | String        | 256-bit signing secret for Company Portal refresh tokens   | `secret_portal_refresh_dummy_key_minimum_32_chars!`                                       |
| `PORTAL_REFRESH_EXPIRES_IN`   |   Yes    | String        | TTL for Company Portal refresh tokens                      | `24h`                                                                                     |
| `VPA_ENCRYPTION_KEY`          |   Yes    | Hex (64 char) | 32-byte hexadecimal AES-256-GCM master encryption key      | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`                        |
| `VPA_ENCRYPTION_KEY_PREV`     |    No    | Hex (64 char) | Secondary key used during master key rotation              | `fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210`                        |
| `S3_ENDPOINT`                 |   Yes    | String (URL)  | S3-compatible object storage endpoint (MinIO / S3 / R2)    | `http://localhost:9000`                                                                   |
| `S3_BUCKET`                   |   Yes    | String        | Storage bucket name for photos & assets                    | `tiptable-media`                                                                          |
| `S3_REGION`                   |   Yes    | String        | AWS region or MinIO region                                 | `us-east-1`                                                                               |
| `S3_ACCESS_KEY`               |   Yes    | String        | Storage service access key                                 | `minioadmin`                                                                              |
| `S3_SECRET_KEY`               |   Yes    | String        | Storage service secret key                                 | `minioadmin`                                                                              |
| `S3_FORCE_PATH_STYLE`         |   Yes    | Boolean       | Set true for MinIO local storage                           | `true`                                                                                    |
| `PORTAL_ALLOWED_IPS`          |    No    | CSV CIDRs     | Optional IP allowlist for internal portal API routes       | `192.168.1.0/24,10.0.0.0/8`                                                               |
| `TURNSTILE_SECRET_KEY`        |    No    | String        | Cloudflare Turnstile secret key for demo lead capture      | `0x4AAAAAAABBBBBB_dummy_secret_key`                                                       |
| `SENTRY_DSN`                  |    No    | String (URL)  | Sentry telemetry DSN for error reporting                   | `https://dummy@sentry.io/123456`                                                          |
| `RATE_LIMIT_GLOBAL_MAX`       |   Yes    | Number        | Max requests per IP per window across all endpoints        | `100`                                                                                     |
| `RATE_LIMIT_GLOBAL_WINDOW_MS` |   Yes    | Number        | Sliding window duration in milliseconds                    | `60000`                                                                                   |
| `RATE_LIMIT_INTENT_MAX`       |   Yes    | Number        | Max tip intent creations per IP per window                 | `10`                                                                                      |
| `RATE_LIMIT_INTENT_WINDOW_MS` |   Yes    | Number        | Sliding window duration for tip intent endpoints           | `60000`                                                                                   |

---

## 2. Customer Mobile App (`apps/customer`)

All frontend variables must be prefixed with `VITE_` and contain **zero sensitive secrets**.

| Variable            | Required | Type         | Purpose                                                          | Example Value                    |
| :------------------ | :------: | :----------- | :--------------------------------------------------------------- | :------------------------------- |
| `VITE_API_BASE_URL` |   Yes    | String (URL) | Base URL for the TipTable REST API                               | `http://localhost:4000`          |
| `VITE_APP_ENV`      |   Yes    | Enum         | Application environment (`development`, `staging`, `production`) | `development`                    |
| `VITE_SENTRY_DSN`   |    No    | String (URL) | Sentry DSN for frontend error telemetry                          | `https://dummy@sentry.io/123456` |

---

## 3. Restaurant Admin App (`apps/admin`)

| Variable            | Required | Type         | Purpose                            | Example Value                    |
| :------------------ | :------: | :----------- | :--------------------------------- | :------------------------------- |
| `VITE_API_BASE_URL` |   Yes    | String (URL) | Base URL for the TipTable REST API | `http://localhost:4000`          |
| `VITE_APP_ENV`      |   Yes    | Enum         | Application environment            | `development`                    |
| `VITE_SENTRY_DSN`   |    No    | String (URL) | Sentry DSN                         | `https://dummy@sentry.io/123456` |

---

## 4. Company Portal (`apps/portal`)

| Variable            | Required | Type         | Purpose                            | Example Value                    |
| :------------------ | :------: | :----------- | :--------------------------------- | :------------------------------- |
| `VITE_API_BASE_URL` |   Yes    | String (URL) | Base URL for the TipTable REST API | `http://localhost:4000`          |
| `VITE_APP_ENV`      |   Yes    | Enum         | Application environment            | `development`                    |
| `VITE_SENTRY_DSN`   |    No    | String (URL) | Sentry DSN                         | `https://dummy@sentry.io/123456` |

---

## 5. Public Landing Site (`apps/landing`)

| Variable                  | Required | Type         | Purpose                                | Example Value                     |
| :------------------------ | :------: | :----------- | :------------------------------------- | :-------------------------------- |
| `VITE_API_BASE_URL`       |   Yes    | String (URL) | Base URL for the TipTable REST API     | `http://localhost:4000`           |
| `VITE_TURNSTILE_SITE_KEY` |    No    | String       | Cloudflare Turnstile public widget key | `0x4AAAAAAABBBBBB_dummy_site_key` |
| `VITE_APP_ENV`            |   Yes    | Enum         | Application environment                | `development`                     |
