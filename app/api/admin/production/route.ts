import { NextResponse } from 'next/server';
import { ProductionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { paidPieces } from '@/lib/settings';

const schema = z.object({ status: z.nativeEnum(ProductionStatus) });
const sequence = [
  ProductionStatus.IN_RACCOLTA,
  ProductionStatus.SOGLIA_RAGGIUNTA,
  ProductionStatus.PRODUZIONE_AVVIATA,
  ProductionStatus.PRODUZIONE_COMPLETATA
];

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Stato produzione non valido.' }, { status: 400 });
  try {
    const [current, total] = await Promise.all([
      prisma.settings.upsert({ where: { id: 'global' }, create: { id: 'global' }, update: {} }),
      paidPieces()
    ]);
    const from = sequence.indexOf(current.productionStatus);
    const to = sequence.indexOf(parsed.data.status);
    if (to < from || to > from + 1) return NextResponse.json({ error: 'Gli stati di produzione devono avanzare in ordine e non possono tornare indietro.' }, { status: 409 });
    if (parsed.data.status === ProductionStatus.SOGLIA_RAGGIUNTA && total < current.threshold) {
      return NextResponse.json({ error: 'La soglia minima non è stata raggiunta.' }, { status: 409 });
    }
    if (parsed.data.status === ProductionStatus.PRODUZIONE_AVVIATA && total < current.threshold) {
      return NextResponse.json({ error: 'La produzione può partire solo dopo il raggiungimento della soglia.' }, { status: 409 });
    }
    await prisma.settings.update({ where: { id: 'global' }, data: { productionStatus: parsed.data.status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Aggiornamento stato produzione non riuscito', error);
    return NextResponse.json({ error: 'Impossibile aggiornare lo stato di produzione.' }, { status: 503 });
  }
}
