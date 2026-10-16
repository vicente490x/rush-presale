import { NextResponse } from 'next/server';
import { DeliveryStatus } from '@prisma/client';
import { z } from 'zod';
import { adminRoute, readJson } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { DomainError } from '@/lib/errors';
export const POST = adminRoute(async (request, context: { params: Promise<{ id: string }> }, actor) => {
  const data = z.object({ status: z.nativeEnum(DeliveryStatus) }).strict().parse(await readJson(request));
  const { id } = await context.params;
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id } });
    if (order.paymentStatus !== 'PAID' || order.refundStatus !== 'NONE') throw new DomainError('Consegna modificabile solo per ordini pagati senza rimborso.');
    await tx.order.update({ where: { id }, data: { deliveryStatus: data.status } });
    await tx.auditLog.create({ data: { actor, action: 'DELIVERY_CHANGED', entityId: id, before: { status: order.deliveryStatus }, after: { status: data.status } } });
  });
  return NextResponse.json({ ok: true });
});
