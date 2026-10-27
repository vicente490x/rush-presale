export function contentSecurityPolicy(nonce: string) {
  const development = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    // Client-side navigation retains the original document policy. Permit the
    // bundled viewer's WASM decoder across entry pages, never JavaScript eval.
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' ${development ? "'unsafe-eval' " : ''}https://challenges.cloudflare.com`,
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://challenges.cloudflare.com",
    "connect-src 'self' blob: https://challenges.cloudflare.com", "frame-src https://challenges.cloudflare.com",
    ...(development ? [] : ['upgrade-insecure-requests'])
  ].join('; ');
}
