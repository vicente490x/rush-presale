import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const value = process.env.RUSH_TEST_DATABASE_URL;
if (!value) throw new Error('Imposta RUSH_TEST_DATABASE_URL su un database PostgreSQL temporaneo localhost denominato rush_audit*.');
const url = new URL(value);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.startsWith('/rush_audit')) throw new Error('Test rifiutati: serve un database locale rush_audit dedicato.');
url.searchParams.set('schema', 'audit_' + randomBytes(8).toString('hex'));
const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), RUSH_ISOLATED_TEST: 'true',
  APP_ENV: 'development', STRIPE_MODE: 'test', ALLOW_LIVE_PAYMENTS: 'false', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', NODE_ENV: 'test',
  SESSION_SECRET: 'integration-session-secret-at-least-32-characters',
  STRIPE_SECRET_KEY: 'sk_test_integration_placeholder', STRIPE_WEBHOOK_SECRET: 'integration-signature-secret',
  EMAIL_ALLOWLIST: 'buyer@example.com,admin@example.com', ADMIN_EMAIL: 'admin@example.com',
  RESEND_API_KEY: '', ENABLE_AUTOMATIC_JOBS: 'false' };
for (const args of [['node_modules/prisma/build/index.js', 'migrate', 'deploy'], ['--import', 'tsx', '--test', 'tests/integration.test.ts']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Schema di test isolato conservato nel solo DB temporaneo per ispezione; nessun dato esistente modificato.');
