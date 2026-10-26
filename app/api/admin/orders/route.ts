import { NextResponse } from 'next/server';
import { adminRoute } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { orderQuery } from '@/lib/order-query';
export const dynamic = 'force-dynamic';
export const GET = adminRoute(async request => {
  const { query, where, orderBy } = orderQuery(request);
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy, skip: (query.page - 1) * 25, take: 25, include: { refundOperation: true } })
  ]);
  return NextResponse.json({ total, page: query.page, pageSize: 25, orders: orders.map(({ checkoutFingerprint: _fingerprint, checkoutKey: _key, excludedBatchId: _batch, ...order }) => order) });
});
