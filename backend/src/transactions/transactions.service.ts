import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActorType,
  CodeStatus,
  LedgerEntryType,
  MerchantStatus,
  RiskLevel,
  TransactionStatus,
  TransactionType,
  WalletOwnerType
} from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { INR, paiseToApi, parsePositivePaise } from '../common/money/money';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerService } from '../ledger/ledger.service';
import { MerchantPaymentDto, MerchantPaymentSource } from './dto/merchant-payment.dto';
import { TransactionRefService } from './transaction-ref.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly ledger: LedgerService,
    private readonly transactionRefs: TransactionRefService
  ) {}

  async payMerchant(user: AuthenticatedUser, dto: MerchantPaymentDto, idempotencyKey: string) {
    const amount = parsePositivePaise(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const idem = await this.idempotency.begin(
        {
          actorType: ActorType.user,
          actorId: user.userId,
          scope: 'transactions.merchant-payments',
          key: idempotencyKey,
          requestBody: dto
        },
        tx
      );

      if (idem.state === 'replay') {
        return idem.responseBody;
      }

      const merchant = await tx.merchant.findUnique({
        where: { merchantCode: dto.merchantCode.trim().toUpperCase() }
      });

      if (!merchant) {
        throw new NotFoundException('Merchant not found');
      }

      if (merchant.status !== MerchantStatus.active || merchant.riskLevel === RiskLevel.high) {
        throw new ConflictException('Merchant cannot receive payments');
      }

      if (dto.paymentSource === MerchantPaymentSource.qr) {
        if (!dto.qrId) {
          throw new BadRequestException('qrId is required for QR payments');
        }

        const qr = await tx.merchantQrCode.findFirst({
          where: {
            id: dto.qrId,
            merchantId: merchant.id,
            status: CodeStatus.active
          }
        });

        if (!qr) {
          throw new NotFoundException('Merchant QR code is not active');
        }
      }

      const userWallet = await tx.wallet.findFirst({
        where: {
          ownerType: WalletOwnerType.user,
          userId: user.userId
        }
      });
      const merchantWallet = await tx.wallet.findFirst({
        where: {
          ownerType: WalletOwnerType.merchant,
          merchantId: merchant.id
        }
      });

      if (!userWallet) {
        throw new NotFoundException('User wallet not found');
      }

      if (!merchantWallet) {
        throw new NotFoundException('Merchant wallet not found');
      }

      const transaction = await tx.transaction.create({
        data: {
          transactionRef: this.transactionRefs.generate(),
          type: TransactionType.wallet_payment,
          status: TransactionStatus.processing,
          amount,
          currency: INR,
          initiatedByUserId: user.userId,
          merchantId: merchant.id,
          sourceWalletId: userWallet.id,
          destinationWalletId: merchantWallet.id,
          idempotencyKeyId: idem.record.id,
          metadata: {
            paymentSource: dto.paymentSource,
            qrId: dto.qrId
          }
        }
      });

      await this.ledger.postEntriesInTransaction(tx, {
        transactionId: transaction.id,
        currency: INR,
        entries: [
          {
            walletId: userWallet.id,
            entryType: LedgerEntryType.debit,
            amount,
            description: `Payment to ${merchant.displayName}`
          },
          {
            walletId: merchantWallet.id,
            entryType: LedgerEntryType.credit,
            amount,
            description: `Payment from ${user.mobileNumber}`
          }
        ]
      });

      const completedAt = new Date();
      const completed = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.succeeded,
          completedAt
        }
      });

      await tx.transactionEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: 'merchant_payment.succeeded',
          fromStatus: TransactionStatus.processing,
          toStatus: TransactionStatus.succeeded,
          metadata: {
            merchantCode: merchant.merchantCode
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorType: ActorType.user,
          actorId: user.userId,
          action: 'wallet.merchant_payment.succeeded',
          entityType: 'transaction',
          entityId: transaction.id,
          metadata: {
            transactionRef: transaction.transactionRef,
            merchantId: merchant.id,
            amount: amount.toString()
          }
        }
      });

      const response = {
        transactionRef: completed.transactionRef,
        status: completed.status,
        amount: paiseToApi(completed.amount),
        currency: completed.currency,
        receipt: {
          paidAt: completedAt.toISOString(),
          merchantName: merchant.displayName,
          merchantCode: merchant.merchantCode,
          paymentSource: dto.paymentSource
        }
      };

      await this.idempotency.complete(idem.record.id, 200, response, tx);
      return response;
    });
  }

  async getTransaction(user: AuthenticatedUser, transactionRef: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionRef },
      include: {
        merchant: true,
        ledgerEntries: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!transaction || transaction.initiatedByUserId !== user.userId) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      transactionRef: transaction.transactionRef,
      type: transaction.type,
      status: transaction.status,
      amount: paiseToApi(transaction.amount),
      currency: transaction.currency,
      merchant: transaction.merchant
        ? {
            merchantId: transaction.merchant.id,
            merchantCode: transaction.merchant.merchantCode,
            displayName: transaction.merchant.displayName
          }
        : null,
      ledgerEntries: transaction.ledgerEntries.map((entry) => ({
        id: entry.id,
        walletId: entry.walletId,
        entryType: entry.entryType,
        amount: paiseToApi(entry.amount),
        balanceAfter: paiseToApi(entry.balanceAfter),
        createdAt: entry.createdAt
      })),
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt
    };
  }
}
