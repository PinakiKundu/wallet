import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './common/config/env.validation';
import appConfig from './common/config/app.config';
import databaseConfig from './common/config/database.config';
import securityConfig from './common/config/security.config';
import { DatabaseModule } from './common/database/database.module';
import { LoggerModule } from './common/logging/logger.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { WalletsModule } from './wallets/wallets.module';
import { LedgerModule } from './ledger/ledger.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { MerchantsModule } from './merchants/merchants.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
      load: [appConfig, databaseConfig, securityConfig]
    }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    WalletsModule,
    LedgerModule,
    IdempotencyModule,
    MerchantsModule,
    TransactionsModule,
    PaymentsModule,
    HealthModule
  ]
})
export class AppModule {}
