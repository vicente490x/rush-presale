import nodemailer from 'nodemailer';
import { config } from './config.js';

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
    })
  : null;

export async function sendMail({ to, subject, text }) {
  if (!to) {
    console.log(`\n[ADMIN] ${subject}\n${text}\n`);
    return;
  }
  if (!transport) {
    console.log(`\n[EMAIL → ${to}]\n${subject}\n${text}\n`);
    return;
  }
  try {
    await transport.sendMail({ from: config.mailFrom, to, subject, text });
  } catch (e) {
    console.error('Errore invio email:', e.message);
  }
}

export const notifyAdmin = (subject, text) => sendMail({ to: config.adminEmail, subject, text });

const eur = (c) => `${(c / 100).toFixed(2).replace('.', ',')}€`;
const dt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

export const mailOrderConfirmed = (o) =>
  sendMail({
    to: o.email,
    subject: `RUSH PRE-SALE — ordine ${o.code} confermato`,
    text: `Ciao ${o.first_name},

il tuo ordine PRE-SALE è confermato.

Ordine: ${o.code}
Maglietta Rush — taglia ${o.size} × ${o.quantity}
Importo pagato: ${eur(o.amount_cents)}

Come funziona: la maglietta viene prodotta solo al raggiungimento di 15 pezzi pre-ordinati.
Se la produzione non parte entro il ${dt(o.expires_at)} (2 mesi dal pagamento), l'importo ti viene rimborsato automaticamente.
La consegna avviene durante una serata Rush o tramite uno dei nostri PR di fiducia.

— Rush`
  });

export const mailRefunded = (o, { reason = 'scadenza' } = {}) =>
  sendMail({
    to: o.email,
    subject: `RUSH PRE-SALE — ordine ${o.code} rimborsato`,
    text: reason === 'manuale'
      ? `Ciao ${o.first_name},

abbiamo rimborsato ${eur(o.amount_cents)} per l'ordine ${o.code}.
L'accredito arriva sul metodo di pagamento usato, di solito entro 5-10 giorni lavorativi.

— Rush`
      : `Ciao ${o.first_name},

la produzione non è stata avviata entro i 2 mesi previsti: abbiamo rimborsato ${eur(o.amount_cents)} per l'ordine ${o.code}.
L'accredito arriva sul metodo di pagamento usato, di solito entro 5-10 giorni lavorativi.

— Rush`
  });
