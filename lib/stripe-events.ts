import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { lockSettings } from '@/lib/db-lock';
import { settings } from '@/lib/settings';
import { addCalendarMonths } from '@/lib/dates';
import { checkThreshold, queueNotice, orderValues } from '@/lib/notifications';
import { applyRefunds, refundState } from '@/lib/refunds';
import { DomainError } from '@/lib/errors';

export async function processStripeEvent(event: Stripe.Event, stripe: Stripe) {
  if (event.livemode) throw new DomainError('Eventi live non consentiti.', 400);
  await settings();
  let refundOrderId: string | undefined;
  let refunds: Stripe.Refund[] | undefined;
  if (['charge.refunded', 'refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) {
    const object = event.data.object as Stripe.Refund | Stripe.Charge;
    const pi = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
    if (pi) {
      const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: pi } });
      refundOrderId = order?.id;
      if (!refundOrderId) {
        const intent = await stripe.paymentIntents.retrieve(pi);
        const candidateId = intent.metadata?.orderId;
        if (candidateId) {
          const candidate = await prisma.order.findUnique({ where: { id: candidateId } });
          if (candidate) {
            // Do not acknowledge an early refund before the verified payment event.
            // Metadata alone must never bind a different payment to this order.
            if (candidate.stripePaymentIntentId !== pi || candidate.paymentStatus !== 'PAID') throw new DomainError('Pagamento non ancora associato o incoerente: riconciliare prima del rimborso.');
            refundOrderId = candidate.id;
          }
        }
      }
      if (refundOrderId) refunds = await refundState(stripe, pi);
    }
  }
  return prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    if (await tx.stripeWebhookEvent.findUnique({ where: { id: event.id } })) return { duplicate: true };
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      const id = session.metadata?.orderId;
      if (id && session.payment_status === 'paid') {
        const order = await tx.order.findUniqueOrThrow({ where: { id } });
        const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        if (session.livemode || session.mode !== 'payment' || session.amount_total !== order.amountCents || session.currency !== order.currency || !pi ||
            (order.stripeSessionId && order.stripeSessionId !== session.id) || (order.stripePaymentIntentId && order.stripePaymentIntentId !== pi)) throw new DomainError('Pagamento incoerente con ordine.', 400);
        if (order.paymentStatus !== 'PAID') {
          const paidAt = new Date(event.created * 1000);
          const paid = await tx.order.update({ where: { id }, data: {
            paymentStatus: 'PAID', orderStatus: order.refundStatus === 'REFUNDED' ? 'REFUNDED' : 'CONFIRMED',
            paidAt, expiresAt: addCalendarMonths(paidAt, order.refundMonths), stripeSessionId: session.id, stripePaymentIntentId: pi
          } });
          if (paid.refundStatus !== 'REFUNDED') await queueNotice(tx, current, 'confirmation', `order-confirmation:${id}`, paid.email, orderValues(paid, current));
        }
        await checkThreshold(tx, current);
      }
    } else if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.orderId) await tx.order.updateMany({
        where: { id: session.metadata.orderId, paymentStatus: { not: 'PAID' }, OR: [{ stripeSessionId: session.id }, { stripeSessionId: null }] },
        data: { paymentStatus: 'FAILED' }
      });
    }
    if (refundOrderId && refunds) await applyRefunds(tx, refundOrderId, refunds);
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
    return { duplicate: false };
  }, { maxWait: 10000, timeout: 15000 });
}
