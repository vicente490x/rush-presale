import assert from 'node:assert/strict';
import test from 'node:test';
import { readFormData } from '../lib/http';
import { clientIp } from '../lib/ratelimit';
import { contentSecurityPolicy } from '../lib/security-headers';
import { orderInput, settingsInput } from '../lib/operational-schema';

test('SEC-05 multipart limits apply to chunked bodies without Content-Length', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(100)); controller.close(); } });
  const request = new Request('http://localhost/api/tryon', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=fixture' }, body: stream, duplex: 'half' } as RequestInit);
  await assert.rejects(readFormData(request, 32), /troppo grande/);
  const form = new FormData(); form.append('consent', 'true'); form.append('photo', new Blob(['synthetic'], { type: 'image/png' }), 'fixture.png');
  const parsed = await readFormData(new Request('http://localhost', { method: 'POST', body: form }), 4096);
  assert.equal(parsed.get('consent'), 'true'); assert.ok(parsed.get('photo') instanceof File);
});

test('SEC-06 direct requests cannot rotate rate-limit identity through spoofed forwarding headers', () => {
  const previous = process.env.VERCEL;
  try {
    delete process.env.VERCEL;
    for (const ip of ['192.0.2.1', '192.0.2.2']) assert.equal(clientIp(new Request('http://localhost', { headers: { 'x-real-ip': ip, 'x-forwarded-for': ip } })), 'unknown');
    process.env.VERCEL = '1';
    assert.equal(clientIp(new Request('https://rush.invalid', { headers: { 'x-real-ip': '192.0.2.99', 'x-forwarded-for': '192.0.2.1' } })), '192.0.2.1');
    assert.equal(clientIp(new Request('https://rush.invalid', { headers: { 'x-forwarded-for': 'invalid' } })), 'unknown');
  } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
});

test('SEC-04 production CSP blocks inline scripts and handler attributes without a request nonce', () => {
  const policy = contentSecurityPolicy('synthetic-nonce');
  const scripts = policy.split('; ').find(value => value.startsWith('script-src '))!;
  assert.ok(scripts.includes("'nonce-synthetic-nonce'"));
  assert.ok(!scripts.includes("'unsafe-inline'"));
  assert.ok(!scripts.includes("'unsafe-eval'"));
  assert.ok(policy.includes("script-src-attr 'none'"));
});

test('financial schemas reject amount/status mass assignment and malformed quantities', () => {
  const input = { firstName: 'Synthetic', lastName: 'Buyer', email: 'qa@example.com', size: 'M', quantity: 1,
    terms: true, termsVersionId: 'fixture', settingsRevision: 1, checkoutKey: '86cbe4be-e0db-4a61-9468-fd746831e87b', turnstileToken: 'fixture' };
  assert.equal(orderInput.safeParse(input).success, true);
  for (const changed of [{ amountCents: 1 }, { paymentStatus: 'PAID' }, { quantity: -1 }, { quantity: 1.5 }, { quantity: 101 }, { terms: false }]) assert.equal(orderInput.safeParse({ ...input, ...changed }).success, false);
  assert.equal(settingsInput.safeParse({ productionStartedAt: null, presaleOpen: true }).success, false);
});
