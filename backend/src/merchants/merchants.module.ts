import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletsModule } from '../wallets/wallets.module';
import { MerchantCodeService } from './merchant-code.service';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { QrParserService } from './qr-parser.service';

@Module({
  imports: [JwtModule.register({}), WalletsModule],
  controllers: [MerchantsController],
  providers: [MerchantsService, MerchantCodeService, QrParserService, JwtAuthGuard],
  exports: [MerchantsService, MerchantCodeService, QrParserService]
})
export class MerchantsModule {}
