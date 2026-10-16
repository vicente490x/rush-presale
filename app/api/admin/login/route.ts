import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createAdminSession, cookieName } from '@/lib/admin-auth';
import { clientIp } from '@/lib/ratelimit';
import { databaseRateLimit } from '@/lib/db-ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { assertSameOrigin, readJson } from '@/lib/http';
import { appEnv, secureCookies } from '@/lib/config';
import { DomainError } from '@/lib/errors';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIp(request);
    if (!await databaseRateLimit(ip, 'admin-login', 10, 15 * 60000)) return NextResponse.json({ error: 'Troppi tentativi. Riprova più tardi.' }, { status: 429 });
    const parsed = z.object({ password: z.string().min(1).max(200), turnstileToken: z.string().min(1).max(4096) }).safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: 'Credenziali non valide.' }, { status: 400 });
    const local = appEnv() === 'development' && process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
    if (!local && !await verifyTurnstile(parsed.data.turnstileToken, ip)) return NextResponse.json({ error: 'Verifica anti-bot non riuscita.' }, { status: 400 });
    if (!process.env.ADMIN_PASSWORD_HASH || !await bcrypt.compare(parsed.data.password, process.env.ADMIN_PASSWORD_HASH)) return NextResponse.json({ error: 'Credenziali non valide.' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, await createAdminSession(), { httpOnly: true, secure: secureCookies(), sameSite: 'strict', path: '/', maxAge: 43200 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof DomainError ? error.message : 'Login non disponibile.' }, { status: error instanceof DomainError ? error.status : 503 }); }
}
