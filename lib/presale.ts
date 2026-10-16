import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { settings } from '@/lib/settings';
import { lockSettings } from '@/lib/db-lock';
import { stripeClient } from '@/lib/stripe';
import { logError } from '@/lib/errors';
export async function setPresaleOpen(open: boolean, actor: string, stripe?: Stripe) {
  await settings();
  await prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    await tx.settings.update({ where: { id: 'global' }, data: { presaleOpen: open, revision: { increment: 1 } } });
    await tx.auditLog.create({ data: { actor, action: 'PRESALE_CHANGED', entityId: 'global', before: { open: current.presaleOpen }, after: { open } } });
  });
  return open ? { checked: 0, errors: 0, more: 0 } : reconcileCheckouts(true, stripe ?? stripeClient());
}
export async function reconcileCheckouts(expireAll: boolean, stripe: Stripe = stripeClient(), budgetMs = 120000) {
  const started = Date.now();
  const total = await prisma.order.count({ where: { paymentStatus: 'PENDING', demoSeedId: null } });
  const pending = await prisma.order.findMany({ where: { paymentStatus: 'PENDING', demoSeedId: null }, orderBy: { createdAt: 'asc' }, take: 50 });
  const result = { checked: 0, errors: 0, more: 0 }; let visited = 0;
  for (const order of pending) {
    if (Date.now() - started >= budgetMs) break;
    visited++;
    try {
      let session: Stripe.Checkout.Session | undefined;
      if (order.stripeSessionId) session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      else if (order.checkoutExpiresAt && order.checkoutExpiresAt <= new Date()) {
        const sessions = await stripe.checkout.sessions.list({ created: { gte: Math.floor(order.createdAt.getTime() / 1000) - 5 }, limit: 100 });
        session = sessions.data.find(s => s.metadata?.orderId === order.id);
        if (!session && sessions.has_more) throw new Error('CHECKOUT_RECONCILIATION_REQUIRED');
        if (!session) {
          await prisma.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
          result.checked++; continue;
        }
        await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
      }
      if (!session) continue;
      if (expireAll && session.status === 'open') session = await stripe.checkout.sessions.expire(session.id);
      if (session.status === 'expired') await prisma.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
      // Paid/async sessions are confirmed exclusively through a verified Stripe webhook.
      if (session.status === 'complete') {
        const events = await stripe.events.list({ types: ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], created: { gte: Math.floor(order.createdAt.getTime() / 1000) - 5 }, limit: 100 });
        const event = events.data.find(e => (e.data.object as Stripe.Checkout.Session).id === session!.id && (e.data.object as Stripe.Checkout.Session).payment_status === 'paid');
        // API-authenticated event reconciliation uses the same transactional processor.
        if (event) await (await import('@/lib/stripe-events')).processStripeEvent(event, stripe);
      }
      result.checked++;
    } catch { result.errors++; await logError('CHECKOUT_RECONCILIATION_REQUIRED', order.id); }
  }
  result.more = Math.max(0, total - visited);
  return result;
}
