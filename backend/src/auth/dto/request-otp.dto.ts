import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class RequestOtpDto {
  @ApiProperty({ example: '+919999999999' })
  @Matches(/^\+[1-9]\d{7,14}$/)
  mobileNumber!: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.login })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose = OtpPurpose.login;
}
