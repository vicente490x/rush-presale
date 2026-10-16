import { NextResponse } from 'next/server';
import { removeExpiredAssets } from '@/lib/storage';
import { cronAuthorized } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  try {
    const removed = await removeExpiredAssets();
    await prisma.rateLimitEntry.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400000) } } });
    return NextResponse.json({ removed });
  } catch { return NextResponse.json({ error: 'Pulizia non completata.' }, { status: 500 }); }
}
