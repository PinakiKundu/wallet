import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum MerchantPaymentSource {
  qr = 'qr',
  vendor_code = 'vendor_code'
}

export class MerchantPaymentDto {
  @ApiProperty({ example: 'MWK-DEMO001' })
  @IsString()
  @MaxLength(32)
  merchantCode!: string;

  @ApiProperty({ example: 25000, description: 'Amount in paise' })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;

  @ApiProperty({ enum: MerchantPaymentSource })
  @IsEnum(MerchantPaymentSource)
  paymentSource!: MerchantPaymentSource;

  @ApiPropertyOptional({ example: 'qr-code-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  qrId?: string;
}
