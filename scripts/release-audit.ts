import { readFile, readdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { deploymentProblems, type Environment } from '../lib/deployment-config';

type Outcome = 'PASS' | 'FAIL' | 'OPEN';
function report(check: string, outcome: Outcome, detail: Record<string, unknown> = {}) {
  console.log('RUSH_RELEASE_AUDIT ' + JSON.stringify({ check, outcome, ...detail }));
}

async function jsonRequest(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('PROVIDER_NOT_READABLE');
  return response.json();
}

async function online(env: Environment) {
  // Read-only probes. Never send emails, create sessions, modify jobs or refund.
  const provider = (value: string | undefined) => {
    try {
      const host = new URL(value ?? '').hostname;
      if (host.endsWith('.supabase.co') || host.endsWith('.supabase.com')) return 'supabase';
      if (host.endsWith('.neon.tech')) return 'neon';
      if (host.endsWith('.prisma.io') || host.endsWith('.prisma-data.net')) return 'prisma';
    } catch { /* Never print connection strings. */ }
    return 'other';
  };
  await Promise.all([
    (async () => {
      if (!env.DATABASE_URL) { report('database', 'FAIL', { reason: 'NOT_CONFIGURED' }); return; }
      const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
      try {
        const rows = await db.$queryRaw<Array<{ ssl: boolean }>>`SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
        const migrations = await db.$queryRaw<Array<{ migration_name: string; finished: boolean }>>`SELECT migration_name, (finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished FROM "_prisma_migrations"`;
        const expected = (await readdir('prisma/migrations', { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
        const complete = expected.every(name => migrations.some(row => row.migration_name === name && row.finished));
        // PostgreSQL reports the final hop, which may be behind a TLS pooler.
        report('database', !complete ? 'FAIL' : rows[0]?.ssl === true ? 'PASS' : 'OPEN', { connected: true, postgresHopTls: rows[0]?.ssl === true, migrationsCurrent: complete, provider: provider(env.DATABASE_URL), ...(!rows[0]?.ssl ? { reason: 'POOLER_OR_POSTGRES_TRANSPORT_REVIEW_REQUIRED' } : {}) });
      } catch { report('database', 'FAIL', { reason: 'CONNECTION_OR_MIGRATION_CHECK_FAILED' }); }
      finally { await db.$disconnect(); }
    })(),
    (async () => {
      if (!env.DIRECT_URL) { report('database-direct', 'OPEN', { reason: 'NOT_CONFIGURED' }); return; }
      const db = new PrismaClient({ datasourceUrl: env.DIRECT_URL, log: [] });
      try {
        const rows = await db.$queryRaw<Array<{ ssl: boolean }>>`SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
        const tls = rows[0]?.ssl === true;
        report('database-direct', tls ? 'PASS' : 'OPEN', { connected: true, postgresHopTls: tls, provider: provider(env.DIRECT_URL), ...(!tls ? { reason: 'PROVIDER_TRANSPORT_REVIEW_REQUIRED' } : {}) });
      } catch { report('database-direct', 'OPEN', { reason: 'DIRECT_CONNECTION_NOT_AVAILABLE' }); }
      finally { await db.$disconnect(); }
    })(),
    (async () => {
      try {
        if (!env.STRIPE_SECRET_KEY) throw new Error();
        const account = await jsonRequest('https://api.stripe.com/v1/account', env.STRIPE_SECRET_KEY);
        const balance = await jsonRequest('https://api.stripe.com/v1/balance', env.STRIPE_SECRET_KEY);
        const hooks = await jsonRequest('https://api.stripe.com/v1/webhook_endpoints?limit=100', env.STRIPE_SECRET_KEY);
        const required = ['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'charge.refunded', 'refund.created', 'refund.updated', 'refund.failed'];
        const hookUrl = new URL('/api/stripe/webhook', env.NEXT_PUBLIC_SITE_URL).href;
        const hook = hooks.data?.find((item: { url: string; status: string }) => item.url === hookUrl && item.status === 'enabled');
        const coverage = !!hook && required.every(event => hook.enabled_events.includes('*') || hook.enabled_events.includes(event));
        const modeMatches = balance.livemode === (env.STRIPE_MODE === 'live');
        report('stripe', modeMatches && coverage ? 'PASS' : 'FAIL', { accountId: account.id, livemode: balance.livemode, modeMatches, webhookConfigured: coverage });
      } catch { report('stripe', 'FAIL', { reason: 'API_OR_WEBHOOK_NOT_READABLE' }); }
    })(),
    (async () => {
      try {
        if (!env.RESEND_API_KEY) throw new Error();
        const result = await jsonRequest('https://api.resend.com/domains', env.RESEND_API_KEY);
        const from = env.MAIL_FROM?.match(/<([^<>]+)>$/)?.[1] ?? env.MAIL_FROM ?? '';
        const domain = from.split('@')[1]?.toLowerCase();
        const verified = !!domain && result.data?.some((item: { name: string; status: string }) => item.name.toLowerCase() === domain && item.status === 'verified');
        report('email-sender', verified ? 'PASS' : 'OPEN', { domainVerified: !!verified, deliveryTested: false });
      } catch { report('email-sender', 'OPEN', { reason: 'DOMAIN_READ_PERMISSION_OR_CONFIGURATION_REQUIRED', deliveryTested: false }); }
    })(),
    (async () => {
      try {
        const url = new URL(env.UPSTASH_REDIS_REST_URL ?? '');
        if (url.protocol !== 'https:' || !env.UPSTASH_REDIS_REST_TOKEN) throw new Error();
        url.pathname = '/ping'; url.search = ''; url.hash = '';
        const result = await jsonRequest(url.toString(), env.UPSTASH_REDIS_REST_TOKEN);
        report('redis', result.result === 'PONG' ? 'PASS' : 'FAIL', { connected: result.result === 'PONG' });
      } catch { report('redis', 'FAIL', { reason: 'CONNECTION_CHECK_FAILED' }); }
    })()
  ]);
  report('turnstile', 'OPEN', { reason: 'INTERACTIVE_BROWSER_AND_SERVER_TOKEN_VALIDATION_REQUIRED' });
  report('commercial-acceptance', 'OPEN', { reason: 'PAYMENT_EMAIL_REFUND_BACKUP_AND_OWNER_ACCEPTANCE_REQUIRE_SEPARATE_EVIDENCE' });
}

async function main() {
  const args = process.argv.slice(2);
  const performOnline = args.at(-1) === '--online';
  if (performOnline) args.pop();
  let env: Environment;
  if (args.length === 1 && args[0] === '--process-env') env = process.env;
  else if (args.length === 2 && args[0] === '--env-file' && args[1]) env = parseEnv(await readFile(args[1], 'utf8'));
  else throw new Error();
  const target = env.APP_ENV === 'production' ? 'production' : 'staging';
  const problems = deploymentProblems(env, target);
  report('configuration', problems.length ? 'FAIL' : 'PASS', { target, problems });
  // Also surface the real LIVE blockers while the site remains safely in TEST.
  if (target !== 'production') report('live-configuration', 'OPEN', { problems: deploymentProblems(env, 'production') });
  if (performOnline) await online(env);
  report('summary', 'OPEN', { liveEnabledByAudit: false, note: 'A probe PASS proves only the named read-only check, never a complete checkout or release approval.' });
}

void main().catch(() => {
  console.error('Audit non eseguito. Uso: npm run release:audit -- --process-env [--online], oppure --env-file percorso [--online]. Nessun valore o errore provider viene mostrato.');
  process.exitCode = 1;
});
