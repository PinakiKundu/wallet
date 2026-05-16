# Step-by-Step Implementation Plan

## Phase 1: Backend Foundation

1. Scaffold NestJS backend.
2. Add config validation, standard responses, global error filter, request correlation IDs, structured logger, and Swagger.
3. Add Docker Compose with PostgreSQL and Redis.
4. Add Prisma schema, migrations, and seed script.
5. Add health endpoints.

Exit criteria:

- Backend starts locally through Docker Compose.
- Swagger is available.
- `/health/live` and `/health/ready` work.
- Database migration and seed run successfully.

## Phase 2: Auth And Sessions

1. Implement OTP request and verify flow.
2. Store hashed OTPs in Redis with TTL.
3. Add rate limits by mobile number, IP, and device ID.
4. Issue JWT access token and opaque refresh token.
5. Store hashed refresh tokens and device sessions.
6. Implement refresh token rotation, logout, session list, and session revoke.

Exit criteria:

- OTP login works with mock OTP delivery.
- Refresh token reuse is detected and revokes the token family.
- Auth APIs are covered by unit and integration tests.

## Phase 3: Wallet And Ledger Core

1. Implement wallet creation for users, merchants, and system accounts.
2. Implement ledger posting service with double-entry validation.
3. Implement atomic wallet balance updates inside database transactions.
4. Add idempotency key middleware/service.
5. Add wallet summary and wallet statement APIs.
6. Add concurrency tests for duplicate debit and insufficient balance.

Exit criteria:

- Ledger entries always balance to zero per transaction.
- Concurrent debits cannot overspend a wallet.
- Retried requests return the same result without duplicate ledger entries.

## Phase 4: Merchant Module

1. Implement merchant registration.
2. Create merchant wallets automatically.
3. Generate QR payloads and vendor codes.
4. Implement merchant lookup, QR parsing, and dashboard APIs.
5. Add merchant status and risk checks.

Exit criteria:

- Active merchants can be resolved by QR payload or static vendor code.
- Suspended merchants cannot receive payments.

## Phase 5: Wallet-To-Merchant Payment

1. Implement merchant payment transaction state machine.
2. Validate merchant, amount, wallet status, limits, and idempotency.
3. Debit user wallet and credit merchant wallet through ledger service.
4. Generate receipt data.
5. Add audit logs and transaction events.
6. Add API and concurrency tests.

Exit criteria:

- QR and vendor-code payments succeed for valid active merchants.
- Duplicate requests do not double debit.
- Concurrent payments respect balance.

## Phase 6: Mock UPI Add Money

1. Implement payment provider interface.
2. Add mock UPI intent and collect providers.
3. Create pending add-money transactions.
4. Implement mock webhook signature verification.
5. Credit wallet only after verified success webhook or confirmed status check.
6. Store gateway logs and webhook events.
7. Add reconciliation command/API.

Exit criteria:

- Duplicate webhooks are accepted but ignored safely.
- Failed gateway payments do not credit wallet.
- Reconciliation can repair pending states without duplicate credit.

## Phase 7: Mobile MVP

1. Scaffold Flutter app.
2. Add auth flow with mobile OTP screens.
3. Add wallet home and transaction history.
4. Add add-money flow with UPI intent and collect options.
5. Add QR scanner and merchant confirmation screen.
6. Add vendor-code payment flow.
7. Store refresh token securely and handle token refresh.

Exit criteria:

- User can log in, view balance, add mock money, scan QR, pay merchant, and view receipt.

## Phase 8: Hardening

1. Add full OpenAPI coverage.
2. Add CI pipeline for lint, test, build, and migration validation.
3. Add request throttling and security headers.
4. Add audit-log coverage for sensitive actions.
5. Add monitoring hooks and log redaction.
6. Add production deployment notes and Kubernetes-ready manifests.

Exit criteria:

- Tests cover wallet correctness, concurrency, idempotency, and webhook duplication.
- Config is environment-driven.
- No hardcoded secrets.

## First Coding Sequence

The recommended implementation order is:

1. Scaffold backend foundation.
2. Add database schema and migrations.
3. Implement auth.
4. Implement wallet and ledger.
5. Implement merchant module.
6. Implement merchant payment.
7. Implement mock UPI add-money.
8. Scaffold mobile MVP.

This order keeps the highest-risk part, wallet correctness, early enough to shape the rest of the platform.

