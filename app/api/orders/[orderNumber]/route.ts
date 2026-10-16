import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { databaseRateLimit } from '@/lib/db-ratelimit';
import { clientIp } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    if (!await databaseRateLimit(clientIp(request), 'order-lookup', 60, 60000)) return NextResponse.json({ error: 'Troppi controlli. Attendi un minuto.' }, { status: 429 });
    const { orderNumber } = await context.params;
    if (!/^RUSH-[A-F0-9]{8,32}$/i.test(orderNumber)) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
    const order = await prisma.order.findUnique({ where: { orderNumber: orderNumber.toUpperCase() },
      select: { orderNumber: true, size: true, quantity: true, paymentStatus: true, refundStatus: true, expiresAt: true } });
    if (!order) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
    const current = await prisma.settings.findUnique({ where: { id: 'global' }, select: { productionStartedAt: true } });
    return NextResponse.json({ ...order, productionStartedAt: current?.productionStartedAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Conferma non disponibile. Riprova più tardi.' }, { status: 503 }); }
}
