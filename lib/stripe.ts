import Stripe from 'stripe';
import { assertStripeTestMode } from '@/lib/config';

let client: Stripe | undefined;

export function stripeClient() {
  assertStripeTestMode();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe non configurato: imposta le chiavi Stripe test.');
  if (!key.startsWith('sk_test_') && process.env.ALLOW_LIVE_PAYMENTS !== 'true') {
    throw new Error('Il checkout è limitato alle chiavi Stripe test.');
  }
  client ??= new Stripe(key);
  return client;
}
