import { NextResponse } from 'next/server';
import { PaymentStatus, ProductionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({ threshold: z.number().int().min(1).max(1_000_000) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'La soglia deve essere un numero intero positivo.' }, { status: 400 });

  try {
    const current = await prisma.settings.upsert({
      where: { id: 'global' },
      create: { id: 'global' },
      update: {}
    });
    const paidOrders = await prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID } });
    if (paidOrders > 0 || current.productionStatus !== ProductionStatus.IN_RACCOLTA) {
      return NextResponse.json({ error: 'La soglia può essere modificata solo prima del primo pagamento.' }, { status: 409 });
    }
    const updated = await prisma.settings.update({
      where: { id: 'global' },
      data: { threshold: parsed.data.threshold }
    });
    return NextResponse.json({ ok: true, threshold: updated.threshold });
  } catch (error) {
    console.error('Aggiornamento soglia PRE-SALE non riuscito', error);
    return NextResponse.json({ error: 'Impossibile aggiornare la soglia.' }, { status: 503 });
  }
}
