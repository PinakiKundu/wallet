import { ConfigService } from '@nestjs/config';
import { MockUpiProvider } from './mock-upi.provider';

describe('MockUpiProvider', () => {
  const provider = new MockUpiProvider({
    getOrThrow: jest.fn().mockReturnValue('mock-webhook-secret')
  } as unknown as ConfigService);

  it('creates UPI intent URLs with transaction reference', () => {
    const order = provider.createIntent({
      transactionRef: 'txn_123',
      amount: 50000n
    });

    expect(order.provider).toBe('mock_upi');
    expect(order.providerOrderId).toBe('mock_order_txn_123');
    expect(order.upiIntentUrl).toContain('upi://pay');
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
