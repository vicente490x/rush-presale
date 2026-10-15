export async function verifyTurnstile(token: unknown, remoteIp?: string) {
  if (process.env.APP_ENV !== 'production' && process.env.TURNSTILE_MODE === 'mock') {
    return token === 'test-pass';
  }
  if (typeof token !== 'string' || !token || !process.env.TURNSTILE_SECRET_KEY) return false;
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
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
