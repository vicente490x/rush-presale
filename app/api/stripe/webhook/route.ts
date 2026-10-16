import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addCalendarMonths } from '@/lib/dates';
import { orderConfirmationText } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { paidPieces } from '@/lib/settings';
import { stripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';

async function enqueueThresholdNotification() {
  await prisma.$transaction(async (tx) => {
    const settings = await tx.settings.findUnique({ where: { id: 'global' } });
    if (!settings || settings.thresholdNotifiedAt || !process.env.ADMIN_EMAIL) return;
    const pieces = await tx.order.aggregate({
      where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } },
      _sum: { quantity: true }
    });
    const total = pieces._sum.quantity ?? 0;
    if (total < settings.threshold) return;
    const claimed = await tx.settings.updateMany({
      where: { id: 'global', thresholdNotifiedAt: null },
      data: { thresholdNotifiedAt: new Date(), productionStatus: 'SOGLIA_RAGGIUNTA' }
    });
    if (claimed.count !== 1) return;
    await tx.emailOutbox.upsert({
      where: { dedupeKey: 'threshold-reached' },
      create: {
        dedupeKey: 'threshold-reached',
        to: process.env.ADMIN_EMAIL,
        subject: 'RUSH PRE-SALE — SOGLIA RAGGIUNTA',
        text: `Sono state prenotate ${total} magliette.\nLa produzione può essere avviata dal pannello admin. La PRE-SALE resta aperta.`
      },
      update: {}
    });
  });
}

async function ensureOrderConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== 'PAID') return;
  await prisma.emailOutbox.upsert({
    where: { dedupeKey: `order-confirmation:${order.id}` },
    create: {
      dedupeKey: `order-confirmation:${order.id}`,
      to: order.email,
      subject: `RUSH PRE-SALE — ordine ${order.orderNumber} confermato`,
      text: orderConfirmationText(order)
    },
    update: {}
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook non configurato.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    event = stripeClient().webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    console.error('Firma webhook Stripe non valida', error);
    return NextResponse.json({ error: 'Firma webhook non valida.' }, { status: 400 });
  }

  try {
    let confirmationOrderId: string | undefined;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.stripeWebhookEvent.findUnique({ where: { id: event.id } });
      if (existing) {
        const session = event.data.object as Stripe.Checkout.Session;
        confirmationOrderId = session.metadata?.orderId;
        return;
      }

      await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== 'paid' || !session.metadata?.orderId) return;
        const order = await tx.order.findUnique({ where: { id: session.metadata.orderId } });
        if (!order) throw new Error(`Ordine Stripe non trovato: ${session.metadata.orderId}`);
        const paidAt = new Date(event.created * 1000);
        await tx.order.updateMany({
          where: { id: order.id, paymentStatus: 'PENDING' },
          data: {
            paymentStatus: 'PAID',
            orderStatus: 'CONFIRMED',
            paidAt,
            expiresAt: addCalendarMonths(paidAt, 2),
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
          }
        });
        confirmationOrderId = order.id;
      } else if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.orderId) {
          await tx.order.updateMany({
            where: { id: session.metadata.orderId, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'FAILED' }
          });
        }
      } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'payment_intent.payment_failed') {
        const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
        const orderId = 'metadata' in object ? object.metadata?.orderId : undefined;
        if (orderId) await tx.order.updateMany({ where: { id: orderId, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) await tx.order.updateMany({
          where: { stripePaymentIntentId: paymentIntentId, refundStatus: { not: 'REFUNDED' } },
          data: { refundStatus: 'REFUNDED', orderStatus: 'REFUNDED', refundedAt: new Date(event.created * 1000) }
        });
      }
    });

    if (confirmationOrderId) await ensureOrderConfirmation(confirmationOrderId);
    await enqueueThresholdNotification();
    return NextResponse.json({ received: true, pieces: await paidPieces() });
  } catch (error) {
    console.error(`Elaborazione webhook ${event.id} non riuscita`, error);
    return NextResponse.json({ error: 'Elaborazione webhook non riuscita.' }, { status: 500 });
  }
}
