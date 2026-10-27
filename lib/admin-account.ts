import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const adminPassword = z.string().min(16).refine(
  value => Buffer.byteLength(value, 'utf8') <= 72 && !/\p{Cc}/u.test(value),
  'Massimo 72 byte UTF-8, senza caratteri di controllo.'
);
export const adminId = () => process.env.ADMIN_ID ?? 'rush-admin';
export const credentialFingerprint = (hash: string) => createHash('sha256').update(hash).digest('hex');

// Never updates an existing identity or password; the unique keys arbitrate concurrent runs.
export async function initializeAdmin(input: { id: string; email: string; password?: string; passwordHash?: string }) {
  const id = z.string().trim().min(1).max(100).parse(input.id);
  const email = z.string().trim().toLowerCase().email().parse(input.email);
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (existing) {
    if (existing.email !== email || existing.role !== 'ADMIN' || !existing.active) throw new Error('ADMIN_IDENTITY_CONFLICT');
    return { created: false, id };
  }
  const passwordHash = input.password !== undefined
    ? await bcrypt.hash(adminPassword.parse(input.password), 12)
    : z.string().regex(/^\$2[ab]\$(1[2-6])\$[./A-Za-z0-9]{53}$/).parse(input.passwordHash);
  const result = await prisma.adminUser.createMany({ data: [{ id, email, role: 'ADMIN', passwordHash }], skipDuplicates: true });
  const saved = await prisma.adminUser.findUnique({ where: { id } });
  if (!saved || saved.email !== email || !saved.active) throw new Error('ADMIN_IDENTITY_CONFLICT');
  return { created: result.count === 1, id };
}

export async function authenticateAdmin(password: string) {
  if (Buffer.byteLength(password, 'utf8') > 72) return null;
  const user = await prisma.adminUser.findUnique({ where: { id: adminId() } });
  if (!user || !user.active || user.role !== 'ADMIN') return null;
  return await bcrypt.compare(password, user.passwordHash) ? user : null;
}
