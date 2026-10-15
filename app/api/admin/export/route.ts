import { NextResponse } from 'next/server';
import { ClothingSize } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { csvCell } from '@/lib/presale-logic';

function xml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[character] ?? character);
}

function xlsCell(value: unknown) {
  const type = typeof value === 'number' ? 'Number' : 'String';
  return `<Cell><Data ss:Type="${type}">${xml(value)}</Data></Cell>`;
}

function xlsWorksheet(name: string, rows: unknown[][]) {
  return `<Worksheet ss:Name="${xml(name)}"><Table>${rows.map((row) => `<Row>${row.map(xlsCell).join('')}</Row>`).join('')}</Table></Worksheet>`;
}

export async function GET(request: Request) {
  const [orders, groups, settings] = await Promise.all([
    prisma.order.findMany({ where: { paymentStatus: 'PAID' }, orderBy: { createdAt: 'asc' } }),
    prisma.order.groupBy({
      by: ['size'],
      where: { paymentStatus: 'PAID', refundStatus: { not: 'REFUNDED' } },
      _sum: { quantity: true }
    }),
    prisma.settings.findUnique({ where: { id: 'global' }, select: { productionStatus: true } })
  ]);
  const productionStatus = settings?.productionStatus ?? 'IN_RACCOLTA';
  const headers = ['Ordine', 'Nome', 'Cognome', 'Email', 'Taglia', 'Quantità', 'Importo EUR', 'Pagato il', 'Scadenza', 'Pagamento', 'Produzione', 'Rimborso', 'Rimborsato il', 'Consegna', 'Creato il'];
  const rows = orders.map((order) => [
    order.orderNumber, order.firstName, order.lastName, order.email, order.size, order.quantity,
    (order.amountCents / 100).toFixed(2).replace('.', ','),
    order.paidAt?.toISOString(), order.expiresAt?.toISOString(), order.paymentStatus, productionStatus, order.refundStatus,
    order.refundedAt?.toISOString(), order.deliveryStatus, order.createdAt.toISOString()
  ].map(csvCell).join(';'));
  const excelRows: unknown[][] = [
    headers,
    ...orders.map((order) => [
      order.orderNumber, order.firstName, order.lastName, order.email, order.size, order.quantity,
      order.amountCents / 100, order.paidAt?.toISOString(), order.expiresAt?.toISOString(),
      order.paymentStatus, productionStatus, order.refundStatus, order.refundedAt?.toISOString(), order.deliveryStatus, order.createdAt.toISOString()
    ])
  ];
  const summary = [
    '',
    [csvCell('RIEPILOGO TAGLIE PRODUTTORE')].join(';'),
    [csvCell('Taglia'), csvCell('Pezzi netti (non rimborsati)')].join(';'),
    ...Object.values(ClothingSize).map((size) => {
      const count = groups.find((item) => item.size === size)?._sum.quantity ?? 0;
      return [csvCell(size), csvCell(count)].join(';');
    })
  ];
  const summaryRows: unknown[][] = [
    ['Taglia', 'Pezzi netti (non rimborsati)'],
    ...Object.values(ClothingSize).map((size) => [
      size,
      groups.find((item) => item.size === size)?._sum.quantity ?? 0
    ])
  ];
  if (new URL(request.url).searchParams.get('format') === 'xls') {
    const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${xlsWorksheet('Ordini', excelRows)}${xlsWorksheet('Riepilogo taglie', summaryRows)}</Workbook>`;
    return new NextResponse(workbook, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rush-ordini.xls"',
        'Cache-Control': 'no-store'
      }
    });
  }
  return new NextResponse(`\uFEFF${[headers.map(csvCell).join(';'), ...rows, ...summary].join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rush-ordini.csv"',
      'Cache-Control': 'no-store'
    }
  });
}
