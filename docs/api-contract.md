# API Contract

Base path:

```text
/api/v1
```

All responses use:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "correlationId": "req_..."
  }
}
```

Errors use:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "WALLET_INSUFFICIENT_BALANCE",
    "message": "Insufficient wallet balance",
    "details": {}
  },
  "meta": {
    "correlationId": "req_..."
  }
}
```

Money-moving endpoints require:

```text
Authorization: Bearer <access_token>
Idempotency-Key: <client-generated-key>
X-Device-Id: <device-id>
```

## Auth

### Request OTP

`POST /auth/otp/request`

```json
{
  "mobileNumber": "+919999999999",
  "purpose": "login"
}
```

### Verify OTP

`POST /auth/otp/verify`

```json
{
  "mobileNumber": "+919999999999",
  "otp": "123456",
  "device": {
    "deviceId": "device-uuid",
    "deviceName": "Pixel 8",
    "platform": "android",
    "appVersion": "1.0.0"
  }
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "mobileNumber": "+919999999999"
  }
}
```

### Refresh Token

`POST /auth/token/refresh`

```json
{
  "refreshToken": "opaque-token",
  "deviceId": "device-uuid"
}
```

### Logout Device

`POST /auth/logout`

### List Sessions

`GET /auth/sessions`

### Revoke Session

`DELETE /auth/sessions/{sessionId}`

## Wallet

### Get Wallet Summary

`GET /wallet`

Response:

```json
{
  "walletId": "uuid",
  "availableBalance": 125000,
  "ledgerBalance": 125000,
  "currency": "INR",
  "status": "active"
}
```

### Get Wallet Statement

`GET /wallet/statement?from=2026-05-01&to=2026-05-31&page=1&pageSize=20`

### Get Transaction

`GET /transactions/{transactionRef}`

## Add Money

### Create UPI Intent

`POST /payments/upi/intent`

```json
{
  "amount": 50000
}
```

Response:

```json
{
  "transactionRef": "txn_...",
  "status": "pending",
  "upiIntentUrl": "upi://pay?...",
  "expiresAt": "2026-05-15T10:00:00.000Z"
}
```

### Create UPI Collect

`POST /payments/upi/collect`

```json
{
  "amount": 50000,
  "payerVpa": "user@upi"
}
```

### Check Add Money Status

`GET /payments/upi/{transactionRef}/status`

### Mock Gateway Webhook

`POST /webhooks/payments/mock-upi`

Headers:

```text
X-Mock-Signature: <hmac>
X-Mock-Event-Id: <event-id>
```

Payload:

```json
{
  "providerPaymentId": "mock_pay_123",
  "providerOrderId": "mock_order_123",
  "status": "success",
  "amount": 50000,
  "transactionRef": "txn_..."
}
```

## Merchant Lookup

### Parse QR

`POST /merchants/qr/parse`

```json
{
  "payload": "wallet://merchant/MWK-AB12CD34?qrId=..."
}
```

### Lookup Vendor Code

`GET /merchants/vendor-codes/{code}`

Response:

```json
{
  "merchantId": "uuid",
  "merchantCode": "MWK-AB12CD34",
  "displayName": "Demo Store",
  "status": "active"
}
```

## Merchant Payment

### Pay Merchant

`POST /transactions/merchant-payments`

```json
{
  "merchantCode": "MWK-AB12CD34",
  "amount": 25000,
  "paymentSource": "qr",
  "qrId": "uuid"
}
```

Response:

```json
{
  "transactionRef": "txn_...",
  "status": "succeeded",
  "amount": 25000,
  "receipt": {
    "paidAt": "2026-05-15T10:00:00.000Z",
    "merchantName": "Demo Store"
  }
}
```

## Merchant Module

### Register Merchant

`POST /merchants`

```json
{
  "businessName": "Demo Store Private Limited",
  "displayName": "Demo Store",
  "mobileNumber": "+919999999998",
  "email": "merchant@example.com"
}
```

### Get Merchant Dashboard

`GET /merchants/{merchantId}/dashboard`

### Generate Merchant QR

`POST /merchants/{merchantId}/qr-codes`

### Generate Vendor Code

`POST /merchants/{merchantId}/vendor-codes`

### Merchant Transactions

`GET /merchants/{merchantId}/transactions`

### Settlement Records

`GET /merchants/{merchantId}/settlements`

## Admin And Operations

### Payment Reconciliation

`POST /ops/payments/reconcile`

### Reverse Transaction

`POST /ops/transactions/{transactionRef}/reverse`

```json
{
  "reason": "duplicate_payment"
}
```

