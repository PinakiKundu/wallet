# Project Structure

```text
digital-wallet/
  backend/
    src/
      main.ts
      app.module.ts
      common/
        config/
        database/
        decorators/
        dto/
        errors/
        filters/
        guards/
        interceptors/
        logging/
        responses/
        validation/
      auth/
        application/
        domain/
        dto/
        infra/
        auth.controller.ts
        auth.module.ts
      users/
      merchants/
      wallets/
      ledger/
      transactions/
      payments/
        providers/
          mock-upi/
        webhooks/
      risk/
      audit/
      health/
    prisma/
      schema.prisma
      migrations/
      seed.ts
    test/
      unit/
      integration/
      concurrency/
    Dockerfile
    package.json
    nest-cli.json
    tsconfig.json
    .env.example
  mobile/
    lib/
      main.dart
      app/
      core/
        config/
        errors/
        http/
        storage/
        widgets/
      features/
        auth/
        wallet/
        add_money/
        merchant_pay/
        qr_scan/
        merchant_dashboard/
    test/
    pubspec.yaml
    .env.example
  infra/
    docker-compose.yml
    postgres/
      init.sql
    nginx/
    k8s/
      README.md
  docs/
    architecture.md
    project-structure.md
    database-schema.md
    api-contract.md
    implementation-plan.md
```

## Backend Layering

Each business module follows this shape:

```text
module/
  domain/
    entities/
    value-objects/
    policies/
    events/
  application/
    services/
    use-cases/
  infra/
    repositories/
    mappers/
  dto/
  module.controller.ts
  module.module.ts
```

Controllers should only handle transport concerns:

- Auth guards.
- Request DTO validation.
- Calling application services.
- Returning standard responses.

Application services own transaction orchestration. Repositories own persistence details. Domain policies own business invariants such as transaction limits, merchant status checks, and wallet debit eligibility.

