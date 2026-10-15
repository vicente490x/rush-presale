import Link from 'next/link';
import { settings } from '@/lib/settings';

export const metadata = { title: 'Termini e condizioni — RUSH' };
export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  let threshold: number | null = null;
  try {
    threshold = (await settings()).threshold;
  } catch (error) {
    console.error('Lettura soglia PRE-SALE per i termini non riuscita', error);
  }

  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>TERMINI E CONDIZIONI</h1>
      <p>Venditore: [RAGIONE SOCIALE], [INDIRIZZO], [PARTITA IVA], contatto [EMAIL]. Questi dati e le condizioni devono essere verificati da un professionista prima dell’avvio delle vendite.</p>
      <h2>Ordine e pagamento</h2>
      <p>La PRE-SALE riguarda una maglietta RUSH al prezzo indicato nella pagina. L’ordine è acquisito dopo la conferma del pagamento da parte di Stripe. Taglia e quantità sono riepilogate prima del pagamento.</p>
      <h2>Produzione, consegna e rimborso</h2>
      {threshold === null
        ? <p role="alert">Condizioni PRE-SALE temporaneamente non disponibili. Riprova più tardi.</p>
        : <p>La produzione può essere avviata al raggiungimento di almeno {threshold} pezzi; la soglia non chiude automaticamente la PRE-SALE. Se la produzione non viene avviata entro due mesi dalla data di pagamento del singolo ordine, l’importo viene rimborsato automaticamente. La consegna è organizzata durante una serata RUSH o tramite un PR di fiducia.</p>}
      <h2>Diritto di recesso e assistenza</h2>
      <p>Le informazioni sui diritti applicabili, sulle eccezioni e sulle modalità di assistenza devono essere completate in base alla natura giuridica del venditore e verificate prima della pubblicazione. Contatti: [EMAIL ASSISTENZA].</p>
    </main>
  );
}
