import { seller } from '@/lib/seller';
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — RUSH' };

export default function PrivacyPage() {
  const identity = seller();
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>PRIVACY POLICY</h1>
      <p>Informativa ai sensi del Regolamento (UE) 2016/679. Il titolare del trattamento è {identity.name}, con sede in {identity.address}, contattabile a {identity.privacyEmail}.</p>
      <h2>Dati degli ordini</h2>
      <p>Per gestire PRE-SALE, pagamenti, conferme, rimborsi e consegne trattiamo nome, cognome, email, taglia, quantità, importo e dati di stato dell’ordine. Stripe gestisce il pagamento; RUSH non riceve né conserva il numero completo della carta.</p>
      <h2>Finalità, base giuridica e conservazione</h2>
      <p>Gli ordini sono trattati per eseguire il contratto e adempiere obblighi di legge. I dati contabili vengono conservati per il periodo richiesto dalla legge; gli altri dati vengono cancellati quando non più necessari alle finalità indicate.</p>
      <h2>Destinatari e diritti</h2>
      <p>I dati possono essere trattati da Stripe, Resend, Vercel, il fornitore PostgreSQL, Cloudflare Turnstile e Upstash, oltre ai fornitori tecnici nominati responsabili, secondo accordi e garanzie applicabili. È possibile chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione scrivendo a {identity.privacyEmail}, e proporre reclamo al Garante per la protezione dei dati personali.</p>
      <h2>Trasferimenti e sicurezza</h2>
      <p>Eventuali trasferimenti fuori dallo Spazio economico europeo devono avvenire con le garanzie previste dal GDPR. Sono adottati controlli di accesso, HTTPS, protezioni delle richieste e minimizzazione dei dati esposti.</p>
    </main>
  );
}
