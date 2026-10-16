import { NextResponse } from 'next/server';
import { ClothingSize } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { paidWhere, settings } from '@/lib/settings';
import { adminRoute } from '@/lib/http';
import { expiryPreview } from '@/lib/expiry';
export const dynamic = 'force-dynamic';
export const GET = adminRoute(async () => {
  const current = await settings();
  const [pieces, ordersCount, paidOrders, money, sizes, pendingRefunds, failedRefunds, toDeliver, recent, preview] = await Promise.all([
    prisma.order.aggregate({ where: paidWhere, _sum: { quantity: true } }), prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: 'PAID' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { amountCents: true, refundedAmountCents: true } }),
    prisma.order.groupBy({ by: ['size'], where: paidWhere, _sum: { quantity: true } }),
    prisma.order.count({ where: { refundStatus: 'PENDING' } }), prisma.order.count({ where: { refundStatus: 'FAILED' } }),
    prisma.order.count({ where: { ...paidWhere, deliveryStatus: { not: 'CONSEGNATA' } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }), expiryPreview()
  ]);
  const total = pieces._sum.quantity ?? 0, gross = money._sum.amountCents ?? 0, refunded = money._sum.refundedAmountCents ?? 0;
  return NextResponse.json({ total, threshold: current.threshold, percent: Math.round(total / current.threshold * 100), missing: Math.max(0, current.threshold - total),
    ordersCount, paidOrders, grossCents: gross, refundedCents: refunded, revenueCents: gross - refunded,
    bySize: Object.fromEntries(Object.values(ClothingSize).map(size => [size, sizes.find(s => s.size === size)?._sum.quantity ?? 0])),
    open: current.presaleOpen, maintenance: current.maintenance, production: current.productionStatus, productionStartedAt: current.productionStartedAt,
    thresholdReached: total >= current.threshold, nearExpiry: preview.warnings.length, toRefund: preview.due.length,
    pendingRefunds, failedRefunds, toDeliver, recent, previewTruncated: preview.truncated
  });
});
