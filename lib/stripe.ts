import Stripe from 'stripe';
import { assertStripeTestMode } from '@/lib/config';
let client: Stripe | undefined;
export function stripeClient() {
  assertStripeTestMode();
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 8000, maxNetworkRetries: 1 });
  return client;
}
