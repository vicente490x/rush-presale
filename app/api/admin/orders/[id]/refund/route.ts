import { NextResponse } from 'next/server';
import { RefundStatus, PaymentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripeClient } from '@/lib/stripe';
import { enqueueEmail } from '@/lib/mail';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.paymentStatus !== PaymentStatus.PAID || !order.stripePaymentIntentId) {
    return NextResponse.json({ error: 'Ordine pagato rimborsabile non trovato.' }, { status: 404 });
  }
  if (order.refundStatus === RefundStatus.REFUNDED) return NextResponse.json({ error: 'Ordine già rimborsato.' }, { status: 409 });
  try {
    await prisma.order.update({ where: { id }, data: { refundStatus: RefundStatus.PENDING } });
    await stripeClient().refunds.create(
      { payment_intent: order.stripePaymentIntentId },
      { idempotencyKey: `refund-${order.orderNumber}` }
    );
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { refundStatus: RefundStatus.REFUNDED, orderStatus: OrderStatus.REFUNDED, refundedAt: new Date() } });
      await tx.emailOutbox.upsert({
        where: { dedupeKey: `manual-refund:${order.id}` },
        create: {
          dedupeKey: `manual-refund:${order.id}`,
          to: order.email,
          subject: `RUSH PRE-SALE — ordine ${order.orderNumber} rimborsato`,
          text: `Ciao ${order.firstName},\n\nabbiamo rimborsato il tuo ordine ${order.orderNumber}. L’accredito arriva sul metodo di pagamento utilizzato, di solito entro 5-10 giorni lavorativi.\n\n— RUSH`
        },
        update: {}
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.order.update({ where: { id }, data: { refundStatus: RefundStatus.FAILED } });
    console.error(`Rimborso ${order.orderNumber} non riuscito`, error);
    return NextResponse.json({ error: 'Rimborso non riuscito. Controlla Stripe e riprova.' }, { status: 502 });
  }
}
