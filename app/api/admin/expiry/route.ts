import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminRoute, readJson } from '@/lib/http';
import { expiryPreview, runExpiry } from '@/lib/expiry';
export const runtime = 'nodejs';
export const maxDuration = 300;
export const GET = adminRoute(async () => NextResponse.json(await expiryPreview()));
export const POST = adminRoute(async (request, _context, actor) => {
  z.object({ confirm: z.literal(true) }).strict().parse(await readJson(request));
  return NextResponse.json(await runExpiry(actor));
});
