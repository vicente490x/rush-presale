import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

let redis: Redis | undefined;
const limiters = new Map<string, Ratelimit>();

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Rate limiting non configurato: imposta Upstash Redis.');
  redis ??= new Redis({ url, token });
  return redis;
}

export async function enforceRateLimit(ip: string, namespace: string, limit: number, window: `${number} m` | `${number} h`) {
  let limiter = limiters.get(namespace);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, window),
      timeout: 5000,
      prefix: `rush:${namespace}`
    });
    limiters.set(namespace, limiter);
  }
  const subject = createHash('sha256').update(ip).digest('hex');
  const result = await limiter.limit(subject);
  // Upstash's timeout response defaults to success=true: it is not an allowance
  // from Redis and must never authorize checkout when the service is unavailable.
  if (result.reason === 'timeout') throw new Error('RATE_LIMIT_UNAVAILABLE');
  return result;
}

export function clientIp(request: Request) {
  // Vercel overwrites X-Forwarded-For. Direct/self-hosted clients cannot be
  // trusted to supply their own rate-limit identity; use a shared bucket there.
  if (process.env.VERCEL !== '1') return 'unknown';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return ip && isIP(ip) ? ip : 'unknown';
}
