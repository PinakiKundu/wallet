import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthCryptoService } from './crypto.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimiterService } from './rate-limiter.service';
import { WalletsModule } from '../wallets/wallets.module';
import { MockOtpDeliveryProvider } from './otp-delivery/mock-otp-delivery.provider';

@Module({
  imports: [JwtModule.register({}), WalletsModule],
  controllers: [AuthController],
  providers: [AuthService, AuthCryptoService, JwtAuthGuard, RateLimiterService, MockOtpDeliveryProvider],
  exports: [JwtAuthGuard]
})
export class AuthModule {}
