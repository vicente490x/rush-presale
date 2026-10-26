import { productionProblems } from '@/lib/deployment-config';
import { z } from 'zod';
export const appEnvSchema = z.enum(['development', 'staging', 'production']);
export function appEnv() {
  const value = process.env.APP_ENV === 'preview' ? 'staging' : process.env.APP_ENV;
  if (process.env.VERCEL_ENV === 'preview' && value && value !== 'staging') throw new Error('I deployment Vercel Preview richiedono APP_ENV=staging.');
  return appEnvSchema.parse(value ?? (process.env.VERCEL_ENV === 'preview' ? 'staging' : process.env.NODE_ENV === 'production' ? 'production' : 'development'));
}
export function secureCookies() { return process.env.NODE_ENV === 'production' || appEnv() !== 'development'; }
export function publicConfig() {
  const url = z.string().url().parse(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  if ((process.env.NODE_ENV === 'production' || appEnv() !== 'development') && new URL(url).protocol !== 'https:') throw new Error('NEXT_PUBLIC_SITE_URL deve usare HTTPS.');
  return { NEXT_PUBLIC_SITE_URL: url.replace(/\/$/, '') };
}
export function stripeMode(): 'test' | 'live' {
  const mode = process.env.STRIPE_MODE ?? 'test';
  if (mode !== 'test' && mode !== 'live') throw new Error('STRIPE_MODE non valido.');
  return mode;
}
export function assertStripeConfiguration() {
  const mode = stripeMode();
  if (mode === 'live') {
    if (appEnv() !== 'production' || process.env.VERCEL_ENV === 'preview') throw new Error('Stripe LIVE consentito solo in produzione.');
    if (productionProblems(process.env).length) throw new Error('Configurazione produzione incompleta: eseguire production:check.');
  }
  if (!process.env.STRIPE_SECRET_KEY?.startsWith(mode === 'live' ? 'sk_live_' : 'sk_test_')) throw new Error('Chiave Stripe non coerente con la modalità TEST/LIVE.');
  if (appEnv() === 'staging' && process.env.STAGING_DATABASE_CONFIRMED !== 'true') throw new Error('Confermare un database staging indipendente con STAGING_DATABASE_CONFIRMED=true.');
}
export function assertStripeEventMode(livemode: boolean) {
  assertStripeConfiguration();
  if (livemode !== (stripeMode() === 'live')) throw new Error('Evento Stripe non coerente con la modalità configurata.');
}
