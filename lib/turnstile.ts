import { appEnv } from '@/lib/config';

export async function verifyTurnstile(token: unknown, remoteIp?: string) {
  if (appEnv !== 'production' && (process.env.TURNSTILE_MODE === 'test' || !process.env.TURNSTILE_SECRET_KEY)) return true;
  if (!process.env.TURNSTILE_SECRET_KEY) throw new Error('TURNSTILE_SECRET_KEY non configurata.');
  if (typeof token !== 'string' || !token) return false;
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token
  });
  if (remoteIp) body.set('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Verifica anti-bot non disponibile (${response.status}).`);
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
