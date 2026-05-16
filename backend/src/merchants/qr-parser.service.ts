import { BadRequestException, Injectable } from '@nestjs/common';

export interface ParsedMerchantQr {
  merchantCode: string;
  qrId?: string;
  rawPayload: string;
}

@Injectable()
export class QrParserService {
  parse(payload: string): ParsedMerchantQr {
    if (payload.startsWith('wallet://merchant/')) {
      return this.parseInternalWalletQr(payload);
    }

    throw new BadRequestException('Unsupported merchant QR payload');
  }

  private parseInternalWalletQr(payload: string): ParsedMerchantQr {
    let url: URL;

    try {
      url = new URL(payload);
    } catch {
      throw new BadRequestException('Invalid merchant QR payload');
    }

    if (url.protocol !== 'wallet:' || url.hostname !== 'merchant') {
      throw new BadRequestException('Invalid merchant QR payload');
    }

    const merchantCode = url.pathname.replace(/^\//, '').trim().toUpperCase();

    if (!/^MWK-[A-Z0-9]{7,12}$/.test(merchantCode)) {
      throw new BadRequestException('Invalid merchant code in QR payload');
    }

    const qrId = url.searchParams.get('qrId') ?? undefined;

    return {
      merchantCode,
      qrId,
      rawPayload: payload
    };
  }
}
