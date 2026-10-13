import { z } from 'zod';

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

export function assertStripeTestMode() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe non configurato: imposta le chiavi Stripe test nel file .env.');
  if (!key.startsWith('sk_test_') && process.env.ALLOW_LIVE_PAYMENTS !== 'true') {
    throw new Error('Sono accettate solo chiavi Stripe test finché i pagamenti live non vengono autorizzati.');
  }
}
