import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { paidPieces } from '../lib/settings';

async function main() {
  const failures: string[] = [];
  const [exampleOrders, testOrders, testJobs, users, settings, paid, counterPieces] = await Promise.all([
    prisma.order.count({ where: { email: { endsWith: '@example.com', mode: 'insensitive' } } }),
    prisma.order.count({ where: { isTest: true } }),
    prisma.tryOnJob.count({ where: { isTest: true } }),
    prisma.adminUser.findMany(),
    prisma.settings.findUnique({ where: { id: 'global' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' }, isTest: false }, _sum: { quantity: true } }),
    paidPieces()
  ]);
  if (exampleOrders) failures.push(`ordini @example.com: ${exampleOrders}`);
  if (testOrders || testJobs) failures.push(`record marcati di test: ordini=${testOrders}, prove virtuali=${testJobs}`);
  if (!users.length) failures.push('nessun utente admin configurato');
  let weakAdminCount = 0;
  for (const user of users) {
    if (user.email.toLowerCase().endsWith('@example.com') || await bcrypt.compare('admin', user.passwordHash)) weakAdminCount++;
  }
  if (weakAdminCount) failures.push(`admin con credenziali di sviluppo: ${weakAdminCount}`);
  if (!settings) failures.push('Settings globali assenti');
  else if (settings.threshold !== 15) failures.push(`soglia impostata a ${settings.threshold} invece di 15`);
  const paidCount = paid._sum.quantity ?? 0;
  const counterConsistent = paidCount === counterPieces;
  if (!counterConsistent) failures.push(`contatore pagati (${counterPieces}) diverso dagli ordini PAID reali (${paidCount})`);
  console.info(JSON.stringify({ database: new URL(process.env.DATABASE_URL ?? '').pathname.replace(/^\//, ''), exampleOrders, testOrders, testTryOnJobs: testJobs, weakAdmins: weakAdminCount, threshold: settings?.threshold ?? null, paidRealPieces: paidCount, counterConsistent }));
  if (failures.length) {
    console.error(`Controllo produzione fallito: ${failures.join('; ')}`);
    process.exitCode = 1;
  } else {
    console.info('Controllo produzione superato.');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Controllo produzione non riuscito.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
