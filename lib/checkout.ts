import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { settings } from '@/lib/settings';
import { orderInput, sizesSchema } from '@/lib/operational-schema';
import { lockSettings } from '@/lib/db-lock';
import { DomainError } from '@/lib/errors';
import { stripeClient } from '@/lib/stripe';
import { publicConfig } from '@/lib/config';
import { appEnv } from '@/lib/config';
import { recipientAllowed } from '@/lib/mail';

export async function reserveOrder(input: z.infer<typeof orderInput>) {
  if (appEnv() === 'staging' && !recipientAllowed(input.email)) throw new DomainError('In anteprima usa un indirizzo di test autorizzato dall’amministratore.', 400);
  await settings();
  const { turnstileToken: _token, website: _trap, checkoutKey, ...details } = input;
  const fingerprint = createHash('sha256').update(JSON.stringify(details)).digest('hex');
  return prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    if (!current.presaleOpen) throw new DomainError(current.closedMessage, 403);
    if (current.maintenance) throw new DomainError('Servizio in manutenzione. Riprova più tardi.', 503);
    const existing = await tx.order.findUnique({ where: { checkoutKey } });
    if (existing) {
      if (existing.checkoutFingerprint !== fingerprint) throw new DomainError('Tentativo già utilizzato con dati differenti.');
      if (existing.paymentStatus !== 'PENDING' || !existing.checkoutExpiresAt || existing.checkoutExpiresAt <= new Date()) throw new DomainError('Tentativo concluso o scaduto. Avvia un nuovo ordine.');
      return existing;
    }
    if (input.termsVersionId !== current.currentTermsId || input.settingsRevision !== current.revision) throw new DomainError('Le condizioni o il listino sono cambiati. Rileggi e accetta la versione aggiornata.');
    if (input.quantity > current.maxQuantity) throw new DomainError(`Quantità massima per ordine: ${current.maxQuantity}.`, 400);
    const size = sizesSchema.parse(current.sizes).find(row => row.size === input.size);
    if (!size?.enabled) throw new DomainError('Taglia non disponibile.', 400);
    // PENDING reservations are retained until Stripe has definitively expired them.
    const reserved = { demoSeedId: null, OR: [{ paymentStatus: 'PAID' as const, refundStatus: { not: 'REFUNDED' as const } }, { paymentStatus: 'PENDING' as const }] };
    if (size.stock !== null) {
      const used = await tx.order.aggregate({ where: { ...reserved, size: input.size }, _sum: { quantity: true } });
      if ((used._sum.quantity ?? 0) + input.quantity > size.stock) throw new DomainError('Disponibilità della taglia esaurita.');
    }
    if (current.maxPerCustomer) {
      const used = await tx.order.aggregate({ where: { ...reserved, email: input.email }, _sum: { quantity: true } });
      if ((used._sum.quantity ?? 0) + input.quantity > current.maxPerCustomer) throw new DomainError('Limite per cliente raggiunto.');
    }
    const terms = await tx.termsVersion.findUniqueOrThrow({ where: { id: current.currentTermsId! } });
    return tx.order.create({ data: {
      orderNumber: `RUSH-${randomBytes(16).toString('hex').toUpperCase()}`,
      firstName: input.firstName, lastName: input.lastName, email: input.email, size: input.size, quantity: input.quantity,
      amountCents: input.quantity * current.unitPriceCents, unitPriceCents: current.unitPriceCents, currency: current.currency,
      refundMonths: current.refundMonths, warningDays: current.warningDays,
      termsVersionId: terms.id, termsSnapshot: terms.text, deliveryTextSnapshot: current.deliveryText, termsAcceptedAt: new Date(),
      checkoutKey, checkoutFingerprint: fingerprint,
      checkoutExpiresAt: new Date(Math.floor(Date.now() / 1000) * 1000 + 31 * 60000)
    } });
  });
}

export async function createCheckout(input: z.infer<typeof orderInput>, stripe: Stripe = stripeClient()) {
  const order = await reserveOrder(input);
  const siteUrl = publicConfig().NEXT_PUBLIC_SITE_URL;
  const session = order.stripeSessionId
    ? await stripe.checkout.sessions.retrieve(order.stripeSessionId)
    : await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: order.email, payment_method_types: ['card'],
      line_items: [{ quantity: order.quantity, price_data: { currency: order.currency, unit_amount: order.unitPriceCents,
        product_data: { name: `RUSH T-SHIRT — PRE-SALE (taglia ${order.size})` } } }],
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      payment_intent_data: { metadata: { orderId: order.id } },
      success_url: `${siteUrl}/conferma?code=${order.orderNumber}`, cancel_url: `${siteUrl}/presale?annullato=1`,
      expires_at: Math.floor(order.checkoutExpiresAt!.getTime() / 1000)
    }, { idempotencyKey: `checkout:${order.id}` });
  const available = await prisma.$transaction(async tx => {
    const current = await lockSettings(tx);
    await tx.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return current.presaleOpen && !current.maintenance;
  });
  if (!available) {
    if (session.status === 'open') await stripe.checkout.sessions.expire(session.id);
    throw new DomainError('PRE-SALE non disponibile. Il checkout è stato annullato.', 403);
  }
  if (session.status !== 'open' || !session.url) throw new DomainError('Checkout concluso o scaduto. Controlla la conferma o avvia un nuovo ordine.');
  return { checkoutUrl: session.url };
}
