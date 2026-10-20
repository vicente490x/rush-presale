import { loadEnvConfig } from '@next/env';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { stagingPrismaEnvironment } from './staging-prisma-env';

try {
  const args = process.argv.slice(2);
  const index = args.indexOf('--env-file');
  let env = process.env;
  if (index !== -1) {
    if (!args[index + 1] || args.indexOf('--env-file', index + 1) !== -1) throw new Error('Specificare un solo --env-file con il percorso del file staging.');
    const path = args[index + 1]; args.splice(index, 2);
    if (!['validate', 'migrate deploy', 'migrate status'].includes(args.join(' '))) throw new Error('Con --env-file sono consentiti solo validate, migrate status e migrate deploy.');
    let contents: string;
    try { contents = readFileSync(path, 'utf8'); } catch { throw new Error('File ambiente staging non leggibile.'); }
    env = stagingPrismaEnvironment(contents, process.env);
  } else {
    loadEnvConfig(process.cwd());
    if ((process.env.APP_ENV === 'staging' || process.env.APP_ENV === 'preview') && process.env.STAGING_DATABASE_CONFIRMED !== 'true') throw new Error('Confermare il database staging indipendente prima di usare Prisma.');
  }
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], { env, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Prisma non avviato: configurazione non valida.');
  process.exitCode = 1;
}
