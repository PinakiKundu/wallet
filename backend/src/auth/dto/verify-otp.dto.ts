import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, ValidateNested } from 'class-validator';
import { DeviceDto } from './device.dto';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919999999999' })
  @Matches(/^\+[1-9]\d{7,14}$/)
  mobileNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;

  @ApiProperty({ type: DeviceDto })
  @ValidateNested()
  @Type(() => DeviceDto)
  device!: DeviceDto;
}
