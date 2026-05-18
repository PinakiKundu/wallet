import { ConfigService } from '@nestjs/config';
import { MockUpiProvider } from './mock-upi.provider';

describe('MockUpiProvider', () => {
  const provider = new MockUpiProvider({
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'payments.upiPayeeVpa': 'merchant@upi',
        'payments.upiPayeeName': 'PiPay',
        'security.mockUpiWebhookSecret': 'mock-webhook-secret'
      };
      return values[key];
    })
  } as unknown as ConfigService);

  it('creates UPI intent URLs with transaction reference', () => {
    const order = provider.createIntent({
      transactionRef: 'txn_123',
      amount: 50000n
    });

    expect(order.provider).toBe('mock_upi');
    expect(order.providerOrderId).toBe('mock_order_txn_123');
    expect(order.upiIntentUrl).toContain('upi://pay');
    expect(order.upiIntentUrl).toContain('pa=merchant@upi');
    expect(order.upiIntentUrl).toContain('pn=PiPay');
    expect(order.upiIntentUrl).toContain('am=500.00');
    expect(order.upiIntentUrl).toContain('cu=INR');
    expect(order.upiIntentUrl).toContain('tr=txn_123');
  });

  it('signs and verifies webhook payloads', () => {
    const payload = {
      transactionRef: 'txn_123',
      status: 'success',
      amount: 50000
    };
    const signature = provider.signPayload(payload);

    expect(provider.verifySignature(payload, signature)).toBe(true);
    expect(provider.verifySignature({ ...payload, amount: 100 }, signature)).toBe(false);
  });
});
