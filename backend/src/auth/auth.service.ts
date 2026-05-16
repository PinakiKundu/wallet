import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpPurpose, OtpStatus, Prisma, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AuthCryptoService } from './crypto.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RateLimiterService } from './rate-limiter.service';
import { AuthenticatedUser } from './interfaces/authenticated-request';
import { WalletProvisioningService } from '../wallets/wallet-provisioning.service';
import { MockOtpDeliveryProvider } from './otp-delivery/mock-otp-delivery.provider';

const OTP_TTL_SECONDS = 300;
const MAX_OTP_ATTEMPTS = 5;

interface RequestContext {
  ip?: string;
  userAgent?: string;
  correlationId?: string;
}

interface StoredOtp {
  challengeId: string;
  mobileNumber: string;
  purpose: OtpPurpose;
  otpHash: string;
  attempts: number;
  expiresAt: string;
}

interface AccessTokenPayload {
  sub: string;
  mobileNumber: string;
  deviceSessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly crypto: AuthCryptoService,
    private readonly rateLimiter: RateLimiterService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly walletProvisioning: WalletProvisioningService,
    private readonly otpDelivery: MockOtpDeliveryProvider
  ) {}

  async requestOtp(dto: RequestOtpDto, context: RequestContext) {
    await this.rateLimiter.consume(`otp:request:mobile:${dto.mobileNumber}`, 3, 300);

    if (context.ip) {
      await this.rateLimiter.consume(`otp:request:ip:${context.ip}`, 30, 300);
    }

    const otp = this.crypto.generateOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        mobileNumber: dto.mobileNumber,
        purpose: dto.purpose,
        status: OtpStatus.requested,
        expiresAt
      }
    });

    await this.redis.setJson(this.otpKey(dto.purpose, dto.mobileNumber), {
      challengeId: challenge.id,
      mobileNumber: dto.mobileNumber,
      purpose: dto.purpose,
      otpHash: this.crypto.hashSecret(otp),
      attempts: 0,
      expiresAt: expiresAt.toISOString()
    } satisfies StoredOtp, OTP_TTL_SECONDS);
    const delivery = await this.otpDelivery.sendOtp({
      mobileNumber: dto.mobileNumber,
      otp,
      purpose: dto.purpose
    });

    await this.writeAudit('system', undefined, 'auth.otp.requested', 'otp_challenge', challenge.id, context, {
      mobileNumber: dto.mobileNumber,
      purpose: dto.purpose
    });

    return {
      challengeId: challenge.id,
      expiresInSeconds: OTP_TTL_SECONDS,
      delivery: delivery.provider,
      deliveryMessageId: delivery.messageId,
      debugOtp: this.isProduction() ? undefined : otp
    };
  }

  async verifyOtp(dto: VerifyOtpDto, context: RequestContext) {
    await this.rateLimiter.consume(`otp:verify:mobile:${dto.mobileNumber}`, 10, 300);

    const otpKey = this.otpKey(OtpPurpose.login, dto.mobileNumber);
    const stored = await this.getStoredOtp(otpKey);

    if (!stored) {
      throw new BadRequestException('OTP has expired or was not requested');
    }

    if (!this.crypto.equalsHash(dto.otp, stored.otpHash)) {
      await this.recordFailedOtpAttempt(otpKey, stored);
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.delete(otpKey);

    const authResult = await this.prisma.$transaction(async (tx) => {
      await tx.otpChallenge.update({
        where: { id: stored.challengeId },
        data: {
          status: OtpStatus.verified,
          verifiedAt: new Date()
        }
      });

      let user = await tx.user.findUnique({
        where: { mobileNumber: dto.mobileNumber }
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            mobileNumber: dto.mobileNumber,
            mobileVerifiedAt: new Date(),
            status: UserStatus.active
          }
        });
      } else if (user.status !== UserStatus.active) {
        throw new ForbiddenException('User is not active');
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: { mobileVerifiedAt: new Date() }
        });
      }

      await this.walletProvisioning.ensureUserWallet(user.id, tx);

      const device = await tx.userDevice.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId: dto.device.deviceId
          }
        },
        update: {
          deviceName: dto.device.deviceName,
          platform: dto.device.platform,
          appVersion: dto.device.appVersion,
          lastSeenAt: new Date(),
          revokedAt: null
        },
        create: {
          userId: user.id,
          deviceId: dto.device.deviceId,
          deviceName: dto.device.deviceName,
          platform: dto.device.platform,
          appVersion: dto.device.appVersion,
          lastSeenAt: new Date()
        }
      });

      const tokens = await this.issueTokenPair(tx, {
        userId: user.id,
        mobileNumber: user.mobileNumber,
        deviceSessionId: device.id
      });

      await this.writeAuditInTx(tx, 'user', user.id, 'auth.login.succeeded', 'user_device', device.id, context, {
        deviceId: dto.device.deviceId
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          mobileNumber: user.mobileNumber
        }
      };
    });

    return authResult;
  }

  async refreshToken(dto: RefreshTokenDto, context: RequestContext) {
    const tokenHash = this.crypto.hashSecret(dto.refreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: {
        user: true,
        device: true
      }
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.rotatedAt || existing.revokedAt) {
      await this.revokeTokenFamily(existing.familyId, existing.deviceRef);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (existing.device.deviceId !== dto.deviceId || existing.device.revokedAt) {
      await this.revokeTokenFamily(existing.familyId, existing.deviceRef);
      throw new UnauthorizedException('Refresh token device mismatch');
    }

    if (existing.user.status !== UserStatus.active) {
      throw new ForbiddenException('User is not active');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { rotatedAt: new Date() }
      });

      await tx.userDevice.update({
        where: { id: existing.deviceRef },
        data: { lastSeenAt: new Date() }
      });

      const tokens = await this.issueTokenPair(tx, {
        userId: existing.user.id,
        mobileNumber: existing.user.mobileNumber,
        deviceSessionId: existing.deviceRef,
        familyId: existing.familyId
      });

      await this.writeAuditInTx(tx, 'user', existing.user.id, 'auth.token.refreshed', 'user_device', existing.deviceRef, context);

      return tokens;
    });
  }

  async logout(user: AuthenticatedUser, context: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userDevice.update({
        where: { id: user.deviceSessionId },
        data: { revokedAt: new Date() }
      });
      await tx.refreshToken.updateMany({
        where: {
          userId: user.userId,
          deviceRef: user.deviceSessionId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
      await this.writeAuditInTx(tx, 'user', user.userId, 'auth.logout', 'user_device', user.deviceSessionId, context);
    });

    return { loggedOut: true };
  }

  async listSessions(user: AuthenticatedUser) {
    const sessions = await this.prisma.userDevice.findMany({
      where: { userId: user.userId },
      include: {
        refreshTokens: {
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() }
          },
          select: { id: true }
        }
      },
      orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }]
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      platform: session.platform,
      appVersion: session.appVersion,
      lastSeenAt: session.lastSeenAt,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
      current: session.id === user.deviceSessionId,
      active: !session.revokedAt && session.refreshTokens.length > 0
    }));
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string, context: RequestContext) {
    const session = await this.prisma.userDevice.findFirst({
      where: {
        id: sessionId,
        userId: user.userId
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userDevice.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() }
      });
      await tx.refreshToken.updateMany({
        where: {
          userId: user.userId,
          deviceRef: sessionId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
      await this.writeAuditInTx(tx, 'user', user.userId, 'auth.session.revoked', 'user_device', sessionId, context);
    });

    return { revoked: true };
  }

  private async issueTokenPair(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      mobileNumber: string;
      deviceSessionId: string;
      familyId?: string;
    }
  ) {
    const accessTtlSeconds = this.config.getOrThrow<number>('security.jwtAccessTtlSeconds');
    const refreshTtlDays = this.config.getOrThrow<number>('security.refreshTokenTtlDays');
    const refreshToken = this.crypto.generateOpaqueToken();
    const familyId = input.familyId ?? randomUUID();
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);
    const accessToken = await this.jwt.signAsync(
      {
        sub: input.userId,
        mobileNumber: input.mobileNumber,
        deviceSessionId: input.deviceSessionId
      } satisfies AccessTokenPayload,
      {
        secret: this.config.getOrThrow<string>('security.jwtAccessSecret'),
        expiresIn: accessTtlSeconds
      }
    );

    await tx.refreshToken.create({
      data: {
        userId: input.userId,
        deviceRef: input.deviceSessionId,
        tokenHash: this.crypto.hashSecret(refreshToken),
        familyId,
        expiresAt: refreshTokenExpiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtlSeconds,
      refreshTokenExpiresAt
    };
  }

  private async getStoredOtp(key: string): Promise<StoredOtp | null> {
    const raw = await this.redis.get(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredOtp;

    if (new Date(parsed.expiresAt) <= new Date()) {
      await this.redis.delete(key);
      return null;
    }

    return parsed;
  }

  private async recordFailedOtpAttempt(key: string, stored: StoredOtp): Promise<void> {
    const attempts = stored.attempts + 1;

    if (attempts >= MAX_OTP_ATTEMPTS) {
      await this.redis.delete(key);
      await this.prisma.otpChallenge.update({
        where: { id: stored.challengeId },
        data: {
          status: OtpStatus.failed,
          attemptCount: attempts
        }
      });
      return;
    }

    const ttlSeconds = Math.max(1, Math.ceil((new Date(stored.expiresAt).getTime() - Date.now()) / 1000));
    await this.redis.setJson(key, { ...stored, attempts }, ttlSeconds);
    await this.prisma.otpChallenge.update({
      where: { id: stored.challengeId },
      data: { attemptCount: attempts }
    });
  }

  private async revokeTokenFamily(familyId: string, deviceSessionId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() }
      }),
      this.prisma.userDevice.update({
        where: { id: deviceSessionId },
        data: { revokedAt: new Date() }
      })
    ]);
  }

  private otpKey(purpose: OtpPurpose, mobileNumber: string): string {
    return `otp:${purpose}:${mobileNumber}`;
  }

  private isProduction(): boolean {
    return this.config.get<string>('app.nodeEnv') === 'production';
  }

  private async writeAudit(
    actorType: 'system' | 'user',
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    context: RequestContext,
    metadata: Prisma.InputJsonObject = {}
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorType,
        actorId,
        action,
        entityType,
        entityId,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        correlationId: context.correlationId,
        metadata
      }
    });
  }

  private async writeAuditInTx(
    tx: Prisma.TransactionClient,
    actorType: 'system' | 'user',
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    context: RequestContext,
    metadata: Prisma.InputJsonObject = {}
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorType,
        actorId,
        action,
        entityType,
        entityId,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        correlationId: context.correlationId,
        metadata
      }
    });
  }
}
