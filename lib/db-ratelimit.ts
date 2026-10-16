import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
export async function databaseRateLimit(subject: string, namespace: string, limit: number, windowMs: number) {
  const key = namespace + ':' + createHash('sha256').update(subject).digest('hex');
  const now = new Date();
  const reset = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitEntry" ("key", "count", "resetAt", "updatedAt") VALUES (${key}, 1, ${reset}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
    "count" = CASE WHEN "RateLimitEntry"."resetAt" <= ${now} THEN 1 ELSE "RateLimitEntry"."count" + 1 END,
    "resetAt" = CASE WHEN "RateLimitEntry"."resetAt" <= ${now} THEN ${reset} ELSE "RateLimitEntry"."resetAt" END,
    "updatedAt" = ${now} RETURNING "count"`;
  return rows[0].count <= limit;
}
