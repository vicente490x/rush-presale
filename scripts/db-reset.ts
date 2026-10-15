import { loadEnvConfig } from '@next/env';
import { spawnSync } from 'node:child_process';

loadEnvConfig(process.cwd());

function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('db:reset è disabilitato in produzione.');
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL non configurato.');
  const database = new URL(rawUrl);
  const dbName = database.pathname.replace(/^\/+/, '');
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(database.hostname);
  const safeName = /^rush_presale_(dev|test)$/.test(dbName);
  if (!loopback || (!safeName && !(dbName === 'rush_presale_local' && process.env.ALLOW_LOCAL_DB_RESET === '1'))) {
    throw new Error('Reset rifiutato: usa un database rush_presale_dev/test su loopback. Per il database rush_presale_local serve ALLOW_LOCAL_DB_RESET=1.');
  }
  const result = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`prisma migrate reset è terminato con codice ${result.status ?? 'sconosciuto'}.`);
  const seeded = spawnSync('npm', ['run', 'seed'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (seeded.error) throw seeded.error;
  if (seeded.status !== 0) throw new Error(`npm run seed è terminato con codice ${seeded.status ?? 'sconosciuto'}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Reset DB non riuscito.');
  process.exitCode = 1;
}
