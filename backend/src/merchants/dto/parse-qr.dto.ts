import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ParseQrDto {
  @ApiProperty({ example: 'wallet://merchant/MWK-DEMO001?qrId=...' })
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  payload!: string;
}
