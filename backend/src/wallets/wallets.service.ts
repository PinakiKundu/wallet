import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerEntryType, WalletOwnerType } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { paiseToApi } from '../common/money/money';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserWalletSummary(userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.user,
        userId
      }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      walletId: wallet.id,
      availableBalance: paiseToApi(wallet.availableBalance),
      ledgerBalance: paiseToApi(wallet.ledgerBalance),
      currency: wallet.currency,
      status: wallet.status,
      updatedAt: wallet.updatedAt
    };
  }

  async getUserWalletStatement(
    userId: string,
    query: {
      from?: Date;
      to?: Date;
      page: number;
      pageSize: number;
    }
  ) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.user,
        userId
      },
      select: { id: true }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const where = {
      walletId: wallet.id,
      createdAt: {
        gte: query.from,
        lte: query.to
      }
    };
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        include: {
          transaction: {
            select: {
              transactionRef: true,
              type: true,
              status: true,
              completedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prisma.ledgerEntry.count({ where })
    ]);

    return {
      walletId: wallet.id,
      page: query.page,
      pageSize: query.pageSize,
      total,
      entries: entries.map((entry) => ({
        id: entry.id,
        transactionRef: entry.transaction.transactionRef,
        transactionType: entry.transaction.type,
        transactionStatus: entry.transaction.status,
        direction: entry.entryType,
        amount: paiseToApi(entry.amount),
        signedAmount: paiseToApi(entry.entryType === LedgerEntryType.credit ? entry.amount : -entry.amount),
        balanceAfter: paiseToApi(entry.balanceAfter),
        currency: entry.currency,
        description: entry.description,
        createdAt: entry.createdAt,
        completedAt: entry.transaction.completedAt
      }))
    };
  }
}
