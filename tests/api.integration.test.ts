import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { after, test } from 'node:test';
import sharp from 'sharp';
import { DeliveryStatus, OrderStatus, PaymentStatus, ProductionStatus, RefundStatus } from '@prisma/client';
import { POST as createOrder } from '../app/api/orders/route';
import { POST as completeMockCheckout } from '../app/api/mock-checkout/complete/route';
import { POST as stripeWebhook } from '../app/api/stripe/webhook/route';
import { GET as dailyCron } from '../app/api/cron/daily/route';
import { POST as login } from '../app/api/admin/login/route';
import { POST as updateThreshold } from '../app/api/admin/settings/threshold/route';
import { POST as tryOn } from '../app/api/tryon/route';
import { GET as exportOrders } from '../app/api/admin/export/route';
import { createAdminSession, isAdminSession } from '../lib/admin-auth';
import { prisma } from '../lib/prisma';
import { resetMemoryRateLimits } from '../lib/ratelimit';
import { setTestClock } from '../lib/clock';
import { resetMockStripeState, stripeClient } from '../lib/stripe';

const fixedNow = new Date('2024-12-31T12:00:00.000Z');
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'preview-password-123!';

after(async () => {
  setTestClock(undefined);
  await prisma.$disconnect();
});

async function clearState() {
  await prisma.temporaryTryOnAsset.deleteMany();
  await prisma.tryOnJob.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.stripeWebhookEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.settings.upsert({
    where: { id: 'global' },
    create: { id: 'global', threshold: 15, presaleOpen: true, tryOnEnabled: false },
    update: {
      threshold: 15,
      presaleOpen: true,
      productionStatus: ProductionStatus.IN_RACCOLTA,
      thresholdNotifiedAt: null,
      tryOnEnabled: false,
      tryOnDailyCount: 0,
      tryOnDailySpendUsd: 0
    }
  });
  resetMemoryRateLimits();
  resetMockStripeState();
  setTestClock(fixedNow);
  delete process.env.MOCK_TRYON_FAIL;
}

const orderInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  size: 'M',
  quantity: 1,
  terms: true,
  turnstileToken: 'test-pass'
};

async function beginCheckout(overrides: Record<string, unknown> = {}) {
  const response = await createOrder(new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...orderInput, ...overrides })
  }));
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  const checkoutUrl = new URL(body.checkoutUrl);
  return {
    sessionId: checkoutUrl.searchParams.get('session')!,
    code: checkoutUrl.searchParams.get('code')!
  };
}

async function finishCheckout(sessionId: string) {
  const response = await completeMockCheckout(new Request('http://localhost/api/mock-checkout/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId })
  }));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body as { pieces: number };
}

function signedWebhook(payloadObject: object) {
  const payload = JSON.stringify(payloadObject);
  const signature = stripeClient().webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!
  });
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body: payload
  });
}

async function addPaidOrder(overrides: {
  quantity?: number;
  expiresAt?: Date;
  refundStatus?: RefundStatus;
} = {}) {
  const suffix = randomUUID();
  return prisma.order.create({
    data: {
      orderNumber: `TEST-${suffix}`,
      firstName: 'Test',
      lastName: 'Customer',
      email: `test-${suffix}@example.com`,
      size: 'M',
      quantity: overrides.quantity ?? 1,
      amountCents: (overrides.quantity ?? 1) * 2500,
      stripePaymentIntentId: `pi_test_${suffix.replace(/-/g, '')}`,
      paymentStatus: PaymentStatus.PAID,
      paidAt: fixedNow,
      expiresAt: overrides.expiresAt ?? new Date(fixedNow.getTime() + 60_000),
      orderStatus: overrides.refundStatus === RefundStatus.REFUNDED ? OrderStatus.REFUNDED : OrderStatus.CONFIRMED,
      refundStatus: overrides.refundStatus ?? RefundStatus.NONE,
      deliveryStatus: DeliveryStatus.DA_CONSEGNARE,
      termsAcceptedAt: fixedNow
    }
  });
}

async function tryOnRequest(file?: File) {
  const form = new FormData();
  if (file) form.set('photo', file);
  form.set('consent', 'true');
  form.set('adult', 'true');
  form.set('turnstileToken', 'test-pass');
  return tryOn(new Request('http://localhost/api/tryon', { method: 'POST', body: form }));
}

test('local-only API integration: checkout, webhooks, cron, admin auth and try-on', async (t) => {
  await t.test('terms checkbox is enforced server-side and closed presale refuses checkout', async () => {
    await clearState();
    const missingTerms = await createOrder(new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...orderInput, terms: false })
    }));
    assert.equal(missingTerms.status, 400);
    await prisma.settings.update({ where: { id: 'global' }, data: { presaleOpen: false } });
    const closed = await createOrder(new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(orderInput)
    }));
    assert.equal(closed.status, 403);
    assert.equal((await closed.json()).error, 'PRE-SALE CHIUSA');
  });

  await t.test('admin can configure threshold before payments but cannot change it afterward', async () => {
    await clearState();
    const update = (threshold: number) => updateThreshold(new Request('http://localhost/api/admin/settings/threshold', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threshold })
    }));
    const configured = await update(12);
    assert.equal(configured.status, 200);
    assert.equal((await configured.json()).threshold, 12);
    assert.equal((await prisma.settings.findUniqueOrThrow({ where: { id: 'global' } })).threshold, 12);
    assert.equal((await update(0)).status, 400);
    await addPaidOrder();
    assert.equal((await update(20)).status, 409);
    assert.equal((await prisma.settings.findUniqueOrThrow({ where: { id: 'global' } })).threshold, 12);
  });

  await t.test('CSV and Excel exports include production state and size summary', async () => {
    await clearState();
    await addPaidOrder({ quantity: 2 });
    await prisma.settings.update({ where: { id: 'global' }, data: { productionStatus: ProductionStatus.PRODUZIONE_AVVIATA } });
    const csvResponse = await exportOrders(new Request('http://localhost/api/admin/export'));
    const csv = await csvResponse.text();
    assert.equal(csvResponse.status, 200);
    assert.match(csv, /"Ordine".*"Produzione"/);
    assert.match(csv, /PRODUZIONE_AVVIATA/);
    assert.match(csv, /RIEPILOGO TAGLIE PRODUTTORE/);
    assert.match(csv, /"M";"2"/);

    const excelResponse = await exportOrders(new Request('http://localhost/api/admin/export?format=xls'));
    const excel = await excelResponse.text();
    assert.equal(excelResponse.status, 200);
    assert.match(excel, /Produzione/);
    assert.match(excel, /PRODUZIONE_AVVIATA/);
    assert.match(excel, /Riepilogo taglie/);
  });

  await t.test('paid count changes only after signed local webhook; calendar expiry is correct', async () => {
    await clearState();
    const checkout = await beginCheckout();
    assert.equal(await prisma.order.count({ where: { paymentStatus: 'PAID' } }), 0);
    const completion = await finishCheckout(checkout.sessionId);
    assert.equal(completion.pieces, 1);
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: checkout.code } });
    assert.equal(order.paymentStatus, PaymentStatus.PAID);
    assert.equal(order.paidAt?.toISOString(), fixedNow.toISOString());
    assert.equal(order.expiresAt?.toISOString(), '2025-02-28T12:00:00.000Z');
  });

  await t.test('threshold notification is once-only while orders remain open at 15, 16 and 17 of 15', async () => {
    await clearState();
    await addPaidOrder({ quantity: 14 });
    for (const expected of [15, 16, 17]) {
      const checkout = await beginCheckout();
      const response = await finishCheckout(checkout.sessionId);
      assert.equal(response.pieces, expected);
      assert.equal((await prisma.settings.findUniqueOrThrow({ where: { id: 'global' } })).presaleOpen, true);
    }
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: 'threshold-reached' } }), 1);
    assert.equal((await prisma.settings.findUniqueOrThrow({ where: { id: 'global' } })).productionStatus, ProductionStatus.SOGLIA_RAGGIUNTA);
  });

  await t.test('invalid webhook signature rejected and duplicate valid event is idempotent', async () => {
    await clearState();
    const invalid = await stripeWebhook(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=invalid' },
      body: '{}'
    }));
    assert.equal(invalid.status, 400);

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${randomUUID()}`,
        firstName: 'Webhook', lastName: 'Test', email: 'webhook@example.com',
        size: 'S', quantity: 1, amountCents: 2500, paymentStatus: PaymentStatus.PENDING,
        termsAcceptedAt: fixedNow
      }
    });
    const event = {
      id: 'evt_test_duplicate',
      object: 'event',
      api_version: '2025-06-30.basil',
      created: Math.floor(fixedNow.getTime() / 1000),
      data: { object: {
        id: 'cs_test_duplicate',
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        metadata: { orderId: order.id },
        payment_intent: 'pi_test_duplicate'
      } },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'checkout.session.completed'
    };
    for (let index = 0; index < 2; index++) {
      const response = await stripeWebhook(signedWebhook(event));
      assert.equal(response.status, 200);
    }
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, PaymentStatus.PAID);
    assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: event.id } }), 1);
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: `order-confirmation:${order.id}` } }), 1);
  });

  await t.test('concurrent duplicate paid webhooks both acknowledge exactly one event', async () => {
    await clearState();
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${randomUUID()}`,
        firstName: 'Concurrent', lastName: 'Webhook', email: 'concurrent@example.com',
        size: 'L', quantity: 1, amountCents: 2500, paymentStatus: PaymentStatus.PENDING,
        termsAcceptedAt: fixedNow
      }
    });
    const event = {
      id: 'evt_test_concurrent_duplicate',
      object: 'event',
      api_version: '2025-06-30.basil',
      created: Math.floor(fixedNow.getTime() / 1000),
      data: { object: {
        id: 'cs_test_concurrent_duplicate',
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        metadata: { orderId: order.id },
        payment_intent: 'pi_test_concurrent_duplicate'
      } },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'checkout.session.completed'
    };
    const responses = await Promise.all([
      stripeWebhook(signedWebhook(event)),
      stripeWebhook(signedWebhook(event))
    ]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, PaymentStatus.PAID);
    assert.equal(await prisma.stripeWebhookEvent.count({ where: { id: event.id } }), 1);
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: `order-confirmation:${order.id}` } }), 1);
  });

  await t.test('failed-payment and expired-checkout webhook events transition pending orders', async () => {
    await clearState();
    const failedPayment = await prisma.order.create({
      data: {
        orderNumber: `TEST-${randomUUID()}`,
        firstName: 'Failed', lastName: 'Payment', email: 'failed@example.com',
        size: 'S', quantity: 1, amountCents: 2500, paymentStatus: PaymentStatus.PENDING,
        termsAcceptedAt: fixedNow
      }
    });
    const expiredCheckout = await prisma.order.create({
      data: {
        orderNumber: `TEST-${randomUUID()}`,
        firstName: 'Expired', lastName: 'Checkout', email: 'expired@example.com',
        size: 'M', quantity: 1, amountCents: 2500, paymentStatus: PaymentStatus.PENDING,
        termsAcceptedAt: fixedNow
      }
    });
    const events = [
      {
        id: 'evt_test_payment_failed', type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_failed', object: 'payment_intent', metadata: { orderId: failedPayment.id } } }
      },
      {
        id: 'evt_test_checkout_expired', type: 'checkout.session.expired',
        data: { object: { id: 'cs_test_expired', object: 'checkout.session', metadata: { orderId: expiredCheckout.id } } }
      }
    ];
    for (const [index, item] of events.entries()) {
      const response = await stripeWebhook(signedWebhook({
        object: 'event', api_version: '2025-06-30.basil',
        created: Math.floor(fixedNow.getTime() / 1000), livemode: false,
        pending_webhooks: 1, request: null, ...item
      }));
      assert.equal(response.status, 200, JSON.stringify(await response.json()));
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: index === 0 ? failedPayment.id : expiredCheckout.id } })).paymentStatus, PaymentStatus.FAILED);
    }
    const recovered = await stripeWebhook(signedWebhook({
      id: 'evt_test_payment_recovered',
      object: 'event',
      api_version: '2025-06-30.basil',
      created: Math.floor(fixedNow.getTime() / 1000),
      data: { object: {
        id: 'cs_test_recovered',
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        metadata: { orderId: failedPayment.id },
        payment_intent: 'pi_test_recovered'
      } },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'checkout.session.completed'
    }));
    assert.equal(recovered.status, 200);
    const recoveredOrder = await prisma.order.findUniqueOrThrow({ where: { id: failedPayment.id } });
    assert.equal(recoveredOrder.paymentStatus, PaymentStatus.PAID);
    assert.equal(recoveredOrder.expiresAt?.toISOString(), '2025-02-28T12:00:00.000Z');
  });

  await t.test('cron sends one warning, refunds expired orders once and skips started production', async () => {
    await clearState();
    const warning = await addPaidOrder({ expiresAt: new Date(fixedNow.getTime() + 5 * 86_400_000) });
    const due = await addPaidOrder({ expiresAt: new Date(fixedNow.getTime() - 1) });
    await prisma.settings.update({ where: { id: 'global' }, data: { productionStatus: ProductionStatus.IN_RACCOLTA } });
    const cron = () => dailyCron(new Request('http://localhost/api/cron/daily', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
    }));
    const [first, concurrent] = await Promise.all([cron(), cron()]);
    assert.equal(first.status, 200);
    assert.equal(concurrent.status, 200);
    const stats = await first.json();
    const concurrentStats = await concurrent.json();
    assert.equal(stats.warnings + concurrentStats.warnings, 1);
    assert.equal(stats.refunds + concurrentStats.refunds, 1);
    assert.ok((await prisma.order.findUniqueOrThrow({ where: { id: warning.id } })).expiryWarningSentAt);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: due.id } })).refundStatus, RefundStatus.REFUNDED);

    await prisma.settings.update({ where: { id: 'global' }, data: { productionStatus: ProductionStatus.PRODUZIONE_AVVIATA } });
    const productionOrder = await addPaidOrder({ expiresAt: new Date(fixedNow.getTime() - 1) });
    const second = await cron();
    assert.equal(second.status, 200);
    const secondStats = await second.json();
    assert.equal(secondStats.warnings, 0);
    assert.equal(secondStats.refunds, 0);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: productionOrder.id } })).refundStatus, RefundStatus.NONE);
    assert.equal(await prisma.emailOutbox.count({ where: { dedupeKey: `expiry-warning:${warning.id}` } }), 1);
  });

  await t.test('admin credentials authenticate and sessions are verifiable', async () => {
    await clearState();
    await prisma.adminUser.create({
      data: {
        email: process.env.ADMIN_EMAIL!,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12)
      }
    });
    const response = await login(new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin@example.com', password: 'wrong', turnstileToken: 'local-development' })
    }));
    assert.equal(response.status, 401);
    const success = await login(new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin@example.com', password: 'preview-password-123!', turnstileToken: 'local-development' })
    }));
    assert.equal(success.status, 200);
    const cookie = success.headers.get('set-cookie');
    assert.ok(cookie?.includes('HttpOnly'));
    assert.ok(cookie?.includes('SameSite=strict'));
    const token = cookie?.match(/rush_admin_session=([^;]+)/)?.[1];
    assert.equal(await isAdminSession(token), true);
    assert.equal(await isAdminSession(undefined), false);
    const session = await createAdminSession();
    assert.equal(await isAdminSession(session), true);
  });

  await t.test('try-on kill switch, fake provider success/failure, size/type checks, and rate limit', async () => {
    await clearState();
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer();
    const validPhoto = () => new File([new Uint8Array(png)], 'photo.png', { type: 'image/png' });

    const disabled = await tryOnRequest(validPhoto());
    assert.equal(disabled.status, 503);
    await prisma.settings.update({ where: { id: 'global' }, data: { tryOnEnabled: true } });
    const success = await tryOnRequest(validPhoto());
    assert.equal(success.status, 200);
    const image = await success.json();
    assert.match(image.imageDataUrl, /^data:image\/webp;base64,/);
    assert.equal(Number((await prisma.tryOnJob.findFirstOrThrow()).costEstimate), 0);

    process.env.MOCK_TRYON_FAIL = '1';
    const failed = await tryOnRequest(validPhoto());
    assert.equal(failed.status, 502);
    delete process.env.MOCK_TRYON_FAIL;

    const wrongMime = await tryOnRequest(new File([new Uint8Array(png)], 'photo.jpg', { type: 'image/jpeg' }));
    assert.equal(wrongMime.status, 400);
    const tooLarge = await tryOnRequest(new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }));
    assert.equal(tooLarge.status, 400);

    resetMemoryRateLimits();
    const requestWithoutConsent = () => tryOn(new Request('http://localhost/api/tryon', { method: 'POST', body: new FormData() }));
    for (let index = 0; index < 5; index++) assert.equal((await requestWithoutConsent()).status, 400);
    assert.equal((await requestWithoutConsent()).status, 429);
  });
});
