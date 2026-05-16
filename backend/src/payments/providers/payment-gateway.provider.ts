export interface UpiOrderInput {
  transactionRef: string;
  amount: bigint;
  payerVpa?: string;
}

export interface UpiGatewayOrder {
  provider: string;
  providerOrderId: string;
  providerPaymentId: string;
  expiresAt: Date;
  upiIntentUrl?: string;
  payerVpa?: string;
}

export interface PaymentGatewayProvider {
  createIntent(input: UpiOrderInput): UpiGatewayOrder;
  createCollect(input: UpiOrderInput): UpiGatewayOrder;
  signPayload(payload: unknown): string;
  verifySignature(payload: unknown, signature: string | undefined): boolean;
}
