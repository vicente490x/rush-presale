import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { now } from '@/lib/clock';
import { isMockRuntime } from '@/lib/mock-runtime';
import { completeMockCheckoutSession, stripeClient } from '@/lib/stripe';
import { POST as handleStripeWebhook } from '@/app/api/stripe/webhook/route';

export const runtime = 'nodejs';

const schema = z.object({ sessionId: z.string().regex(/^cs_test_mock_[a-f0-9]{32}$/) });

export async function POST(request: Request) {
  if (!isMockRuntime() || process.env.PAYMENT_PROVIDER !== 'mock') {
    return NextResponse.json({ error: 'Checkout mock non disponibile.' }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Sessione checkout non valida.' }, { status: 400 });

  try {
    const session = completeMockCheckoutSession(parsed.data.sessionId);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('Firma webhook mock non configurata.');
    const payload = JSON.stringify({
      id: `evt_mock_${randomUUID().replace(/-/g, '')}`,
      object: 'event',
      api_version: '2025-06-30.basil',
      created: Math.floor(now().getTime() / 1000),
      data: {
        object: {
          id: session.id,
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
          metadata: session.metadata,
          payment_intent: session.payment_intent
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'checkout.session.completed'
    });
    const signature = stripeClient().webhooks.generateTestHeaderString({ payload, secret });
    const webhookResponse = await handleStripeWebhook(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
      body: payload
    }));
    const result: unknown = await webhookResponse.json();
    return NextResponse.json(result, { status: webhookResponse.status });
  } catch (error) {
    console.error('Completamento checkout mock non riuscito', error);
    return NextResponse.json({ error: 'Impossibile completare il checkout mock.' }, { status: 400 });
  }
}
