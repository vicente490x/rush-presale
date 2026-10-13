import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — RUSH' };

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>PRIVACY POLICY</h1>
      <p>Informativa ai sensi del Regolamento (UE) 2016/679. Il titolare del trattamento è [RAGIONE SOCIALE], con sede in [INDIRIZZO], contattabile a [EMAIL PRIVACY]. Completa e verifica questi dati prima di attivare la vendita.</p>
      <h2>Dati degli ordini</h2>
      <p>Per gestire PRE-SALE, pagamenti, conferme, rimborsi e consegne trattiamo nome, cognome, email, taglia, quantità, importo e dati di stato dell’ordine. Stripe gestisce il pagamento; RUSH non riceve né conserva il numero completo della carta.</p>
      <h2>Prova virtuale AI (solo maggiorenni)</h2>
      <p>Solo dopo consenso esplicito e conferma della maggiore età, la foto scelta viene normalizzata per rimuovere metadati EXIF, caricata in uno storage privato temporaneo e inviata al provider FASHN tramite fal.ai per generare una prova indicativa. Il file sorgente viene eliminato dal nostro storage al termine dell’elaborazione; in caso di errore, la pulizia viene ritentata dal processo pianificato. L’immagine generata viene restituita al browser senza essere salvata nel database o nello storage del sito e resta nella memoria della pagina.</p>
      <p>Il provider AI elabora i file necessari a completare la richiesta secondo le proprie condizioni e informative, che possono prevedere tempi di conservazione e usi ulteriori. Prima di attivare la funzione, il titolare deve verificare le condizioni contrattuali applicabili a conservazione, riuso e addestramento, documentare le garanzie appropriate e aggiornare questa informativa con i dettagli verificati. I metadati conservati da RUSH sono anonimi e limitati a stato, data, durata, provider e costo stimato; non colleghiamo i job all’ordine o all’identità dell’utente.</p>
      <h2>Finalità, base giuridica e conservazione</h2>
      <p>Gli ordini sono trattati per eseguire il contratto e adempiere obblighi di legge; la foto AI è trattata solo dopo consenso esplicito, che può essere negato senza impedire l’acquisto. I dati contabili vengono conservati per il periodo richiesto dalla legge; gli altri dati vengono cancellati quando non più necessari alle finalità indicate.</p>
      <h2>Destinatari e diritti</h2>
      <p>I dati possono essere trattati da Stripe, Resend, Supabase, fal.ai/FASHN e dai fornitori tecnici nominati responsabili, secondo accordi e garanzie applicabili. È possibile chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione scrivendo a [EMAIL PRIVACY], e proporre reclamo al Garante per la protezione dei dati personali.</p>
      <h2>Trasferimenti e sicurezza</h2>
      <p>Eventuali trasferimenti fuori dallo Spazio economico europeo devono avvenire con le garanzie previste dal GDPR. Sono adottati controlli di accesso, HTTPS, storage privato e scadenza degli asset temporanei.</p>
    </main>
  );
}
