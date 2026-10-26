import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { lockSettings } from '@/lib/db-lock';
import { settings, hasProductionStarted } from '@/lib/settings';
import { requestRefund } from '@/lib/refunds';
import { queueNotice, orderValues, recipients } from '@/lib/notifications';
import { deliverPendingEmails } from '@/lib/mail';
import { reconcileCheckouts } from '@/lib/presale';
// Preview is read-only; only runExpiry can persist warning/refund actions.
export async function expiryPreview(now = new Date()) {
  const current = await settings();
  const orders = await prisma.order.findMany({ where: { excludedBatchId: null, paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' }, expiresAt: { not: null } }, orderBy: { expiresAt: 'asc' }, take: 1000 });
  const productionStarted = Boolean(current.productionStartedAt) || hasProductionStarted(current.productionStatus);
  return { productionStarted, truncated: orders.length === 1000,
    due: productionStarted ? [] : orders.filter(o => o.expiresAt! <= now),
    warnings: productionStarted ? [] : orders.filter(o => !o.expiryWarningSentAt && o.expiresAt! > now && o.expiresAt!.getTime() <= now.getTime() + o.warningDays * 86400000),
    pending: await prisma.refundOperation.findMany({ where: { status: { in: ['PENDING', 'FAILED'] } }, include: { order: true }, take: 100, orderBy: { updatedAt: 'asc' } })
  };
}
// Bounded work keeps the scheduled invocation inside the hosting time budget.
export async function runExpiry(actor: string, stripe?: Stripe) {
  const deadline = Date.now() + 120000;
  const preview = await expiryPreview();
  let warnings = 0, refundChecks = 0, confirmedRefunds = 0, pendingRefunds = 0, errors = 0;
  for (const item of preview.warnings.slice(0, 50)) await prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    if (current.productionStartedAt || hasProductionStarted(current.productionStatus)) return;
    const order = await tx.order.findUniqueOrThrow({ where: { id: item.id } });
    if (order.expiryWarningSentAt || order.paymentStatus !== 'PAID' || order.refundStatus !== 'NONE') return;
    const targets = recipients(current);
    if (!targets.length) return;
    for (const to of targets) await queueNotice(tx, current, 'warning', `expiry-warning:${order.id}:${to}`, to, orderValues(order, current));
    await tx.order.update({ where: { id: order.id }, data: { expiryWarningSentAt: new Date() } });
    warnings++;
  });
  const ids = new Set([...preview.pending.filter(o => o.status === 'PENDING').map(o => o.orderId), ...preview.due.map(o => o.id)]);
  let examined = 0;
  for (const id of [...ids].slice(0, 25)) {
    if (Date.now() >= deadline) break;
    examined++;
    try {
      const result = await requestRefund(id, true, actor, stripe); refundChecks++;
      if (result.status === 'REFUNDED') confirmedRefunds++;
      else if (result.status === 'PENDING') pendingRefunds++;
      else errors++;
    } catch { errors++; }
  }
  const current = await settings();
  const checkouts = await reconcileCheckouts(!current.presaleOpen || current.maintenance, stripe, 15000);
  const emails = await deliverPendingEmails(5);
  await prisma.auditLog.create({ data: { actor, action: 'EXPIRY_CHECK_EXECUTED', after: { warnings, refundChecks, confirmedRefunds, pendingRefunds, errors, emails, checkouts } } });
  return { warnings, refundChecks, confirmedRefunds, pendingRefunds, errors, emails, checkouts, moreDue: ids.size > examined };
}
