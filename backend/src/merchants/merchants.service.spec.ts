import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CodeStatus, MerchantStatus, RiskLevel } from '@prisma/client';
import { MerchantsService } from './merchants.service';

describe('MerchantsService', () => {
  const merchant = {
    id: 'merchant-1',
    merchantCode: 'MWK-DEMO001',
    businessName: 'Demo Store Private Limited',
    displayName: 'Demo Store',
    mobileNumber: '+919999999998',
    email: 'merchant@example.com',
    status: MerchantStatus.active,
    riskLevel: RiskLevel.low,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const makeService = () => {
    const tx = {
      merchant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(merchant)
      },
      vendorCode: {
        create: jest.fn().mockResolvedValue({
          id: 'vendor-1',
          merchantId: merchant.id,
          code: 'MWK-VEND001',
          status: CodeStatus.active,
          createdAt: new Date(),
          revokedAt: null
        })
      },
      merchantQrCode: {
        create: jest.fn().mockResolvedValue({
          id: 'qr-1',
          merchantId: merchant.id,
          qrPayload: 'wallet://merchant/MWK-DEMO001',
          status: CodeStatus.active,
          createdAt: new Date(),
          revokedAt: null
        }),
        update: jest.fn().mockResolvedValue({
          id: 'qr-1',
          merchantId: merchant.id,
          qrPayload: 'wallet://merchant/MWK-DEMO001?qrId=qr-1',
          status: CodeStatus.active,
          createdAt: new Date(),
          revokedAt: null
        }),
        findFirst: jest.fn()
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
      merchant: {
        findUnique: jest.fn()
      },
      vendorCode: {
        findUnique: jest.fn()
      },
      merchantQrCode: {
        findFirst: jest.fn()
      },
      wallet: {
        findFirst: jest.fn()
      },
      transaction: {
        count: jest.fn(),
        findMany: jest.fn()
      },
      settlementRecord: {
        count: jest.fn(),
        findMany: jest.fn()
      }
    };
    const walletProvisioning = {
      ensureMerchantWallet: jest.fn().mockResolvedValue({ id: 'wallet-merchant' })
    };
    const merchantCodes = {
      generateMerchantCode: jest.fn().mockReturnValue('MWK-DEMO001'),
      generateVendorCode: jest.fn().mockReturnValue('MWK-VEND001'),
      buildQrPayload: jest.fn((code: string, qrId?: string) => `wallet://merchant/${code}${qrId ? `?qrId=${qrId}` : ''}`)
    };
    const qrParser = {
      parse: jest.fn().mockReturnValue({
        merchantCode: merchant.merchantCode,
        qrId: 'qr-1',
        rawPayload: 'wallet://merchant/MWK-DEMO001?qrId=qr-1'
      })
    };

    const service = new MerchantsService(
      prisma as never,
      walletProvisioning as never,
      merchantCodes as never,
      qrParser as never
    );

    return { service, prisma, tx, walletProvisioning };
  };

  it('registers a merchant with wallet, QR, vendor code, and audit log', async () => {
    const { service, tx, walletProvisioning } = makeService();

    const result = await service.registerMerchant(
      {
        businessName: merchant.businessName,
        displayName: merchant.displayName,
        mobileNumber: merchant.mobileNumber,
        email: merchant.email
      },
      'user-1'
    );

    expect(tx.merchant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        merchantCode: 'MWK-DEMO001',
        status: MerchantStatus.active
      })
    });
    expect(walletProvisioning.ensureMerchantWallet).toHaveBeenCalledWith(merchant.id, tx);
    expect(tx.vendorCode.create).toHaveBeenCalled();
    expect(tx.merchantQrCode.update).toHaveBeenCalledWith({
      where: { id: 'qr-1' },
      data: { qrPayload: 'wallet://merchant/MWK-DEMO001?qrId=qr-1' }
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(result).toMatchObject({
      merchant: {
        id: merchant.id,
        merchantCode: merchant.merchantCode
      },
      walletId: 'wallet-merchant',
      vendorCode: {
        code: 'MWK-VEND001'
      }
    });
  });

  it('looks up an active vendor code', async () => {
    const { service, prisma } = makeService();
    prisma.vendorCode.findUnique.mockResolvedValue({
      id: 'vendor-1',
      code: 'MWK-VEND001',
      status: CodeStatus.active,
      merchant
    });

    await expect(service.lookupVendorCode(' mwk-vend001 ')).resolves.toMatchObject({
      merchantId: merchant.id,
      merchantCode: merchant.merchantCode,
      displayName: merchant.displayName
    });
    expect(prisma.vendorCode.findUnique).toHaveBeenCalledWith({
      where: { code: 'MWK-VEND001' },
      include: { merchant: true }
    });
  });

  it('rejects suspended merchants during validation', async () => {
    const { service, prisma } = makeService();
    prisma.merchant.findUnique.mockResolvedValue({
      ...merchant,
      status: MerchantStatus.suspended
    });

    await expect(service.validateActiveMerchantByCode(merchant.merchantCode)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for missing vendor codes', async () => {
    const { service, prisma } = makeService();
    prisma.vendorCode.findUnique.mockResolvedValue(null);

    await expect(service.lookupVendorCode('MWK-MISSING1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
