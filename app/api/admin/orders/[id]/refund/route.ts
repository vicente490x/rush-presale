import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminRoute, readJson } from '@/lib/http';
import { requestRefund } from '@/lib/refunds';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = adminRoute(async (request, context: { params: Promise<{ id: string }> }, actor) => {
  z.object({ confirm: z.literal(true) }).strict().parse(await readJson(request));
  const { id } = await context.params;
  return NextResponse.json(await requestRefund(id, false, actor));
});
