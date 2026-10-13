import Link from 'next/link';

export const metadata = { title: 'PRE-SALE e rimborsi — RUSH' };

export default function RefundPage() {
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>PRE-SALE E RIMBORSI</h1>
      <h2>ATTENZIONE — PRE-SALE</h2>
      <p>Questa maglietta viene prodotta esclusivamente al raggiungimento di un minimo di 15 pezzi pre-ordinati.</p>
      <p>La maglietta non è quindi immediatamente disponibile. Una volta raggiunta la soglia minima, la produzione potrà essere avviata.</p>
      <p>La consegna avverrà durante una serata RUSH oppure tramite uno dei nostri PR di fiducia.</p>
      <p>Qualora la produzione non venga avviata entro 2 mesi dalla data del pagamento, l’importo dell’ordine verrà automaticamente rimborsato.</p>
      <p>Ogni ordine ha una propria scadenza calcolata dalla relativa data di pagamento. Il raggiungimento della soglia non chiude la PRE-SALE: la chiusura è manuale.</p>
    </main>
  );
}
