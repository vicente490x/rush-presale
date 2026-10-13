import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { prisma } from '../lib/prisma';

const confirmed = process.argv.includes('--confirm');
const openPresale = process.argv.includes('--open-presale');

function databaseName() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL non configurata.');
  const url = new URL(raw);
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

function maskedAddress(value: string) {
  const [local, domain] = value.split('@');
  return domain ? `${local.slice(0, 1)}***@${domain}` : '[indirizzo non valido]';
}

async function main() {
  const dbName = databaseName();
  console.info(`Database: ${dbName}`);
  if (confirmed && process.env.CONFIRM_DB_NAME !== dbName) {
    throw new Error('Conferma rifiutata: CONFIRM_DB_NAME deve corrispondere esattamente al nome del database.');
  }

  const orders = await prisma.order.findMany();
  const realOrders = orders.filter((order) => {
    const exampleEmail = order.email.toLowerCase().endsWith('@example.com');
    const realPaymentIntent = Boolean(order.stripePaymentIntentId && !order.stripePaymentIntentId.startsWith('pi_mock'));
    return !exampleEmail || realPaymentIntent;
  });
  if (realOrders.length) {
    console.error(`Pulizia interrotta: ${realOrders.length} ordini sembrano reali. Nessun record sarà modificato.`);
    for (const order of realOrders) {
      console.error(`- ${order.orderNumber}: ${maskedAddress(order.email)}, pagamento=${order.paymentStatus}, paymentIntent=${order.stripePaymentIntentId ? 'presente' : 'assente'}`);
    }
    process.exitCode = 2;
    return;
  }

  const testOrders = orders.filter((order) => order.isTest || order.email.toLowerCase().endsWith('@example.com'));
  const tryOnJobs = await prisma.tryOnJob.findMany();
  const testJobs = tryOnJobs.filter((job) => job.isTest || /mock|test/i.test(job.provider));
  const users = await prisma.adminUser.findMany();
  const weakAdmins = [] as typeof users;
  for (const user of users) {
    if (user.email.toLowerCase().endsWith('@example.com') || await bcrypt.compare('admin', user.passwordHash)) weakAdmins.push(user);
  }
  const list = {
    orders: testOrders.map(({ id, orderNumber, email, paymentStatus, stripePaymentIntentId }) => ({ id, orderNumber, email: maskedAddress(email), paymentStatus, paymentIntentPresent: Boolean(stripePaymentIntentId) })),
    tryOnJobs: testJobs.map(({ id, provider, status }) => ({ id, provider, status })),
    developmentAdmins: weakAdmins.map(({ id, email, username }) => ({ id, email: maskedAddress(email), username }))
  };
  console.info(JSON.stringify({ dryRun: !confirmed, counts: { orders: list.orders.length, tryOnJobs: list.tryOnJobs.length, developmentAdmins: list.developmentAdmins.length }, records: list }, null, 2));

  if (!confirmed) {
    console.info('Dry-run: nessuna modifica. Per procedere usa --confirm e CONFIRM_DB_NAME=<nome database>.');
    return;
  }

  const backupDirectory = join(process.cwd(), 'data', 'backups');
  await mkdir(backupDirectory, { recursive: true });
  const backupPath = join(backupDirectory, `test-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const adminBackup = weakAdmins.map(({ passwordHash: _passwordHash, ...user }) => ({ ...user, passwordHash: '[REDACTED]' }));
  await writeFile(backupPath, JSON.stringify({ database: dbName, exportedAt: new Date().toISOString(), orders: testOrders, tryOnJobs: testJobs, developmentAdmins: adminBackup }, null, 2), { flag: 'wx', mode: 0o600 });
  console.info(`Backup creato: ${basename(backupPath)}`);
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { id: { in: testOrders.map((order) => order.id) } } }),
    prisma.tryOnJob.deleteMany({ where: { id: { in: testJobs.map((job) => job.id) } } }),
    prisma.adminUser.deleteMany({ where: { id: { in: weakAdmins.map((user) => user.id) } } }),
    prisma.settings.upsert({
      where: { id: 'global' },
      create: {
        id: 'global', threshold: 15, presaleOpen: openPresale, productionStatus: 'IN_RACCOLTA', thresholdNotifiedAt: null,
        tryOnEnabled: false, tryOnDailyLimit: 50, tryOnDailyCount: 0, tryOnDailySpendUsd: 0, tryOnSpendResetAt: new Date()
      },
      update: {
        threshold: 15, presaleOpen: openPresale, productionStatus: 'IN_RACCOLTA', thresholdNotifiedAt: null,
        tryOnEnabled: false, tryOnDailyLimit: 50, tryOnDailyCount: 0, tryOnDailySpendUsd: 0, tryOnSpendResetAt: new Date()
      }
    })
  ]);
  console.info(`Pulizia completata. PRE-SALE ${openPresale ? 'APERTA' : 'CHIUSA'}, soglia 15.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Pulizia DB non riuscita.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
