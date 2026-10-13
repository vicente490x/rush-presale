import Stripe from 'stripe';

function createMockStripeClient() {
  const id = () => `mock_${Math.random().toString(36).slice(2, 10)}`;
  return {
    checkout: {
      sessions: {
        create: async (payload: Record<string, unknown>) => ({
          id: `cs_${id()}`,
          url: `https://example.com/mock-checkout/${id()}`,
          status: 'open',
          payment_status: 'unpaid',
          metadata: payload.metadata ?? {}
        }),
        expire: async (sessionId: string) => ({ id: sessionId, status: 'expired' }),
        retrieve: async (sessionId: string) => ({ id: sessionId, status: 'open', payment_status: 'unpaid' })
      }
    },
    refunds: {
      create: async (payload: Record<string, unknown>) => ({ id: `re_${id()}`, payment_intent: payload.payment_intent ?? 'pi_mock' })
    },
    webhooks: {
      constructEvent: (raw: Buffer | ArrayBuffer | string, _signature: string | string[] | null, _secret: string) => {
        const text = typeof raw === 'string'
          ? raw
          : Buffer.from(raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw).toString('utf8');
        const payload = JSON.parse(text);
        return {
          id: payload.id ?? `evt_${id()}`,
          type: payload.type ?? 'checkout.session.completed',
          created: payload.created ?? Math.floor(Date.now() / 1000),
          data: { object: payload.data?.object ?? {} }
        };
      }
    }
  } as unknown as Stripe;
}

let client: Stripe | undefined;

export function stripeClient() {
  if (process.env.STRIPE_MOCK === 'true') {
    client ??= createMockStripeClient();
    return client;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe non configurato: imposta le chiavi Stripe test.');
  if (!key.startsWith('sk_test_') && process.env.ALLOW_LIVE_PAYMENTS !== 'true') {
    throw new Error('Il checkout è limitato alle chiavi Stripe test.');
  }
  client ??= new Stripe(key);
  return client;
}
