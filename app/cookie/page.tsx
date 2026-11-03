import { seller } from '@/lib/seller';
import Link from 'next/link';

export const metadata = { title: 'Cookie Policy — RUSH' };

export default function CookiePage() {
  const identity = seller();
  return (
    <main className="legal-page">
      <Link href="/">← RUSH</Link>
      <h1>COOKIE POLICY</h1>
      <p>Il sito utilizza cookie tecnici strettamente necessari alla sicurezza e all’accesso dell’area amministrativa. Il checkout è gestito da Stripe e può impostare cookie propri quando si apre la pagina di pagamento.</p>
      <p>Quando avvii un ordine, un cookie tecnico di conferma consente di consultare i dettagli del pagamento dallo stesso browser per sette giorni. Non contiene dati della carta e non è accessibile agli script della pagina. Cancellandolo o cambiando browser, dovrai contattare l’assistenza per verificare l’ordine.</p>
      <p>Non usiamo cookie pubblicitari o strumenti di profilazione. Se in futuro saranno introdotti strumenti non essenziali, questa informativa e il meccanismo di consenso verranno aggiornati prima della loro attivazione.</p>
      <p>Per informazioni: {identity.privacyEmail} · Titolare: {identity.name}, {identity.address}.</p>
    </main>
  );
}
