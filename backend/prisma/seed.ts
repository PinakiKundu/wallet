import { PrismaClient, WalletOwnerType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.wallet.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ownerType: WalletOwnerType.system,
      systemAccountCode: 'UPI_CLEARING',
      currency: 'INR'
    }
  });

  const merchant = await prisma.merchant.upsert({
    where: { merchantCode: 'MWK-DEMO001' },
    update: {},
    create: {
      merchantCode: 'MWK-DEMO001',
      businessName: 'Demo Store Private Limited',
      displayName: 'Demo Store',
      mobileNumber: '+919999999998',
      email: 'merchant@example.com',
      status: 'active'
    }
  });

  await prisma.wallet.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000002'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      ownerType: WalletOwnerType.merchant,
      merchantId: merchant.id,
      currency: 'INR'
    }
  });

  await prisma.vendorCode.upsert({
    where: { code: 'MWK-DEMO001' },
    update: {},
    create: {
      merchantId: merchant.id,
      code: 'MWK-DEMO001',
      status: 'active'
    }
  });

  const qrPayload = `wallet://merchant/${merchant.merchantCode}`;
  const existingQr = await prisma.merchantQrCode.findFirst({
    where: { merchantId: merchant.id, qrPayload }
  });

  if (!existingQr) {
    await prisma.merchantQrCode.create({
      data: {
        merchantId: merchant.id,
        qrPayload,
        status: 'active'
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
