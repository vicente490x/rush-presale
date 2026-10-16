import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { appEnv } from '@/lib/config';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const environment = appEnv();
  let response: NextResponse;
  if (pathname === '/admin/login' || pathname === '/api/admin/login') response = NextResponse.next();
  else {
    const allowed = await isAdminSession(request.cookies.get('rush_admin_session')?.value);
    if (allowed) response = NextResponse.next();
    else if (pathname.startsWith('/api/')) response = NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
    else response = NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (environment !== 'production') response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/:path*']
};
