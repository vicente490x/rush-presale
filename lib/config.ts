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
export function assertStripeTestMode() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Sono consentite esclusivamente chiavi Stripe TEST.');
  if (appEnv() === 'staging' && process.env.STAGING_DATABASE_CONFIRMED !== 'true') throw new Error('Confermare un database staging indipendente con STAGING_DATABASE_CONFIRMED=true.');
}
