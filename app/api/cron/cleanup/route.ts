import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { removeExpiredAssets } from '@/lib/storage';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  try {
    const removed = await removeExpiredAssets();
    return NextResponse.json({ removed });
  } catch (error) {
    logError('cron.asset_cleanup.failed', error);
    return NextResponse.json({ error: 'Pulizia immagini temporanee non riuscita.' }, { status: 500 });
  }
}
