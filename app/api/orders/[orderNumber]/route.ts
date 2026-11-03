import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { databaseRateLimit } from '@/lib/db-ratelimit';
import { clientIp } from '@/lib/ratelimit';
import { cookie } from '@/lib/http';
import { hasOrderAccess, orderAccessCookie } from '@/lib/order-access';
import { stripeClient } from '@/lib/stripe';
import { stripeMode } from '@/lib/config';
import { verifiedPayment } from '@/lib/payment-confirmation';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    if (!await databaseRateLimit(clientIp(request), 'order-lookup', 60, 60000)) return NextResponse.json({ error: 'Troppi controlli. Attendi un minuto.' }, { status: 429 });
    const { orderNumber } = await context.params;
    if (!/^RUSH-[A-F0-9]{8,32}$/i.test(orderNumber)) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
    const code = orderNumber.toUpperCase();
    if (!hasOrderAccess(code, cookie(request, orderAccessCookie(code)))) return NextResponse.json({ error: 'Apri la conferma dal browser usato per il checkout. Se non è più disponibile, contatta l’assistenza con il codice ordine.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    const order = await prisma.order.findUnique({ where: { orderNumber: orderNumber.toUpperCase() },
      select: { id: true, orderNumber: true, size: true, quantity: true, paymentStatus: true, refundStatus: true, expiresAt: true,
        amountCents: true, currency: true, stripeSessionId: true, stripePaymentIntentId: true } });
    if (!order) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
    if (!order.stripeSessionId) return NextResponse.json({ error: 'Pagamento in preparazione. Riprova tra poco.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    const session = await stripeClient().checkout.sessions.retrieve(order.stripeSessionId, { expand: ['payment_intent.latest_charge'] });
    const payment = verifiedPayment(order, session, stripeMode() === 'live');
    const current = await prisma.settings.findUnique({ where: { id: 'global' }, select: { productionStartedAt: true } });
    return NextResponse.json({ orderNumber: order.orderNumber, size: order.size, quantity: order.quantity,
      amountCents: order.amountCents, currency: order.currency, refundStatus: order.refundStatus, expiresAt: order.expiresAt,
      ...payment, productionStartedAt: current?.productionStartedAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Conferma non disponibile. Riprova più tardi.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
