import {
  LedgerEntryType,
  PrismaClient,
  TransactionStatus,
  TransactionType,
  WalletOwnerType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.wallet.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000001",
    },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      ownerType: WalletOwnerType.system,
      systemAccountCode: "UPI_CLEARING",
      currency: "INR",
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { merchantCode: "MWK-DEMO001" },
    update: {},
    create: {
      merchantCode: "MWK-DEMO001",
      businessName: "Demo Store Private Limited",
      displayName: "Demo Store",
      mobileNumber: "+919999999998",
      email: "merchant@example.com",
      status: "active",
    },
  });

  await prisma.wallet.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000002",
    },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      ownerType: WalletOwnerType.merchant,
      merchantId: merchant.id,
      currency: "INR",
    },
  });

  await prisma.vendorCode.upsert({
    where: { code: "MWK-DEMO001" },
    update: {},
    create: {
      merchantId: merchant.id,
      code: "MWK-DEMO001",
      status: "active",
    },
  });

  const qrPayload = `wallet://merchant/${merchant.merchantCode}`;
  const existingQr = await prisma.merchantQrCode.findFirst({
    where: { merchantId: merchant.id, qrPayload },
  });

  if (!existingQr) {
    await prisma.merchantQrCode.create({
      data: {
        merchantId: merchant.id,
        qrPayload,
        status: "active",
      },
    });
  }

  const user = await prisma.user.upsert({
    where: { mobileNumber: "+919999999999" },
    update: {
      displayName: "PiPay Demo User",
      mobileVerifiedAt: new Date("2026-05-17T10:00:00.000Z"),
    },
    create: {
      mobileNumber: "+919999999999",
      displayName: "PiPay Demo User",
      email: "demo.user@pipay.local",
      mobileVerifiedAt: new Date("2026-05-17T10:00:00.000Z"),
    },
  });

  const userWallet = await prisma.wallet.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000003",
    },
    update: {
      userId: user.id,
      availableBalance: 90000,
      ledgerBalance: 90000,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      ownerType: WalletOwnerType.user,
      userId: user.id,
      currency: "INR",
      availableBalance: 90000,
      ledgerBalance: 90000,
    },
  });

  const systemWallet = await prisma.wallet.update({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    data: {
      availableBalance: -125000,
      ledgerBalance: -125000,
    },
  });

  const merchantWallet = await prisma.wallet.update({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    data: {
      merchantId: merchant.id,
      availableBalance: 35000,
      ledgerBalance: 35000,
    },
  });

  const addMoneyRef = "PIPAY-SEED-ADD-001";
  const existingAddMoney = await prisma.transaction.findUnique({
    where: { transactionRef: addMoneyRef },
  });

  if (!existingAddMoney) {
    await prisma.transaction.create({
      data: {
        transactionRef: addMoneyRef,
        type: TransactionType.add_money,
        status: TransactionStatus.succeeded,
        amount: 125000,
        currency: "INR",
        initiatedByUserId: user.id,
        sourceWalletId: systemWallet.id,
        destinationWalletId: userWallet.id,
        completedAt: new Date("2026-05-17T10:05:00.000Z"),
        metadata: { seed: true, provider: "mock_upi" },
        ledgerEntries: {
          create: [
            {
              walletId: systemWallet.id,
              entryType: LedgerEntryType.debit,
              amount: 125000,
              currency: "INR",
              balanceAfter: -125000,
              description: "Seed UPI add money funding",
            },
            {
              walletId: userWallet.id,
              entryType: LedgerEntryType.credit,
              amount: 125000,
              currency: "INR",
              balanceAfter: 125000,
              description: "Added money to PiPay wallet",
            },
          ],
        },
      },
    });
  }

  const merchantPaymentRef = "PIPAY-SEED-PAY-001";
  const existingMerchantPayment = await prisma.transaction.findUnique({
    where: { transactionRef: merchantPaymentRef },
  });

  if (!existingMerchantPayment) {
    await prisma.transaction.create({
      data: {
        transactionRef: merchantPaymentRef,
        type: TransactionType.wallet_payment,
        status: TransactionStatus.succeeded,
        amount: 35000,
        currency: "INR",
        initiatedByUserId: user.id,
        merchantId: merchant.id,
        sourceWalletId: userWallet.id,
        destinationWalletId: merchantWallet.id,
        completedAt: new Date("2026-05-17T10:10:00.000Z"),
        metadata: { seed: true, paymentSource: "vendor_code" },
        ledgerEntries: {
          create: [
            {
              walletId: userWallet.id,
              entryType: LedgerEntryType.debit,
              amount: 35000,
              currency: "INR",
              balanceAfter: 90000,
              description: "Paid to Demo Store",
            },
            {
              walletId: merchantWallet.id,
              entryType: LedgerEntryType.credit,
              amount: 35000,
              currency: "INR",
              balanceAfter: 35000,
              description: "Received from PiPay Demo User",
            },
          ],
        },
      },
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
