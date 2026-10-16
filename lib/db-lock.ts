import { Prisma } from '@prisma/client';
export async function lockSettings(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT id FROM "Settings" WHERE id = 'global' FOR UPDATE`;
  return tx.settings.findUniqueOrThrow({ where: { id: 'global' } });
}
