import { readFileSync } from 'node:fs';

const testDatabaseOverride = process.env.TEST_DATABASE_URL;
const testDirectUrlOverride = process.env.TEST_DIRECT_URL;
const contents = readFileSync('.env.test', 'utf8');
for (const line of contents.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const separator = line.indexOf('=');
  if (separator < 1) continue;
  process.env[line.slice(0, separator)] = line.slice(separator + 1);
}
if (testDatabaseOverride) process.env.DATABASE_URL = testDatabaseOverride;
if (testDirectUrlOverride) process.env.DIRECT_URL = testDirectUrlOverride;

process.env.RUSH_TEST_MODE = '1';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.EMAIL_PROVIDER = 'console';
process.env.TURNSTILE_MODE = 'mock';
process.env.RATE_LIMIT_PROVIDER = 'memory';
process.env.TRYON_PROVIDER = 'mock';
process.env.ALLOW_LIVE_PAYMENTS = 'false';
for (const key of [
  'RESEND_API_KEY',
  'FAL_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_SECRET_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN'
]) delete process.env[key];

const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
const direct = new URL(process.env.DIRECT_URL ?? 'http://invalid');
if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
  database.searchParams.get('schema') !== 'rush_presale_test' ||
  !['localhost', '127.0.0.1', '::1'].includes(direct.hostname) ||
  direct.searchParams.get('schema') !== 'rush_presale_test' ||
  process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') !== true ||
  !process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
  throw new Error('Configurazione test rifiutata: usa solo database loopback isolato e chiavi Stripe test.');
}
