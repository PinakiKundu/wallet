import { Injectable } from '@nestjs/common';
import { OtpDeliveryInput, OtpDeliveryProvider, OtpDeliveryResult } from './otp-delivery.provider';

@Injectable()
export class MockOtpDeliveryProvider implements OtpDeliveryProvider {
  async sendOtp(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    return {
      provider: 'mock',
      messageId: `mock_otp_${input.purpose}_${input.mobileNumber}`
    };
  }
}
