import { ProductionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { lockSettings } from '@/lib/db-lock';
import { defaultTemplates, initialTerms } from '@/lib/operational-schema';
export async function settings() {
  await prisma.settings.upsert({ where: { id: 'global' }, create: { id: 'global' }, update: {} });
  return prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    if (current.currentTermsId) return current;
    const terms = await tx.termsVersion.create({ data: { version: 1, text: initialTerms(current.threshold, current.refundMonths, current.deliveryText), createdBy: 'system:initialization' } });
    return tx.settings.update({ where: { id: 'global' }, data: {
      currentTermsId: terms.id, emailTemplates: defaultTemplates,
      adminRecipients: (process.env.ADMIN_EMAIL ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    } });
  });
}
export function hasProductionStarted(status: ProductionStatus) {
  return status === 'PRODUZIONE_AVVIATA' || status === 'PRODUZIONE_COMPLETATA';
}
export const paidWhere = { paymentStatus: 'PAID' as const, refundStatus: { not: 'REFUNDED' as const } };
export async function paidPieces() {
  const result = await prisma.order.aggregate({ where: paidWhere, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
