import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export enum MockUpiWebhookStatus {
  success = 'success',
  failed = 'failed'
}

export class MockUpiWebhookDto {
  @ApiProperty({ example: 'mock_pay_123' })
  @IsString()
  providerPaymentId!: string;

  @ApiProperty({ example: 'mock_order_123' })
  @IsString()
  providerOrderId!: string;

  @ApiProperty({ enum: MockUpiWebhookStatus })
  @IsEnum(MockUpiWebhookStatus)
  status!: MockUpiWebhookStatus;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;

  @ApiProperty({ example: 'txn_...' })
  @IsString()
  transactionRef!: string;
}
