import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  refreshToken!: string;

  @ApiProperty({ example: 'device-uuid-or-install-id' })
  @IsString()
  @MaxLength(128)
  deviceId!: string;
}
