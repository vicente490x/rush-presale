import { prisma } from '@/lib/prisma';
export class DomainError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export async function logError(code: string, context?: string) {
  console.error(code);
  await prisma.applicationError.create({ data: { code, context } }).catch(() => undefined);
}
