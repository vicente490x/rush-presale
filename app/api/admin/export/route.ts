import { NextResponse } from 'next/server';
import { ClothingSize } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';

function csv(value: unknown) {
  const text = String(value ?? '').replace(/[\r\n]/g, ' ');
  return `"${/^\s*[=+\-@]/.test(text) ? `'${text}` : text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  const orders = await prisma.order.findMany({ where: { paymentStatus: 'PAID' }, orderBy: { createdAt: 'asc' } });
  const groups = await prisma.order.groupBy({
    by: ['size'],
    where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } },
    _sum: { quantity: true }
  });
  const headers = ['Ordine', 'Nome', 'Cognome', 'Email', 'Taglia', 'Quantità', 'Importo EUR', 'Pagato il', 'Scadenza', 'Pagamento', 'Rimborso', 'Consegna'];
  const rows = orders.map((order) => [
    order.orderNumber, order.firstName, order.lastName, order.email, order.size, order.quantity,
    (order.amountCents / 100).toFixed(2).replace('.', ','),
    order.paidAt?.toISOString(), order.expiresAt?.toISOString(), order.paymentStatus, order.refundStatus, order.deliveryStatus
  ].map(csv).join(';'));
  const summary = ['', 'RIEPILOGO TAGLIE PRODUTTORE', ...Object.values(ClothingSize).map((size) => {
    const count = groups.find((item) => item.size === size)?._sum.quantity ?? 0;
    return `${csv(size)};${count}`;
  })];
  return new NextResponse(`\uFEFF${[headers.map(csv).join(';'), ...rows, ...summary].join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rush-ordini.csv"',
      'Cache-Control': 'no-store'
    }
  });
}
