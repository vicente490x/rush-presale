import { loadEnvConfig } from '@next/env';
import bcrypt from 'bcryptjs';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  ProductionStatus,
  RefundStatus
} from '@prisma/client';
import { addCalendarMonths } from '../lib/dates';

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const deliveryStates = Object.values(DeliveryStatus);
const seedPrefix = 'DEV-SEED-';

function requireAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !zIsEmail(email) || !password || password.length < 12 || password.toLowerCase() === 'admin') {
    throw new Error('Imposta ADMIN_EMAIL valido e ADMIN_PASSWORD di almeno 12 caratteri, diverso da "admin".');
  }
  return { email, password };
}

function zIsEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function selectDataset() {
  const value = process.argv.find((argument) => argument.startsWith('--dataset='))?.split('=')[1] ?? 'mixed';
  if (!['mixed', 'sotto-soglia', 'soglia-superata', 'produzione-avviata'].includes(value)) {
    throw new Error('Dataset non valido. Usa mixed, sotto-soglia, soglia-superata o produzione-avviata.');
  }
  return value;
}

async function main() {
  const demoSeed = process.argv.includes('--demo');
  if (demoSeed && process.env.APP_ENV === 'production') {
    throw new Error('Il seed dimostrativo è disabilitato in APP_ENV=production.');
  }
  const credentials = requireAdminCredentials();
  const dataset = selectDataset();
  const now = new Date();
  const adminHash = await bcrypt.hash(credentials.password, 12);
  const productionStatus = dataset === 'produzione-avviata'
    ? ProductionStatus.PRODUZIONE_AVVIATA
    : dataset === 'soglia-superata' || dataset === 'mixed'
      ? ProductionStatus.SOGLIA_RAGGIUNTA
      : ProductionStatus.IN_RACCOLTA;
  await prisma.adminUser.upsert({
    where: { email: credentials.email },
    create: { email: credentials.email, passwordHash: adminHash },
    update: { passwordHash: adminHash }
  });
  await prisma.settings.upsert({
    where: { id: 'global' },
    create: { id: 'global', threshold: Number(process.env.PRESALE_THRESHOLD ?? 15), presaleOpen: true, productionStatus },
    update: {
      threshold: Number(process.env.PRESALE_THRESHOLD ?? 15),
      presaleOpen: true,
      productionStatus,
      thresholdNotifiedAt: null
    }
  });

  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: seedPrefix } } });
  const orders: Array<Parameters<typeof prisma.order.create>[0]['data']> = [];
  const extraQuantities = dataset === 'sotto-soglia' ? [] : [2, 2, 3, 3];
  const paidOrderCount = 8 + extraQuantities.length;
  const paidUnits = dataset === 'sotto-soglia' ? 8 : 18;

  for (let index = 0; index < paidOrderCount; index++) {
    const orderNumber = `${seedPrefix}PAID-${String(index + 1).padStart(2, '0')}`;
    const expiresAt = index < 2
      ? new Date(now.getTime() + 5 * 86_400_000)
      : index < 4
        ? new Date(now.getTime() - 86_400_000)
        : addCalendarMonths(new Date(now.getTime() - 7 * 86_400_000), 2);
    const quantity = index < 8 ? 1 : extraQuantities[index - 8];
    const paidAt = addCalendarMonths(expiresAt, -2);
    orders.push({
      orderNumber,
      firstName: `Cliente${index + 1}`,
      lastName: 'Demo',
      email: `cliente${index + 1}@example.com`,
      size: sizes[index % sizes.length],
      quantity,
      amountCents: quantity * 2500,
      stripeSessionId: `${seedPrefix}SESSION-${index + 1}`,
      stripePaymentIntentId: `${seedPrefix}PI-${index + 1}`,
      paymentStatus: PaymentStatus.PAID,
      paidAt,
      expiresAt,
      orderStatus: OrderStatus.CONFIRMED,
      refundStatus: RefundStatus.NONE,
      deliveryStatus: deliveryStates[index % deliveryStates.length],
      termsAcceptedAt: paidAt,
      createdAt: paidAt
    });
  }
  orders.push(
    {
      orderNumber: `${seedPrefix}PENDING`,
      firstName: 'Ordine', lastName: 'Abbandonato', email: 'pending@example.com',
      size: 'M', quantity: 1, amountCents: 2500, paymentStatus: PaymentStatus.PENDING,
      termsAcceptedAt: now, createdAt: new Date(now.getTime() - 60 * 60_000)
    },
    {
      orderNumber: `${seedPrefix}REFUNDED`,
      firstName: 'Cliente', lastName: 'Rimborsato', email: 'refunded@example.com',
      size: 'L', quantity: 1, amountCents: 2500, stripePaymentIntentId: `${seedPrefix}PI-REFUNDED`,
      paymentStatus: PaymentStatus.PAID, paidAt: now, expiresAt: addCalendarMonths(now, 2),
      orderStatus: OrderStatus.REFUNDED, refundStatus: RefundStatus.REFUNDED, refundedAt: now,
      deliveryStatus: DeliveryStatus.CONSEGNATA, termsAcceptedAt: now
    },
    {
      orderNumber: `${seedPrefix}FAILED`,
      firstName: 'Cliente', lastName: 'Fallito', email: 'failed@example.com',
      size: 'S', quantity: 1, amountCents: 2500, paymentStatus: PaymentStatus.FAILED, termsAcceptedAt: now
    }
  );
  for (const order of orders) await prisma.order.create({ data: order });

  console.info(`Seed ${demoSeed ? 'demo' : 'locale'} completato: admin ${credentials.email}, dataset ${dataset}, ${paidUnits} pezzi PAID in ${paidOrderCount} ordini e 3 ordini dimostrativi.`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed non completato:', error instanceof Error ? error.message : 'errore sconosciuto');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
