import { Body, Controller, Delete, Get, Headers, Ip, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedRequest, AuthenticatedUser } from './interfaces/authenticated-request';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @ApiOkResponse({ description: 'Requests a mock OTP for mobile login' })
  requestOtp(
    @Body() dto: RequestOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.authService.requestOtp(dto, {
      ip,
      userAgent,
      correlationId: request.correlationId
    });
  }

  @Post('otp/verify')
  @ApiOkResponse({ description: 'Verifies OTP and issues access and refresh tokens' })
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.authService.verifyOtp(dto, {
      ip,
      userAgent,
      correlationId: request.correlationId
    });
  }

  @Post('token/refresh')
  @ApiOkResponse({ description: 'Rotates refresh token and returns a new token pair' })
  refreshToken(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.authService.refreshToken(dto, {
      ip,
      userAgent,
      correlationId: request.correlationId
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Revokes the current device session' })
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.authService.logout(user, {
      ip,
      userAgent,
      correlationId: request.correlationId
    });
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Lists active and revoked device sessions' })
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessions(user);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Revokes a device session' })
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.authService.revokeSession(user, sessionId, {
      ip,
      userAgent,
      correlationId: request.correlationId
    });
  }
}
