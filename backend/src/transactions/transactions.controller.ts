import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MerchantPaymentDto } from './dto/merchant-payment.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('merchant-payments')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ description: 'Pays a merchant by QR or static vendor code' })
  payMerchant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MerchantPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    return this.transactionsService.payMerchant(user, dto, idempotencyKey);
  }

  @Get(':transactionRef')
  @ApiOkResponse({ description: 'Returns a transaction receipt and ledger entries' })
  getTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionRef') transactionRef: string
  ) {
    return this.transactionsService.getTransaction(user, transactionRef);
  }
}
