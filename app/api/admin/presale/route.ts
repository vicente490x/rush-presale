import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminRoute, readJson } from '@/lib/http';
import { setPresaleOpen } from '@/lib/presale';
export const runtime = 'nodejs';
export const maxDuration = 300;
export const POST = adminRoute(async (request, _context, actor) => {
  const data = z.object({ open: z.boolean(), confirm: z.literal(true) }).strict().parse(await readJson(request));
  const result = await setPresaleOpen(data.open, actor);
  const incomplete = result.errors > 0 || result.more > 0;
  return NextResponse.json({ ok: !incomplete, ...result, ...(incomplete ? { error: 'PRE-SALE chiusa; alcuni checkout richiedono un altro controllo in diagnostica.' } : {}) }, { status: incomplete ? 502 : 200 });
});
