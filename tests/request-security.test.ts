import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTurnstile } from '../lib/turnstile';
import { assertSameOrigin, readBytes } from '../lib/http';
import { cronAuthorized } from '../lib/cron-auth';

test('Turnstile verifies server-side success AND the exact canonical hostname', async t => {
  const old = { TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL };
  process.env.TURNSTILE_SECRET_KEY = 'synthetic-server-only-secret';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://rush.test-provider.net';
  try {
    let result: object = { success: true, hostname: 'rush.test-provider.net' }; let ok = true; let calls = 0;
    t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      calls++; assert.equal(init.method, 'POST'); assert.equal(init.cache, 'no-store');
      const form = init.body as URLSearchParams; assert.equal(form.get('response'), 'synthetic-token');
      assert.equal(form.get('secret'), process.env.TURNSTILE_SECRET_KEY);
      return new Response(JSON.stringify(result), { status: ok ? 200 : 503 });
    });
    assert.equal(await verifyTurnstile(undefined), false); assert.equal(calls, 0);
    assert.equal(await verifyTurnstile('synthetic-token'), true);
    for (const hostname of ['rush.test-provider.net.evil', 'evil.test-provider.net', undefined]) {
      result = { success: true, hostname }; assert.equal(await verifyTurnstile('synthetic-token'), false);
    }
    result = { success: false, hostname: 'rush.test-provider.net' }; assert.equal(await verifyTurnstile('synthetic-token'), false);
    ok = false; await assert.rejects(verifyTurnstile('synthetic-token'));
  } finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test('mutations reject absent/foreign origins and cross-site fetches even with a canonical Origin', () => {
  const old = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://rush.test-provider.net';
  try {
    for (const headers of [{}, { origin: 'https://rush.test-provider.net.evil' }, { origin: 'https://rush.test-provider.net', 'sec-fetch-site': 'cross-site' }] as Record<string, string>[]) {
      assert.throws(() => assertSameOrigin(new Request('https://rush.test-provider.net/api/orders', { method: 'POST', headers })), /Origine/);
    }
    assert.doesNotThrow(() => assertSameOrigin(new Request('https://rush.test-provider.net/api/orders', { method: 'POST', headers: { origin: 'https://rush.test-provider.net' } })));
  } finally { if (old === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = old; }
});

test('chunked JSON/webhook bytes are limited even when Content-Length is missing or forged', async () => {
  for (const headers of [{}, { 'content-length': '1' }]) {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(100)); controller.close(); } });
    await assert.rejects(readBytes(new Request('http://localhost', { method: 'POST', body: stream, duplex: 'half', headers } as RequestInit), 50), /troppo grande/);
  }
});

test('cron refuses missing, short and altered secrets before running jobs', () => {
  const old = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET; assert.equal(cronAuthorized(new Request('http://localhost')), false);
    process.env.CRON_SECRET = 'short'; assert.equal(cronAuthorized(new Request('http://localhost', { headers: { authorization: 'Bearer short' } })), false);
    process.env.CRON_SECRET = 'synthetic-cron-secret-' + 'a'.repeat(32);
    for (const authorization of ['', 'Bearer wrong', 'bearer ' + process.env.CRON_SECRET, 'Bearer ' + process.env.CRON_SECRET + 'x']) assert.equal(cronAuthorized(new Request('http://localhost', { headers: { authorization } })), false);
    assert.equal(cronAuthorized(new Request('http://localhost', { headers: { authorization: 'Bearer ' + process.env.CRON_SECRET } })), true);
  } finally { if (old === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = old; }
});
