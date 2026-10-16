import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { lockSettings } from '@/lib/db-lock';
import { settings, hasProductionStarted } from '@/lib/settings';
import { DomainError, logError } from '@/lib/errors';
import { stripeClient } from '@/lib/stripe';
import { orderValues, queueNotice, recipients, checkThreshold } from '@/lib/notifications';

export async function refundState(stripe: Stripe, paymentIntent: string) {
  const all = await stripe.refunds.list({ payment_intent: paymentIntent, limit: 100 });
  if (all.has_more) throw new DomainError('Troppi rimborsi: riconciliazione manuale necessaria.');
  return all.data;
}
export async function applyRefunds(tx: Prisma.TransactionClient, orderId: string, refunds: Stripe.Refund[]) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  const succeeded = refunds.filter(r => r.status === 'succeeded').reduce((sum, r) => sum + r.amount, 0);
  const total = Math.max(order.refundedAmountCents, succeeded);
  const full = total >= order.amountCents;
  const pending = refunds.some(r => r.status === 'pending' || r.status === 'requires_action');
  const operation = await tx.refundOperation.findUnique({ where: { orderId } });
  const own = refunds.find(r => r.id === operation?.stripeRefundId) ?? refunds.find(r => operation && r.metadata?.operationKey === operation.idempotencyKey);
  const failed = own?.status === 'failed' || own?.status === 'canceled';
  const status = full ? 'REFUNDED' : pending ? 'PENDING' : failed ? 'FAILED' : order.refundStatus;
  await tx.order.update({ where: { id: orderId }, data: {
    refundedAmountCents: total, refundStatus: status,
    ...(full ? { orderStatus: 'REFUNDED', refundedAt: order.refundedAt ?? new Date() } : {})
  } });
  if (operation) await tx.refundOperation.update({ where: { id: operation.id }, data: {
    status, ...(own ? { stripeRefundId: own.id } : {}), lastError: failed ? 'STRIPE_REFUND_FAILED_REVIEW_REQUIRED' : null
  } });
  if (full) {
    const current = await tx.settings.findUniqueOrThrow({ where: { id: 'global' } });
    await queueNotice(tx, current, 'refund', `refund:${order.id}:customer`, order.email, orderValues(order, current));
    for (const to of recipients(current)) await queueNotice(tx, current, 'refund', `refund:${order.id}:admin:${to}`, to, orderValues(order, current));
    await checkThreshold(tx, current);
  }
  return status;
}

export async function requestRefund(orderId: string, automatic: boolean, actor: string, stripe: Stripe = stripeClient()) {
  await settings();
  const operation = await prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.paymentStatus !== 'PAID' || !order.stripePaymentIntentId) throw new DomainError('Ordine non pagato o pagamento non identificato.');
    if (order.refundStatus === 'REFUNDED') return null;
    const existing = await tx.refundOperation.findUnique({ where: { orderId } });
    if (existing) {
      if (!automatic && existing.status === 'FAILED') {
        const updated = await tx.refundOperation.update({ where: { id: existing.id }, data: {
          status: 'PENDING', automatic: false, stripeRefundId: null, amountCents: order.amountCents - order.refundedAmountCents,
          idempotencyKey: `refund:${order.id}:retry:${existing.attempts + 1}`, createdAt: new Date(), lastError: null
        } });
        await tx.order.update({ where: { id: orderId }, data: { refundStatus: 'PENDING' } });
        await tx.auditLog.create({ data: { actor, action: 'REFUND_RETRY_CONFIRMED', entityId: orderId, before: { stripeRefundId: existing.stripeRefundId, status: existing.status, key: existing.idempotencyKey }, after: { key: updated.idempotencyKey } } });
        return updated;
      }
      return existing;
    }
    if (automatic && (current.productionStartedAt || hasProductionStarted(current.productionStatus) || !order.expiresAt || order.expiresAt > new Date())) throw new DomainError('Ordine non idoneo al rimborso automatico.');
    const op = await tx.refundOperation.create({ data: {
      orderId, amountCents: order.amountCents - order.refundedAmountCents,
      automatic, idempotencyKey: `refund:${order.id}`
    } });
    await tx.order.update({ where: { id: orderId }, data: { refundStatus: 'PENDING' } });
    await tx.auditLog.create({ data: { actor, action: 'REFUND_REQUESTED', entityId: orderId, after: { automatic, operationId: op.id } } });
    return op;
  });
  if (!operation) return { status: 'REFUNDED' };
  try {
    // Persistent intent above survives a crash. Shared lock below excludes production start
    // during the provider request. Production start also rejects unresolved automatic intents.
    return await prisma.$transaction(async tx => {
      const current = await lockSettings(tx);
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      const latest = await tx.refundOperation.findUniqueOrThrow({ where: { orderId } });
      const list = await refundState(stripe, order.stripePaymentIntentId!);
      const reconciled = await applyRefunds(tx, orderId, list);
      const own = list.find(r => r.id === latest.stripeRefundId) ?? list.find(r => r.metadata?.operationKey === latest.idempotencyKey);
      if (reconciled === 'REFUNDED' || list.some(r => ['pending', 'requires_action'].includes(r.status ?? ''))) return { status: reconciled };
      // A definitive provider failure must be investigated, not retried with a fresh key.
      if (own && ['failed', 'canceled'].includes(own.status ?? '')) return { status: 'FAILED' };
      if (latest.automatic && (current.productionStartedAt || hasProductionStarted(current.productionStatus))) throw new DomainError('Produzione avviata: consentita soltanto riconciliazione.');
      // Stripe retains keys for >=24h. Never recreate an ambiguous old request blindly.
      if (Date.now() - latest.createdAt.getTime() >= 23 * 3600000) throw new DomainError('Tentativo ambiguo oltre finestra idempotenza: riconciliare con Stripe.');
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId!, amount: latest.amountCents,
        metadata: { orderId, operationId: latest.id, operationKey: latest.idempotencyKey }
      }, { idempotencyKey: latest.idempotencyKey });
      await tx.refundOperation.update({ where: { id: latest.id }, data: { stripeRefundId: refund.id, attempts: { increment: 1 } } });
      const status = await applyRefunds(tx, orderId, [...list.filter(r => r.id !== refund.id), refund]);
      await tx.auditLog.create({ data: { actor, action: 'REFUND_PROVIDER_RESULT', entityId: orderId, after: { status, stripeRefundId: refund.id } } });
      return { status };
    }, { timeout: 45000, maxWait: 10000 });
  } catch (error) {
    // A timeout does NOT establish that Stripe rejected the request. Keep PENDING.
    await prisma.refundOperation.updateMany({ where: { id: operation.id, status: { not: 'REFUNDED' } }, data: { attempts: { increment: 1 }, lastError: 'REFUND_RECONCILIATION_REQUIRED' } });
    await logError('REFUND_RECONCILIATION_REQUIRED', operation.id);
    throw error;
  }
}
