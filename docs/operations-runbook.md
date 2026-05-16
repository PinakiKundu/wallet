# Operations Runbook

## Local Backend Verification

```powershell
Set-Location backend
npm run build
npm run lint
npm test
npm run prisma:validate
```

## Local Services

```powershell
docker --config .docker compose -f infra/docker-compose.yml up -d postgres redis
Set-Location backend
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

## Mock UPI Webhook Testing

Mock webhooks require:

- `X-Mock-Event-Id`
- `X-Mock-Signature`

The signature is HMAC-SHA256 over the JSON body using `MOCK_UPI_WEBHOOK_SECRET`.

## Reconciliation Checklist

- Find `add_money` transactions stuck in `pending`.
- Query latest provider status.
- If provider success exists and no ledger entries were posted, credit through the ledger service.
- If provider failed or expired, mark the transaction failed or expired.
- Store every provider status lookup in `payment_gateway_logs`.

## Incident Checklist

- Freeze impacted wallets by setting wallet status to `frozen`.
- Stop webhook processing for the impacted provider.
- Export transaction, ledger, webhook, gateway log, and audit log records.
- Verify ledger balance totals before any reversal.
- Apply reversals only through the ledger service.
