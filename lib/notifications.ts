import { Order, Prisma, Settings } from '@prisma/client';
import { templatesSchema, defaultTemplates } from '@/lib/operational-schema';

export function renderTemplate(template: { subject: string; text: string }, values: Record<string, string>) {
  const render = (text: string) => text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
  return { subject: render(template.subject).replace(/[\r\n]/g, ' '), text: render(template.text) };
}
export async function queueNotice(tx: Prisma.TransactionClient, current: Settings, kind: keyof typeof defaultTemplates, key: string, to: string, values: Record<string, string>) {
  const templates = templatesSchema.safeParse(current.emailTemplates);
  const rendered = renderTemplate(templates.success ? templates.data[kind] : defaultTemplates[kind], values);
  await tx.emailOutbox.upsert({ where: { dedupeKey: key }, create: { dedupeKey: key, to, ...rendered }, update: {} });
}
export function orderValues(order: Order, _current: Settings) {
  return { orderNumber: order.orderNumber, firstName: order.firstName, size: order.size,
    quantity: String(order.quantity), amount: (order.amountCents / 100).toFixed(2),
    expires: order.expiresAt?.toISOString() ?? 'non disponibile', delivery: order.deliveryTextSnapshot ?? 'Consegna secondo le condizioni accettate nell’ordine.',
    terms: order.termsSnapshot ?? 'Condizioni storiche non disponibili: contattare assistenza.' };
}
export function recipients(current: Settings) { return Array.isArray(current.adminRecipients) ? current.adminRecipients.filter((v): v is string => typeof v === 'string') : []; }
// Caller holds the global settings lock: no threshold/production race.
export async function checkThreshold(tx: Prisma.TransactionClient, current: Settings) {
  const aggregate = await tx.order.aggregate({ where: { excludedBatchId: null, paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } }, _sum: { quantity: true } });
  const total = aggregate._sum.quantity ?? 0;
  const productionLocked = current.productionStartedAt || ['PRODUZIONE_AVVIATA', 'PRODUZIONE_COMPLETATA'].includes(current.productionStatus);
  if (total < current.threshold) {
    if (!productionLocked && current.productionStatus === 'SOGLIA_RAGGIUNTA') await tx.settings.update({ where: { id: 'global' }, data: { productionStatus: 'IN_RACCOLTA' } });
    return;
  }
  if (current.thresholdNotifiedAt) {
    if (!productionLocked && current.productionStatus === 'IN_RACCOLTA') await tx.settings.update({ where: { id: 'global' }, data: { productionStatus: 'SOGLIA_RAGGIUNTA' } });
    return;
  }
  const targets = recipients(current);
  await tx.settings.update({ where: { id: 'global' }, data: {
    thresholdNotifiedAt: targets.length ? new Date() : null,
    ...(productionLocked ? {} : { productionStatus: 'SOGLIA_RAGGIUNTA' })
  } });
  for (const to of targets) await queueNotice(tx, current, 'threshold', `threshold:${current.revision}:${to}`, to, { pieces: String(total) });
}
