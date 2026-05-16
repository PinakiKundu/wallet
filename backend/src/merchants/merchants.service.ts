import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CodeStatus,
  Merchant,
  MerchantStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
  WalletOwnerType
} from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { paiseToApi } from '../common/money/money';
import { WalletProvisioningService } from '../wallets/wallet-provisioning.service';
import { MerchantCodeService } from './merchant-code.service';
import { ParseQrDto } from './dto/parse-qr.dto';
import { RegisterMerchantDto } from './dto/register-merchant.dto';
import { QrParserService } from './qr-parser.service';

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletProvisioning: WalletProvisioningService,
    private readonly merchantCodes: MerchantCodeService,
    private readonly qrParser: QrParserService
  ) {}

  async registerMerchant(dto: RegisterMerchantDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const merchantCode = await this.generateUniqueMerchantCode(tx);
      const merchant = await tx.merchant.create({
        data: {
          merchantCode,
          businessName: dto.businessName,
          displayName: dto.displayName,
          mobileNumber: dto.mobileNumber,
          email: dto.email,
          status: MerchantStatus.active,
          riskLevel: 'low'
        }
      });

      const wallet = await this.walletProvisioning.ensureMerchantWallet(merchant.id, tx);
      const vendorCode = await this.createUniqueVendorCode(tx, merchant.id);
      const qr = await this.createQrCodeInTx(tx, merchant.id, merchant.merchantCode);

      await tx.auditLog.create({
        data: {
          actorType: 'user',
          actorId: actorUserId,
          action: 'merchant.registered',
          entityType: 'merchant',
          entityId: merchant.id,
          metadata: {
            merchantCode: merchant.merchantCode,
            vendorCode: vendorCode.code
          }
        }
      });

      return this.toMerchantRegistrationResponse(merchant, wallet.id, qr, vendorCode);
    });
  }

  async createQrCode(merchantId: string) {
    const merchant = await this.findMerchantOrThrow(merchantId);
    return this.prisma.$transaction((tx) => this.createQrCodeInTx(tx, merchant.id, merchant.merchantCode));
  }

  async createVendorCode(merchantId: string) {
    await this.findMerchantOrThrow(merchantId);
    return this.prisma.$transaction((tx) => this.createUniqueVendorCode(tx, merchantId));
  }

  async parseQr(dto: ParseQrDto) {
    const parsed = this.qrParser.parse(dto.payload);
    const merchant = await this.validateActiveMerchantByCode(parsed.merchantCode);

    if (parsed.qrId) {
      const qr = await this.prisma.merchantQrCode.findFirst({
        where: {
          id: parsed.qrId,
          merchantId: merchant.id,
          status: CodeStatus.active
        }
      });

      if (!qr) {
        throw new NotFoundException('Merchant QR code is not active');
      }
    }

    return this.toMerchantLookupResponse(merchant, parsed.qrId);
  }

  async lookupVendorCode(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const vendorCode = await this.prisma.vendorCode.findUnique({
      where: { code: normalizedCode },
      include: { merchant: true }
    });

    if (!vendorCode || vendorCode.status !== CodeStatus.active) {
      throw new NotFoundException('Vendor code not found');
    }

    this.assertMerchantCanReceivePayments(vendorCode.merchant);

    return this.toMerchantLookupResponse(vendorCode.merchant);
  }

  async validateActiveMerchantByCode(merchantCode: string): Promise<Merchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { merchantCode: merchantCode.trim().toUpperCase() }
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    this.assertMerchantCanReceivePayments(merchant);
    return merchant;
  }

  async getDashboard(merchantId: string) {
    const merchant = await this.findMerchantOrThrow(merchantId);
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.merchant,
        merchantId
      }
    });

    const [successfulPayments, pendingPayments, failedPayments] = await this.prisma.$transaction([
      this.prisma.transaction.count({
        where: {
          merchantId,
          type: TransactionType.wallet_payment,
          status: TransactionStatus.succeeded
        }
      }),
      this.prisma.transaction.count({
        where: {
          merchantId,
          type: TransactionType.wallet_payment,
          status: { in: [TransactionStatus.initiated, TransactionStatus.pending, TransactionStatus.processing] }
        }
      }),
      this.prisma.transaction.count({
        where: {
          merchantId,
          type: TransactionType.wallet_payment,
          status: TransactionStatus.failed
        }
      })
    ]);

    return {
      merchant: this.toMerchantResponse(merchant),
      wallet: wallet
        ? {
            walletId: wallet.id,
            availableBalance: paiseToApi(wallet.availableBalance),
            ledgerBalance: paiseToApi(wallet.ledgerBalance),
            currency: wallet.currency,
            status: wallet.status
          }
        : null,
      payments: {
        successful: successfulPayments,
        pending: pendingPayments,
        failed: failedPayments
      }
    };
  }

  async listTransactions(merchantId: string, page = 1, pageSize = 20) {
    await this.findMerchantOrThrow(merchantId);
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.transaction.count({ where: { merchantId } })
    ]);

    return {
      page,
      pageSize,
      total,
      transactions: transactions.map((transaction) => ({
        transactionRef: transaction.transactionRef,
        type: transaction.type,
        status: transaction.status,
        amount: paiseToApi(transaction.amount),
        currency: transaction.currency,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt
      }))
    };
  }

  async listSettlements(merchantId: string, page = 1, pageSize = 20) {
    await this.findMerchantOrThrow(merchantId);
    const [settlements, total] = await this.prisma.$transaction([
      this.prisma.settlementRecord.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.settlementRecord.count({ where: { merchantId } })
    ]);

    return {
      page,
      pageSize,
      total,
      settlements: settlements.map((settlement) => ({
        id: settlement.id,
        amount: paiseToApi(settlement.amount),
        currency: settlement.currency,
        status: settlement.status,
        createdAt: settlement.createdAt,
        updatedAt: settlement.updatedAt
      }))
    };
  }

  private async findMerchantOrThrow(merchantId: string): Promise<Merchant> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  private assertMerchantCanReceivePayments(merchant: Merchant): void {
    if (merchant.status !== MerchantStatus.active) {
      throw new ForbiddenException('Merchant is not active');
    }

    if (merchant.riskLevel === 'high') {
      throw new ForbiddenException('Merchant is temporarily restricted');
    }
  }

  private async createQrCodeInTx(tx: Prisma.TransactionClient, merchantId: string, merchantCode: string) {
    const qr = await tx.merchantQrCode.create({
      data: {
        merchantId,
        qrPayload: this.merchantCodes.buildQrPayload(merchantCode),
        status: CodeStatus.active
      }
    });

    const qrPayload = this.merchantCodes.buildQrPayload(merchantCode, qr.id);

    return tx.merchantQrCode.update({
      where: { id: qr.id },
      data: { qrPayload }
    });
  }

  private async createUniqueVendorCode(tx: Prisma.TransactionClient, merchantId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await tx.vendorCode.create({
          data: {
            merchantId,
            code: this.merchantCodes.generateVendorCode(),
            status: CodeStatus.active
          }
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException('Unable to generate a unique vendor code');
  }

  private async generateUniqueMerchantCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = this.merchantCodes.generateMerchantCode();
      const existing = await tx.merchant.findUnique({ where: { merchantCode: code } });

      if (!existing) {
        return code;
      }
    }

    throw new ConflictException('Unable to generate a unique merchant code');
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private toMerchantRegistrationResponse(
    merchant: Merchant,
    walletId: string,
    qr: { id: string; qrPayload: string; status: CodeStatus; createdAt: Date },
    vendorCode: { id: string; code: string; status: CodeStatus; createdAt: Date }
  ) {
    return {
      merchant: this.toMerchantResponse(merchant),
      walletId,
      qrCode: qr,
      vendorCode
    };
  }

  private toMerchantLookupResponse(merchant: Merchant, qrId?: string) {
    return {
      merchantId: merchant.id,
      merchantCode: merchant.merchantCode,
      displayName: merchant.displayName,
      businessName: merchant.businessName,
      status: merchant.status,
      riskLevel: merchant.riskLevel,
      qrId
    };
  }

  private toMerchantResponse(merchant: Merchant) {
    return {
      id: merchant.id,
      merchantCode: merchant.merchantCode,
      businessName: merchant.businessName,
      displayName: merchant.displayName,
      mobileNumber: merchant.mobileNumber,
      email: merchant.email,
      status: merchant.status,
      riskLevel: merchant.riskLevel,
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt
    };
  }
}
