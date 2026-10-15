# RUSH — PRE-SALE

Storefront Next.js per la PRE-SALE RUSH. Prezzo: 25 € a maglietta; la produzione può essere avviata al raggiungimento della soglia configurata. I pagamenti sono gestiti da Stripe Checkout e gli ordini vengono confermati esclusivamente dal webhook Stripe verificato.

## Requisiti

- Node.js 22 o 24 (vedi `.nvmrc`).
- PostgreSQL accessibile tramite `DATABASE_URL` e `DIRECT_URL`.
- Credenziali Stripe, Resend e Upstash Redis per i flussi di vendita e le email.
- Supabase Storage e fal.ai sono necessari solo se si attiva la prova virtuale.

## Avvio locale

```powershell
npm install
.\scripts\setup-local-postgres.ps1
```

Lo script individua PostgreSQL installato in `Program Files`, richiede la password amministrativa senza mostrarla, crea un database e un utente locali dedicati, scrive la connessione in `.env.local` (ignorato da Git) e applica le migrazioni. Non legge, modifica o cancella il precedente database SQLite. In locale `NEXT_PUBLIC_SITE_URL` può essere `http://localhost:3000`; in produzione deve usare HTTPS.

Se Next.js è già in esecuzione, arrestalo con `Ctrl+C` nel terminale che lo ospita e riavvialo:

```powershell
npm run dev
```

- Storefront: http://localhost:3000
- PRE-SALE: http://localhost:3000/presale
- Admin: http://localhost:3000/admin/login

Configura o reimposta l’accesso admin locale (la password viene digitata senza echo; il suo hash viene aggiornato nel database e in `.env.local`, insieme alla chiave di sessione):

```powershell
npm run admin:setup
```

Per l’accesso da `localhost` in modalità sviluppo, il form admin non richiede Turnstile né Upstash. Questo bypass non è attivo in produzione o su hostname diversi da localhost.

## Configurazione servizi

| Variabili | Servizio / uso |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL e migrazioni Prisma |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Checkout e webhook firmati; usa `sk_test_` finché i pagamenti live non sono autorizzati |
| `ALLOW_LIVE_PAYMENTS` | Deve rimanere `false` fino ad autorizzazione esplicita dei pagamenti reali |
| `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL` | Outbox e invio email |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limit distribuito |
| `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` | Accesso amministratore |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Protezione anti-bot dei moduli |
| `CRON_SECRET` | Autenticazione dei cron job |
| `FAL_KEY`, `TRYON_MODEL_ID` | Provider commerciale della prova virtuale |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TRYON_BUCKET` | Storage privato temporaneo per le foto della prova virtuale |
| `TRYON_COST_ESTIMATE_USD`, `TRYON_MAX_DAILY_SPEND_USD`, `TRYON_DAILY_LIMIT` | Stima e limiti di spesa della prova virtuale |

La prova virtuale resta disabilitata finché non viene attivata dal pannello admin. Prima di abilitarla, verifica licenza, prezzo, conservazione e uso delle immagini con fal.ai/FASHN e aggiorna l’informativa privacy: il costo configurato è solo una stima, non una tariffa garantita.

## Stripe

Configura nel Dashboard Stripe il webhook `https://TUODOMINIO/api/stripe/webhook` per `checkout.session.completed` e `checkout.session.expired`, quindi copia il relativo secret in `STRIPE_WEBHOOK_SECRET`. Un ordine diventa pagato esclusivamente dopo la verifica della firma e dell’evento Stripe.

## Verifiche e produzione

```powershell
npm run lint
npm test
npm run build
```

Usa un hosting Node compatibile con Next.js e con cron pianificati. `vercel.json` esegue il job amministrativo giornaliero e la pulizia degli asset temporanei ogni cinque minuti; verifica che il piano del provider supporti la frequenza richiesta e configura `CRON_SECRET`. Imposta tutte le variabili d’ambiente nell’hosting, non nel repository.

Le pagine legali contengono ancora campi da completare (ragione sociale, sede, contatti e dettagli verificati sui provider). Devono essere revisionate e completate prima della vendita reale. Non attivare i pagamenti live o la prova AI prima della revisione operativa, contrattuale e legale.

## Logica PRE-SALE

- Il contatore considera i pezzi pagati non rimborsati.
- Al raggiungimento della soglia viene accodata una notifica admin; la PRE-SALE resta aperta.
- Chiusura, stati produzione, gestione consegne e rimborsi sono disponibili nell’area admin.
- Ogni ordine pagato scade due mesi di calendario dopo il pagamento. Se la produzione non è stata avviata, il job pianificato tenta il rimborso Stripe e accoda le notifiche.
- Foto e risultati della prova AI non sono collegati agli ordini. La foto sorgente viene rimossa dallo storage del sito dopo l’elaborazione o dal job di pulizia alla scadenza.
