import { PrismaClient } from '@prisma/client';
import { appEnv } from '@/lib/config';

if (appEnv() === 'staging' && process.env.STAGING_DATABASE_CONFIRMED !== 'true') {
  throw new Error('Accesso DB staging bloccato: confermare un database indipendente con STAGING_DATABASE_CONFIRMED=true.');
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Errors are logged by route/service handlers with fixed, non-sensitive codes.
    log: []
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
