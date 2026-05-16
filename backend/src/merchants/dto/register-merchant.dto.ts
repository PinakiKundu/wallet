import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterMerchantDto {
  @ApiProperty({ example: 'Demo Store Private Limited' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  businessName!: string;

  @ApiProperty({ example: 'Demo Store' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @ApiPropertyOptional({ example: '+919999999998' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  mobileNumber?: string;

  @ApiPropertyOptional({ example: 'merchant@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
