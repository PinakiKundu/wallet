import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletStatementQueryDto } from './dto/wallet-statement-query.dto';
import { WalletsService } from './wallets.service';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOkResponse({ description: 'Returns current user wallet summary' })
  getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getUserWalletSummary(user.userId);
  }

  @Get('statement')
  @ApiOkResponse({ description: 'Returns paginated wallet ledger statement' })
  getStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WalletStatementQueryDto
  ) {
    return this.walletsService.getUserWalletStatement(user.userId, query);
  }
}
