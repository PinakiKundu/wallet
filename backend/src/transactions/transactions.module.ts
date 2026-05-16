import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { LedgerModule } from '../ledger/ledger.module';
import { TransactionRefService } from './transaction-ref.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [JwtModule.register({}), IdempotencyModule, LedgerModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionRefService, JwtAuthGuard],
  exports: [TransactionsService, TransactionRefService]
})
export class TransactionsModule {}
