import { loadEnvConfig } from '@next/env';
import { spawnSync } from 'node:child_process';
loadEnvConfig(process.cwd());
if ((process.env.APP_ENV === 'staging' || process.env.APP_ENV === 'preview') && process.env.STAGING_DATABASE_CONFIRMED !== 'true') throw new Error('Confermare il database staging indipendente prima di usare Prisma.');
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...process.argv.slice(2)], { env: process.env, stdio: 'inherit' });
process.exit(result.status ?? 1);
