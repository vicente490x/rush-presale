import Link from 'next/link';

export const metadata = { title: 'Termini e condizioni — RUSH' };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>TERMINI E CONDIZIONI</h1>
      <p>Venditore: [RAGIONE SOCIALE], [INDIRIZZO], [PARTITA IVA], contatto [EMAIL]. Questi dati e le condizioni devono essere verificati da un professionista prima dell’avvio delle vendite.</p>
      <h2>Ordine e pagamento</h2>
      <p>La PRE-SALE riguarda una maglietta RUSH al prezzo indicato nella pagina. L’ordine è acquisito dopo la conferma del pagamento da parte di Stripe. Taglia e quantità sono riepilogate prima del pagamento.</p>
      <h2>Produzione, consegna e rimborso</h2>
      <p>La soglia, il termine individuale di rimborso e la consegna sono indicati nelle <Link href="/rimborsi">condizioni PRE-SALE attuali</Link>, mostrate prima del pagamento. Ogni ordine conserva la versione accettata; le modifiche successive non la cambiano. Il raggiungimento della soglia non chiude automaticamente la PRE-SALE.</p>
      <h2>Diritto di recesso e assistenza</h2>
      <p>Le informazioni sui diritti applicabili, sulle eccezioni e sulle modalità di assistenza devono essere completate in base alla natura giuridica del venditore e verificate prima della pubblicazione. Contatti: [EMAIL ASSISTENZA].</p>
    </main>
  );
}
