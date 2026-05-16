import { Injectable } from '@nestjs/common';
import { Prisma, Wallet, WalletOwnerType, WalletStatus } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { INR } from '../common/money/money';

@Injectable()
export class WalletProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUserWallet(userId: string, tx: Prisma.TransactionClient = this.prisma): Promise<Wallet> {
    const existing = await tx.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.user,
        userId
      }
    });

    if (existing) {
      return existing;
    }

    try {
      return await tx.wallet.create({
        data: {
          ownerType: WalletOwnerType.user,
          userId,
          currency: INR,
          status: WalletStatus.active
        }
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const wallet = await tx.wallet.findFirstOrThrow({
          where: {
            ownerType: WalletOwnerType.user,
            userId
          }
        });
        return wallet;
      }

      throw error;
    }
  }

  async ensureMerchantWallet(merchantId: string, tx: Prisma.TransactionClient = this.prisma): Promise<Wallet> {
    const existing = await tx.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.merchant,
        merchantId
      }
    });

    if (existing) {
      return existing;
    }

    try {
      return await tx.wallet.create({
        data: {
          ownerType: WalletOwnerType.merchant,
          merchantId,
          currency: INR,
          status: WalletStatus.active
        }
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return tx.wallet.findFirstOrThrow({
          where: {
            ownerType: WalletOwnerType.merchant,
            merchantId
          }
        });
      }

      throw error;
    }
  }

  async ensureSystemWallet(systemAccountCode: string, tx: Prisma.TransactionClient = this.prisma): Promise<Wallet> {
    const existing = await tx.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.system,
        systemAccountCode
      }
    });

    if (existing) {
      return existing;
    }

    try {
      return await tx.wallet.create({
        data: {
          ownerType: WalletOwnerType.system,
          systemAccountCode,
          currency: INR,
          status: WalletStatus.active
        }
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return tx.wallet.findFirstOrThrow({
          where: {
            ownerType: WalletOwnerType.system,
            systemAccountCode
          }
        });
      }

      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
