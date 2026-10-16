import { NextResponse } from 'next/server';
import { adminRoute, readJson } from '@/lib/http';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
export const POST = adminRoute(async (request, _context, actor) => {
  z.object({ enabled: z.literal(false), dailyLimit: z.number().int().min(0).max(1000).optional() }).strict().parse(await readJson(request));
  await prisma.settings.update({ where: { id: 'global' }, data: { tryOnEnabled: false } });
  await prisma.auditLog.create({ data: { actor, action: 'TRYON_DISABLED' } });
  return NextResponse.json({ ok: true, message: 'Prova AI esclusa dalla demo: non prevista da SPEC.md.' });
});
