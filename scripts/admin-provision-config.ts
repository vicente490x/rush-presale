import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { z } from 'zod';

export function personalAdminIdentity(value: string) {
  const email = z.string().trim().toLowerCase().email().max(254).parse(value);
  return { email, id: 'admin-' + createHash('sha256').update(email).digest('hex').slice(0, 32) };
}

export function provisioningEnvironment(contents: string, environment: string, expectedHost: string): Record<string, string> {
  const input = parseEnv(contents);
  if (!['staging', 'production'].includes(environment) || input.APP_ENV !== environment) throw new Error('ENVIRONMENT_MISMATCH');
  const confirmation = environment === 'staging' ? 'STAGING_DATABASE_CONFIRMED' : 'PRODUCTION_DATABASE_CONFIRMED';
  if (input[confirmation] !== 'true') throw new Error('DATABASE_NOT_CONFIRMED');
  // Require a reviewed, direct Neon endpoint, not a default branch or an inherited shell URL.
  if (!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(expectedHost) || expectedHost.includes('-pooler.')) throw new Error('INVALID_EXPECTED_HOST');
  const urls = ['DATABASE_URL', 'DIRECT_URL'].map(key => {
    const url = new URL(input[key] ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname.length < 2 || url.hash ||
      url.hostname.replace('-pooler.', '.') !== expectedHost ||
      url.searchParams.getAll('sslmode').length !== 1 || url.searchParams.get('sslmode') !== 'require' ||
      url.searchParams.getAll('sslaccept').length !== 1 || url.searchParams.get('sslaccept') !== 'strict' || url.searchParams.has('host')) throw new Error('DATABASE_TARGET_OR_TLS_MISMATCH');
    return url;
  });
  if (urls[1].hostname !== expectedHost || urls[0].pathname !== urls[1].pathname ||
    (urls[0].searchParams.get('schema') ?? 'public') !== (urls[1].searchParams.get('schema') ?? 'public')) throw new Error('DATABASE_TARGET_MISMATCH');
  return { APP_ENV: environment, [confirmation]: 'true', DATABASE_URL: urls[1].href, DIRECT_URL: urls[1].href, __NEXT_PROCESSED_ENV: 'true' };
}
