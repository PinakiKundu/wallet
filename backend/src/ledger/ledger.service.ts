import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LedgerEntryType, Prisma, WalletOwnerType, WalletStatus } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { INR, parsePositivePaise } from '../common/money/money';

export interface LedgerPostingEntry {
  walletId: string;
  entryType: LedgerEntryType;
  amount: bigint | number | string;
  description?: string;
}

export interface LedgerPostingInput {
  transactionId: string;
  currency?: string;
  entries: LedgerPostingEntry[];
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async postEntries(input: LedgerPostingInput) {
    return this.prisma.$transaction((tx) => this.postEntriesInTransaction(tx, input));
  }

  async postEntriesInTransaction(tx: Prisma.TransactionClient, input: LedgerPostingInput) {
    const currency = input.currency ?? INR;
    const normalizedEntries = this.normalizeEntries(input.entries);
    this.assertBalanced(normalizedEntries);

    const walletIds = [...new Set(normalizedEntries.map((entry) => entry.walletId))].sort();
    await this.lockWalletRows(tx, walletIds);

    const wallets = await tx.wallet.findMany({
      where: { id: { in: walletIds } }
    });

    if (wallets.length !== walletIds.length) {
      throw new NotFoundException('One or more wallets were not found');
    }

    const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const deltas = new Map<string, bigint>();

    for (const entry of normalizedEntries) {
      const current = deltas.get(entry.walletId) ?? 0n;
      const signed = entry.entryType === LedgerEntryType.credit ? entry.amount : -entry.amount;
      deltas.set(entry.walletId, current + signed);
    }

    for (const [walletId, delta] of deltas) {
      const wallet = walletById.get(walletId);

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.status !== WalletStatus.active) {
        throw new ConflictException('Wallet is not active');
      }

      if (wallet.currency !== currency) {
        throw new BadRequestException('Wallet currency does not match ledger currency');
      }

      const nextAvailableBalance = wallet.availableBalance + delta;
      const nextLedgerBalance = wallet.ledgerBalance + delta;

      if (wallet.ownerType !== WalletOwnerType.system && (nextAvailableBalance < 0n || nextLedgerBalance < 0n)) {
        throw new ConflictException('Insufficient wallet balance');
      }

      await tx.wallet.update({
        where: { id: walletId },
        data: {
          availableBalance: nextAvailableBalance,
          ledgerBalance: nextLedgerBalance,
          version: { increment: 1 }
        }
      });

      walletById.set(walletId, {
        ...wallet,
        availableBalance: nextAvailableBalance,
        ledgerBalance: nextLedgerBalance
      });
    }

    const ledgerRows = normalizedEntries.map((entry) => {
      const wallet = walletById.get(entry.walletId);

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      return {
        transactionId: input.transactionId,
        walletId: entry.walletId,
        entryType: entry.entryType,
        amount: entry.amount,
        currency,
        balanceAfter: wallet.ledgerBalance,
        description: entry.description
      };
    });

    await tx.ledgerEntry.createMany({ data: ledgerRows });

    return {
      transactionId: input.transactionId,
      currency,
      entries: ledgerRows
    };
  }

  private normalizeEntries(entries: LedgerPostingEntry[]) {
    if (entries.length < 2) {
      throw new BadRequestException('A ledger transaction requires at least two entries');
    }

    const walletIds = new Set(entries.map((entry) => entry.walletId));

    if (walletIds.size !== entries.length) {
      throw new BadRequestException('A wallet can appear only once in a ledger transaction');
    }

    return entries.map((entry) => ({
      ...entry,
      amount: parsePositivePaise(entry.amount)
    }));
  }

  private assertBalanced(entries: Array<LedgerPostingEntry & { amount: bigint }>): void {
    const total = entries.reduce((sum, entry) => {
      return sum + (entry.entryType === LedgerEntryType.credit ? entry.amount : -entry.amount);
    }, 0n);

    if (total !== 0n) {
      throw new BadRequestException('Ledger entries must balance to zero');
    }
  }

  private async lockWalletRows(tx: Prisma.TransactionClient, walletIds: string[]): Promise<void> {
    if (walletIds.length === 0) {
      return;
    }

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM wallets WHERE id IN (${Prisma.join(walletIds)}) ORDER BY id FOR UPDATE`
    );
  }
}
