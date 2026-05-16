import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { ParseQrDto } from './dto/parse-qr.dto';
import { RegisterMerchantDto } from './dto/register-merchant.dto';
import { MerchantsService } from './merchants.service';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @ApiOkResponse({ description: 'Registers a merchant and provisions wallet, QR, and vendor code' })
  registerMerchant(
    @Body() dto: RegisterMerchantDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.merchantsService.registerMerchant(dto, user.userId);
  }

  @Post('qr/parse')
  @ApiOkResponse({ description: 'Parses and validates a wallet merchant QR payload' })
  parseQr(@Body() dto: ParseQrDto) {
    return this.merchantsService.parseQr(dto);
  }

  @Get('vendor-codes/:code')
  @ApiOkResponse({ description: 'Looks up an active merchant by static vendor code' })
  lookupVendorCode(@Param('code') code: string) {
    return this.merchantsService.lookupVendorCode(code);
  }

  @Get(':merchantId/dashboard')
  @ApiOkResponse({ description: 'Returns merchant wallet and payment dashboard summary' })
  getDashboard(@Param('merchantId') merchantId: string) {
    return this.merchantsService.getDashboard(merchantId);
  }

  @Post(':merchantId/qr-codes')
  @ApiOkResponse({ description: 'Generates a new active merchant QR payload' })
  createQrCode(@Param('merchantId') merchantId: string) {
    return this.merchantsService.createQrCode(merchantId);
  }

  @Post(':merchantId/vendor-codes')
  @ApiOkResponse({ description: 'Generates a new active static vendor code' })
  createVendorCode(@Param('merchantId') merchantId: string) {
    return this.merchantsService.createVendorCode(merchantId);
  }

  @Get(':merchantId/transactions')
  @ApiOkResponse({ description: 'Lists merchant transactions' })
  listTransactions(
    @Param('merchantId') merchantId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.merchantsService.listTransactions(merchantId, query.page, query.pageSize);
  }

  @Get(':merchantId/settlements')
  @ApiOkResponse({ description: 'Lists merchant settlement records' })
  listSettlements(
    @Param('merchantId') merchantId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.merchantsService.listSettlements(merchantId, query.page, query.pageSize);
  }
}
