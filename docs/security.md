# Security Hardening Notes

## Implemented Baseline

- JWT access tokens with short TTL.
- Opaque refresh tokens stored only as HMAC hashes.
- Refresh token rotation and token-family revocation on reuse.
- Device/session revocation.
- OTPs stored hashed in Redis with TTL.
- OTP request and verify rate limiting.
- Standard response envelope and global exception handling.
- DTO validation with unknown-field rejection.
- Helmet security headers.
- HMAC webhook signature verification for the mock UPI provider.
- Idempotency keys for money-moving APIs.
- Double-entry ledger and row-level wallet locking.
- Audit logging for login, merchant registration, merchant payment, and transaction-sensitive events.

## Production Before Real Money

- Move secrets to a managed secret store.
- Add real SMS OTP delivery with template controls and delivery audit logs.
- Add device fingerprinting and stronger risk scoring.
- Add merchant ownership and staff roles before exposing merchant dashboards.
- Add KYC, AML checks, and transaction limits.
- Add provider-specific webhook raw-body verification for Razorpay, Cashfree, PayU, or PhonePe.
- Encrypt high-sensitivity PII fields at rest.
- Add WAF/API gateway rate limits.
- Add alerting on failed ledger posts, webhook mismatch, high OTP failures, and reconciliation drift.
- Run database backups and restore drills.

## PCI-Conscious Boundary

The MVP stores no card data and does not process card PAN/CVV. UPI provider references and webhook payloads are stored for audit and reconciliation, but real provider payloads should be redacted before persistence.
