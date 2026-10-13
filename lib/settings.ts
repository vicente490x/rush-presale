import { ProductionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function settings() {
  return prisma.settings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      threshold: Number(process.env.PRESALE_THRESHOLD ?? 15),
      tryOnDailyLimit: Number(process.env.TRYON_DAILY_LIMIT ?? 50)
    },
    update: {}
  });
}

export function hasProductionStarted(status: ProductionStatus) {
  return status === ProductionStatus.PRODUZIONE_AVVIATA || status === ProductionStatus.PRODUZIONE_COMPLETATA;
}

export async function paidPieces() {
  const result = await prisma.order.aggregate({
    where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } },
    _sum: { quantity: true }
  });
  return result._sum.quantity ?? 0;
}
