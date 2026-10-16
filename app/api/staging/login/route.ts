import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { appEnv, secureCookies } from '@/lib/config';
import { assertSameOrigin, readJson } from '@/lib/http';
import { databaseRateLimit } from '@/lib/db-ratelimit';
import { clientIp } from '@/lib/ratelimit';
import { createStagingSession, stagingCookie } from '@/lib/staging-auth';
import { DomainError } from '@/lib/errors';
export async function POST(request: Request) {
  try {
    if (appEnv() !== 'staging') return NextResponse.json({ error: 'Anteprima non attiva.' }, { status: 404 });
    assertSameOrigin(request);
    if (!await databaseRateLimit(clientIp(request), 'staging-login', 8, 15 * 60000)) return NextResponse.json({ error: 'Troppi tentativi. Riprova più tardi.' }, { status: 429 });
    const data = z.object({ password: z.string().min(1).max(200) }).safeParse(await readJson(request));
    if (!data.success || !process.env.STAGING_PASSWORD_HASH || !await bcrypt.compare(data.data.password, process.env.STAGING_PASSWORD_HASH)) return NextResponse.json({ error: 'Password non valida.' }, { status: 401 });
    if (process.env.ADMIN_PASSWORD_HASH && await bcrypt.compare(data.data.password, process.env.ADMIN_PASSWORD_HASH)) return NextResponse.json({ error: 'Configura password diverse per anteprima e amministrazione.' }, { status: 503 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(stagingCookie, await createStagingSession(), { httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/', maxAge: 43200 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof DomainError ? error.message : 'Accesso anteprima non disponibile.' }, { status: error instanceof DomainError ? error.status : 503 }); }
}
