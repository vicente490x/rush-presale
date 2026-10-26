import { NextResponse } from 'next/server';
import { adminRoute, cookie } from '@/lib/http';
import { cookieName, revokeAdminSession } from '@/lib/admin-auth';
import { secureCookies } from '@/lib/config';
export const POST = adminRoute(async (request) => {
  await revokeAdminSession(cookie(request, cookieName));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, '', { httpOnly: true, secure: secureCookies(), sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
});
