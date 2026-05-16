import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUpiCollectDto } from './dto/create-upi-collect.dto';
import { CreateUpiIntentDto } from './dto/create-upi-intent.dto';
import { MockUpiWebhookDto } from './dto/mock-upi-webhook.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/upi/intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ description: 'Creates a mock UPI intent add-money order' })
  createUpiIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUpiIntentDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    return this.paymentsService.createUpiIntent(user, dto, idempotencyKey);
  }

  @Post('payments/upi/collect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ description: 'Creates a mock UPI collect add-money order' })
  createUpiCollect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUpiCollectDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    return this.paymentsService.createUpiCollect(user, dto, idempotencyKey);
  }

  @Get('payments/upi/:transactionRef/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Returns add-money transaction status' })
  getUpiStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionRef') transactionRef: string
  ) {
    return this.paymentsService.getUpiStatus(user, transactionRef);
  }

  @Post('webhooks/payments/mock-upi')
  @ApiHeader({ name: 'X-Mock-Signature', required: true })
  @ApiHeader({ name: 'X-Mock-Event-Id', required: true })
  @ApiOkResponse({ description: 'Processes mock UPI payment webhooks' })
  mockUpiWebhook(
    @Body() dto: MockUpiWebhookDto,
    @Headers('x-mock-event-id') eventId: string | undefined,
    @Headers('x-mock-signature') signature: string | undefined
  ) {
    return this.paymentsService.handleMockUpiWebhook(dto, eventId, signature);
  }
}
