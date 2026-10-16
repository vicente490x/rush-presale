import { NextResponse } from 'next/server';
import { adminRoute, readJson } from '@/lib/http';
import { settings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { settingsInput } from '@/lib/operational-schema';
import { saveSettings } from '@/lib/admin-operations';
export const GET = adminRoute(async () => {
  const current = await settings();
  const [terms, versions, history] = await Promise.all([
    prisma.termsVersion.findUniqueOrThrow({ where: { id: current.currentTermsId! } }),
    prisma.termsVersion.findMany({ orderBy: { version: 'desc' }, take: 20 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
  ]);
  return NextResponse.json({ settings: current, terms, versions, history });
});
export const POST = adminRoute(async (request, _context, actor) => {
  const parsed = settingsInput.parse(await readJson(request, 262144));
  await saveSettings(parsed, actor);
  return NextResponse.json({ ok: true });
});
