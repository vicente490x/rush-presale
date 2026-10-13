import { z } from 'zod';

export const appEnv = process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'test' ? 'test' : 'development');

const productionEnvSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), 'deve essere un URL PostgreSQL'),
  DIRECT_URL: z.string().url().refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), 'deve essere un URL PostgreSQL'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_live_', 'in produzione è richiesta una chiave Stripe live'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().refine((value) => z.string().email().safeParse(value).success || /^.+<[^<>\s]+@[^<>\s]+>$/.test(value), 'deve essere un indirizzo email valido'),
  FAL_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  CRON_SECRET: z.string().min(32),
  NEXT_PUBLIC_SITE_URL: z.string().url().refine((value) => value.startsWith('https://'), 'deve usare HTTPS'),
  SESSION_SECRET: z.string().min(32),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1)
});

export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  if ((env.APP_ENV ?? (env.NODE_ENV === 'production' ? 'production' : 'development')) !== 'production') return;
  const parsed = productionEnvSchema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Configurazione di produzione non valida. Correggi queste variabili d'ambiente: ${missing.join('; ')}`);
  }
}
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  PRESALE_THRESHOLD: z.coerce.number().int().positive().default(15),
  PRESALE_MAX_QUANTITY: z.coerce.number().int().positive().max(100).default(5)
});

export function publicConfig() {
  const parsed = publicEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    PRESALE_THRESHOLD: process.env.PRESALE_THRESHOLD ?? '15',
    PRESALE_MAX_QUANTITY: process.env.PRESALE_MAX_QUANTITY ?? '5'
  });
  const url = new URL(parsed.NEXT_PUBLIC_SITE_URL);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL deve essere HTTPS in produzione.');
  }
  return parsed;
}
