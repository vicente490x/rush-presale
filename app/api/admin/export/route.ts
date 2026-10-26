import { NextResponse } from 'next/server';
import { ClothingSize } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { adminRoute } from '@/lib/http';
import { orderQuery } from '@/lib/order-query';
import { makeCsv, makeXlsx } from '@/lib/export';
import { DomainError } from '@/lib/errors';
import { settings } from '@/lib/settings';
export const runtime = 'nodejs';
export const GET = adminRoute(async (request, _context, actor) => {
  const format = new URL(request.url).searchParams.get('format') ?? 'csv';
  if (!['csv', 'xlsx'].includes(format)) throw new DomainError('Formato non valido.', 400);
  const { where, orderBy } = orderQuery(request);
  const [orders, current] = await Promise.all([prisma.order.findMany({ where, orderBy, take: 10001 }), settings()]);
  if (orders.length > 10000) throw new DomainError('Oltre 10.000 ordini: restringi i filtri per esportare.', 400);
  const headers = ['Ordine', 'Nome', 'Cognome', 'Email', 'Taglia', 'Quantità', 'Prezzo unitario EUR', 'Importo EUR', 'Rimborsato EUR', 'Data ordine UTC', 'Pagato UTC', 'Scadenza UTC', 'Pagamento', 'Produzione', 'Avvio produzione UTC', 'Rimborso', 'Consegna', 'Stripe session', 'Stripe payment intent', 'Versione termini'];
  const rows = orders.map(o => [o.orderNumber, o.firstName, o.lastName, o.email, o.size, o.quantity, o.unitPriceCents / 100, o.amountCents / 100, o.refundedAmountCents / 100,
    o.createdAt.toISOString(), o.paidAt?.toISOString(), o.expiresAt?.toISOString(), o.paymentStatus, current.productionStatus, current.productionStartedAt?.toISOString(),
    o.refundStatus, o.deliveryStatus, o.stripeSessionId, o.stripePaymentIntentId, o.termsVersionId]);
  const summary = [['Taglia', 'Pezzi pagati non rimborsati (risultati filtrati)'], ...Object.values(ClothingSize).map(size => [size, orders.filter(o => o.size === size && o.paymentStatus === 'PAID' && o.refundStatus !== 'REFUNDED').reduce((sum, o) => sum + o.quantity, 0)])];
  await prisma.auditLog.create({ data: { actor, action: 'ORDERS_EXPORTED', after: { format, count: orders.length } } });
  const body = format === 'xlsx' ? Buffer.from(makeXlsx([{ name: 'Ordini', rows: [headers, ...rows] }, { name: 'Produttore', rows: summary }])) : makeCsv([headers, ...rows, [], ['RIEPILOGO PRODUTTORE'], ...summary]);
  return new NextResponse(body, { headers: { 'Content-Type': format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="rush-ordini.${format}"`, 'Cache-Control': 'no-store' } });
});
