import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class MerchantCodeService {
  generateMerchantCode(): string {
    return `MWK-${this.generateCodeBody()}`;
  }

  generateVendorCode(): string {
    return `MWK-${this.generateCodeBody()}`;
  }

  buildQrPayload(merchantCode: string, qrId?: string): string {
    const suffix = qrId ? `?qrId=${encodeURIComponent(qrId)}` : '';
    return `wallet://merchant/${merchantCode}${suffix}`;
  }

  private generateCodeBody(): string {
    return Array.from({ length: 8 }, () => codeAlphabet[randomInt(0, codeAlphabet.length)]).join('');
  }
}
