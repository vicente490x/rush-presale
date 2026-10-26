import Stripe from 'stripe';
import { assertStripeConfiguration } from '@/lib/config';
let client: Stripe | undefined;
let clientKey: string | undefined;
export function stripeClient() {
  assertStripeConfiguration();
  if (!client || clientKey !== process.env.STRIPE_SECRET_KEY) {
    clientKey = process.env.STRIPE_SECRET_KEY!;
    client = new Stripe(clientKey, { timeout: 8000, maxNetworkRetries: 1 });
  }
  return client;
}
