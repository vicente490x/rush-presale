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
  const { createStagingSession, isStagingSession } = await import('../lib/staging-auth');
  let calls = 0;
  let refundMode: 'pending' | 'succeeded' | 'failed' | 'timeout' = 'pending';
  let refundList: Stripe.Refund[] = [];
  const stripe = {
    refunds: {
      list: async () => ({ data: refundList, has_more: false }),
      create: async (params: Stripe.RefundCreateParams) => {
        calls++;
        if (refundMode === 'timeout') throw new Error('Provider timeout');
        const refund = { id: 're_' + randomUUID(), status: refundMode, amount: params.amount!, metadata: params.metadata } as Stripe.Refund;
        refundList.push(refund); return refund;
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
    const response = await POST(new Request('http://localhost/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 'invalid' }, body: '{}' })); assert.equal(response.status, 400);
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
  await t.test('20 staging session distinct from admin, tampering rejected', async () => {
    const gate = await createStagingSession(); const admin = await createAdminSession();
    assert.equal(await isStagingSession(gate), true); assert.equal(await isAdminSession(gate), false); assert.equal(await isStagingSession(admin), false); assert.equal(await isStagingSession(gate + 'x'), false);
  });
  await reset();
  await t.test('21 quantity/customer limit and 22 validation size/email/checkbox', async () => {
    const { orderInput } = await import('../lib/operational-schema');
    for (const extra of [{ terms: false }, { quantity: 0 }, { email: 'invalid' }, { size: 'XXXL' }]) assert.equal(orderInput.safeParse(await input(extra)).success, false);
    await assert.rejects(reserveOrder(await input({ quantity: 6 })), /massima/);
    await saveSettings(await config({ maxPerCustomer: 5 }), 'test-admin'); await reserveOrder(await input({ quantity: 5 })); await assert.rejects(reserveOrder(await input()), /cliente/);
  });
  await t.test('23 AI endpoint disabled without processing image', async () => {
    const { POST } = await import('../app/api/tryon/route'); assert.equal((await POST(new Request('http://localhost/api/tryon', { method: 'POST' }))).status, 503);
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
    refundList = [{ id: 're_partial', amount: 1000, status: 'succeeded' } as Stripe.Refund];
    const event = { id: 'evt_partial', type: 'charge.refunded', livemode: false, data: { object: { payment_intent: order.stripePaymentIntentId } } } as unknown as Stripe.Event;
    await processStripeEvent(event, stripe); assert.equal(await paidPieces(), 1);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmountCents, 1000);
    refundList.push({ id: 're_rest', amount: 1500, status: 'succeeded' } as Stripe.Refund);
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
      ['dashboard', 'GET'], ['diagnostics', 'GET'], ['expiry', 'GET'], ['export', 'GET'], ['orders', 'GET'],
      ['presale', 'POST'], ['production', 'POST'], ['settings/tryon', 'POST'], ['orders/[id]/delivery', 'POST'], ['orders/[id]/refund', 'POST'], ['logout', 'POST']
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
  await prisma.$disconnect();
});
