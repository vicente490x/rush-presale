import Stripe from 'stripe';
import { config } from './config.js';
import { db, getSetting, setSetting, totalPieces } from './db.js';
import { mailOrderConfirmed, mailRefunded, notifyAdmin } from './mail.js';

export const stripe = config.stripeKey ? new Stripe(config.stripeKey) : null;

const addMonths = (d, m) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};

export async function markPaid(orderId, { sessionId, paymentIntent } = {}) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || order.payment_status === 'paid') return order;
  const paidAt = new Date();
  db.prepare(
    `UPDATE orders SET payment_status='paid', paid_at=?, expires_at=?, stripe_session_id=COALESCE(?, stripe_session_id), stripe_payment_intent=COALESCE(?, stripe_payment_intent) WHERE id=?`
  ).run(paidAt.toISOString(), addMonths(paidAt, 2).toISOString(), sessionId || null, paymentIntent || null, orderId);
  const paid = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  await mailOrderConfirmed(paid);
  await checkThreshold();
  return paid;
}

export async function checkThreshold() {
  const total = totalPieces();
  if (total >= config.threshold && getSetting('threshold_notified') !== '1') {
    setSetting('threshold_notified', '1');
    if (getSetting('production_status') === 'in_raccolta') setSetting('production_status', 'soglia_raggiunta');
    await notifyAdmin(
      'RUSH PRE-SALE — SOGLIA RAGGIUNTA',
      `Sono state prenotate ${total} magliette.\nLa produzione può essere avviata dal pannello admin.`
    );
  }
}

export async function refundOrder(order, { reason = 'scadenza' } = {}) {
  if (order.refund_status === 'refunded') return false;
  try {
    if (stripe && order.stripe_payment_intent) {
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent }, { idempotencyKey: `refund-${order.code}` });
    } else if (!config.demoMode) {
      throw new Error('Nessun payment_intent per il rimborso');
    }
    db.prepare(`UPDATE orders SET refund_status='refunded', refunded_at=? WHERE id=?`).run(new Date().toISOString(), order.id);
    await mailRefunded(order);
    await notifyAdmin(`ORDINE SCADUTO — RIMBORSO AUTOMATICO (${order.code})`, `Ordine ${order.code} di ${order.first_name} ${order.last_name} rimborsato (${reason}).`);
    return true;
  } catch (e) {
    db.prepare(`UPDATE orders SET refund_status='failed' WHERE id=?`).run(order.id);
    await notifyAdmin(`ERRORE RIMBORSO ${order.code}`, `Rimborso non riuscito: ${e.message}\nVa gestito manualmente dal pannello Stripe.`);
    return false;
  }
}
