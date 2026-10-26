import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTurnstile } from '../lib/turnstile';

test('Turnstile rejects missing and oversized tokens before contacting the provider', async t => {
  const mocked = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not run'); });
  for (const token of [undefined, '', {}, 'x'.repeat(2049)]) assert.equal(await verifyTurnstile(token), false);
  assert.equal(mocked.mock.callCount(), 0);
});

test('Turnstile forwards a valid IP only and never treats provider failure as authorization', async t => {
  const oldKey = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = 'unit-test-secret';
  try {
    let captured: URLSearchParams | undefined;
    const mocked = t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
      captured = init?.body as URLSearchParams;
      return Response.json({ success: false });
    });
    await verifyTurnstile('synthetic-token', 'unknown');
    assert.equal(captured?.has('remoteip'), false);
    await verifyTurnstile('synthetic-token', '192.0.2.1');
    assert.equal(captured?.get('remoteip'), '192.0.2.1');
    mocked.mock.mockImplementation(async () => new Response('', { status: 503 }));
    await assert.rejects(verifyTurnstile('synthetic-token'), /non disponibile/);
    mocked.mock.mockImplementation(async () => { throw new DOMException('timed out', 'TimeoutError'); });
    await assert.rejects(verifyTurnstile('synthetic-token'), { name: 'TimeoutError' });
  } finally { if (oldKey === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = oldKey; }
});
