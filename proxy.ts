import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/admin/login' || pathname === '/api/admin/login') return NextResponse.next();
  const allowed = await isAdminSession(request.cookies.get('rush_admin_session')?.value);
  if (allowed) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
};
