# PiPay MVP

Production-oriented PiPay wallet MVP inspired by Indian wallet flows such as add money through UPI, merchant QR payments, and static vendor-code payments.

## Phase 1 Backend Foundation

Created:

- NestJS backend scaffold.
- PostgreSQL and Redis Docker Compose.
- Prisma schema and seed script.
- Environment validation.
- Standard response envelope.
- Global exception filter.
- Correlation IDs.
- Structured Pino logging.
- Helmet security headers.
- Swagger documentation at `/docs`.
- Health endpoints:
  - `/api/v1/health/live`
  - `/api/v1/health/ready`
- GitHub Actions CI skeleton.

## Local Setup

```powershell
Copy-Item backend/.env.example backend/.env
docker compose -f infra/docker-compose.yml up -d postgres redis
Set-Location backend
npm install --cache .npm-cache
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

If Docker on Windows cannot read the default user Docker config from the sandbox, use:

```powershell
New-Item -ItemType Directory -Force .docker
docker --config .docker compose -f infra/docker-compose.yml up -d postgres redis
```

Open:

- API: `http://localhost:3000/api/v1/health/live`
- Swagger: `http://localhost:3000/docs`

One-command runtime verification after Docker Desktop is running:

```powershell
.\scripts\verify-runtime.ps1
```

## Notes

## Phase 2 Auth And Sessions

Implemented:

- Mobile OTP request and verify APIs.
- OTPs cached in Redis as hashes with a 5 minute TTL.
- OTP request and verify rate limiting.
- Mock OTP delivery for local development. Non-production responses include `debugOtp`.
- JWT access tokens.
- Opaque refresh tokens stored only as HMAC hashes.
- Refresh token rotation.
- Refresh token reuse detection with token-family and device-session revocation.
- Device session list, logout, and revoke APIs.
- JWT guard that rejects revoked sessions and inactive users.

Auth endpoints:

- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/token/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:sessionId`

Example local OTP request:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/v1/auth/otp/request `
  -ContentType "application/json" `
  -Body '{"mobileNumber":"+919999999999","purpose":"login"}'
```

The current backend now has the foundation and auth/session layer. Wallet ledger posting, merchant payments, and mock UPI flows are intentionally implemented in later phases so transaction safety can be added in the right sequence.

## Phase 3 Wallet And Ledger Core

Implemented:

- User wallet provisioning during OTP login.
- Wallet provisioning service for user, merchant, and system wallets.
- Wallet summary API.
- Paginated wallet statement API backed by ledger entries.
- Double-entry ledger posting service.
- Deterministic wallet row locking with `SELECT ... FOR UPDATE`.
- Atomic wallet balance and ledger entry writes inside one database transaction.
- Non-system wallet overdraft prevention.
- Ledger validation that rejects unbalanced entries, duplicate wallet entries, and non-positive amounts.
- Idempotency core service with request hashing, in-progress locks, completed response replay, failed records, and payload mismatch rejection.
- Initial migration includes wallet owner uniqueness and balance-safety constraints.

Wallet endpoints:

- `GET /api/v1/wallet`
- `GET /api/v1/wallet/statement`

Phase 3 verification:

```powershell
Set-Location backend
npm run build
npm run lint
npm test
npx prisma validate
```

## Phase 4 Merchant Module

Implemented:

- Merchant registration API.
- Merchant wallet provisioning during registration.
- Merchant QR payload generation.
- Static vendor code generation.
- Merchant QR parser for internal `wallet://merchant/...` payloads.
- Static vendor code lookup.
- Active merchant validation with suspended/high-risk rejection.
- Merchant dashboard summary.
- Merchant transaction and settlement listing APIs.

Merchant endpoints:

- `POST /api/v1/merchants`
- `POST /api/v1/merchants/qr/parse`
- `GET /api/v1/merchants/vendor-codes/:code`
- `GET /api/v1/merchants/:merchantId/dashboard`
- `POST /api/v1/merchants/:merchantId/qr-codes`
- `POST /api/v1/merchants/:merchantId/vendor-codes`
- `GET /api/v1/merchants/:merchantId/transactions`
- `GET /api/v1/merchants/:merchantId/settlements`

All merchant endpoints currently require user JWT auth. A dedicated merchant staff/owner role model should be added before exposing merchant dashboards in production.

## Phase 5 Wallet-To-Merchant Payment

Implemented:

- `POST /api/v1/transactions/merchant-payments`
- `GET /api/v1/transactions/:transactionRef`
- QR and static vendor-code merchant payment support.
- Idempotency-key enforcement for merchant payments.
- Merchant status/risk checks before debit.
- Atomic user debit and merchant credit through the ledger service.
- Transaction receipt generation.
- Transaction events and audit logs.

## Phase 6 Mock UPI Add Money

Implemented:

- `POST /api/v1/payments/upi/intent`
- `POST /api/v1/payments/upi/collect`
- `GET /api/v1/payments/upi/:transactionRef/status`
- `POST /api/v1/webhooks/payments/mock-upi`
- Mock UPI provider abstraction.
- Intent and collect order creation.
- Gateway log persistence.
- HMAC webhook signature verification.
- Webhook duplicate detection by provider event ID.
- Wallet credit only after verified success webhook.
- Failed webhook handling without wallet credit.

## Phase 7 Mobile MVP

Created Flutter scaffold in `mobile/`:

- OTP login screen.
- Wallet balance and statement screen.
- Add-money screen for UPI intent and collect.
- QR scanner using `mobile_scanner`.
- Merchant/vendor-code payment screen.
- Merchant registration/dashboard utility screen.
- Secure token storage and reusable API client.

Flutter is not installed in this environment, so mobile compilation was not run here.

## Phase 8 Hardening

Added:

- CI Prisma schema validation.
- Security hardening notes in `docs/security.md`.
- Operations runbook in `docs/operations-runbook.md`.
- Backend verification scripts for build, lint, tests, and Prisma validation.
