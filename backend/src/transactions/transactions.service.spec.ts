import { ActorType, CodeStatus, MerchantStatus, RiskLevel, TransactionStatus, WalletOwnerType } from '@prisma/client';
import { TransactionsService } from './transactions.service';
import { MerchantPaymentSource } from './dto/merchant-payment.dto';

describe('TransactionsService', () => {
  it('debits the user wallet and credits the merchant wallet through the ledger', async () => {
    const merchant = {
      id: 'merchant-1',
      merchantCode: 'MWK-DEMO001',
      displayName: 'Demo Store',
      status: MerchantStatus.active,
      riskLevel: RiskLevel.low
    };
    const userWallet = {
      id: 'wallet-user',
      ownerType: WalletOwnerType.user
    };
    const merchantWallet = {
      id: 'wallet-merchant',
      ownerType: WalletOwnerType.merchant
    };
    const transaction = {
      id: 'transaction-1',
      transactionRef: 'txn_1',
      amount: 25000n,
      currency: 'INR',
      status: TransactionStatus.processing
    };
    const completed = {
      ...transaction,
      status: TransactionStatus.succeeded
    };
    const tx = {
      merchant: {
        findUnique: jest.fn().mockResolvedValue(merchant)
      },
      merchantQrCode: {
        findFirst: jest.fn().mockResolvedValue({ id: 'qr-1', status: CodeStatus.active })
      },
      wallet: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(userWallet)
          .mockResolvedValueOnce(merchantWallet)
      },
      transaction: {
        create: jest.fn().mockResolvedValue(transaction),
        update: jest.fn().mockResolvedValue(completed)
      },
      transactionEvent: {
        create: jest.fn().mockResolvedValue({})
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const prisma = {
      $transaction: jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx))
    };
    const idempotency = {
      begin: jest.fn().mockResolvedValue({ state: 'started', record: { id: 'idem-1' } }),
      complete: jest.fn().mockResolvedValue({})
    };
    const ledger = {
      postEntriesInTransaction: jest.fn().mockResolvedValue({})
    };
    const refs = {
      generate: jest.fn().mockReturnValue('txn_1')
    };
    const service = new TransactionsService(
      prisma as never,
      idempotency as never,
      ledger as never,
      refs as never
    );

    const result = await service.payMerchant(
      {
        userId: 'user-1',
        mobileNumber: '+919999999999',
        deviceSessionId: 'device-session-1'
      },
      {
        merchantCode: 'MWK-DEMO001',
        amount: 25000,
        paymentSource: MerchantPaymentSource.qr,
        qrId: 'qr-1'
      },
      'idem-key'
    );

    expect(idempotency.begin).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: ActorType.user,
        actorId: 'user-1',
        scope: 'transactions.merchant-payments',
        key: 'idem-key'
      }),
      tx
    );
    expect(ledger.postEntriesInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionId: 'transaction-1',
        entries: [
          expect.objectContaining({ walletId: 'wallet-user', amount: 25000n }),
          expect.objectContaining({ walletId: 'wallet-merchant', amount: 25000n })
        ]
      })
    );
    expect(idempotency.complete).toHaveBeenCalled();
    expect(result).toMatchObject({
      transactionRef: 'txn_1',
      status: TransactionStatus.succeeded,
      amount: '25000',
      receipt: {
        merchantName: 'Demo Store'
      }
    });
  });
});
