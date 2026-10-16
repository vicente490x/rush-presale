import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createAdminSession, cookieName } from '@/lib/admin-auth';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';

const schema = z.object({
  password: z.string().min(1).max(200),
  turnstileToken: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const hostname = new URL(request.url).hostname;
    const localDevelopment = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(hostname);
    const ip = clientIp(request);
    if (!localDevelopment) {
      const limit = await enforceRateLimit(ip, 'admin-login', 10, '15 m');
      if (!limit.success) return NextResponse.json({ error: 'Troppi tentativi di accesso. Riprova più tardi.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Inserisci la password e completa la verifica anti-bot.' }, { status: 400 });
    if (!localDevelopment && !await verifyTurnstile(parsed.data.turnstileToken, ip)) {
      return NextResponse.json({ error: 'Verifica anti-bot non riuscita.' }, { status: 400 });
    }
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash || !await bcrypt.compare(parsed.data.password, hash)) {
      return NextResponse.json({ error: 'Credenziali non valide.' }, { status: 401 });
    }
    const token = await createAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'preview',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60
    });
    return response;
  } catch (error) {
    console.error('Login admin non riuscito', error);
    return NextResponse.json({ error: 'Login non disponibile.' }, { status: 503 });
  }
}
