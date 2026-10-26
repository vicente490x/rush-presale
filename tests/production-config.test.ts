import assert from 'node:assert/strict';
import test from 'node:test';
import { productionProblems, type Environment } from '../lib/deployment-config';
import { assertStripeConfiguration, assertStripeEventMode, stripeMode } from '../lib/config';
import { stagingPrismaEnvironment } from '../scripts/staging-prisma-env';

import { productionFixture } from './fixtures/production-env';

function withEnv(values: Environment, action: () => void) {
  const old = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) delete process.env[key];
    for (const [key, value] of Object.entries(values)) if (value !== undefined) process.env[key] = value;
    action();
  } finally { for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, old); }
}

test('production preflight requires every launch, provider and seller prerequisite without printing values', () => {
  const input = productionFixture(); assert.deepEqual(productionProblems(input), []);
  for (const key of Object.keys(input)) {
    if (['VERCEL_ENV', 'ADMIN_ID'].includes(key)) continue;
    const missing = { ...input }; delete missing[key];
    assert.ok(productionProblems(missing).length, key);
  }
  for (const [key, value] of Object.entries({ VERCEL_ENV: 'preview', STRIPE_SECRET_KEY: 'sk_test_secret-not-for-logs',
    ALLOW_LIVE_PAYMENTS: 'false', ENABLE_AUTOMATIC_JOBS: 'false', TRYON_REVIEWED: 'true', SELLER_NAME: '[SELLER]',
    NEXT_PUBLIC_SITE_URL: 'https://rush.test-provider.net/path', ADMIN_PASSWORD_HASH: '$2b$10$' + 'a'.repeat(53) })) {
    const errors = productionProblems({ ...input, [key]: value });
    assert.ok(errors.length, key); assert.ok(!errors.join().includes(value), key);
  }
});

test('LIVE is refused in development/Preview/staging regardless of the opt-in flags', () => {
  for (const APP_ENV of ['development', 'staging']) withEnv({ ...productionFixture(), APP_ENV }, () => assert.throws(assertStripeConfiguration));
  withEnv({ ...productionFixture(), VERCEL_ENV: 'preview' }, () => assert.throws(assertStripeConfiguration));
  withEnv({ ...productionFixture(), PRODUCTION_LAUNCH_CONFIRMED: 'false' }, () => assert.throws(assertStripeConfiguration));
});

test('payment key and signed event mode must agree; explicit production accepts LIVE only', () => {
  withEnv(productionFixture(), () => { assert.equal(stripeMode(), 'live'); assert.doesNotThrow(assertStripeConfiguration); assert.doesNotThrow(() => assertStripeEventMode(true)); assert.throws(() => assertStripeEventMode(false)); });
  withEnv({ APP_ENV: 'staging', STRIPE_SECRET_KEY: 'sk_test_fixture', STAGING_DATABASE_CONFIRMED: 'true' }, () => {
    assert.equal(stripeMode(), 'test'); assert.doesNotThrow(() => assertStripeEventMode(false)); assert.throws(() => assertStripeEventMode(true));
    process.env.STRIPE_SECRET_KEY = 'sk_live_fixture'; assert.throws(assertStripeConfiguration);
    process.env.STRIPE_MODE = 'invalid'; assert.throws(stripeMode);
  });
});

test('production Prisma file is explicit, confirmed, preserves dollars and ignores inherited URLs', () => {
  const content = 'APP_ENV=production\nPRODUCTION_DATABASE_CONFIRMED=true\nDATABASE_URL=postgresql://audit:p$literal@localhost/rush_audit\nDIRECT_URL=postgresql://audit:p$literal@localhost/rush_audit';
  const result = stagingPrismaEnvironment(content, { NODE_ENV: 'test', DATABASE_URL: 'must-not-be-used' });
  assert.equal(result.APP_ENV, 'production'); assert.ok(result.DATABASE_URL?.includes('p$literal'));
  assert.throws(() => stagingPrismaEnvironment(content.replace('CONFIRMED=true', 'CONFIRMED=false'), { NODE_ENV: 'test' }));
  assert.throws(() => stagingPrismaEnvironment(content.replace(/^DIRECT_URL=.*$/m, ''), { NODE_ENV: 'test', DIRECT_URL: 'must-not-be-used' }));
});
