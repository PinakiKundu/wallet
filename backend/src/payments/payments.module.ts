import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { LedgerModule } from '../ledger/ledger.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockUpiProvider } from './providers/mock-upi.provider';

@Module({
  imports: [JwtModule.register({}), IdempotencyModule, LedgerModule, WalletsModule, TransactionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockUpiProvider, JwtAuthGuard],
  exports: [PaymentsService, MockUpiProvider]
})
export class PaymentsModule {}
