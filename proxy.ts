import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession, cookieName } from '@/lib/admin-auth';
import { appEnv } from '@/lib/config';
import { randomBytes } from 'node:crypto';
import { contentSecurityPolicy } from '@/lib/security-headers';
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const environment = appEnv();
  const nonce = randomBytes(24).toString('base64');
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  let response: NextResponse = NextResponse.next({ request: { headers: requestHeaders } });
  // Public brand assets may be cached; storefront and API responses remain private.
  const brandAsset = ['/assets/logo.png', '/assets/mockup-fronte.png', '/assets/mockup-retro.png'].includes(path);
  if ((path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/')) && path !== '/admin/login' && path !== '/api/admin/login' && !await isAdminSession(request.cookies.get(cookieName)?.value)) {
    response = path.startsWith('/api/') ? NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 }) : NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (environment !== 'production') response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Content-Security-Policy', csp);
  if (!brandAsset && !path.startsWith('/_next/static/') && path !== '/_next/image' && path !== '/favicon.ico') {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  }
  return response;
}
export const config = { matcher: ['/:path*'] };
