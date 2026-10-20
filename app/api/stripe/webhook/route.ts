import { NextResponse, after } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe';
import { processStripeEvent } from '@/lib/stripe-events';
import { logError } from '@/lib/errors';
import { readBytes } from '@/lib/http';
import { deliverPendingEmails } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Firma richiesta.' }, { status: 400 });
  let event: Stripe.Event;
  try {
    const raw = await readBytes(request, 1048576);
    event = stripeClient().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.livemode) return NextResponse.json({ error: 'Eventi live non consentiti.' }, { status: 400 });
  } catch {
    // Unauthenticated traffic must not create persistent database records.
    console.warn('STRIPE_WEBHOOK_REJECTED');
    return NextResponse.json({ error: 'Firma webhook non valida o Stripe TEST non configurato.' }, { status: 400 });
  }
  let receiptId: string | undefined;
  try {
    receiptId = (await prisma.webhookReceipt.create({ data: { eventId: event.id, type: event.type } })).id;
    const result = await processStripeEvent(event, stripeClient());
    await prisma.webhookReceipt.update({ where: { id: receiptId }, data: { status: result.duplicate ? 'DUPLICATE' : 'PROCESSED' } });
    after(async () => { await deliverPendingEmails(2); });
    return NextResponse.json({ received: true, ...result });
  }
  catch {
    if (receiptId) await prisma.webhookReceipt.update({ where: { id: receiptId }, data: { status: 'FAILED' } }).catch(() => undefined);
    await logError('STRIPE_WEBHOOK_PROCESSING_FAILED', event.id); return NextResponse.json({ error: 'Elaborazione non completata; ritentare.' }, { status: 500 });
  }
}
