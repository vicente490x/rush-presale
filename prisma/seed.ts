import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const strongPassword = (value: string) => value.length >= 12;

async function ensureAdmin() {
  const username = 'admin';
  const email = 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'admin';

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !strongPassword(process.env.ADMIN_PASSWORD)) {
      throw new Error('Produzione: ADMIN_EMAIL e ADMIN_PASSWORD (min 12 caratteri) sono richiesti per il seed admin.');
    }
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { username },
    update: { email, passwordHash: hash },
    create: { username, email, passwordHash: hash }
  });

  if (process.env.NODE_ENV !== 'production' && password === 'admin') {
    console.warn('ATTENZIONE: password admin di sviluppo in chiaro usata per il seed. Cambiarla prima di andare online.');
  }
}

async function ensureSettings() {
  await prisma.settings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      threshold: 15,
      presaleOpen: true,
      productionStatus: 'IN_RACCOLTA',
      tryOnEnabled: true,
      tryOnDailyLimit: 50,
      tryOnSpendResetAt: new Date()
    },
    update: {
      threshold: 15,
      presaleOpen: true,
      productionStatus: 'IN_RACCOLTA',
      tryOnEnabled: true,
      tryOnDailyLimit: 50
    }
  });
}

function orderNumber(base: number) {
  return `RUSH-${String(base).padStart(4, '0')}`;
}

async function seedOrders() {
  const now = new Date();
  const def = [
    { firstName: 'Arianna', lastName: 'Bianchi', email: 'aria@example.com', size: 'XS', quantity: 1, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 30 * 86400000), expiresAt: new Date(now.getTime() + 40 * 86400000) },
    { firstName: 'Marco', lastName: 'Rossi', email: 'marco@example.com', size: 'S', quantity: 2, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 45 * 86400000), expiresAt: new Date(now.getTime() + 35 * 86400000) },
    { firstName: 'Luca', lastName: 'Verdi', email: 'luca@example.com', size: 'M', quantity: 1, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 20 * 86400000), expiresAt: new Date(now.getTime() + 60 * 86400000) },
    { firstName: 'Giulia', lastName: 'Neri', email: 'giulia@example.com', size: 'L', quantity: 2, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 17 * 86400000), expiresAt: new Date(now.getTime() + 77 * 86400000) },
    { firstName: 'Sara', lastName: 'Gialli', email: 'sara@example.com', size: 'XL', quantity: 1, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 10 * 86400000), expiresAt: new Date(now.getTime() + 85 * 86400000) },
    { firstName: 'Noemi', lastName: 'Blu', email: 'noemi@example.com', size: 'XXL', quantity: 1, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 35 * 86400000), expiresAt: new Date(now.getTime() + 60 * 86400000) },
    { firstName: 'Paolo', lastName: 'Azzurri', email: 'paolo@example.com', size: 'M', quantity: 1, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 15 * 86400000), expiresAt: new Date(now.getTime() + 80 * 86400000) },
    { firstName: 'Irene', lastName: 'Castelli', email: 'irene@example.com', size: 'L', quantity: 1, paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paidAt: new Date(now.getTime() - 12 * 86400000), expiresAt: new Date(now.getTime() + 82 * 86400000) }
  ];
  for (let index = 0; index < def.length; index++) {
    const row = def[index];
    await prisma.order.upsert({
      where: { orderNumber: orderNumber(index + 1) },
      update: {},
      create: {
        orderNumber: orderNumber(index + 1),
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        size: row.size as any,
        quantity: row.quantity,
        paymentStatus: row.paymentStatus as any,
        orderStatus: row.orderStatus as any,
        amountCents: row.quantity * 2500,
        paidAt: row.paidAt,
        expiresAt: row.expiresAt,
        termsAcceptedAt: new Date(),
        stripeSessionId: `cs_seed_${index + 1}`,
        stripePaymentIntentId: `pi_seed_${index + 1}`
      }
    });
  }

  const extra = [
    { orderNumber: 'RUSH-0009', firstName: 'Alessio', lastName: 'Rosa', email: 'alessio@example.com', size: 'S', quantity: 3, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 5 * 86400000), expiresAt: new Date(now.getTime() + 40 * 86400000) },
    { orderNumber: 'RUSH-0010', firstName: 'Giorgia', lastName: 'Moro', email: 'giorgia@example.com', size: 'M', quantity: 2, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 4 * 86400000), expiresAt: new Date(now.getTime() + 50 * 86400000) },
    { orderNumber: 'RUSH-0011', firstName: 'Dario', lastName: 'Pelle', email: 'dario@example.com', size: 'XL', quantity: 2, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 3 * 86400000), expiresAt: new Date(now.getTime() + 70 * 86400000) },
    { orderNumber: 'RUSH-0012', firstName: 'Alice', lastName: 'Mazz', email: 'alice@example.com', size: 'XXL', quantity: 2, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 2 * 86400000), expiresAt: new Date(now.getTime() + 60 * 86400000) },
    { orderNumber: 'RUSH-0013', firstName: 'Tommaso', lastName: 'Lupi', email: 'tommaso@example.com', size: 'M', quantity: 3, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 8 * 86400000), expiresAt: new Date(now.getTime() + 30 * 86400000) },
    { orderNumber: 'RUSH-0014', firstName: 'Beatrice', lastName: 'Ferri', email: 'beatrice@example.com', size: 'L', quantity: 2, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 10 * 86400000), expiresAt: new Date(now.getTime() + 24 * 86400000) },
    { orderNumber: 'RUSH-0015', firstName: 'Carlo', lastName: 'Sensi', email: 'carlo@example.com', size: 'XS', quantity: 1, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 14 * 86400000), expiresAt: new Date(now.getTime() + 16 * 86400000) },
    { orderNumber: 'RUSH-0016', firstName: 'Marta', lastName: 'Nati', email: 'marta@example.com', size: 'S', quantity: 2, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 18 * 86400000), expiresAt: new Date(now.getTime() + 12 * 86400000) },
    { orderNumber: 'RUSH-0017', firstName: 'Lorenzo', lastName: 'Sera', email: 'lorenzo@example.com', size: 'L', quantity: 2, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 22 * 86400000), expiresAt: new Date(now.getTime() + 14 * 86400000) },
    { orderNumber: 'RUSH-0018', firstName: 'Eva', lastName: 'Greco', email: 'eva@example.com', size: 'XL', quantity: 1, paymentStatus: 'PAID', paidAt: new Date(now.getTime() - 25 * 86400000), expiresAt: new Date(now.getTime() + 10 * 86400000) },
    { orderNumber: 'RUSH-0019', firstName: 'Nicolas', lastName: 'Lomb', email: 'nicolas@example.com', size: 'M', quantity: 1, paymentStatus: 'PENDING', paidAt: null, expiresAt: null },
    { orderNumber: 'RUSH-0020', firstName: 'Rita', lastName: 'More', email: 'rita@example.com', size: 'L', quantity: 1, paymentStatus: 'FAILED', paidAt: null, expiresAt: null },
    { orderNumber: 'RUSH-0021', firstName: 'Claudio', lastName: 'Verna', email: 'claudio@example.com', size: 'S', quantity: 1, paymentStatus: 'PAID', orderStatus: 'REFUNDED', refundStatus: 'REFUNDED', refundAt: new Date(now.getTime() - 3 * 86400000), paidAt: new Date(now.getTime() - 20 * 86400000), expiresAt: new Date(now.getTime() - 1 * 86400000) }
  ];
  for (const row of extra) {
    await prisma.order.upsert({
      where: { orderNumber: row.orderNumber },
      update: {},
      create: {
        orderNumber: row.orderNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        size: row.size as any,
        quantity: row.quantity,
        paymentStatus: row.paymentStatus as any,
        orderStatus: row.paymentStatus === 'PAID' ? 'CONFIRMED' : 'RESERVED',
        amountCents: row.quantity * 2500,
        paidAt: row.paidAt,
        expiresAt: row.expiresAt,
        refundStatus: row.paymentStatus === 'PAID' && row.orderNumber === 'RUSH-0021' ? 'REFUNDED' : 'NONE',
        termsAcceptedAt: new Date(),
        stripeSessionId: `cs_seed_${row.orderNumber}`,
        stripePaymentIntentId: `pi_seed_${row.orderNumber}`
      }
    });
  }
}

async function run() {
  const reset = process.argv.includes('--reset');
  if (reset) {
    const dbFile = 'dev.db';
    if (existsSync(dbFile)) unlinkSync(dbFile);
    execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });
  }

  execSync('npx prisma migrate dev --name seed --skip-generate', { stdio: 'inherit' });
  await ensureAdmin();
  await ensureSettings();
  await seedOrders();
  console.log('Seed completato. Admin: admin / admin');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
