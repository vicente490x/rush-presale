import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:net';
import { verifyPostgresTransport } from '../lib/postgres-transport';

test('database TLS probe sends only SSLRequest and refuses a plaintext server', async () => {
  let request: Buffer | undefined;
  const server = createServer(socket => socket.once('data', bytes => { request = bytes; socket.end('N'); }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as { port: number }).port;
    await assert.rejects(verifyPostgresTransport(`postgresql://test-user:never-transmitted@127.0.0.1:${port}/test`), /DATABASE_TLS_CHECK_FAILED/);
    assert.equal(request?.length, 8);
    assert.equal(request?.readInt32BE(0), 8);
    assert.equal(request?.readInt32BE(4), 80877103);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('database TLS probe times out safely and rejects an invalid URL without disclosing it', async () => {
  const server = createServer(socket => { socket.on('data', () => undefined); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as { port: number }).port;
    await assert.rejects(verifyPostgresTransport(`postgresql://secret-user:secret-password@127.0.0.1:${port}/test`, 50), { message: 'DATABASE_TLS_CHECK_FAILED' });
    await assert.rejects(verifyPostgresTransport('invalid-sensitive-url'), { message: 'DATABASE_TLS_CHECK_FAILED' });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
