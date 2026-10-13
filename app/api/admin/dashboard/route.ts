import { NextResponse } from 'next/server';
import { ClothingSize } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { paidPieces, settings, hasProductionStarted } from '@/lib/settings';
import { logError } from '@/lib/logger';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  try {
    const [current, total, ordersCount, revenue, sizes, failedRefunds] = await Promise.all([
      settings(),
      paidPieces(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } },
        _sum: { amountCents: true }
      }),
      prisma.order.groupBy({
        by: ['size'],
        where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } },
        _sum: { quantity: true }
      }),
      prisma.order.count({ where: { paymentStatus: 'PAID', refundStatus: 'FAILED' } })
    ]);
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 86_400_000);
    const refundableWhere = { paymentStatus: 'PAID' as const, refundStatus: 'NONE' as const, expiresAt: { lte: soon } };
    const [nearExpiry, overdue] = hasProductionStarted(current.productionStatus)
      ? [0, 0]
      : await Promise.all([
          prisma.order.count({ where: { ...refundableWhere, expiresAt: { gt: now, lte: soon } } }),
          prisma.order.count({ where: { ...refundableWhere, expiresAt: { lte: now } } })
        ]);
    const bySize = Object.fromEntries(Object.values(ClothingSize).map((size) => [size, 0])) as Record<ClothingSize, number>;
    for (const row of sizes) bySize[row.size] = row._sum.quantity ?? 0;
    return NextResponse.json({
      total,
      threshold: current.threshold,
      percent: Math.min(100, Math.round(total / current.threshold * 100)),
      ordersCount,
      revenueCents: revenue._sum.amountCents ?? 0,
      bySize,
      open: current.presaleOpen,
      production: current.productionStatus,
      thresholdReached: total >= current.threshold,
      nearExpiry,
      toRefund: overdue + failedRefunds,
      tryOnEnabled: current.tryOnEnabled,
      tryOnDailyLimit: current.tryOnDailyLimit,
      tryOnGenerations: await prisma.tryOnJob.count({ where: { createdAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } } }),
      tryOnFailures: await prisma.tryOnJob.count({ where: { createdAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) }, status: 'FAILED' } }),
      tryOnCostUsd: Number(current.tryOnDailySpendUsd)
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logError('admin.dashboard.unavailable', error);
    return NextResponse.json({ error: 'Dashboard non disponibile.' }, { status: 503 });
  }
}
