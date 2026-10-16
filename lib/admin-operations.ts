import { z } from 'zod';
import { ProductionStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { settings } from '@/lib/settings';
import { lockSettings } from '@/lib/db-lock';
import { DomainError } from '@/lib/errors';
import { settingsInput, initialTerms } from '@/lib/operational-schema';
import { checkThreshold } from '@/lib/notifications';
export async function saveSettings(input: z.infer<typeof settingsInput>, actor: string) {
  await settings();
  // Core agreed clauses remain intact; admin may add explanations without removing them.
  if (!initialTerms(input.threshold, input.refundMonths, input.deliveryText).split('\n\n').every(p => input.termsText.includes(p))) throw new DomainError('Le condizioni devono conservare tutte le clausole PRE-SALE e riflettere soglia, durata e consegna.', 400);
  return prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    if (input.revision !== current.revision) throw new DomainError('Impostazioni aggiornate da un’altra sessione. Ricarica prima di salvare.');
    const { termsText, revision: _revision, ...data } = input;
    const previousTerms = await tx.termsVersion.findUniqueOrThrow({ where: { id: current.currentTermsId! } });
    let termsId = previousTerms.id;
    if (termsText !== previousTerms.text) {
      const last = await tx.termsVersion.aggregate({ _max: { version: true } });
      termsId = (await tx.termsVersion.create({ data: { version: (last._max.version ?? 0) + 1, text: termsText, createdBy: actor } })).id;
    }
    const thresholdChanged = current.threshold !== input.threshold;
    const updated = await tx.settings.update({ where: { id: 'global' }, data: {
      ...data, currentTermsId: termsId, revision: { increment: 1 },
      ...(thresholdChanged ? { thresholdNotifiedAt: null, ...(!current.productionStartedAt ? { productionStatus: 'IN_RACCOLTA' } : {}) } : {})
    } });
    const before = Object.fromEntries(Object.keys(data).map(key => [key, current[key as keyof typeof current]]));
    await tx.auditLog.create({ data: { actor, action: 'SETTINGS_UPDATED', entityId: 'global',
      before: JSON.parse(JSON.stringify({ ...before, termsVersionId: current.currentTermsId })) as Prisma.InputJsonObject,
      after: JSON.parse(JSON.stringify({ ...data, termsVersionId: termsId })) as Prisma.InputJsonObject } });
    await checkThreshold(tx, updated);
    return updated;
  }, { timeout: 10000 });
}
export async function changeProduction(status: ProductionStatus, actor: string) {
  await settings();
  return prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    if (current.productionStatus === status) return current;
    if (status === 'PRODUZIONE_AVVIATA') {
      if (current.productionStartedAt || !['IN_RACCOLTA', 'SOGLIA_RAGGIUNTA'].includes(current.productionStatus)) throw new DomainError('Transizione produzione non valida.');
      const pieces = await tx.order.aggregate({ where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } }, _sum: { quantity: true } });
      if ((pieces._sum.quantity ?? 0) < current.threshold) throw new DomainError('La soglia minima non è stata raggiunta.');
      if (await tx.refundOperation.count({ where: { automatic: true, status: 'PENDING' } })) throw new DomainError('Riconcilia prima i rimborsi automatici in corso.');
    } else if (status !== 'PRODUZIONE_COMPLETATA' || !current.productionStartedAt || current.productionStatus !== 'PRODUZIONE_AVVIATA') throw new DomainError('La produzione può soltanto avanzare da avviata a completata.');
    const updated = await tx.settings.update({ where: { id: 'global' }, data: {
      productionStatus: status, revision: { increment: 1 },
      ...(status === 'PRODUZIONE_AVVIATA' ? { productionStartedAt: new Date() } : { productionCompletedAt: new Date() })
    } });
    await tx.auditLog.create({ data: { actor, action: 'PRODUCTION_CHANGED', entityId: 'global',
      before: { status: current.productionStatus }, after: { status, startedAt: updated.productionStartedAt?.toISOString() } } });
    return updated;
  });
}
