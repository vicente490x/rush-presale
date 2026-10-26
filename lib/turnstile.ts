import { isIP } from 'node:net';

export async function verifyTurnstile(token: unknown, remoteIp?: string) {
  if (typeof token !== 'string' || !token || token.length > 2048 || !process.env.TURNSTILE_SECRET_KEY) return false;
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token
  });
  if (remoteIp && isIP(remoteIp)) body.set('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Verifica anti-bot non disponibile (${response.status}).`);
  const result = (await response.json()) as { success?: boolean; hostname?: string };
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').hostname;
  return result.success === true && result.hostname === expected;
}
