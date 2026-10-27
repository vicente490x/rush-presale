import { loadEnvConfig } from '@next/env';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { stagingPrismaEnvironment } from './staging-prisma-env';

async function main() {
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--env-file') throw new Error('INVALID_ARGUMENTS');
    const contents = await readFile(args[1], 'utf8');
    const fileEnv = { ...process.env, ...parseEnv(contents) };
    Object.assign(process.env, fileEnv, stagingPrismaEnvironment(contents, fileEnv));
    process.env.__NEXT_PROCESSED_ENV = 'true';
  } else loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
  const { prisma } = await import('../lib/prisma');
  try {
    const { initializeAdmin, adminId } = await import('../lib/admin-account');
    const result = await initializeAdmin({ id: adminId(), email: process.env.ADMIN_EMAIL ?? '',
      password: process.env.ADMIN_PASSWORD, passwordHash: process.env.ADMIN_PASSWORD_HASH });
    console.log(result.created ? 'Amministratore ADMIN creato nel database.' : 'Amministratore già presente: nessuna modifica.');
  } finally {
    delete process.env.ADMIN_PASSWORD;
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Prisma and validation errors may contain submitted values: do not log them.
  console.error('Inizializzazione non riuscita. Verifica database, migrazioni, ADMIN_ID, ADMIN_EMAIL e password (16 caratteri, massimo 72 byte) o hash bcrypt valido. Nessuna credenziale mostrata.');
  process.exitCode = 1;
});
