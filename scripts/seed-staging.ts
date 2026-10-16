import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  const { appEnv } = await import('../lib/config');
  if (appEnv() !== 'staging' || process.env.STAGING_DATABASE_CONFIRMED !== 'true' || process.env.SEED_STAGING_CONFIRMED !== 'true') throw new Error('Seed consentito solo su database staging separato e confermato esplicitamente con SEED_STAGING_CONFIRMED=true.');
  const { prisma } = await import('../lib/prisma');
  const { settings } = await import('../lib/settings');
  const current = await settings();
  const terms = await prisma.termsVersion.findUniqueOrThrow({ where: { id: current.currentTermsId! } });
  const demoSeedId = 'rush-staging-v1';
  if (process.argv.includes('--cleanup')) {
    const where = { demoSeedId, orderNumber: { startsWith: 'RUSH-DEMO-V1-' }, stripeSessionId: null, stripePaymentIntentId: null };
    const count = await prisma.order.count({ where });
    if (!process.argv.includes('--confirm-delete-demo=rush-staging-v1')) console.log(`DRY-RUN: ${count} ordini del seed eliminabili. Nessuna eliminazione eseguita.`);
    else {
      const result = await prisma.order.deleteMany({ where });
      await prisma.auditLog.create({ data: { actor: 'local:seed', action: 'DEMO_SEED_CLEANED', after: { demoSeedId, count: result.count } } });
      console.log(`Eliminati esclusivamente ${result.count} ordini del seed ${demoSeedId}, senza identificativi Stripe.`);
    }
  } else {
    for (const [index, size] of ['S', 'M', 'L'].entries()) {
      const orderNumber = 'RUSH-DEMO-V1-' + index;
      await prisma.order.upsert({ where: { orderNumber }, update: {}, create: {
        orderNumber, demoSeedId, firstName: 'DEMO', lastName: 'Cliente ' + index, email: 'demo-' + index + '@example.invalid',
        size: size as 'S' | 'M' | 'L', quantity: index + 1, unitPriceCents: current.unitPriceCents, amountCents: current.unitPriceCents * (index + 1), currency: current.currency,
        paymentStatus: 'PENDING', orderStatus: 'RESERVED', termsAcceptedAt: new Date(), termsVersionId: terms.id, termsSnapshot: terms.text, refundMonths: current.refundMonths, warningDays: current.warningDays
      } });
    }
    await prisma.auditLog.create({ data: { actor: 'local:seed', action: 'DEMO_SEED_CREATED', after: { demoSeedId } } });
    console.log('Seed demo creato (ordini PENDING sintetici, nessun pagamento o email). I contatori pagati restano reali; usa Stripe TEST per dimostrare il pagamento.');
  }
  await prisma.$disconnect();
}
main().catch(() => { console.error('Seed non completato. Verifica ambiente staging, conferme e database.'); process.exitCode = 1; });
