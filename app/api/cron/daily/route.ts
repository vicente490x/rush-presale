import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron-auth';
import { expiryPreview, runExpiry } from '@/lib/expiry';
import { appEnv } from '@/lib/config';
import { logError } from '@/lib/errors';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  try {
    if (appEnv() !== 'production' || process.env.ENABLE_AUTOMATIC_JOBS !== 'true') {
      const preview = await expiryPreview();
      return NextResponse.json({ dryRun: true, due: preview.due.length, warnings: preview.warnings.length, pending: preview.pending.length }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(await runExpiry('cron:daily'), { headers: { 'Cache-Control': 'no-store' } });
  } catch { await logError('CRON_FAILED'); return NextResponse.json({ error: 'Attività pianificate non completate.' }, { status: 500 }); }
}
