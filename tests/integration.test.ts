import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';

test('PostgreSQL integration (real DB, explicit Stripe/Resend test doubles)', { skip: process.env.RUSH_ISOLATED_TEST !== 'true' }, async t => {
  const { prisma } = await import('../lib/prisma');
  const { settings, paidPieces } = await import('../lib/settings');
  const { reserveOrder, createCheckout } = await import('../lib/checkout');
  const { saveSettings, changeProduction } = await import('../lib/admin-operations');
  const { processStripeEvent } = await import('../lib/stripe-events');
  const { requestRefund } = await import('../lib/refunds');
  const { deliverPendingEmails } = await import('../lib/mail');
  const { expiryPreview, runExpiry } = await import('../lib/expiry');
  const { initialTerms } = await import('../lib/operational-schema');
  const { createAdminSession, isAdminSession } = await import('../lib/admin-auth');
  let calls = 0;
  let refundMode: 'pending' | 'succeeded' | 'failed' | 'timeout' | 'accepted-timeout' = 'pending';
  let refundList: Stripe.Refund[] = [];
  const stripe = {
    refunds: {
      list: async () => ({ data: refundList, has_more: false }),
      create: async (params: Stripe.RefundCreateParams) => {
        calls++;
        if (refundMode === 'timeout') throw new Error('Provider timeout');
        const refund = { id: 're_' + randomUUID(), status: refundMode === 'accepted-timeout' ? 'succeeded' : refundMode, amount: params.amount!, metadata: params.metadata, payment_intent: params.payment_intent, currency: 'eur' } as Stripe.Refund;
        refundList.push(refund);
        if (refundMode === 'accepted-timeout') throw new Error('Connection lost after provider accepted refund');
        return refund;
      }
    }, checkout: { sessions: {
      create: async (params: Stripe.Checkout.SessionCreateParams) => ({ id: 'cs_' + params.metadata!.orderId, status: 'open', url: 'https://checkout.stripe.com/test', ...params }),
      retrieve: async (id: string) => ({ id, status: 'open', url: 'https://checkout.stripe.com/test' }),
      list: async () => ({ data: [], has_more: false }), expire: async (id: string) => ({ id, status: 'expired' })
    } }, events: { list: async () => ({ data: [] }) }
  } as unknown as Stripe;
  const input = async (extra = {}) => {
    const s = await settings();
    return { firstName: 'Test', lastName: 'Buyer', email: 'buyer@example.com', size: 'M' as const, quantity: 1, terms: true as const, termsVersionId: s.currentTermsId!, settingsRevision: s.revision, checkoutKey: randomUUID(), turnstileToken: 'test-double', ...extra };
  };
  const config = async (extra = {}) => {
    const s = await settings(); const terms = await prisma.termsVersion.findUniqueOrThrow({ where: { id: s.currentTermsId! } });
    return { revision: s.revision, threshold: s.threshold, unitPriceCents: s.unitPriceCents, currency: 'eur' as const, maintenance: s.maintenance, closedMessage: s.closedMessage,
      maxQuantity: s.maxQuantity, maxPerCustomer: s.maxPerCustomer, sizes: s.sizes as Array<{ size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'; enabled: boolean; stock: number | null }>,
      refundMonths: s.refundMonths, warningDays: s.warningDays, adminRecipients: ['admin@example.com'], emailTemplates: s.emailTemplates as never, deliveryText: s.deliveryText, termsText: terms.text, ...extra };
  };
  const paid = async (extra = {}) => {
    const order = await reserveOrder(await input(extra));
    const event = { id: 'evt_' + randomUUID(), type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), livemode: false,
      data: { object: { id: 'cs_' + order.id, mode: 'payment', payment_status: 'paid', amount_total: order.amountCents, currency: order.currency, livemode: false, payment_intent: 'pi_' + order.id, metadata: { orderId: order.id } } } } as unknown as Stripe.Event;
    await processStripeEvent(event, stripe);
    return { order: await prisma.order.findUniqueOrThrow({ where: { id: order.id } }), event };
  };
  async function reset() {
    // This schema was created uniquely by test-integration.ts, never the application schema.
    await prisma.refundOperation.deleteMany(); await prisma.order.deleteMany(); await prisma.settings.deleteMany(); await prisma.termsVersion.deleteMany();
    await prisma.emailOutbox.deleteMany(); await prisma.stripeWebhookEvent.deleteMany(); await prisma.auditLog.deleteMany();
    calls = 0; refundList = []; refundMode = 'pending'; await settings();
  }
  await reset();
  await t.test('1 paid quantity excludes pending, failed and fully refunded', async () => {
    await reserveOrder(await input({ quantity: 3 })); const { order } = await paid({ quantity: 2 }); assert.equal(await paidPieces(), 2);
    await prisma.order.update({ where: { id: order.id }, data: { refundStatus: 'REFUNDED' } }); assert.equal(await paidPieces(), 0);
  });
  await reset();
  await t.test('2 threshold reached does not close sale; 3 orders over threshold', async () => {
    for (let i = 0; i < 4; i++) await paid({ quantity: 5 });
    assert.equal(await paidPieces(), 20); const s = await settings(); assert.equal(s.presaleOpen, true); assert.equal(s.productionStatus, 'SOGLIA_RAGGIUNTA');
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: { startsWith: 'threshold:' } } }), 1);
  });
  await reset();
  await t.test('4 admin threshold and 5 price snapshots', async () => {
    const { order } = await paid(); const c = await config({ threshold: 1, unitPriceCents: 3000 }); c.termsText = initialTerms(1, 2, c.deliveryText);
    await saveSettings(c, 'test-admin'); assert.equal((await settings()).threshold, 1);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).amountCents, 2500);
    assert.equal((await reserveOrder(await input())).amountCents, 3000); assert.equal((await settings()).presaleOpen, true);
  });
  await reset();
  await t.test('6 concurrent checkout stock reservation and repeat idempotency', async () => {
    const c = await config(); c.sizes = c.sizes.map(s => ({ ...s, stock: s.size === 'M' ? 1 : null })); await saveSettings(c, 'test-admin');
    const results = await Promise.allSettled([reserveOrder(await input()), reserveOrder(await input())]); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const one = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof reserveOrder>>>;
    assert.equal(await prisma.order.count(), 1); assert.ok(one.value.checkoutKey);
    const same = await input({ checkoutKey: one.value.checkoutKey }); assert.equal((await reserveOrder(same)).id, one.value.id);
    assert.equal((await createCheckout(same, stripe)).checkoutUrl, 'https://checkout.stripe.com/test');
  });
  await reset();
  await t.test('7 duplicate webhooks, concurrent delivery and one email', async () => {
    const { event, order } = await paid(); await Promise.all([processStripeEvent(event, stripe), processStripeEvent(event, stripe)]);
    assert.equal(await paidPieces(), 1); assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: 'order-confirmation:' + order.id } }), 1);
  });
  await reset();
  await t.test('8 out-of-order expired then async success then failure stays paid', async () => {
    const order = await reserveOrder(await input());
    const base = { livemode: false, created: Math.floor(Date.now() / 1000), data: { object: { id: 'cs_' + order.id, mode: 'payment', payment_status: 'paid', amount_total: 2500, currency: 'eur', payment_intent: 'pi_' + order.id, metadata: { orderId: order.id } } } };
    await processStripeEvent({ ...base, id: 'evt_expire', type: 'checkout.session.expired' } as unknown as Stripe.Event, stripe);
    await processStripeEvent({ ...base, id: 'evt_paid', type: 'checkout.session.async_payment_succeeded' } as unknown as Stripe.Event, stripe);
    await processStripeEvent({ ...base, id: 'evt_fail', type: 'checkout.session.async_payment_failed' } as unknown as Stripe.Event, stripe);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, 'PAID');
  });
  await reset();
  await t.test('9 invalid Stripe signature rejected by actual route', async () => {
    const { POST } = await import('../app/api/stripe/webhook/route');
    const errorsBefore = await prisma.applicationError.count();
    const response = await POST(new Request('http://localhost/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 'invalid' }, body: '{}' })); assert.equal(response.status, 400);
    assert.equal(await prisma.applicationError.count(), errorsBefore);
  });
  await t.test('10 closed presale and 11 maintenance reject checkout', async () => {
    await prisma.settings.update({ where: { id: 'global' }, data: { presaleOpen: false } }); await assert.rejects(reserveOrder(await input()), /CHIUSA/);
    await prisma.settings.update({ where: { id: 'global' }, data: { presaleOpen: true, maintenance: true } }); await assert.rejects(reserveOrder(await input()), /manutenzione/);
  });
  await reset();
  await t.test('13 expiry warning queued atomically once and dry-run has no refund effects', async () => {
    const { order } = await paid(); await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() + 2 * 86400000) } });
    assert.equal((await expiryPreview()).warnings.length, 1); assert.equal(calls, 0);
    await runExpiry('test-admin', stripe); await runExpiry('test-admin', stripe);
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: { startsWith: 'expiry-warning:' } } }), 1);
  });
  await reset();
  await t.test('14 no automatic refund after production; monotonic timestamp', async () => {
    const c = await config({ threshold: 1 }); c.termsText = initialTerms(1, 2, c.deliveryText); await saveSettings(c, 'test-admin');
    const { order } = await paid(); await changeProduction('PRODUZIONE_AVVIATA', 'test-admin');
    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } }); await assert.rejects(requestRefund(order.id, true, 'cron', stripe), /non idoneo/);
    await assert.rejects(changeProduction('IN_RACCOLTA', 'test-admin')); assert.ok((await settings()).productionStartedAt); assert.equal(calls, 0);
    await paid(); assert.equal((await settings()).productionStatus, 'PRODUZIONE_AVVIATA');
  });
  await reset();
  await t.test('15 refund pending then succeeded, idempotent concurrent retries', async () => {
    const { order } = await paid(); await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } });
    await Promise.all([requestRefund(order.id, true, 'cron', stripe), requestRefund(order.id, true, 'cron', stripe)]);
    assert.equal(calls, 1); assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'PENDING');
    refundList[0].status = 'succeeded'; await requestRefund(order.id, true, 'cron', stripe);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'REFUNDED'); assert.equal(await paidPieces(), 0);
  });
  await reset();
  await t.test('16 timeout retains pending and retries safely; blocks production while ambiguous', async () => {
    const c = await config({ threshold: 1 }); c.termsText = initialTerms(1, 2, c.deliveryText); await saveSettings(c, 'test-admin');
    const { order } = await paid(); await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } }); refundMode = 'timeout';
    await assert.rejects(requestRefund(order.id, true, 'cron', stripe)); assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'PENDING');
    await assert.rejects(changeProduction('PRODUZIONE_AVVIATA', 'test-admin'), /Riconcilia/);
    refundMode = 'succeeded'; await requestRefund(order.id, true, 'cron', stripe); assert.equal(await paidPieces(), 0);
  });
  await reset();
  await t.test('17 manual refund does not require expiry', async () => {
    const { order } = await paid(); refundMode = 'succeeded'; assert.equal((await requestRefund(order.id, false, 'test-admin', stripe)).status, 'REFUNDED');
  });
  await t.test('19 unauthorized admin handler and CSRF checks', async () => {
    const { GET } = await import('../app/api/admin/settings/route'); const { requireAdmin } = await import('../lib/http');
    assert.equal((await GET(new Request('http://localhost/api/admin/settings'), undefined)).status, 401);
    const token = await createAdminSession(); assert.equal(await isAdminSession(token), true);
    await assert.rejects(requireAdmin(new Request('http://localhost/api/admin/settings', { method: 'POST', headers: { cookie: 'rush_admin_session=' + token, origin: 'https://evil.example' } })), /Origine/);
  });
  await reset();
  await t.test('21 quantity/customer limit and 22 validation size/email/checkbox', async () => {
    const { orderInput } = await import('../lib/operational-schema');
    for (const extra of [{ terms: false }, { quantity: 0 }, { email: 'invalid' }, { size: 'XXXL' }]) assert.equal(orderInput.safeParse(await input(extra)).success, false);
    await assert.rejects(reserveOrder(await input({ quantity: 6 })), /massima/);
    await saveSettings(await config({ maxPerCustomer: 5 }), 'test-admin'); await reserveOrder(await input({ quantity: 5 })); await assert.rejects(reserveOrder(await input()), /cliente/);
  });
  await reset();
  await t.test('24 email lease concurrent workers sends once', async () => {
    await paid(); let sends = 0; const sender = async () => { sends++; return 'provider-test'; };
    await Promise.all([deliverPendingEmails(25, sender), deliverPendingEmails(25, sender)]); assert.equal(sends, 1);
  });
  await reset();
  await t.test('25 changed terms/duration affect only new orders and stale acceptance rejected', async () => {
    const oldInput = await input(); const { order } = await paid(); const c = await config({ refundMonths: 3 }); c.termsText = initialTerms(c.threshold, 3, c.deliveryText); await saveSettings(c, 'test-admin');
    const previous = await prisma.order.findUniqueOrThrow({ where: { id: order.id } }); assert.equal(previous.refundMonths, 2); assert.equal(previous.expiresAt?.toISOString(), order.expiresAt?.toISOString()); assert.equal(previous.termsSnapshot, order.termsSnapshot);
    await assert.rejects(reserveOrder(oldInput), /cambiati/); assert.equal((await reserveOrder(await input())).refundMonths, 3);
  });
  await reset();
  await t.test('two distinct simultaneous checkout sessions persist independent orders', async () => {
    const [a, b] = await Promise.all([input(), input()]);
    const result = await Promise.all([createCheckout(a, stripe), createCheckout(b, stripe)]);
    assert.equal(result.length, 2); assert.equal(await prisma.order.count(), 2);
    assert.equal(await prisma.order.count({ where: { paymentStatus: 'PENDING', stripeSessionId: { not: null }, amountCents: 2500 } }), 2);
    assert.equal(await paidPieces(), 0);
  });
  await reset();
  await t.test('unpaid completed session never confirms; mismatched amount rolls back event', async () => {
    const { order, event } = await paid();
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING' } }); await prisma.emailOutbox.deleteMany();
    const unpaid = structuredClone(event); unpaid.id = 'evt_unpaid'; (unpaid.data.object as Stripe.Checkout.Session).payment_status = 'unpaid';
    await processStripeEvent(unpaid, stripe); assert.equal(await paidPieces(), 0); assert.equal(await prisma.emailOutbox.count(), 0);
    const wrong = structuredClone(event); wrong.id = 'evt_wrong'; (wrong.data.object as Stripe.Checkout.Session).amount_total = 1;
    await assert.rejects(processStripeEvent(wrong, stripe), /incoerente/); assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: wrong.id } }), 0);
  });
  await reset();
  await t.test('partial external refund does not remove whole quantity; stale events cannot undo full refund', async () => {
    const { order } = await paid();
    refundList = [{ id: 're_partial', amount: 1000, status: 'succeeded', payment_intent: order.stripePaymentIntentId, currency: 'eur' } as Stripe.Refund];
    const event = { id: 'evt_partial', type: 'charge.refunded', livemode: false, data: { object: { payment_intent: order.stripePaymentIntentId } } } as unknown as Stripe.Event;
    await processStripeEvent(event, stripe); assert.equal(await paidPieces(), 1);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmountCents, 1000);
    refundList.push({ id: 're_rest', amount: 1500, status: 'succeeded', payment_intent: order.stripePaymentIntentId, currency: 'eur' } as Stripe.Refund);
    await processStripeEvent({ ...event, id: 'evt_full' }, stripe); assert.equal(await paidPieces(), 0);
    refundList = []; await processStripeEvent({ ...event, id: 'evt_old' }, stripe);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'REFUNDED');
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: `refund:${order.id}:customer` } }), 1);
  });
  await reset();
  await t.test('terminal failed refund can be manually retried with a new persisted key and history', async () => {
    const { order } = await paid(); refundMode = 'failed';
    assert.equal((await requestRefund(order.id, false, 'test-admin', stripe)).status, 'FAILED');
    const before = await prisma.refundOperation.findUniqueOrThrow({ where: { orderId: order.id } }); refundMode = 'succeeded';
    assert.equal((await requestRefund(order.id, false, 'test-admin', stripe)).status, 'REFUNDED');
    const after = await prisma.refundOperation.findUniqueOrThrow({ where: { orderId: order.id } });
    assert.notEqual(before.idempotencyKey, after.idempotencyKey); assert.equal(calls, 2);
    assert.equal(await prisma.auditLog.count({ where: { action: 'REFUND_RETRY_CONFIRMED' } }), 1);
  });
  await reset();
  await t.test('production/refund race is serialized; DB rejects timestamp rollback', async () => {
    const c = await config({ threshold: 1 }); c.termsText = initialTerms(1, 2, c.deliveryText); await saveSettings(c, 'test-admin');
    const { order } = await paid(); await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } });
    const results = await Promise.allSettled([changeProduction('PRODUZIONE_AVVIATA', 'test-admin'), requestRefund(order.id, true, 'cron', stripe)]);
    assert.equal(results.filter(r => r.status === 'rejected').length, 1);
    const current = await settings(); assert.ok(!(current.productionStartedAt && calls > 0));
    if (current.productionStartedAt) await assert.rejects(prisma.settings.update({ where: { id: 'global' }, data: { productionStatus: 'IN_RACCOLTA', productionStartedAt: null } }));
  });
  await t.test('each admin handler independently rejects an unsigned request', async () => {
    for (const [path, method] of [
      ['dashboard', 'GET'], ['diagnostics', 'GET'], ['diagnostics', 'POST'], ['expiry', 'GET'], ['expiry', 'POST'], ['export', 'GET'], ['orders', 'GET'], ['settings', 'GET'], ['settings', 'POST'],
      ['presale', 'POST'], ['production', 'POST'], ['orders/[id]/delivery', 'POST'], ['orders/[id]/refund', 'POST'], ['logout', 'POST']
    ]) {
      const module = await import('../app/api/admin/' + path + '/route');
      const response = await module[method](new Request('http://localhost/api/admin/' + path, { method }), { params: Promise.resolve({ id: 'not-an-order' }) });
      assert.equal(response.status, 401, path);
    }
  });
  await reset();
  await t.test('refund below threshold restores collection before production; reaching again preserves notice dedupe', async () => {
    const c = await config({ threshold: 1 }); c.termsText = initialTerms(1, 2, c.deliveryText); await saveSettings(c, 'test-admin');
    const { order } = await paid(); assert.equal((await settings()).productionStatus, 'SOGLIA_RAGGIUNTA');
    refundMode = 'succeeded'; await requestRefund(order.id, false, 'test-admin', stripe); assert.equal((await settings()).productionStatus, 'IN_RACCOLTA');
    await paid(); assert.equal((await settings()).productionStatus, 'SOGLIA_RAGGIUNTA');
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: { startsWith: 'threshold:' } } }), 1);
  });
  await reset();
  await t.test('SEC-02 logout revokes copied tokens, sessions are unique and password rotation invalidates them', async () => {
    const { POST } = await import('../app/api/admin/logout/route');
    const a = await createAdminSession(); const b = await createAdminSession();
    assert.notEqual(a, b);
    const response = await POST(new Request('http://localhost:3000/api/admin/logout', { method: 'POST', headers: { origin: 'http://localhost:3000', cookie: 'rush_admin_session=' + a } }), undefined);
    assert.equal(response.status, 200);
    assert.equal(await isAdminSession(a), false);
    assert.equal(await isAdminSession(b), true);
    const original = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = 'rotated-fixture-hash';
    assert.equal(await isAdminSession(b), false);
    if (original === undefined) delete process.env.ADMIN_PASSWORD_HASH; else process.env.ADMIN_PASSWORD_HASH = original;
  });
  await reset();
  await t.test('SEC-03 mismatched, duplicate and excessive refund results roll back financial state', async () => {
    const { order } = await paid();
    const event = { id: 'evt_refund_validation', type: 'charge.refunded', livemode: false, data: { object: { payment_intent: order.stripePaymentIntentId } } } as unknown as Stripe.Event;
    const valid = { id: 're_validation', amount: 1000, status: 'succeeded', payment_intent: order.stripePaymentIntentId, currency: 'eur' } as Stripe.Refund;
    for (const invalid of [[{ ...valid, payment_intent: 'pi_unrelated' }], [{ ...valid, currency: 'usd' }], [valid, valid], [{ ...valid, amount: 3000 }], [valid, { ...valid, id: 're_second', amount: 2000 }]]) {
      refundList = invalid;
      await assert.rejects(processStripeEvent(event, stripe), /incoerente/);
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmountCents, 0);
      assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: event.id } }), 0);
    }
  });
  await reset();
  await t.test('SEC-03 refund-before-payment is retriable and metadata cannot rebind an unrelated payment', async () => {
    const order = await reserveOrder(await input());
    const pi = 'pi_early_' + order.id;
    const event = { id: 'evt_early_refund', type: 'refund.created', livemode: false, data: { object: { payment_intent: pi } } } as unknown as Stripe.Event;
    const service = { ...stripe, paymentIntents: { retrieve: async () => ({ metadata: { orderId: order.id } }) } } as unknown as Stripe;
    refundList = [{ id: 're_early', amount: 2500, status: 'succeeded', payment_intent: pi, currency: 'eur' } as Stripe.Refund];
    await assert.rejects(processStripeEvent(event, service), /non ancora associato/);
    assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: event.id } }), 0);
    const payment = { id: 'evt_early_payment', created: Math.floor(Date.now() / 1000), type: 'checkout.session.completed', livemode: false,
      data: { object: { id: 'cs_early', mode: 'payment', payment_status: 'paid', amount_total: 2500, currency: 'eur', payment_intent: pi, metadata: { orderId: order.id } } } } as unknown as Stripe.Event;
    await processStripeEvent(payment, service); await processStripeEvent(event, service);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'REFUNDED');
    await assert.rejects(processStripeEvent({ ...event, id: 'evt_unrelated', data: { object: { payment_intent: 'pi_unrelated' } } } as unknown as Stripe.Event, service), /incoerente/);
  });
  await t.test('SEC-06 rate limit increments atomically and rejects attempts beyond the budget', async () => {
    const { databaseRateLimit } = await import('../lib/db-ratelimit');
    const results = await Promise.all(Array.from({ length: 12 }, () => databaseRateLimit('synthetic-client', 'security-' + process.pid, 5, 60000)));
    assert.equal(results.filter(Boolean).length, 5);
  });
  await reset();
  await t.test('two distinct paid events concurrently confirm exactly two orders and emails', async () => {
    const results = await Promise.all([paid({ email: 'first@example.com' }), paid({ email: 'second@example.com' })]);
    assert.notEqual(results[0].order.id, results[1].order.id);
    assert.equal(await paidPieces(), 2);
    assert.equal(await prisma.order.count({ where: { paymentStatus: 'PAID' } }), 2);
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: { startsWith: 'order-confirmation:' } } }), 2);
  });
  await reset();
  await t.test('accepted refund followed by network timeout reconciles without a second create', async () => {
    const { order } = await paid();
    refundMode = 'accepted-timeout';
    await assert.rejects(requestRefund(order.id, false, 'test-admin', stripe), /Connection lost/);
    assert.equal(calls, 1);
    refundMode = 'succeeded';
    await requestRefund(order.id, false, 'test-admin', stripe);
    assert.equal(calls, 1);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'REFUNDED');
  });
  await reset();
  await t.test('delivery rejects an order made ineligible by an overlapping refund transaction', async () => {
    const { POST } = await import('../app/api/admin/orders/[id]/delivery/route');
    const { lockSettings } = await import('../lib/db-lock');
    const { order } = await paid();
    const token = await createAdminSession();
    let release!: () => void;
    let acquired!: () => void;
    const locked = new Promise<void>(resolve => { acquired = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const transaction = prisma.$transaction(async tx => {
      await lockSettings(tx); acquired(); await proceed;
      await tx.order.update({ where: { id: order.id }, data: { refundStatus: 'PENDING' } });
    });
    await locked;
    const delivery = POST(new Request('http://localhost:3000/api/admin/orders/' + order.id + '/delivery', {
      method: 'POST', headers: { origin: 'http://localhost:3000', cookie: 'rush_admin_session=' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONSEGNATA' })
    }), { params: Promise.resolve({ id: order.id }) });
    release(); await transaction;
    assert.equal((await delivery).status, 409);
    assert.notEqual((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).deliveryStatus, 'CONSEGNATA');
  });
  await t.test('LIVE processor accepts only coherent events after full production configuration', async () => {
    const { productionFixture } = await import('./fixtures/production-env');
    const order = await reserveOrder(await input());
    const original = { ...process.env };
    const fixture = productionFixture();
    try {
      for (const [key, value] of Object.entries(fixture)) if (value !== undefined) process.env[key] = value;
      const event = { id: 'evt_live_synthetic_' + randomUUID(), type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), livemode: true,
        data: { object: { id: 'cs_live_synthetic_' + order.id, livemode: true, mode: 'payment', payment_status: 'paid', amount_total: order.amountCents, currency: order.currency, payment_intent: 'pi_live_synthetic_' + order.id, metadata: { orderId: order.id } } } } as unknown as Stripe.Event;
      await assert.rejects(processStripeEvent({ ...event, livemode: false }, stripe));
      await assert.rejects(processStripeEvent({ ...event, data: { object: { ...event.data.object, livemode: false } } } as Stripe.Event, stripe));
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, 'PENDING');
      assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: event.id } }), 0);
      await processStripeEvent(event, stripe);
      await processStripeEvent(event, stripe);
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, 'PAID');
      assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: event.id } }), 1);
    } finally {
      for (const key of Object.keys(fixture)) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
    }
  });
  await reset();
  await t.test('SPEC-08 expired order is refunded by the scheduled workflow and both parties are notified once', async () => {
    const { order } = await paid();
    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    refundMode = 'succeeded';
    const result = await runExpiry('cron:acceptance', stripe);
    assert.equal(result.confirmedRefunds, 1); assert.equal(calls, 1);
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(updated.refundStatus, 'REFUNDED'); assert.equal(updated.orderStatus, 'REFUNDED');
    assert.equal(updated.refundedAmountCents, order.amountCents); assert.equal(await paidPieces(), 0);
    const notices = await prisma.emailOutbox.findMany({ where: { dedupeKey: { startsWith: 'refund:' + order.id } } });
    assert.deepEqual(notices.map(n => n.to).sort(), ['admin@example.com', 'buyer@example.com']);
    await runExpiry('cron:acceptance', stripe); assert.equal(calls, 1);
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: { startsWith: 'refund:' + order.id } } }), 2);
  });
  await reset();
  await t.test('SPEC-08 an order cannot be refunded automatically before its individual deadline', async () => {
    const { order } = await paid();
    await assert.rejects(requestRefund(order.id, true, 'cron:acceptance', stripe), /non idoneo/);
    assert.equal(calls, 0); assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundStatus, 'NONE');
  });
  await reset();
  await t.test('SPEC-05 closing cancels open checkout and preserves the order record', async () => {
    const data = await input(); await createCheckout(data, stripe);
    const { setPresaleOpen } = await import('../lib/presale');
    const result = await setPresaleOpen(false, 'test-admin', stripe);
    assert.equal(result.errors, 0); assert.equal((await settings()).presaleOpen, false);
    assert.equal(await prisma.order.count(), 1); assert.equal((await prisma.order.findFirstOrThrow()).paymentStatus, 'FAILED');
    await assert.rejects(reserveOrder(await input()), /CHIUSA/);
  });
  await reset();
  await t.test('excluded historical batches are absent from paid counters and administrative lists', async () => {
    const { order } = await paid(); await prisma.order.update({ where: { id: order.id }, data: { excludedBatchId: 'historical-batch' } });
    assert.equal(await paidPieces(), 0);
    const { orderQuery } = await import('../lib/order-query');
    assert.equal(await prisma.order.count({ where: orderQuery(new Request('http://localhost/api/admin/orders')).where }), 0);
    assert.equal(await prisma.order.count(), 1);
  });
  await reset();
  await t.test('real bcrypt admin login rejects wrong credentials and persists revocable session', async () => {
    const bcrypt = await import('bcryptjs');
    const { POST } = await import('../app/api/admin/login/route');
    const previousHash = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('synthetic-local-password', 12);
    const request = (password: string) => new Request('http://localhost:3000/api/admin/login', {
      method: 'POST', headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, turnstileToken: 'local-test' })
    });
    try {
      assert.equal((await POST(request('wrong'))).status, 401);
      const response = await POST(request('synthetic-local-password'));
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie') ?? '';
      assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=strict/i);
      const token = cookie.split(';')[0].split('=')[1];
      assert.equal(await isAdminSession(token), true);
      for (let i = 0; i < 8; i++) assert.equal((await POST(request('wrong'))).status, 401);
      assert.equal((await POST(request('synthetic-local-password'))).status, 429);
    } finally {
      if (previousHash === undefined) delete process.env.ADMIN_PASSWORD_HASH; else process.env.ADMIN_PASSWORD_HASH = previousHash;
    }
  });
  await prisma.$disconnect();
});
