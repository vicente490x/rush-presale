import Link from 'next/link';
import { settings } from '@/lib/settings';
import { presaleTermsForThreshold } from '@/lib/presale-terms';

export const metadata = { title: 'PRE-SALE e rimborsi — RUSH' };
export const dynamic = 'force-dynamic';

export default async function RefundPage() {
  let terms: ReturnType<typeof presaleTermsForThreshold> | null = null;
  try {
    terms = presaleTermsForThreshold((await settings()).threshold);
  } catch (error) {
    console.error('Lettura soglia PRE-SALE per la pagina rimborsi non riuscita', error);
  }

  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>PRE-SALE E RIMBORSI</h1>
      <h2>ATTENZIONE — PRE-SALE</h2>
      {terms
        ? terms.map((term) => <p key={term}>{term}</p>)
        : <p role="alert">Condizioni PRE-SALE temporaneamente non disponibili. Riprova più tardi.</p>}
      {terms && <p>Ogni ordine ha una propria scadenza calcolata dalla relativa data di pagamento. Il raggiungimento della soglia non chiude la PRE-SALE: la chiusura è manuale.</p>}
    </main>
  );
}
