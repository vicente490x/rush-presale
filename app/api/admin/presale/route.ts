import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { stripeClient } from '@/lib/stripe';
import { logError } from '@/lib/logger';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({ open: z.boolean() });

export async function POST(request: Request) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
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
    const stripe = stripeClient();
    const failed: string[] = [];
    for (const order of pending) {
      try {
        const session = await stripe.checkout.sessions.expire(order.stripeSessionId!);
        if (session.status === 'expired') {
          await prisma.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
        }
      } catch (error) {
        failed.push(order.id);
        logError('admin.presale.checkout.cancel.failed', error);
      }
    }
    if (failed.length) {
      return NextResponse.json({ error: `PRE-SALE chiusa; ${failed.length} checkout richiedono verifica su Stripe.` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError('admin.presale.update.failed', error);
    return NextResponse.json({ error: 'Impossibile aggiornare lo stato PRE-SALE.' }, { status: 503 });
  }
}
