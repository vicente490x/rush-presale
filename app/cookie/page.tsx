import Link from 'next/link';

export const metadata = { title: 'Cookie Policy — RUSH' };

export default function CookiePage() {
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>COOKIE POLICY</h1>
      <p>Il sito utilizza cookie tecnici strettamente necessari alla sicurezza e all’accesso dell’area amministrativa. Il checkout è gestito da Stripe e può impostare cookie propri quando si apre la pagina di pagamento.</p>
      <p>Non usiamo cookie pubblicitari o strumenti di profilazione. Se in futuro saranno introdotti strumenti non essenziali, questa informativa e il meccanismo di consenso verranno aggiornati prima della loro attivazione.</p>
      <p>Per informazioni: [EMAIL PRIVACY] · Titolare: [RAGIONE SOCIALE], [INDIRIZZO].</p>
    </main>
  );
}
