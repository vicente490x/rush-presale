import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { expireCheckoutSession } from '@/lib/stripe';

const schema = z.object({ open: z.boolean() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Stato PRE-SALE non valido.' }, { status: 400 });
  try {
    await prisma.settings.upsert({
      where: { id: 'global' },
      create: { id: 'global', presaleOpen: parsed.data.open },
      update: { presaleOpen: parsed.data.open }
    });
    if (parsed.data.open) return NextResponse.json({ ok: true });

    const pending = await prisma.order.findMany({
      where: { paymentStatus: 'PENDING', stripeSessionId: { not: null } },
      select: { id: true, stripeSessionId: true }
    });
    const failed: string[] = [];
    for (const order of pending) {
      try {
        const session = await expireCheckoutSession(order.stripeSessionId!);
        if (session.status === 'expired') {
          await prisma.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
        }
      } catch (error) {
        failed.push(order.id);
        console.error(`Annullamento checkout ${order.id} non riuscito`, error);
      }
    }
    if (failed.length) {
      return NextResponse.json({ error: `PRE-SALE chiusa; ${failed.length} checkout richiedono verifica su Stripe.` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Aggiornamento apertura PRE-SALE non riuscito', error);
    return NextResponse.json({ error: 'Impossibile aggiornare lo stato PRE-SALE.' }, { status: 503 });
  }
}
