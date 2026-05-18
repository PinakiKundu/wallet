import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentGatewayProvider, UpiOrderInput } from './payment-gateway.provider';

@Injectable()
export class MockUpiProvider implements PaymentGatewayProvider {
  constructor(private readonly config: ConfigService) {}

  createIntent(input: UpiOrderInput) {
    const providerOrderId = `mock_order_${input.transactionRef}`;
    const providerPaymentId = `mock_pay_${input.transactionRef}`;
    const amountRupees = (Number(input.amount) / 100).toFixed(2);
    const payeeVpa = this.config.getOrThrow<string>('payments.upiPayeeVpa');
    const payeeName = encodeURIComponent(this.config.getOrThrow<string>('payments.upiPayeeName'));

    return {
      provider: 'mock_upi',
      providerOrderId,
      providerPaymentId,
      upiIntentUrl: `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${amountRupees}&cu=INR&tr=${input.transactionRef}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
  }

  createCollect(input: UpiOrderInput) {
    const providerOrderId = `mock_order_${input.transactionRef}`;
    const providerPaymentId = `mock_pay_${input.transactionRef}`;

    return {
      provider: 'mock_upi',
      providerOrderId,
      providerPaymentId,
      payerVpa: input.payerVpa,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
  }

  signPayload(payload: unknown): string {
    return createHmac('sha256', this.secret()).update(JSON.stringify(payload)).digest('hex');
  }

  verifySignature(payload: unknown, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }

    const expected = Buffer.from(this.signPayload(payload), 'hex');
    const actual = Buffer.from(signature, 'hex');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private secret(): string {
    return this.config.getOrThrow<string>('security.mockUpiWebhookSecret');
  }
}
