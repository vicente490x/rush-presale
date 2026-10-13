import { NextResponse } from 'next/server';
import { cookieName, isAdminRequest } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
