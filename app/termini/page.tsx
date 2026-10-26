import { seller } from '@/lib/seller';
import Link from 'next/link';

export const metadata = { title: 'Termini e condizioni — RUSH' };

export default function TermsPage() {
  const identity = seller();
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>TERMINI E CONDIZIONI</h1>
      <p>Venditore: {identity.name}, {identity.address}, {identity.taxId}, contatto {identity.supportEmail}. Questi dati e le condizioni devono essere verificati da un professionista prima dell’avvio delle vendite.</p>
      <h2>Ordine e pagamento</h2>
      <p>La PRE-SALE riguarda una maglietta RUSH al prezzo indicato nella pagina. L’ordine è acquisito dopo la conferma del pagamento da parte di Stripe. Taglia e quantità sono riepilogate prima del pagamento.</p>
      <h2>Produzione, consegna e rimborso</h2>
      <p>La soglia, il termine individuale di rimborso e la consegna sono indicati nelle <Link href="/rimborsi">condizioni PRE-SALE attuali</Link>, mostrate prima del pagamento. Ogni ordine conserva la versione accettata; le modifiche successive non la cambiano. Il raggiungimento della soglia non chiude automaticamente la PRE-SALE.</p>
      <h2>Diritto di recesso e assistenza</h2>
      <p style={{ whiteSpace: 'pre-line' }}>{identity.withdrawalPolicy}</p><p>Assistenza: {identity.supportEmail}.</p>
    </main>
  );
}
