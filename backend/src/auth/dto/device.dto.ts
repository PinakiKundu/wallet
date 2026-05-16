import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Platform } from '@prisma/client';

export class DeviceDto {
  @ApiProperty({ example: 'device-uuid-or-install-id' })
  @IsString()
  @MaxLength(128)
  deviceId!: string;

  @ApiPropertyOptional({ example: 'Pixel 8' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;

  @ApiProperty({ enum: Platform, default: Platform.unknown })
  @IsEnum(Platform)
  platform: Platform = Platform.unknown;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
