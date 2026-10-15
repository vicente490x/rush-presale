import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';

let client: Stripe | undefined;

type CheckoutSession = Pick<
  Stripe.Checkout.Session,
  'id' | 'url' | 'status' | 'payment_status' | 'metadata' | 'payment_intent'
>;

const mockSessions = new Map<string, CheckoutSession>();
const mockRefunds = new Set<string>();

function realStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe non configurato: imposta le chiavi Stripe test.');
  if (!key.startsWith('sk_test_') &&
    (process.env.APP_ENV !== 'production' || process.env.ALLOW_LIVE_PAYMENTS !== 'true')) {
    throw new Error('Il checkout è limitato alle chiavi Stripe test.');
  }
  client ??= new Stripe(key);
  return client;
}

export function stripeClient() {
  return realStripeClient();
}

export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams): Promise<CheckoutSession> {
  if (process.env.RUSH_TEST_MODE !== '1' || process.env.PAYMENT_PROVIDER !== 'mock') {
    return realStripeClient().checkout.sessions.create(params);
  }
  if (!params.success_url) throw new Error('URL di conferma checkout non configurato.');
  const id = `cs_test_mock_${randomUUID().replace(/-/g, '')}`;
  const successUrl = new URL(params.success_url);
  const mockUrl = new URL('/mock-checkout', successUrl.origin);
  mockUrl.searchParams.set('session', id);
  const confirmationCode = successUrl.searchParams.get('code');
  if (confirmationCode) mockUrl.searchParams.set('code', confirmationCode);
  const metadata = Object.fromEntries(
    Object.entries(params.metadata ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
  const session: CheckoutSession = {
    id,
    url: mockUrl.toString(),
    status: 'open',
    payment_status: 'unpaid',
    metadata,
    payment_intent: `pi_test_mock_${randomUUID().replace(/-/g, '')}`
  };
  mockSessions.set(id, session);
  return session;
}

export async function expireCheckoutSession(id: string): Promise<CheckoutSession> {
  if (process.env.RUSH_TEST_MODE !== '1' || process.env.PAYMENT_PROVIDER !== 'mock') {
    return realStripeClient().checkout.sessions.expire(id);
  }
  const session = mockSessions.get(id);
  if (!session) throw new Error('Sessione Stripe mock non trovata.');
  const expired = { ...session, status: 'expired' as const };
  mockSessions.set(id, expired);
  return expired;
}

export async function retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
  if (process.env.RUSH_TEST_MODE !== '1' || process.env.PAYMENT_PROVIDER !== 'mock') {
    return realStripeClient().checkout.sessions.retrieve(id);
  }
  const session = mockSessions.get(id);
  if (!session) throw new Error('Sessione Stripe mock non trovata.');
  return session;
}

export async function createRefund(
  params: Stripe.RefundCreateParams,
  options?: Stripe.RequestOptions
) {
  if (process.env.RUSH_TEST_MODE !== '1' || process.env.PAYMENT_PROVIDER !== 'mock') {
    return realStripeClient().refunds.create(params, options);
  }
  const key = options?.idempotencyKey ?? params.payment_intent ?? params.charge ?? randomUUID();
  mockRefunds.add(key);
  return { id: `re_test_mock_${key}`, status: 'succeeded' } as const;
}

export function completeMockCheckoutSession(id: string) {
  if (process.env.RUSH_TEST_MODE !== '1' || process.env.PAYMENT_PROVIDER !== 'mock') {
    throw new Error('Checkout mock non abilitato.');
  }
  const session = mockSessions.get(id);
  if (!session || (session.status !== 'open' && session.status !== 'complete')) {
    throw new Error('Sessione checkout mock non disponibile.');
  }
  const completed: CheckoutSession = { ...session, status: 'complete', payment_status: 'paid' };
  mockSessions.set(id, completed);
  return completed;
}

export function resetMockStripeState() {
  if (process.env.RUSH_TEST_MODE !== '1') throw new Error('Il reset Stripe mock è disponibile solo in ambiente di test.');
  mockSessions.clear();
  mockRefunds.clear();
}
