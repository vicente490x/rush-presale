import { NextResponse } from 'next/server';
import { DeliveryStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';

const schema = z.object({ status: z.nativeEnum(DeliveryStatus) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Stato consegna non valido.' }, { status: 400 });
  const { id } = await context.params;
  const updated = await prisma.order.updateMany({ where: { id }, data: { deliveryStatus: parsed.data.status } });
  if (!updated.count) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
