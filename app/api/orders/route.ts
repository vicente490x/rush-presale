import { NextResponse } from 'next/server';
import { ClothingSize, PaymentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { appEnv, publicConfig } from '@/lib/config';
import { stripeClient } from '@/lib/stripe';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';

const orderSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(120),
  size: z.nativeEnum(ClothingSize),
  quantity: z.number().int().min(1).max(100),
  terms: z.literal(true),
  turnstileToken: z.string().min(1),
  website: z.string().max(0).optional()
});

function orderNumber() {
  return `RUSH-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  try {
    const limit = await enforceRateLimit(ip, 'checkout', 5, '15 m');
    if (!limit.success) return NextResponse.json({ error: 'Troppi tentativi. Riprova più tardi.' }, { status: 429 });
    const body: unknown = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dati ordine non validi.' }, { status: 400 });
    if (parsed.data.website) return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
    if (!await verifyTurnstile(parsed.data.turnstileToken, ip)) {
      return NextResponse.json({ error: 'Completa la verifica anti-bot.' }, { status: 400 });
    }
    const config = publicConfig();
    if (parsed.data.quantity > config.PRESALE_MAX_QUANTITY) {
      return NextResponse.json({ error: `La quantità massima per ordine è ${config.PRESALE_MAX_QUANTITY}.` }, { status: 400 });
    }

    const current = await prisma.settings.upsert({
      where: { id: 'global' },
      create: { id: 'global', threshold: config.PRESALE_THRESHOLD },
      update: {}
    });
    if (!current.presaleOpen) return NextResponse.json({ error: 'PRE-SALE CHIUSA' }, { status: 403 });
    const stripe = stripeClient();

    const order = await prisma.order.create({
      data: {
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        orderNumber: orderNumber(),
        size: parsed.data.size,
        quantity: parsed.data.quantity,
        amountCents: parsed.data.quantity * 2500,
        termsAcceptedAt: new Date(),
        isTest: appEnv !== 'production'
      }
    });
    try {
      const siteUrl = config.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: order.email,
        line_items: [{
          quantity: order.quantity,
          price_data: {
            currency: 'eur',
            unit_amount: 2500,
            product_data: { name: `RUSH T-SHIRT — PRE-SALE (taglia ${order.size})` }
          }
        }],
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.orderNumber } },
        success_url: `${siteUrl}/conferma?code=${order.orderNumber}`,
        cancel_url: `${siteUrl}/presale?annullato=1`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60
      });
      await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
      const latestSettings = await prisma.settings.findUniqueOrThrow({ where: { id: 'global' } });
      if (!latestSettings.presaleOpen) {
        try {
          const expired = await stripe.checkout.sessions.expire(session.id);
          if (expired.status === 'expired') {
            await prisma.order.updateMany({ where: { id: order.id, paymentStatus: PaymentStatus.PENDING }, data: { paymentStatus: PaymentStatus.FAILED } });
            return NextResponse.json({ error: 'La PRE-SALE è stata chiusa. Non è stato avviato alcun pagamento.' }, { status: 403 });
          }
        } catch (expireError) {
          try {
            const latestSession = await stripe.checkout.sessions.retrieve(session.id);
            if (latestSession.status === 'complete' && latestSession.payment_status === 'paid') {
              return NextResponse.json({ checkoutUrl: `${siteUrl}/conferma?code=${order.orderNumber}` }, { status: 201 });
            }
            if (latestSession.status === 'expired') {
              await prisma.order.updateMany({ where: { id: order.id, paymentStatus: PaymentStatus.PENDING }, data: { paymentStatus: PaymentStatus.FAILED } });
              return NextResponse.json({ error: 'La PRE-SALE è stata chiusa. Non è stato avviato alcun pagamento.' }, { status: 403 });
            }
          } catch (retrieveError) {
            logError('checkout.after_close.verify.failed', retrieveError);
          }
          logError('checkout.after_close.expire.failed', expireError);
          return NextResponse.json({ error: 'La PRE-SALE è chiusa; contatta l’assistenza per verificare il pagamento.' }, { status: 502 });
        }
      }
      if (!session.url) throw new Error('Stripe non ha restituito l’URL del checkout.');
      return NextResponse.json({ checkoutUrl: session.url }, { status: 201 });
    } catch (error) {
      await prisma.order.updateMany({ where: { id: order.id, paymentStatus: PaymentStatus.PENDING }, data: { paymentStatus: PaymentStatus.FAILED } });
      logError('checkout.create.failed', error);
      return NextResponse.json({ error: 'Checkout non disponibile. Riprova più tardi.' }, { status: 503 });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logError('order.create.failed', error);
    } else {
      logError('order.create.failed', error);
    }
    return NextResponse.json({ error: 'Impossibile completare la richiesta. Riprova più tardi.' }, { status: 503 });
  }
}
