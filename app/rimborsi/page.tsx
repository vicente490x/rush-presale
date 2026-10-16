import Link from 'next/link';
import { settings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'PRE-SALE e rimborsi — RUSH' };
export default async function RefundPage() {
  const current = await settings();
  const terms = await prisma.termsVersion.findUniqueOrThrow({ where: { id: current.currentTermsId! } });
  return <main className="legal-page"><Link href="/">← RUSH</Link><h1>PRE-SALE E RIMBORSI</h1><h2>Condizioni attuali · versione {terms.version}</h2>{terms.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}<p>Ogni ordine conserva la versione accettata prima del pagamento. Il raggiungimento della soglia non chiude la PRE-SALE: la chiusura è manuale.</p></main>;
}
