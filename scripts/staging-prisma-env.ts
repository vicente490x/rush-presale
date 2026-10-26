import { parseEnv } from 'node:util';

// Explicit staging input never falls back to development URLs from the shell.
export function stagingPrismaEnvironment(contents: string, inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const input = parseEnv(contents);
  const production = input.APP_ENV === 'production';
  const confirmation = production ? 'PRODUCTION_DATABASE_CONFIRMED' : 'STAGING_DATABASE_CONFIRMED';
  if ((!production && input.APP_ENV !== 'staging') || input[confirmation] !== 'true') throw new Error('Serve APP_ENV staging/production e la conferma manuale del database nel file dedicato.');
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    try {
      const url = new URL(input[key] ?? '');
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) throw new Error();
    } catch { throw new Error(`${key}: URL PostgreSQL mancante o non valido nel file dedicato. Nessun fallback consentito.`); }
  }
  return { ...inherited, DATABASE_URL: input.DATABASE_URL, DIRECT_URL: input.DIRECT_URL,
    APP_ENV: input.APP_ENV, [confirmation]: 'true' };
}
