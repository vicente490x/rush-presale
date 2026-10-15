import assert from 'node:assert/strict';
import test from 'node:test';
import { addCalendarMonths } from '../lib/dates';
import {
  countPaidPieces,
  csvCell,
  hasReachedThreshold,
  isAutoRefundDue,
  isExpiryWarningDue,
  orderExpiry
} from '../lib/presale-logic';
import { orderSchema } from '../lib/order-validation';
import { presaleTerms, presaleTermsAcceptance, presaleTermsForThreshold } from '../lib/presale-terms';

test('checkout condition text and mandatory consent match the agreed wording', () => {
  assert.deepEqual(presaleTerms, [
    'Questa maglietta viene prodotta esclusivamente al raggiungimento di un minimo di 15 pezzi pre-ordinati.',
    'La maglietta non è quindi immediatamente disponibile.',
    'Una volta raggiunta la soglia minima, la produzione potrà essere avviata.',
    'La consegna avverrà durante una serata Rush oppure tramite uno dei nostri PR di fiducia.',
    "Qualora la produzione non venga avviata entro 2 mesi dalla data del pagamento, l'importo dell'ordine verrà automaticamente rimborsato."
  ]);
  assert.equal(presaleTermsAcceptance, 'Ho letto e accetto le condizioni della PRE-SALE.');
  assert.match(presaleTermsForThreshold(20)[0], /minimo di 20 pezzi/);
});

test('counts paid pieces only and excludes refunded orders', () => {
  assert.equal(countPaidPieces([
    { paymentStatus: 'PAID', refundStatus: 'NONE', quantity: 3 },
    { paymentStatus: 'PAID', refundStatus: 'PENDING', quantity: 2 },
    { paymentStatus: 'PAID', refundStatus: 'REFUNDED', quantity: 100 },
    { paymentStatus: 'PENDING', refundStatus: 'NONE', quantity: 50 },
    { paymentStatus: 'FAILED', refundStatus: 'NONE', quantity: 20 }
  ]), 5);
});

test('threshold remains reached above the configured target', () => {
  assert.equal(hasReachedThreshold(14, 15), false);
  assert.equal(hasReachedThreshold(15, 15), true);
  assert.equal(hasReachedThreshold(16, 15), true);
  assert.equal(hasReachedThreshold(17, 15), true);
});

test('expiry is two calendar months after payment, including leap and year boundaries', () => {
  assert.equal(orderExpiry(new Date('2023-12-31T12:00:00.000Z')).toISOString(), '2024-02-29T12:00:00.000Z');
  assert.equal(orderExpiry(new Date('2024-12-31T12:00:00.000Z')).toISOString(), '2025-02-28T12:00:00.000Z');
  assert.equal(addCalendarMonths(new Date('2024-01-31T12:00:00.000Z'), 1).toISOString(), '2024-02-29T12:00:00.000Z');
});

test('expiry reminder window includes exactly seven days but excludes due orders', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(isExpiryWarningDue(new Date(now.getTime() + 7 * 86_400_000), now), true);
  assert.equal(isExpiryWarningDue(now, now), false);
  assert.equal(isExpiryWarningDue(new Date(now.getTime() - 1), now), false);
  assert.equal(isExpiryWarningDue(new Date(now.getTime() + 7 * 86_400_000 + 1), now), false);
});

test('overdue order is refundable only before production starts', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const expired = new Date(now.getTime() - 1);
  assert.equal(isAutoRefundDue(expired, now, false), true);
  assert.equal(isAutoRefundDue(expired, now, true), false);
  assert.equal(isAutoRefundDue(now, now, false), true);
  assert.equal(isAutoRefundDue(new Date(now.getTime() + 1), now, false), false);
});

test('CSV output escapes quotes, newlines and spreadsheet formulas', () => {
  assert.equal(csvCell('O"Neil\r\nCustomer'), '"O""Neil Customer"');
  assert.equal(csvCell('=1+2'), '"\'=1+2"');
  assert.equal(csvCell('@SUM(A1:A2)'), '"\'@SUM(A1:A2)"');
  assert.equal(csvCell(null), '""');
});

test('order input rejects missing consent and invalid sizes or quantities', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    size: 'M',
    quantity: 1,
    terms: true,
    turnstileToken: 'test-pass'
  };
  assert.equal(orderSchema.safeParse(valid).success, true);
  assert.equal(orderSchema.safeParse({ ...valid, website: '' }).success, true);
  assert.equal(orderSchema.safeParse({ ...valid, terms: false }).success, false);
  assert.equal(orderSchema.safeParse({ ...valid, size: 'XXXL' }).success, false);
  for (const quantity of [0, -1, 101, 1.5]) {
    assert.equal(orderSchema.safeParse({ ...valid, quantity }).success, false);
  }
  assert.equal(orderSchema.safeParse({ ...valid, email: 'bad-email' }).success, false);
  assert.equal(orderSchema.safeParse({ ...valid, firstName: '  ' }).success, false);
  assert.equal(orderSchema.safeParse({ ...valid, website: 'filled-by-bot' }).success, false);
});
