import { z } from 'zod';

export type Environment = Record<string, string | undefined>;
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
export function deploymentProblems(env: Environment, target: 'staging' | 'production'): string[] {
  const production = target === 'production';
  const problems: string[] = [];
  const require = (ok: boolean, message: string) => { if (!ok) problems.push(message); };
  require(env.APP_ENV === target, `APP_ENV: usare ${target}.`);
  require(!production || env.VERCEL_ENV !== 'preview', 'VERCEL_ENV: un deployment Preview non può attivare vendite reali.');
  let origin = false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL ?? '');
    origin = remoteUrl(env.NEXT_PUBLIC_SITE_URL, ['https:']) && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash;
  } catch { /* Report a fixed message without the supplied URL. */ }
  require(origin, `NEXT_PUBLIC_SITE_URL: configurare la vera origine HTTPS ${target}.`);
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    require(remoteUrl(env[key], ['postgres:', 'postgresql:']), `${key}: serve un database PostgreSQL ${target} remoto, senza placeholder.`);
    let tls = false;
    try {
      const params = new URL(env[key] ?? '').searchParams;
      tls = params.getAll('sslmode').length === 1 && params.get('sslmode') === 'require' &&
        params.getAll('sslaccept').length === 1 && params.get('sslaccept') === 'strict' && !params.has('host');
    } catch { /* Fixed message only; never disclose a connection URL. */ }
    require(tls, `${key}: richiedere TLS e certificato valido con sslmode=require e sslaccept=strict (Prisma 6); verificare CA e hostname sul provider.`);
  }
  const dbConfirmation = production ? 'PRODUCTION_DATABASE_CONFIRMED' : 'STAGING_DATABASE_CONFIRMED';
  require(env[dbConfirmation] === 'true', `${dbConfirmation}: confermare solo dopo verifica del database separato.`);
  require(configured(env.STRIPE_SECRET_KEY) && (production ? /^sk_live_[A-Za-z0-9]{24,}$/ : /^sk_test_[A-Za-z0-9]{24,}$/).test(env.STRIPE_SECRET_KEY ?? ''), `STRIPE_SECRET_KEY: inserire una chiave ${production ? 'LIVE' : 'TEST'} effettiva.`);
  require(production ? env.STRIPE_MODE === 'live' : !env.STRIPE_MODE || env.STRIPE_MODE === 'test', 'STRIPE_MODE: usare live solo in produzione, test in staging.');
  require(configured(env.STRIPE_WEBHOOK_SECRET) && /^whsec_[A-Za-z0-9]{24,}$/.test(env.STRIPE_WEBHOOK_SECRET ?? ''), `STRIPE_WEBHOOK_SECRET: configurare il segreto del webhook ${production ? 'LIVE' : 'TEST'} di questo ambiente.`);
  require(production ? env.ALLOW_LIVE_PAYMENTS === 'true' : env.ALLOW_LIVE_PAYMENTS !== 'true', `ALLOW_LIVE_PAYMENTS: impostare ${production ? 'true solo per il lancio reale' : 'false'}.`);
  const bcrypt = /^\$2[aby]\$(1[2-6])\$[./A-Za-z0-9]{53}$/;
  for (const key of ['ADMIN_PASSWORD_HASH']) require(bcrypt.test(env[key] ?? ''), `${key}: generare un hash bcrypt con staging:credentials.`);
  require(!env.ADMIN_PASSWORD, 'ADMIN_PASSWORD: rimuovere la password in chiaro dalla configurazione staging.');
  const keys = ['SESSION_SECRET', 'CRON_SECRET'];
  for (const key of keys) require(configured(env[key]) && (env[key]?.length ?? 0) >= 32, `${key}: generare almeno 32 caratteri casuali.`);
  require(keys.every(key => !!env[key]) && new Set(keys.map(key => env[key])).size === keys.length, 'Segreti sessione/cron: devono essere distinti.');
  require(env.ENABLE_AUTOMATIC_JOBS === (production ? 'true' : 'false'), `ENABLE_AUTOMATIC_JOBS: impostare ${production ? 'true per rispettare i rimborsi previsti dalle condizioni' : 'false'}.`);
  require(configured(env.RESEND_API_KEY) && /^re_[A-Za-z0-9_-]{16,}$/.test(env.RESEND_API_KEY ?? ''), 'RESEND_API_KEY: configurare il provider reale.');
  const from = (env.MAIL_FROM ?? '').match(/<([^<>]+)>$/)?.[1] ?? env.MAIL_FROM ?? '';
  require(email.safeParse(from).success && configured(from), 'MAIL_FROM: impostare un mittente verificato in Resend.');
  const recipients = (env.EMAIL_ALLOWLIST ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  require(production || recipients.length > 0 && recipients.every(value => email.safeParse(value).success && configured(value)), 'EMAIL_ALLOWLIST: inserire indirizzi test effettivi ed esatti.');
  require(email.safeParse(env.ADMIN_EMAIL).success && configured(env.ADMIN_EMAIL) && (production || recipients.includes((env.ADMIN_EMAIL ?? '').trim().toLowerCase())), 'ADMIN_EMAIL: usare un indirizzo compreso nella allowlist.');
  for (const key of ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'UPSTASH_REDIS_REST_TOKEN']) require(configured(env[key]), `${key}: valore mancante o placeholder.`);
  require(remoteUrl(env.UPSTASH_REDIS_REST_URL, ['https:']), 'UPSTASH_REDIS_REST_URL: configurare l\'endpoint HTTPS reale.');
  for (const key of ['STRIPE_MOCK', 'MAIL_PROVIDER', 'TURNSTILE_MODE', 'RATE_LIMIT_MODE', 'TRYON_PROVIDER_MODE']) require(!env[key], `${key}: rimuovere la vecchia opzione locale; non abilita servizi staging.`);
  if (production) {
    require(env.PRODUCTION_LAUNCH_CONFIRMED === 'true', 'PRODUCTION_LAUNCH_CONFIRMED: confermare collaudo e lancio dopo la checklist.');
    require(env.LEGAL_REVIEW_CONFIRMED === 'true', 'LEGAL_REVIEW_CONFIRMED: completare dati venditore, informative e condizioni.');
    for (const key of ['SELLER_NAME', 'SELLER_ADDRESS', 'SELLER_TAX_ID']) require(configured(env[key]) && (env[key]?.trim().length ?? 0) >= 3 && !/[<>[\]]/.test(env[key] ?? ''), `${key}: completare i dati autentici del venditore.`);
    for (const key of ['PRIVACY_EMAIL', 'SUPPORT_EMAIL']) require(email.safeParse(env[key]).success && configured(env[key]), `${key}: configurare un contatto effettivo.`);
    require(configured(env.WITHDRAWAL_POLICY) && (env.WITHDRAWAL_POLICY?.trim().length ?? 0) >= 40, 'WITHDRAWAL_POLICY: completare la procedura di recesso e assistenza revisionata.');
  }
  return problems;
}


export const stagingProblems = (env: Environment) => deploymentProblems(env, 'staging');
export const productionProblems = (env: Environment) => deploymentProblems(env, 'production');
