import { BadRequestException } from '@nestjs/common';
import { QrParserService } from './qr-parser.service';

describe('QrParserService', () => {
  const service = new QrParserService();

  it('parses internal merchant QR payloads', () => {
    expect(service.parse('wallet://merchant/MWK-DEMO001?qrId=qr-1')).toEqual({
      merchantCode: 'MWK-DEMO001',
      qrId: 'qr-1',
      rawPayload: 'wallet://merchant/MWK-DEMO001?qrId=qr-1'
    });
  });

  it('rejects unsupported QR payloads', () => {
    expect(() => service.parse('upi://pay?pa=merchant@upi')).toThrow(BadRequestException);
  });
});
