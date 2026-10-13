import { NextResponse } from 'next/server';
import { ClothingSize } from '@prisma/client';
import { publicConfig } from '@/lib/config';
import { paidPieces, settings } from '@/lib/settings';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [config, current, total] = await Promise.all([Promise.resolve(publicConfig()), settings(), paidPieces()]);
    return NextResponse.json({
      total,
      threshold: current.threshold || config.PRESALE_THRESHOLD,
      missing: Math.max(0, current.threshold - total),
      thresholdReached: total >= current.threshold,
      open: current.presaleOpen,
      production: current.productionStatus,
      priceCents: 2500,
      maxQty: config.PRESALE_MAX_QUANTITY,
      sizes: Object.values(ClothingSize),
      tryOn: current.tryOnEnabled && Boolean(process.env.FAL_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY)
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logError('presale.status.unavailable', error);
    return NextResponse.json({ error: 'Stato PRE-SALE non disponibile.' }, { status: 503 });
  }
}
