# Digital Wallet MVP Architecture

## MVP Scope

The first production-oriented MVP supports:

- Mobile OTP login with JWT access tokens and refresh tokens.
- User wallet balance, transaction history, ledger entries, and wallet statements.
- Add money through a mock UPI gateway using intent or collect flows.
- Merchant payment through QR scan or static vendor code.
- Merchant registration, merchant wallet, QR generation, vendor code generation, and transaction dashboard APIs.
- Retry-safe transaction APIs, webhook signature verification, reconciliation hooks, and audit logs.

The system deliberately excludes real UPI PSP integration, KYC, cashback, bank settlement, and notification delivery in the first phase, but keeps extension points for them.

## Stack

Backend:

- Node.js with NestJS.
- PostgreSQL for ACID wallet state and ledger records.
- Redis for OTPs, rate limiting, sessions, idempotency locks, and replay protection.
- Prisma or TypeORM can be used; for this project, Prisma is preferred for typed migrations and predictable query access.
- Swagger/OpenAPI for REST API documentation.

Mobile:

- Flutter with clean architecture.
- Riverpod or Bloc for state management. Riverpod is preferred for a smaller MVP surface.
- Camera-based QR scanning through a maintained QR scanner package.
- Local secure storage for refresh tokens.

Infrastructure:

- Docker Compose for local PostgreSQL, Redis, backend, and mobile-adjacent dev services.
- Environment-based config.
- Structured JSON logs.
- Health checks and metrics-ready endpoints.
- GitHub Actions-ready test pipeline.

## Modular Monolith Boundaries

The backend starts as a modular monolith. Each module owns its application services, DTOs, repositories, and domain rules. Cross-module calls happen through service interfaces or domain events, not direct table mutation.

Modules:

- `auth`: OTP login, token issuance, refresh tokens, device sessions.
- `users`: user profile and identity state.
- `merchants`: merchant onboarding, merchant status, QR codes, static vendor codes.
- `wallets`: wallet accounts, balance reads, wallet statements.
- `ledger`: double-entry ledger posting and balance-safe accounting.
- `transactions`: transaction orchestration, state machine, receipts, reversals.
- `payments`: mock UPI gateway, add-money orders, payment gateway abstraction, webhooks, reconciliation.
- `risk`: rate limits, transaction limits, replay checks, suspicious behavior flags.
- `audit`: immutable audit log writer.
- `common`: config, database, logger, filters, interceptors, response format, guards.

## Core Payment Principles

Wallet money movement must never directly mutate balances from controller code.

All money movement goes through the ledger posting service:

1. Validate request, actor, merchant, amount, idempotency key, and risk rules.
2. Create or load a transaction by idempotency key.
3. Acquire required database locks inside one PostgreSQL transaction.
4. Verify available balance for debit entries.
5. Insert balanced ledger entries.
6. Update wallet cached balances atomically from the same transaction.
7. Transition transaction state.
8. Emit domain event for receipt, audit, webhook, or notification work.

## Double-Entry Ledger

Each wallet transfer creates balanced entries. For example, user pays merchant INR 100:

- Debit user wallet: `-10000` paise.
- Credit merchant wallet: `+10000` paise.

Add money through UPI after confirmed gateway success:

- Debit system UPI clearing account: `-10000` paise.
- Credit user wallet: `+10000` paise.

The total of entries for a ledger transaction must always be zero.

## Transaction States

General transaction states:

- `initiated`
- `pending`
- `processing`
- `succeeded`
- `failed`
- `reversed`
- `expired`

Add-money states:

- `created`
- `payment_pending`
- `gateway_success`
- `gateway_failed`
- `credit_processing`
- `credited`
- `reconciliation_required`

State transitions are explicit and audited. Duplicate webhook delivery must be accepted but must not duplicate wallet credits.

## Idempotency Model

Every money-moving API requires an `Idempotency-Key` header.

Storage:

- Redis short-lived lock for in-flight duplicate suppression.
- PostgreSQL durable idempotency record keyed by actor, endpoint scope, and idempotency key.
- Request hash is stored to reject key reuse with different payloads.
- Completed response snapshot is stored for safe replay.

## Locking Strategy

Wallet debits use row-level locks on wallet rows in a deterministic order:

- Lock source wallet.
- Lock destination wallet if present.
- Validate balance after locks.
- Insert ledger entries.
- Update balances.

PostgreSQL transaction isolation:

- Default `READ COMMITTED` with explicit `SELECT ... FOR UPDATE` is sufficient for the MVP wallet path.
- High-risk reconciliation jobs can use stricter isolation or advisory locks.

## Payment Gateway Abstraction

The payment module exposes a provider interface:

- `createUpiIntent(order)`
- `createUpiCollect(order)`
- `fetchPaymentStatus(providerPaymentId)`
- `verifyWebhookSignature(rawBody, headers)`
- `parseWebhook(rawBody, headers)`

Initial provider:

- `MockUpiGatewayProvider`

Future providers:

- Razorpay
- Cashfree
- PayU
- PhonePe

Provider-specific payloads are stored in gateway log tables, while domain transaction state remains provider-neutral.

## QR And Vendor Code Payments

Merchant QR payload should resolve to an internal merchant identifier, not blindly trust arbitrary UPI text.

Recommended internal QR payload:

```text
wallet://merchant/{merchantCode}?qrId={qrId}
```

The parser can later support Bharat QR, UPI QR, or PSP-specific payloads by adapting them into a normalized merchant lookup request.

Static vendor code format:

```text
MWK-{8 to 12 uppercase chars}
```

Codes are unique, non-sequential, and status controlled.

## Security Baseline

- OTPs stored hashed in Redis with TTL.
- OTP request and verify endpoints rate limited by mobile number, IP, and device fingerprint.
- JWT access tokens are short-lived.
- Refresh tokens are opaque, hashed in PostgreSQL, rotate on use, and are bound to a device session.
- Webhook signature verification uses constant-time comparison.
- Idempotency and webhook event IDs prevent replay.
- DTO validation rejects unknown and malformed fields.
- SQL injection prevention through ORM parameterization.
- Structured audit logs for auth, payment, ledger, merchant, and admin-sensitive actions.
- Secrets loaded only from environment or secret manager.
- Sensitive fields encrypted or hashed where applicable.

## Observability

- Correlation ID on every request.
- Structured JSON logs.
- Audit logs persisted to PostgreSQL.
- Health endpoints:
  - `/health/live`
  - `/health/ready`
- Metrics hooks for:
  - OTP requests
  - login failures
  - wallet debit failures
  - ledger post latency
  - webhook duplicates
  - reconciliation mismatches

