import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletProvisioningService } from './wallet-provisioning.service';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [WalletsController],
  providers: [WalletsService, WalletProvisioningService, JwtAuthGuard],
  exports: [WalletProvisioningService, WalletsService]
})
export class WalletsModule {}
