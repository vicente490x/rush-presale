import { NextResponse } from 'next/server';
import { adminRoute } from '@/lib/http';
import { cookieName } from '@/lib/admin-auth';
import { secureCookies } from '@/lib/config';
export const POST = adminRoute(async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, '', { httpOnly: true, secure: secureCookies(), sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
});
