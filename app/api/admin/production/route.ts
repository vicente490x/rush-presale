import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminRoute, readJson } from '@/lib/http';
import { changeProduction } from '@/lib/admin-operations';
const schema = z.object({ status: z.enum(['PRODUZIONE_AVVIATA', 'PRODUZIONE_COMPLETATA']), confirm: z.literal(true) }).strict();
export const POST = adminRoute(async (request, _context, actor) => {
  const data = schema.parse(await readJson(request));
  await changeProduction(data.status, actor);
  return NextResponse.json({ ok: true });
});
