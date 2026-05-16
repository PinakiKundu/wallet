import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { AuthenticatedRequest, AuthenticatedUser } from './interfaces/authenticated-request';

interface AccessTokenPayload {
  sub: string;
  mobileNumber: string;
  deviceSessionId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.header('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('security.jwtAccessSecret')
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        mobileNumber: true,
        status: true,
        devices: {
          where: { id: payload.deviceSessionId },
          select: { id: true, revokedAt: true }
        }
      }
    });

    if (!user || user.status !== UserStatus.active) {
      throw new ForbiddenException('User is not active');
    }

    const device = user.devices[0];

    if (!device || device.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    request.user = {
      userId: user.id,
      mobileNumber: user.mobileNumber,
      deviceSessionId: device.id
    } satisfies AuthenticatedUser;

    return true;
  }
}
