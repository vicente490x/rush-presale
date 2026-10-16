import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession, cookieName } from '@/lib/admin-auth';
import { appEnv } from '@/lib/config';
import { isStagingSession, stagingCookie } from '@/lib/staging-auth';
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const environment = appEnv();
  let response: NextResponse = NextResponse.next();
  // Next image optimizer fetches public brand assets internally without gate cookies.
  const brandAsset = ['/assets/logo.png', '/assets/mockup-fronte.png', '/assets/mockup-retro.png'].includes(path);
  const publicGatePath = brandAsset || path === '/anteprima' || path === '/api/staging/login' || path === '/robots.txt' || path.startsWith('/_next/') || path === '/favicon.ico';
  const servicePath = path === '/api/stripe/webhook' || path === '/api/cron/daily' || path === '/api/cron/cleanup';
  if (environment === 'staging' && !publicGatePath && !servicePath && !await isStagingSession(request.cookies.get(stagingCookie)?.value)) {
    response = path.startsWith('/api/') ? NextResponse.json({ error: 'Accesso anteprima richiesto.' }, { status: 401 }) : NextResponse.redirect(new URL('/anteprima', request.url));
  } else if ((path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/')) && path !== '/admin/login' && path !== '/api/admin/login' && !await isAdminSession(request.cookies.get(cookieName)?.value)) {
    response = path.startsWith('/api/') ? NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 }) : NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (environment !== 'production') response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}
export const config = { matcher: ['/:path*'] };
