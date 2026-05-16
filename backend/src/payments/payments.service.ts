import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActorType,
  GatewayDirection,
  GatewayFlow,
  LedgerEntryType,
  TransactionStatus,
  TransactionType,
  WebhookStatus,
  WalletOwnerType
} from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { INR, paiseToApi, parsePositivePaise } from '../common/money/money';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionRefService } from '../transactions/transaction-ref.service';
import { WalletProvisioningService } from '../wallets/wallet-provisioning.service';
import { CreateUpiCollectDto } from './dto/create-upi-collect.dto';
import { CreateUpiIntentDto } from './dto/create-upi-intent.dto';
import { MockUpiWebhookDto, MockUpiWebhookStatus } from './dto/mock-upi-webhook.dto';
import { MockUpiProvider } from './providers/mock-upi.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly ledger: LedgerService,
    private readonly walletProvisioning: WalletProvisioningService,
    private readonly transactionRefs: TransactionRefService,
    private readonly mockUpi: MockUpiProvider
  ) {}

  createUpiIntent(user: AuthenticatedUser, dto: CreateUpiIntentDto, idempotencyKey: string) {
    return this.createAddMoneyOrder(user, dto.amount, 'upi_intent', idempotencyKey);
  }

  createUpiCollect(user: AuthenticatedUser, dto: CreateUpiCollectDto, idempotencyKey: string) {
    return this.createAddMoneyOrder(user, dto.amount, 'upi_collect', idempotencyKey, dto.payerVpa);
  }

  async getUpiStatus(user: AuthenticatedUser, transactionRef: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionRef }
    });

    if (!transaction || transaction.initiatedByUserId !== user.userId || transaction.type !== TransactionType.add_money) {
      throw new NotFoundException('Add-money transaction not found');
    }

    return {
      transactionRef: transaction.transactionRef,
      status: transaction.status,
      amount: paiseToApi(transaction.amount),
      currency: transaction.currency,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt
    };
  }

  async handleMockUpiWebhook(payload: MockUpiWebhookDto, eventId: string | undefined, signature: string | undefined) {
    if (!eventId) {
      throw new BadRequestException('Missing webhook event id');
    }

    const signatureValid = this.mockUpi.verifySignature(payload, signature);

    if (!signatureValid) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    return this.prisma.$transaction(async (tx) => {
      const webhookPayload = {
        providerPaymentId: payload.providerPaymentId,
        providerOrderId: payload.providerOrderId,
        status: payload.status,
        amount: payload.amount,
        transactionRef: payload.transactionRef
      };
      const existingEvent = await tx.webhookEvent.findUnique({
        where: {
          provider_eventId: {
            provider: 'mock_upi',
            eventId
          }
        },
        include: { transaction: true }
      });

      if (existingEvent) {
        return {
          status: 'duplicate',
          eventId,
          transactionRef: existingEvent.transaction?.transactionRef
        };
      }

      const transaction = await tx.transaction.findUnique({
        where: { transactionRef: payload.transactionRef }
      });

      if (!transaction || transaction.type !== TransactionType.add_money) {
        throw new NotFoundException('Add-money transaction not found');
      }

      const webhook = await tx.webhookEvent.create({
        data: {
          provider: 'mock_upi',
          eventId,
          eventType: `payment.${payload.status}`,
          signatureValid,
          transactionId: transaction.id,
          payload: webhookPayload,
          status: WebhookStatus.received
        }
      });

      await tx.paymentGatewayLog.create({
        data: {
          transactionId: transaction.id,
          provider: 'mock_upi',
          providerOrderId: payload.providerOrderId,
          providerPaymentId: payload.providerPaymentId,
          flow: GatewayFlow.webhook,
          direction: GatewayDirection.request,
          status: payload.status,
          payload: webhookPayload
        }
      });

      if (transaction.status === TransactionStatus.succeeded) {
        await tx.webhookEvent.update({
          where: { id: webhook.id },
          data: {
            status: WebhookStatus.duplicate,
            processedAt: new Date()
          }
        });

        return {
          status: 'duplicate',
          eventId,
          transactionRef: transaction.transactionRef
        };
      }

      if (payload.status === MockUpiWebhookStatus.failed) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.failed,
            failureCode: 'MOCK_UPI_FAILED',
            failureMessage: 'Mock UPI payment failed'
          }
        });
        await tx.webhookEvent.update({
          where: { id: webhook.id },
          data: {
            status: WebhookStatus.processed,
            processedAt: new Date()
          }
        });

        return {
          status: 'processed',
          transactionRef: transaction.transactionRef,
          transactionStatus: TransactionStatus.failed
        };
      }

      if (BigInt(payload.amount) !== transaction.amount) {
        await tx.webhookEvent.update({
          where: { id: webhook.id },
          data: {
            status: WebhookStatus.failed,
            processedAt: new Date()
          }
        });
        throw new BadRequestException('Webhook amount does not match transaction');
      }

      const systemWallet = await this.walletProvisioning.ensureSystemWallet('UPI_CLEARING', tx);
      const userWallet = await tx.wallet.findFirst({
        where: {
          ownerType: WalletOwnerType.user,
          userId: transaction.initiatedByUserId ?? undefined
        }
      });

      if (!userWallet) {
        throw new NotFoundException('User wallet not found');
      }

      await this.ledger.postEntriesInTransaction(tx, {
        transactionId: transaction.id,
        currency: INR,
        entries: [
          {
            walletId: systemWallet.id,
            entryType: LedgerEntryType.debit,
            amount: transaction.amount,
            description: 'UPI clearing debit'
          },
          {
            walletId: userWallet.id,
            entryType: LedgerEntryType.credit,
            amount: transaction.amount,
            description: 'Add money via UPI'
          }
        ]
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.succeeded,
          completedAt: new Date()
        }
      });
      await tx.transactionEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: 'add_money.credited',
          fromStatus: transaction.status,
          toStatus: TransactionStatus.succeeded,
          metadata: {
            provider: 'mock_upi',
            providerPaymentId: payload.providerPaymentId
          }
        }
      });
      await tx.webhookEvent.update({
        where: { id: webhook.id },
        data: {
          status: WebhookStatus.processed,
          processedAt: new Date()
        }
      });

      return {
        status: 'processed',
        transactionRef: transaction.transactionRef,
        transactionStatus: TransactionStatus.succeeded
      };
    });
  }

  private async createAddMoneyOrder(
    user: AuthenticatedUser,
    amountInput: number,
    flow: 'upi_intent' | 'upi_collect',
    idempotencyKey: string,
    payerVpa?: string
  ) {
    const amount = parsePositivePaise(amountInput);

    return this.prisma.$transaction(async (tx) => {
      const idem = await this.idempotency.begin(
        {
          actorType: ActorType.user,
          actorId: user.userId,
          scope: `payments.${flow}`,
          key: idempotencyKey,
          requestBody: { amount: amount.toString(), payerVpa }
        },
        tx
      );

      if (idem.state === 'replay') {
        return idem.responseBody;
      }

      const userWallet = await tx.wallet.findFirst({
        where: {
          ownerType: WalletOwnerType.user,
          userId: user.userId
        }
      });

      if (!userWallet) {
        throw new NotFoundException('User wallet not found');
      }

      const systemWallet = await this.walletProvisioning.ensureSystemWallet('UPI_CLEARING', tx);
      const transactionRef = this.transactionRefs.generate();
      const gatewayOrder = flow === 'upi_intent'
        ? this.mockUpi.createIntent({ transactionRef, amount })
        : this.mockUpi.createCollect({ transactionRef, amount, payerVpa });
      const transaction = await tx.transaction.create({
        data: {
          transactionRef,
          type: TransactionType.add_money,
          status: TransactionStatus.pending,
          amount,
          currency: INR,
          initiatedByUserId: user.userId,
          sourceWalletId: systemWallet.id,
          destinationWalletId: userWallet.id,
          idempotencyKeyId: idem.record.id,
          metadata: {
            provider: 'mock_upi',
            flow,
            payerVpa
          }
        }
      });

      await tx.paymentGatewayLog.create({
        data: {
          transactionId: transaction.id,
          provider: 'mock_upi',
          providerOrderId: gatewayOrder.providerOrderId,
          providerPaymentId: gatewayOrder.providerPaymentId,
          flow: flow === 'upi_intent' ? GatewayFlow.upi_intent : GatewayFlow.upi_collect,
          direction: GatewayDirection.request,
          status: 'created',
          payload: {
            amount: amount.toString(),
            payerVpa,
            transactionRef
          }
        }
      });

      const response = {
        transactionRef,
        status: transaction.status,
        amount: paiseToApi(amount),
        provider: gatewayOrder.provider,
        providerOrderId: gatewayOrder.providerOrderId,
        providerPaymentId: gatewayOrder.providerPaymentId,
        upiIntentUrl: 'upiIntentUrl' in gatewayOrder ? gatewayOrder.upiIntentUrl : undefined,
        payerVpa: 'payerVpa' in gatewayOrder ? gatewayOrder.payerVpa : undefined,
        expiresAt: gatewayOrder.expiresAt.toISOString()
      };

      await this.idempotency.complete(idem.record.id, 200, response, tx);
      return response;
    });
  }
}
