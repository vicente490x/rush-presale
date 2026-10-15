import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createAdminSession, cookieName } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/turnstile';

const schema = z.object({
  username: z.string().trim().email().max(120),
  password: z.string().min(1).max(200),
  turnstileToken: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const hostname = new URL(request.url).hostname;
    const localDevelopment = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(hostname);
    const ip = clientIp(request);
    const limit = await enforceRateLimit(ip, 'admin-login', 10, '15 m');
    if (!limit.success) return NextResponse.json({ error: 'Troppi tentativi di accesso. Riprova più tardi.' }, { status: 429 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Inserisci la password e completa la verifica anti-bot.' }, { status: 400 });
    if (!localDevelopment && !await verifyTurnstile(parsed.data.turnstileToken, ip)) {
      return NextResponse.json({ error: 'Verifica anti-bot non riuscita.' }, { status: 400 });
    }
    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredEmail || !configuredPassword || configuredPassword.length < 12 || configuredPassword.toLowerCase() === 'admin') {
      console.error('Credenziali amministratore non configurate correttamente.');
      return NextResponse.json({ error: 'Accesso amministratore non configurato.' }, { status: 503 });
    }
    const email = parsed.data.username.toLowerCase();
    if (email !== configuredEmail) return NextResponse.json({ error: 'Credenziali non valide.' }, { status: 401 });
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user?.passwordHash || !await bcrypt.compare(parsed.data.password, user.passwordHash) ||
      !await bcrypt.compare(configuredPassword, user.passwordHash)) {
      return NextResponse.json({ error: 'Credenziali non valide.' }, { status: 401 });
    }
    const token = await createAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.APP_ENV === 'production' || process.env.APP_ENV === 'preview' || process.env.NODE_ENV === 'production',
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
