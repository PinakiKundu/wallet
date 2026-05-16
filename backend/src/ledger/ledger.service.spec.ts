import { BadRequestException, ConflictException } from '@nestjs/common';
import { LedgerEntryType, WalletOwnerType, WalletStatus } from '@prisma/client';
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  const makeTx = () => {
    const wallets = [
      {
        id: 'wallet-user',
        ownerType: WalletOwnerType.user,
        userId: 'user-1',
        merchantId: null,
        systemAccountCode: null,
        currency: 'INR',
        availableBalance: 1000n,
        ledgerBalance: 1000n,
        status: WalletStatus.active,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'wallet-merchant',
        ownerType: WalletOwnerType.merchant,
        userId: null,
        merchantId: 'merchant-1',
        systemAccountCode: null,
        currency: 'INR',
        availableBalance: 0n,
        ledgerBalance: 0n,
        status: WalletStatus.active,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      wallet: {
        findMany: jest.fn().mockResolvedValue(wallets),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const wallet = wallets.find((item) => item.id === where.id);

          if (!wallet) {
            throw new Error('wallet not found');
          }

          wallet.availableBalance = data.availableBalance;
          wallet.ledgerBalance = data.ledgerBalance;
          wallet.version += data.version.increment;
          return wallet;
        })
      },
      ledgerEntry: {
        createMany: jest.fn().mockResolvedValue({ count: 2 })
      }
    };

    return { tx, wallets };
  };

  it('posts balanced debit and credit entries atomically', async () => {
    const { tx, wallets } = makeTx();
    const service = new LedgerService({} as never);

    const result = await service.postEntriesInTransaction(tx as never, {
      transactionId: 'txn-1',
      entries: [
        {
          walletId: 'wallet-user',
          entryType: LedgerEntryType.debit,
          amount: 250n,
          description: 'Pay merchant'
        },
        {
          walletId: 'wallet-merchant',
          entryType: LedgerEntryType.credit,
          amount: 250n,
          description: 'Receive payment'
        }
      ]
    });

    expect(wallets[0].availableBalance).toBe(750n);
    expect(wallets[1].availableBalance).toBe(250n);
    expect(tx.wallet.update).toHaveBeenCalledTimes(2);
    expect(tx.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          transactionId: 'txn-1',
          walletId: 'wallet-user',
          entryType: LedgerEntryType.debit,
          amount: 250n,
          balanceAfter: 750n
        }),
        expect.objectContaining({
          transactionId: 'txn-1',
          walletId: 'wallet-merchant',
          entryType: LedgerEntryType.credit,
          amount: 250n,
          balanceAfter: 250n
        })
      ]
    });
    expect(result.entries).toHaveLength(2);
  });

  it('rejects unbalanced entries before updating wallets', async () => {
    const { tx } = makeTx();
    const service = new LedgerService({} as never);

    await expect(
      service.postEntriesInTransaction(tx as never, {
        transactionId: 'txn-1',
        entries: [
          {
            walletId: 'wallet-user',
            entryType: LedgerEntryType.debit,
            amount: 250n
          },
          {
            walletId: 'wallet-merchant',
            entryType: LedgerEntryType.credit,
            amount: 200n
          }
        ]
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it('prevents non-system wallets from going negative', async () => {
    const { tx } = makeTx();
    const service = new LedgerService({} as never);

    await expect(
      service.postEntriesInTransaction(tx as never, {
        transactionId: 'txn-1',
        entries: [
          {
            walletId: 'wallet-user',
            entryType: LedgerEntryType.debit,
            amount: 1250n
          },
          {
            walletId: 'wallet-merchant',
            entryType: LedgerEntryType.credit,
            amount: 1250n
          }
        ]
      })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });
});
