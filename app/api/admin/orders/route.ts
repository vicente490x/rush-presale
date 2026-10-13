import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(orders, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logError('admin.orders.unavailable', error);
    return NextResponse.json({ error: 'Elenco ordini non disponibile.' }, { status: 503 });
  }
}
