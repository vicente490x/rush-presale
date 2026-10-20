import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEnv } from 'node:util';
import bcrypt from 'bcryptjs';
import { credentialFile } from '../scripts/staging-credentials';
import { stagingPrismaEnvironment } from '../scripts/staging-prisma-env';
import { enforceRateLimit } from '../lib/ratelimit';

test('staging credentials preserve literal bcrypt dollars, omit plaintext and use distinct secrets', async () => {
  const admin = 'synthetic-admin-password';
  const gate = 'synthetic-preview-password';
  const content = await credentialFile(admin, gate);
  assert.ok(!content.includes(admin)); assert.ok(!content.includes(gate));
  const values = parseEnv(content);
  assert.ok(values.ADMIN_PASSWORD_HASH); assert.ok(values.STAGING_PASSWORD_HASH);
  assert.match(values.ADMIN_PASSWORD_HASH, /^\$2b\$12\$/);
  assert.equal(await bcrypt.compare(admin, values.ADMIN_PASSWORD_HASH), true);
  assert.equal(await bcrypt.compare(gate, values.STAGING_PASSWORD_HASH), true);
  assert.equal(await bcrypt.compare(gate, values.ADMIN_PASSWORD_HASH), false);
  const secrets = [values.SESSION_SECRET, values.STAGING_SESSION_SECRET, values.CRON_SECRET];
  assert.equal(new Set([...secrets, admin, gate]).size, 5);
  for (const secret of secrets) { assert.ok(secret); assert.equal(Buffer.from(secret, 'base64url').length, 32); }
  await assert.rejects(credentialFile(admin, admin), /diverse/);
  await assert.rejects(credentialFile('x'.repeat(73), gate), /72 byte/);
  await assert.rejects(credentialFile('short', gate), /16 caratteri/);
  await assert.rejects(credentialFile(admin + '\n', gate), /controllo/);
});

test('explicit staging Prisma file never inherits missing database URLs or expands dollar characters', () => {
  const contents = 'APP_ENV=staging\nSTAGING_DATABASE_CONFIRMED=true\nDATABASE_URL=postgresql://fixture:p$literal@localhost/rush_audit_fixture\nDIRECT_URL=postgresql://fixture:p$literal@localhost/rush_audit_fixture';
  const inherited: NodeJS.ProcessEnv = { NODE_ENV: 'test', DATABASE_URL: 'must-not-be-used', DIRECT_URL: 'must-not-be-used' };
  const env = stagingPrismaEnvironment(contents, inherited);
  assert.ok(env.DATABASE_URL?.includes('p$literal'));
  assert.equal(env.DIRECT_URL, env.DATABASE_URL);
  assert.throws(() => stagingPrismaEnvironment(contents.replace('STAGING_DATABASE_CONFIRMED=true', 'STAGING_DATABASE_CONFIRMED=false'), inherited), /conferma/);
  assert.throws(() => stagingPrismaEnvironment(contents.replace(/^DIRECT_URL=.*$/m, ''), inherited), /DIRECT_URL/);
  assert.throws(() => stagingPrismaEnvironment(contents.replace('APP_ENV=staging', 'APP_ENV=development'), inherited), /APP_ENV/);
});

test('SEC-14 real Upstash timeout cannot grant checkout authorization (no network)', async t => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = 'https://synthetic-redis.example.invalid';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(() => {}));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const result = enforceRateLimit('synthetic-client', 'timeout-regression', 5, '15 m');
    const rejected = assert.rejects(result, /RATE_LIMIT_UNAVAILABLE/);
    t.mock.timers.tick(5000);
    await rejected;
  } finally {
    t.mock.timers.reset();
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
