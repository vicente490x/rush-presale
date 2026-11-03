import assert from 'node:assert/strict';
import test from 'node:test';
import type Stripe from 'stripe';
import { verifiedPayment } from '../lib/payment-confirmation';
import { hasOrderAccess, issueOrderAccess } from '../lib/order-access';

const order = { id: 'order-1', orderNumber: 'RUSH-0123456789ABCDEF', stripeSessionId: 'cs_test_order', stripePaymentIntentId: 'pi_order', amountCents: 5000, currency: 'eur', paymentStatus: 'PAID' };
function fixture(wallet?: string) {
  return { id: order.stripeSessionId, mode: 'payment', status: 'complete', payment_status: 'paid', livemode: false,
    amount_total: 5000, currency: 'eur', metadata: { orderId: order.id, orderNumber: order.orderNumber },
    payment_intent: { id: 'pi_order', status: 'succeeded', amount: 5000, amount_received: 5000, currency: 'eur', livemode: false, metadata: { orderId: order.id },
      latest_charge: { id: 'ch_order', payment_intent: 'pi_order', paid: true, captured: true, amount: 5000, currency: 'eur', livemode: false, created: 1793174400,
        billing_details: { email: 'private@example.com' }, payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242', wallet: wallet ? { type: wallet } : null } } } }
  } as unknown as Stripe.Checkout.Session;
}
test('confirmation identifies card and wallets using verified charge and exposes only safe fields', () => {
  for (const [wallet, label] of [[undefined, 'Carta'], ['apple_pay', 'Apple Pay'], ['google_pay', 'Google Pay']] as const) {
    const result = verifiedPayment(order, fixture(wallet), false);
    assert.equal(result.paymentStatus, 'PAID'); assert.equal(result.method, label);
    assert.equal(result.amountPaidCents, 5000); assert.equal(result.cardLast4, '4242'); assert.ok(result.paidAt);
    assert.doesNotMatch(JSON.stringify(result), /private@|billing_details|pi_order|ch_order/);
  }
});
test('confirmation refuses wrong session, metadata, amount, currency, mode and intent association', () => {
  for (const patch of [{ id: 'cs_other' }, { amount_total: 1 }, { currency: 'usd' }, { livemode: true }, { mode: 'subscription' }, { metadata: { orderId: 'other' } }]) {
    assert.throws(() => verifiedPayment(order, { ...fixture(), ...patch } as Stripe.Checkout.Session, false), /MISMATCH/);
  }
  assert.throws(() => verifiedPayment({ ...order, stripePaymentIntentId: 'pi_other' }, fixture(), false), /MISMATCH/);
  assert.throws(() => verifiedPayment({ ...order, stripePaymentIntentId: null }, fixture(), false), /MISMATCH/);
  assert.throws(() => verifiedPayment(order, { ...fixture(), status: 'open' }, false), /MISMATCH/);
  const session = fixture(); const intent = session.payment_intent as Stripe.PaymentIntent;
  intent.amount_received = 1;
  assert.throws(() => verifiedPayment(order, session, false), /MISMATCH/);
});
test('redirect or completed Checkout never confirms an unpaid or unprocessed order', () => {
  assert.equal(verifiedPayment({ ...order, paymentStatus: 'PENDING' }, fixture(), false).paymentStatus, 'PENDING');
  assert.equal(verifiedPayment(order, { ...fixture(), payment_status: 'unpaid' }, false).paymentStatus, 'PENDING');
  assert.equal(verifiedPayment(order, { ...fixture(), payment_status: 'unpaid', status: 'expired' }, false).paymentStatus, 'FAILED');
});
test('confirmation rejects unexpanded or inconsistent charge and shows no invented card details', () => {
  const session = fixture(); const intent = session.payment_intent as Stripe.PaymentIntent;
  intent.latest_charge = 'ch_order'; assert.throws(() => verifiedPayment(order, session, false), /MISMATCH/);
  const another = fixture(); const charge = (another.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge;
  charge.payment_intent = 'pi_other'; assert.throws(() => verifiedPayment(order, another, false), /MISMATCH/);
  charge.payment_intent = 'pi_order'; charge.payment_method_details = { type: 'paypal' } as Stripe.Charge.PaymentMethodDetails;
  const result = verifiedPayment(order, another, false);
  assert.equal(result.method, 'PayPal'); assert.equal(result.cardLast4, null); assert.equal(result.cardBrand, null);
});
test('order access survives refresh but rejects another order, tampering, expiry and key rotation', () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'isolated-test-secret-with-more-than-32-characters';
  try {
    const now = 1793174400000; const token = issueOrderAccess(order.orderNumber, now);
    assert.equal(hasOrderAccess(order.orderNumber, token, now + 1000), true);
    assert.equal(hasOrderAccess('RUSH-OTHER', token, now), false);
    assert.equal(hasOrderAccess(order.orderNumber, token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), now), false);
    assert.equal(hasOrderAccess(order.orderNumber, token, now + 8 * 86400000), false);
    assert.equal(hasOrderAccess(order.orderNumber, undefined, now), false);
    process.env.SESSION_SECRET = 'a-different-isolated-secret-with-32-characters';
    assert.equal(hasOrderAccess(order.orderNumber, token, now), false);
  } finally { if (previous === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previous; }
});
