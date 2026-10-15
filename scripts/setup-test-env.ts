import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const source = process.env.DATABASE_URL;
if (!source) throw new Error('Configura DATABASE_URL in .env.local prima di preparare i test.');
const database = new URL(source);
if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname)) {
  throw new Error('Configurazione test rifiutata: il database sorgente deve essere locale.');
}
const direct = new URL(process.env.DIRECT_URL ?? source);
if (!['localhost', '127.0.0.1', '::1'].includes(direct.hostname)) {
  throw new Error('Configurazione test rifiutata: DIRECT_URL deve essere locale.');
}
database.searchParams.set('schema', 'rush_presale_test');
direct.searchParams.set('schema', 'rush_presale_test');

const content = [
  `DATABASE_URL=${database}`,
  `DIRECT_URL=${direct}`,
  'NODE_ENV=test',
  'APP_ENV=test',
  'RUSH_TEST_MODE=1',
  'PAYMENT_PROVIDER=mock',
  'STRIPE_SECRET_KEY=sk_test_local_mock_no_network',
  'STRIPE_WEBHOOK_SECRET=whsec_local_test_only',
  'EMAIL_PROVIDER=console',
  'TURNSTILE_MODE=mock',
  'RATE_LIMIT_PROVIDER=memory',
  'TRYON_PROVIDER=mock',
  'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
  `SESSION_SECRET=${randomBytes(48).toString('base64url')}`,
  'ADMIN_EMAIL=admin@example.com',
  'ADMIN_PASSWORD=preview-password-123!',
  'CRON_SECRET=local-test-cron-secret',
  'TRYON_DAILY_LIMIT=100',
  'TRYON_MAX_DAILY_SPEND_USD=5',
  'TRYON_RESULT_TTL_SECONDS=300'
].join('\n') + '\n';

if (existsSync('.env.test')) {
  throw new Error('.env.test esiste già; non verrà sovrascritto. Rimuovilo manualmente se vuoi rigenerarlo.');
}
writeFileSync('.env.test', content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
console.info('.env.test creato con schema PostgreSQL isolato e provider esclusivamente mock; i segreti non sono stati stampati.');
