import { NextResponse } from 'next/server';
import { createCheckout } from '@/lib/checkout';
import { orderInput } from '@/lib/operational-schema';
import { assertSameOrigin, readJson } from '@/lib/http';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { DomainError, logError } from '@/lib/errors';
import { issueOrderAccess, orderAccessCookie, orderAccessMaxAge } from '@/lib/order-access';
import { secureCookies } from '@/lib/config';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIp(request);
    const limit = await enforceRateLimit(ip, 'checkout', 5, '15 m');
    if (!limit.success) return NextResponse.json({ error: 'Troppi tentativi. Riprova più tardi.' }, { status: 429 });
    const parsed = orderInput.safeParse(await readJson(request));
    if (!parsed.success) throw new DomainError('Verifica nome, cognome, email, taglia, quantità e accettazione delle condizioni.', 400);
    if (!await verifyTurnstile(parsed.data.turnstileToken, ip)) throw new DomainError('Completa la verifica anti-bot.', 400);
    const checkout = await createCheckout(parsed.data);
    const response = NextResponse.json({ checkoutUrl: checkout.checkoutUrl }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(orderAccessCookie(checkout.orderNumber), issueOrderAccess(checkout.orderNumber), {
      httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/api/orders', maxAge: orderAccessMaxAge
    });
    return response;
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
    await logError('CHECKOUT_UNAVAILABLE');
    return NextResponse.json({ error: 'Checkout non disponibile. Riprova con gli stessi dati; il tentativo resta identificato.' }, { status: 503 });
  }
}
