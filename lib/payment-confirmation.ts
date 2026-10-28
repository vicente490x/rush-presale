import type Stripe from 'stripe';

type ExpectedOrder = { id: string; orderNumber: string; stripeSessionId: string | null; stripePaymentIntentId: string | null; amountCents: number; currency: string; paymentStatus: string };

// Only a verified provider response may supply payment details. Never return the raw object.
export function verifiedPayment(order: ExpectedOrder, session: Stripe.Checkout.Session, live: boolean) {
  if (session.id !== order.stripeSessionId || session.mode !== 'payment' || session.livemode !== live ||
      session.metadata?.orderId !== order.id || session.metadata?.orderNumber !== order.orderNumber ||
      session.amount_total !== order.amountCents || session.currency !== order.currency) throw new Error('PAYMENT_MISMATCH');
  const pending = { paymentStatus: session.status === 'expired' || order.paymentStatus === 'FAILED' ? 'FAILED' as const : 'PENDING' as const,
    amountPaidCents: null, method: null, cardBrand: null, cardLast4: null, paidAt: null };
  if (session.payment_status !== 'paid') return pending;
  if (session.status !== 'complete') throw new Error('PAYMENT_MISMATCH');
  const intent = session.payment_intent;
  if (!intent || typeof intent === 'string' || intent.livemode !== live || intent.metadata.orderId !== order.id ||
      intent.amount !== order.amountCents || intent.amount_received !== order.amountCents || intent.currency !== order.currency ||
      (order.stripePaymentIntentId && intent.id !== order.stripePaymentIntentId)) throw new Error('PAYMENT_MISMATCH');
  if (intent.status !== 'succeeded' || order.paymentStatus !== 'PAID') return { ...pending, paymentStatus: 'PENDING' as const };
  if (order.stripePaymentIntentId !== intent.id) throw new Error('PAYMENT_MISMATCH');
  const charge = intent.latest_charge;
  if (!charge || typeof charge === 'string' || !charge.paid || !charge.captured || charge.livemode !== live ||
      charge.payment_intent !== intent.id || charge.amount !== order.amountCents || charge.currency !== order.currency) throw new Error('PAYMENT_MISMATCH');
  const details = charge.payment_method_details;
  const card = details?.card;
  const wallet = card?.wallet?.type;
  const method = wallet === 'apple_pay' ? 'Apple Pay' : wallet === 'google_pay' ? 'Google Pay' :
    details?.type === 'card' ? 'Carta' : details?.type === 'paypal' ? 'PayPal' :
    details?.type === 'link' ? 'Link' : details?.type === 'sepa_debit' ? 'Addebito SEPA' : details?.type ?? null;
  return { paymentStatus: 'PAID' as const, amountPaidCents: intent.amount_received, method,
    cardBrand: card?.brand ?? null, cardLast4: card?.last4 && /^\d{4}$/.test(card.last4) ? card.last4 : null,
    paidAt: new Date(charge.created * 1000).toISOString() };
}
