import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

let redis: Redis | undefined;
const limiters = new Map<string, Ratelimit>();
const memoryLimiters = new Map<string, { count: number; resetAt: number }>();

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Rate limiting non configurato: imposta Upstash Redis.');
  redis ??= new Redis({ url, token });
  return redis;
}

function parseWindowMs(window: `${number} m` | `${number} h`) {
  const value = Number.parseInt(window, 10);
  return window.endsWith('h') ? value * 60 * 60 * 1000 : value * 60 * 1000;
}

export async function enforceRateLimit(ip: string, namespace: string, limit: number, window: `${number} m` | `${number} h`) {
  const subject = createHash('sha256').update(ip).digest('hex');
  const canUseRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) && process.env.RATE_LIMIT_MODE !== 'memory';
  if (!canUseRedis) {
    const key = `${namespace}:${subject}`;
    const now = Date.now();
    const current = memoryLimiters.get(key);
    if (!current || current.resetAt <= now) {
      memoryLimiters.set(key, { count: 1, resetAt: now + parseWindowMs(window) });
      return { success: true, limit, remaining: limit - 1, reset: new Date(now + parseWindowMs(window)) } as const;
    }
    if (current.count >= limit) {
      return { success: false, limit, remaining: 0, reset: new Date(current.resetAt) } as const;
    }
    current.count += 1;
    return { success: true, limit, remaining: limit - current.count, reset: new Date(current.resetAt) } as const;
  }

  let limiter = limiters.get(namespace);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `rush:${namespace}`
    });
    limiters.set(namespace, limiter);
  }
  return limiter.limit(subject);
}

export function clientIp(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return realIp || forwarded || 'unknown';
}
