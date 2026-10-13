import Stripe from 'stripe';
import { config } from './config.js';
import { db, getSetting, setSetting, totalPieces } from './db.js';
import { addMonths } from './dates.js';
import { mailOrderConfirmed, mailRefunded, notifyAdmin } from './mail.js';

export const stripe = config.stripeKey ? new Stripe(config.stripeKey) : null;

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
  const production = getSetting('production_status');
  if (production === 'produzione_avviata' || production === 'produzione_completata') return;
  const total = totalPieces();
  if (total < config.threshold) {
    setSetting('threshold_notified', '0');
    if (production === 'soglia_raggiunta') {
      setSetting('production_status', 'in_raccolta');
    }
    return;
  }
  if (total >= config.threshold && getSetting('threshold_notified') !== '1') {
    setSetting('threshold_notified', '1');
    if (production === 'in_raccolta') setSetting('production_status', 'soglia_raggiunta');
    await notifyAdmin(
      'RUSH PRE-SALE — SOGLIA RAGGIUNTA',
      `Sono state prenotate ${total} magliette.\nLa produzione può essere avviata dal pannello admin.`
    );
  }
}

export async function refundOrder(order, { reason = 'scadenza' } = {}) {
  const current = db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);
  if (!current || current.payment_status !== 'paid' || current.refund_status === 'refunded') return false;
  try {
    if (stripe && current.stripe_payment_intent) {
      await stripe.refunds.create({ payment_intent: current.stripe_payment_intent }, { idempotencyKey: `refund-${current.code}` });
    } else if (!config.demoMode) {
      throw new Error('Nessun payment_intent per il rimborso');
    }
    db.prepare(`UPDATE orders SET refund_status='refunded', refunded_at=? WHERE id=? AND refund_status!='refunded'`).run(new Date().toISOString(), current.id);
    await mailRefunded(current, { reason });
    const subject = reason === 'manuale' ? `RUSH PRE-SALE — RIMBORSO MANUALE (${current.code})` : `ORDINE SCADUTO — RIMBORSO AUTOMATICO (${current.code})`;
    await notifyAdmin(subject, `Ordine ${current.code} di ${current.first_name} ${current.last_name} rimborsato (${reason}).`);
    await checkThreshold();
    return true;
  } catch (e) {
    db.prepare(`UPDATE orders SET refund_status='failed' WHERE id=?`).run(current.id);
    await notifyAdmin(`ERRORE RIMBORSO ${current.code}`, `Rimborso non riuscito: ${e.message}\nVa gestito manualmente dal pannello Stripe.`);
    return false;
  }
}
