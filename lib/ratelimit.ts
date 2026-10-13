import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

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
      prefix: `rush:${namespace}`
    });
    limiters.set(namespace, limiter);
  }
  const subject = createHash('sha256').update(ip).digest('hex');
  return limiter.limit(subject);
}

export function clientIp(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return realIp || forwarded || 'unknown';
}
