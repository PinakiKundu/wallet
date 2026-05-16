import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

@Injectable()
export class AuthCryptoService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('security.jwtAccessSecret');
  }

  generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashSecret(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  equalsHash(value: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashSecret(value), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
