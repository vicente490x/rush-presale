import { NextResponse } from 'next/server';
import { cookieName } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: process.env.APP_ENV === 'production' || process.env.APP_ENV === 'preview' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  return response;
}
