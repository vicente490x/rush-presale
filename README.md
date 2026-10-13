# Rush PRE-SALE

Sito mobile-first per la PRE-SALE della maglietta Rush: 25€, soglia 15 pezzi, rimborso automatico dopo 2 mesi.
Stack: Node.js 22 · Express · SQLite · Stripe Checkout · Nodemailer.

## Avvio locale

Usa Node.js 22: `better-sqlite3` è un modulo nativo e deve essere eseguito con la stessa versione principale di Node usata per installarlo.

Su Windows, seleziona prima Node.js 22 con un version manager (ad esempio `nvm use 22`). Se `better-sqlite3` è stato installato con Node 24, reinstalla le dipendenze dopo aver selezionato Node 22:

```bash
npm install
```

Poi crea `.env` da `.env.example`, modifica `ADMIN_PASSWORD` e `SESSION_SECRET`, quindi avvia il server:

```powershell
Copy-Item .env.example .env
npm start
```

In altri shell, usa `cp .env.example .env` al posto di `Copy-Item`.

- Sito: http://localhost:3000
- Admin: http://localhost:3000/admin.html
- Senza chiavi Stripe parte in **DEMO_MODE**: il pagamento è simulato. Le email vengono stampate in console.
- In locale la password admin predefinita è `admin`: cambiala sempre prima di esporre il sito a Internet.
- Test: `npm test`

## Andare online

1. Crea un account Stripe e imposta `STRIPE_SECRET_KEY` e `DEMO_MODE=false`.
2. In Stripe → Developers → Webhooks configura `https://TUODOMINIO/api/stripe/webhook` per gli eventi `checkout.session.completed` e `checkout.session.expired`; imposta `STRIPE_WEBHOOK_SECRET`.
3. Imposta `BASE_URL=https://TUODOMINIO`, `NODE_ENV=production`, `ADMIN_EMAIL` e le credenziali `SMTP_*`. In produzione l'app rifiuta l'avvio senza HTTPS, password admin forte, secret di sessione casuale (almeno 32 caratteri), Stripe e SMTP.
4. Usa un hosting con disco persistente per `DATA_DIR` (inclusi `data/backups`) e HTTPS, per esempio Railway, Render, Fly.io o un VPS. Esegui periodicamente il backup anche fuori dal server.
5. Completa i campi segnaposto `[... ]` in Privacy, Termini e Rimborsi e fai verificare i testi prima di accettare ordini reali.

## Logica

- Contatore = somma dei pezzi degli ordini pagati e non rimborsati.
- A 15 pezzi: email all'admin, stato `SOGLIA RAGGIUNTA`. La PRE-SALE **resta aperta**.
- La PRE-SALE si apre/chiude solo da admin. La chiusura annulla i checkout Stripe ancora aperti; la produzione avanza solo dopo la soglia e non può essere riportata indietro.
- Ogni ordine ha scadenza = pagamento + 2 mesi. Un job orario rimborsa (Stripe) gli ordini scaduti se la produzione non è avviata, avvisa acquirente e admin, e manda un avviso 7 giorni prima.
- Le date di scadenza usano mesi di calendario e si adeguano all'ultimo giorno del mese quando necessario.
- Backup giornaliero del DB in `data/backups` (ultimi 14). Manuale: `npm run backup`.
- Sicurezza: helmet/CSP, rate limit, honeypot anti-bot, login admin con cookie firmato, nessun dato carta sul sito.

## Prova AI (facoltativa)

Serve un account Replicate: imposta `REPLICATE_API_TOKEN` e `REPLICATE_MODEL_VERSION` (versione di un modello virtual try-on, es. IDM-VTON). Senza queste variabili la sezione resta nascosta.

## Da fare prima del lancio

- Rivedere Privacy, Termini e Rimborsi in `public/` (testi base con campi `[...]`) con un professionista.
- Sostituire `public/img/front.jpg` con una foto piatta della maglietta se vuoi migliorare la prova AI.
