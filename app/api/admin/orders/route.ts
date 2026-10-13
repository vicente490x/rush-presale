import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(orders, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Elenco ordini non disponibile', error);
    return NextResponse.json({ error: 'Elenco ordini non disponibile.' }, { status: 503 });
  }
}
