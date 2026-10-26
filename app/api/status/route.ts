import { NextResponse } from 'next/server';
import { paidPieces, settings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { sizesSchema } from '@/lib/operational-schema';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const [current, total] = await Promise.all([settings(), paidPieces()]);
    const terms = await prisma.termsVersion.findUniqueOrThrow({ where: { id: current.currentTermsId! } });
    return NextResponse.json({ total, threshold: current.threshold, missing: Math.max(0, current.threshold - total),
      thresholdReached: total >= current.threshold, open: current.presaleOpen && !current.maintenance,
      maintenance: current.maintenance, closedMessage: current.maintenance ? 'Servizio in manutenzione. Riprova più tardi.' : current.closedMessage,
      production: current.productionStatus, priceCents: current.unitPriceCents, maxQty: current.maxQuantity,
      sizes: sizesSchema.parse(current.sizes).filter(row => row.enabled).map(row => row.size),
      termsText: terms.text, termsVersionId: terms.id, termsVersion: terms.version, settingsRevision: current.revision,
      deliveryText: current.deliveryText, refundMonths: current.refundMonths
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Stato PRE-SALE non disponibile.' }, { status: 503 }); }
}
