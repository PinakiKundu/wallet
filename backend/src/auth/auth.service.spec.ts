import { UnauthorizedException } from '@nestjs/common';
import { OtpPurpose, OtpStatus, Platform } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const makeService = () => {
    const prisma = {
      otpChallenge: {
        create: jest.fn().mockResolvedValue({ id: 'challenge-1' }),
        update: jest.fn().mockResolvedValue({})
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const redis = {
      setJson: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined)
    };
    const crypto = {
      generateOtp: jest.fn().mockReturnValue('123456'),
      hashSecret: jest.fn().mockReturnValue('hashed-otp'),
      equalsHash: jest.fn()
    };
    const rateLimiter = {
      consume: jest.fn().mockResolvedValue(undefined)
    };
    const jwt = {
      signAsync: jest.fn()
    };
    const config = {
      get: jest.fn((key: string) => (key === 'app.nodeEnv' ? 'development' : undefined)),
      getOrThrow: jest.fn()
    };
    const walletProvisioning = {
      ensureUserWallet: jest.fn()
    };
    const otpDelivery = {
      sendOtp: jest.fn().mockResolvedValue({ provider: 'mock', messageId: 'mock-message' })
    };

    const service = new AuthService(
      prisma as never,
      redis as never,
      crypto as never,
      rateLimiter as never,
      jwt as never,
      config as never,
      walletProvisioning as never,
      otpDelivery as never
    );

    return { service, prisma, redis, crypto, rateLimiter };
  };

  it('stores only a hashed OTP and returns the debug OTP outside production', async () => {
    const { service, redis, crypto, rateLimiter } = makeService();

    const result = await service.requestOtp(
      { mobileNumber: '+919999999999', purpose: OtpPurpose.login },
      { ip: '127.0.0.1', userAgent: 'jest' }
    );

    expect(result).toMatchObject({
      challengeId: 'challenge-1',
      expiresInSeconds: 300,
      delivery: 'mock',
      debugOtp: '123456'
    });
    expect(rateLimiter.consume).toHaveBeenCalledWith('otp:request:mobile:+919999999999', 3, 300);
    expect(crypto.hashSecret).toHaveBeenCalledWith('123456');
    expect(redis.setJson).toHaveBeenCalledWith(
      'otp:login:+919999999999',
      expect.objectContaining({
        otpHash: 'hashed-otp'
      }),
      300
    );
    expect(JSON.stringify(redis.setJson.mock.calls[0][1])).not.toContain('123456');
  });

  it('records failed OTP attempts without deleting the challenge before max attempts', async () => {
    const { service, prisma, redis, crypto } = makeService();
    redis.get.mockResolvedValue(
      JSON.stringify({
        challengeId: 'challenge-1',
        mobileNumber: '+919999999999',
        purpose: OtpPurpose.login,
        otpHash: 'hashed-otp',
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      })
    );
    crypto.equalsHash.mockReturnValue(false);

    await expect(
      service.verifyOtp(
        {
          mobileNumber: '+919999999999',
          otp: '000000',
          device: {
            deviceId: 'device-1',
            platform: Platform.android
          }
        },
        {}
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(redis.delete).not.toHaveBeenCalled();
    expect(redis.setJson).toHaveBeenCalledWith(
      'otp:login:+919999999999',
      expect.objectContaining({ attempts: 1 }),
      expect.any(Number)
    );
    expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
      where: { id: 'challenge-1' },
      data: { attemptCount: 1 }
    });
  });

  it('expires the OTP challenge after the maximum number of failed attempts', async () => {
    const { service, prisma, redis, crypto } = makeService();
    redis.get.mockResolvedValue(
      JSON.stringify({
        challengeId: 'challenge-1',
        mobileNumber: '+919999999999',
        purpose: OtpPurpose.login,
        otpHash: 'hashed-otp',
        attempts: 4,
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      })
    );
    crypto.equalsHash.mockReturnValue(false);

    await expect(
      service.verifyOtp(
        {
          mobileNumber: '+919999999999',
          otp: '000000',
          device: {
            deviceId: 'device-1',
            platform: Platform.android
          }
        },
        {}
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(redis.delete).toHaveBeenCalledWith('otp:login:+919999999999');
    expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
      where: { id: 'challenge-1' },
      data: {
        status: OtpStatus.failed,
        attemptCount: 5
      }
    });
  });
});
