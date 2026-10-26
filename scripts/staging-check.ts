import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

type Environment = Record<string, string | undefined>;
const email = z.string().email();
const placeholder = /example|placeholder|changeme|replace|your[_-]|inserire|sostituire|abc123/i;
function configured(value: string | undefined) { return !!value?.trim() && !placeholder.test(value); }
function remoteUrl(value: string | undefined, protocols: string[]) {
  try {
    const url = new URL(value ?? '');
    const host = url.hostname.toLowerCase();
    return configured(value) && protocols.includes(url.protocol) && !!host &&
      !host.endsWith('.invalid') && !host.endsWith('.local') && !host.endsWith('.localhost') &&
      !['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(host);
  } catch { return false; }
}

// Static checks only: never contacts providers, imports Prisma or prints values.
export function stagingProblems(env: Environment): string[] {
  const problems: string[] = [];
  const require = (ok: boolean, message: string) => { if (!ok) problems.push(message); };
  require(env.APP_ENV === 'staging', 'APP_ENV: usare staging.');
  let origin = false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL ?? '');
    origin = remoteUrl(env.NEXT_PUBLIC_SITE_URL, ['https:']) && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash;
  } catch { /* Report a fixed message without the supplied URL. */ }
  require(origin, 'NEXT_PUBLIC_SITE_URL: configurare la vera origine HTTPS staging.');
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    require(remoteUrl(env[key], ['postgres:', 'postgresql:']), `${key}: serve un database PostgreSQL staging remoto, senza placeholder.`);
    let tls = false;
    try {
      const params = new URL(env[key] ?? '').searchParams;
      tls = params.getAll('sslmode').length === 1 && params.get('sslmode') === 'require' &&
        params.getAll('sslaccept').length === 1 && params.get('sslaccept') === 'strict' && !params.has('host');
    } catch { /* Fixed message only; never disclose a connection URL. */ }
    require(tls, `${key}: richiedere TLS e certificato valido con sslmode=require e sslaccept=strict (Prisma 6); verificare CA e hostname sul provider.`);
  }
  require(env.STAGING_DATABASE_CONFIRMED === 'true', 'STAGING_DATABASE_CONFIRMED: confermare solo dopo verifica del database separato.');
  require(configured(env.STRIPE_SECRET_KEY) && /^sk_test_[A-Za-z0-9]{24,}$/.test(env.STRIPE_SECRET_KEY ?? ''), 'STRIPE_SECRET_KEY: inserire una chiave TEST effettiva.');
  require(configured(env.STRIPE_WEBHOOK_SECRET) && /^whsec_[A-Za-z0-9]{24,}$/.test(env.STRIPE_WEBHOOK_SECRET ?? ''), 'STRIPE_WEBHOOK_SECRET: configurare il segreto del webhook TEST di questo staging.');
  require(env.ALLOW_LIVE_PAYMENTS !== 'true', 'ALLOW_LIVE_PAYMENTS: mantenere false.');
  const bcrypt = /^\$2[aby]\$(1[0-6])\$[./A-Za-z0-9]{53}$/;
  for (const key of ['ADMIN_PASSWORD_HASH']) require(bcrypt.test(env[key] ?? ''), `${key}: generare un hash bcrypt con staging:credentials.`);
  require(!env.ADMIN_PASSWORD, 'ADMIN_PASSWORD: rimuovere la password in chiaro dalla configurazione staging.');
  const keys = ['SESSION_SECRET', 'CRON_SECRET'];
  for (const key of keys) require(configured(env[key]) && (env[key]?.length ?? 0) >= 32, `${key}: generare almeno 32 caratteri casuali.`);
  require(keys.every(key => !!env[key]) && new Set(keys.map(key => env[key])).size === keys.length, 'Segreti sessione/cron: devono essere distinti.');
  require(env.ENABLE_AUTOMATIC_JOBS === 'false', 'ENABLE_AUTOMATIC_JOBS: impostare false.');
  require(env.TRYON_REVIEWED === 'false', 'TRYON_REVIEWED: impostare false per questa demo.');
  require(configured(env.RESEND_API_KEY) && /^re_[A-Za-z0-9_-]{16,}$/.test(env.RESEND_API_KEY ?? ''), 'RESEND_API_KEY: configurare il provider reale.');
  const from = (env.MAIL_FROM ?? '').match(/<([^<>]+)>$/)?.[1] ?? env.MAIL_FROM ?? '';
  require(email.safeParse(from).success && configured(from), 'MAIL_FROM: impostare un mittente verificato in Resend.');
  const recipients = (env.EMAIL_ALLOWLIST ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  require(recipients.length > 0 && recipients.every(value => email.safeParse(value).success && configured(value)), 'EMAIL_ALLOWLIST: inserire indirizzi test effettivi ed esatti.');
  require(email.safeParse(env.ADMIN_EMAIL).success && recipients.includes((env.ADMIN_EMAIL ?? '').trim().toLowerCase()), 'ADMIN_EMAIL: usare un indirizzo compreso nella allowlist.');
  for (const key of ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'UPSTASH_REDIS_REST_TOKEN']) require(configured(env[key]), `${key}: valore mancante o placeholder.`);
  require(remoteUrl(env.UPSTASH_REDIS_REST_URL, ['https:']), 'UPSTASH_REDIS_REST_URL: configurare l\'endpoint HTTPS reale.');
  for (const key of ['STRIPE_MOCK', 'MAIL_PROVIDER', 'TURNSTILE_MODE', 'RATE_LIMIT_MODE', 'TRYON_PROVIDER_MODE']) require(!env[key], `${key}: rimuovere la vecchia opzione locale; non abilita servizi staging.`);
  return problems;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--env-file' || !args[1]) {
    console.error('Uso: npm run staging:check -- --env-file .env.staging.local');
    console.error('Legge solo il file indicato; nessun fallback a .env.local o variabili della shell.');
    process.exitCode = 1;
    return;
  }
  let env: Environment;
  try { env = parseEnv(await readFile(resolve(args[1]), 'utf8')); }
  catch { console.error('File ambiente non leggibile o non valido. Nessun valore mostrato.'); process.exitCode = 1; return; }
  const problems = stagingProblems(env);
  console.log('Controllo statico locale: nessuna richiesta esterna, modifica, migrazione o invio email.');
  for (const problem of problems) console.log('- ' + problem);
  console.log(problems.length ? `CONFIGURAZIONE INCOMPLETA: ${problems.length} controlli da risolvere.` : 'FORMATO CONFIGURAZIONE OK. Credenziali, separazione DB e servizi esterni ancora da verificare sul provider.');
  process.exitCode = problems.length ? 1 : 0;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) void main();
