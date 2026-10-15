import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

let redis: Redis | undefined;
const limiters = new Map<string, Ratelimit>();
const memoryLimits = new Map<string, { count: number; resetAt: number }>();

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Rate limiting non configurato: imposta Upstash Redis.');
  redis ??= new Redis({ url, token });
  return redis;
}

export async function enforceRateLimit(ip: string, namespace: string, limit: number, window: `${number} m` | `${number} h`) {
  const useMemoryRateLimit = process.env.APP_ENV !== 'production' &&
    process.env.APP_ENV !== 'preview' &&
    (process.env.RATE_LIMIT_PROVIDER === 'memory' || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN);
  if (useMemoryRateLimit) {
    const duration = Number.parseInt(window, 10) * (window.endsWith(' h') ? 60 : 1) * 60_000;
    const key = `${namespace}:${createHash('sha256').update(ip).digest('hex')}`;
    const current = memoryLimits.get(key);
    const timestamp = Date.now();
    if (!current || current.resetAt <= timestamp) {
      const entry = { count: 1, resetAt: timestamp + duration };
      memoryLimits.set(key, entry);
      return { success: true, limit, remaining: limit - 1, reset: entry.resetAt };
    }
    if (current.count >= limit) {
      return { success: false, limit, remaining: 0, reset: current.resetAt };
    }
    current.count++;
    return { success: true, limit, remaining: limit - current.count, reset: current.resetAt };
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

  const subject = createHash('sha256').update(ip).digest('hex');
  return limiter.limit(subject);
}

export function resetMemoryRateLimits() {
  if (process.env.NODE_ENV !== 'test' && process.env.RUSH_TEST_MODE !== '1') {
    throw new Error('Il reset del rate limit è disponibile solo in ambiente di test.');
  }
  memoryLimits.clear();
}

export function clientIp(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return realIp || forwarded || 'unknown';
}
