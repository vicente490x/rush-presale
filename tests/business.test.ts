import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addCalendarMonths } from '@/lib/dates';
import { shouldWarnExpiry, shouldAutoRefund, thresholdReached, computePaidPieces, buildOrderExpiry } from '@/lib/business';

describe('business logic', () => {
  it('somma quantità ordini pagati e non rimborsati', () => {
    assert.equal(computePaidPieces([{ paymentStatus: 'PAID', refundStatus: 'NONE', quantity: 2 }, { paymentStatus: 'PAID', refundStatus: 'REFUNDED', quantity: 5 }, { paymentStatus: 'PENDING', refundStatus: 'NONE', quantity: 10 }, { paymentStatus: 'PAID', refundStatus: 'NONE', quantity: 3 }]), 5);
  });

  it('la soglia viene raggiunta ma non chiude la pre-sale', () => {
    assert.equal(thresholdReached(15, 15), true);
    assert.equal(thresholdReached(16, 15), true);
    assert.equal(thresholdReached(17, 15), true);
  });

  it('le scadenze a 2 mesi rispettano il calendario', () => {
    const paidAt = new Date('2026-12-31T12:00:00Z');
    const expiry = buildOrderExpiry(paidAt);
    assert.equal(expiry.toISOString(), '2027-02-28T12:00:00.000Z');
    assert.equal(addCalendarMonths(paidAt, 2).toISOString(), '2027-02-28T12:00:00.000Z');
  });

  it('avvisa a 7 giorni ma non prima', () => {
    const now = new Date('2026-10-15T10:00:00Z');
    const near = new Date('2026-10-22T09:00:00Z');
    const far = new Date('2026-10-23T11:00:00Z');
    assert.equal(shouldWarnExpiry(now, near), true);
    assert.equal(shouldWarnExpiry(now, far), false);
  });

  it('rimborsa automaticamente solo senza produzione avviata', () => {
    assert.equal(shouldAutoRefund({ paymentStatus: 'PAID', refundStatus: 'NONE', expiresAt: new Date('2026-10-01T00:00:00Z') }, new Date('2026-10-15T00:00:00Z'), 'IN_RACCOLTA'), true);
    assert.equal(shouldAutoRefund({ paymentStatus: 'PAID', refundStatus: 'NONE', expiresAt: new Date('2026-10-01T00:00:00Z') }, new Date('2026-10-15T00:00:00Z'), 'PRODUZIONE_AVVIATA'), false);
  });
});
