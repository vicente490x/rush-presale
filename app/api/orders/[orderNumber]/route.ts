import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    select: { orderNumber: true, size: true, quantity: true, paymentStatus: true, expiresAt: true }
  });
  if (!order) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
  return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } });
}
