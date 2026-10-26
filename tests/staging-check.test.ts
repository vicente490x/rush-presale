import assert from 'node:assert/strict';
import test from 'node:test';
import { stagingProblems } from '../scripts/staging-check';

function fixture() {
  return {
    APP_ENV: 'staging', NEXT_PUBLIC_SITE_URL: 'https://rush-staging.vercel.app',
    DATABASE_URL: 'postgresql://audit:fixture@db.test-provider.net/rush_stage?sslmode=require&sslaccept=strict',
    DIRECT_URL: 'postgresql://audit:fixture@direct.test-provider.net/rush_stage?sslmode=require&sslaccept=strict',
    STAGING_DATABASE_CONFIRMED: 'true', STRIPE_SECRET_KEY: 'sk_' + 'test_' + 'A'.repeat(32),
    STRIPE_WEBHOOK_SECRET: 'whsec_' + 'B'.repeat(32), ALLOW_LIVE_PAYMENTS: 'false',
    ADMIN_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53), STAGING_PASSWORD_HASH: '$2b$12$' + 'b'.repeat(53),
    SESSION_SECRET: 'c'.repeat(40), STAGING_SESSION_SECRET: 'd'.repeat(40), CRON_SECRET: 'e'.repeat(40),
    ENABLE_AUTOMATIC_JOBS: 'false', RESEND_API_KEY: 're_' + 'f'.repeat(32),
    MAIL_FROM: 'RUSH <orders@rush.test-provider.net>', EMAIL_ALLOWLIST: 'qa@rush.test-provider.net',
    ADMIN_EMAIL: 'qa@rush.test-provider.net', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'fixture-site',
    TURNSTILE_SECRET_KEY: 'fixture-secret', UPSTASH_REDIS_REST_TOKEN: 'fixture-token',
    UPSTASH_REDIS_REST_URL: 'https://rush.test-provider.net'
  };
}

test('staging preflight validates format without claiming provider verification', () => {
  assert.deepEqual(stagingProblems(fixture()), []);
  const env = fixture();
  env.STRIPE_SECRET_KEY = 'sk_' + 'live_' + 'secret-must-never-appear';
  const problems = stagingProblems(env);
  assert.ok(problems.some(value => value.startsWith('STRIPE_SECRET_KEY:')));
  assert.ok(!problems.join('\n').includes(env.STRIPE_SECRET_KEY));
});

test('staging preflight rejects local DB, shared secrets, plaintext passwords and legacy mock flags', () => {
  const problems = stagingProblems({ ...fixture(), DATABASE_URL: 'postgresql://audit:secret@localhost/rush',
    STAGING_DATABASE_CONFIRMED: 'false', CRON_SECRET: 'c'.repeat(40),
    ADMIN_PASSWORD: 'secret-must-never-appear', STRIPE_MOCK: 'true', ADMIN_EMAIL: 'other@rush.test-provider.net' });
  for (const prefix of ['DATABASE_URL:', 'STAGING_DATABASE_CONFIRMED:', 'Segreti sessione', 'ADMIN_PASSWORD:', 'STRIPE_MOCK:', 'ADMIN_EMAIL:']) {
    assert.ok(problems.some(value => value.startsWith(prefix)), prefix);
  }
  assert.ok(!problems.join('\n').includes('secret-must-never-appear'));
  assert.ok(stagingProblems({}).length > 20);
});

test('staging preflight requires explicit TLS with certificate verification on both database URLs', () => {
  for (const suffix of ['', '?sslmode=disable&sslaccept=strict', '?sslmode=require&sslaccept=accept_invalid_certs', '?sslmode=require&sslmode=disable&sslaccept=strict']) {
    const env = fixture();
    env.DATABASE_URL = 'postgresql://audit:fixture@db.test-provider.net/rush_stage' + suffix;
    env.DIRECT_URL = 'postgresql://audit:fixture@direct.test-provider.net/rush_stage' + suffix;
    const problems = stagingProblems(env);
    for (const name of ['DATABASE_URL', 'DIRECT_URL']) assert.ok(problems.some(p => p.startsWith(name + ': richiedere TLS')));
    assert.ok(!problems.join('\n').includes('audit:fixture'));
  }
});

test('public staging requires no storefront password or gate secret', () => {
  const env: Record<string, string | undefined> = fixture();
  delete env.STAGING_PASSWORD_HASH; delete env.STAGING_SESSION_SECRET;
  assert.deepEqual(stagingProblems(env), []);
  delete env.ADMIN_PASSWORD_HASH;
  assert.ok(stagingProblems(env).some(p => p.startsWith('ADMIN_PASSWORD_HASH:')));
});
