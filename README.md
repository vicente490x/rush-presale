# RUSH PRE-SALE

Storefront Next.js con ordini tramite Stripe Checkout, database PostgreSQL, email Resend e area admin. Il sito applica una soglia di produzione di 15 pezzi e parte con la PRE-SALE chiusa.

## Requisiti e sviluppo locale

- Node.js 22 o 24.
- PostgreSQL. Il file `prisma/dev.db` è un residuo locale e non viene usato dall'app.
- Copia `.env.example` in `.env.local` e configura un database **di sviluppo** separato.
- Applica le migrazioni con `npm run db:migrate` e genera Prisma Client con `npm run db:generate`.
- Avvia `npm run dev`.

Per creare un admin, esporta `ADMIN_EMAIL` e `ADMIN_PASSWORD` nel terminale insieme alle variabili di connessione, quindi esegui `npm run create-admin`. La password deve avere almeno 12 caratteri e non può essere `admin`; viene memorizzata con bcrypt. Non usare `npm run create-admin` con un database condiviso o non destinato all'ambiente selezionato.

I provider mock e i bypass anti-bot sono disponibili soltanto fuori da `APP_ENV=production`. I test restano nella cartella `tests/`; `npm test` li esegue in ambiente di sviluppo/test.

## Comandi database

```powershell
npm run db:migrate
npm run db:generate
npm run db:clean-test-data
npm run db:check-production
```

`db:clean-test-data` è dry-run per impostazione predefinita. La modalità effettiva richiede `--confirm` e `CONFIRM_DB_NAME` uguale al database stampato. Si arresta se trova ordini che sembrano reali, esporta prima i record di test e imposta la PRE-SALE chiusa. `--open-presale` lascia la PRE-SALE aperta dopo la pulizia.

In produzione esegui esclusivamente `npx prisma migrate deploy` per applicare le migrazioni. Non usare `prisma migrate reset`, `prisma db push` o seed nel database di produzione.

## Deploy Vercel e database PostgreSQL

In Vercel crea un database PostgreSQL di produzione separato da quello locale e da Preview. Dal Marketplace Vercel installa Neon, assegna un nome riconoscibile come `rush-presale-prod` e scegli una regione vicina alle funzioni. Collega il database solo all'ambiente Production. Usa l'URL pooled per `DATABASE_URL` e quello diretto per `DIRECT_URL`; Vercel/Neon forniscono entrambi i valori dopo il provisioning. La [guida Marketplace Vercel](https://vercel.com/docs/marketplace-storage) descrive provisioning e collegamento delle variabili.

In Vercel apri **Project Settings → Environment Variables** e inserisci per l'ambiente **Production** i nomi in `.env.production.example`. Crea segreti casuali per `CRON_SECRET` e `SESSION_SECRET` (almeno 32 caratteri). Imposta `ADMIN_PASSWORD` solo per la sessione in cui esegui `create-admin`, poi rimuovilo dalle variabili di produzione. Non salvare chiavi o password nel repository.

La build non esegue seed né reset: `npm run build` genera Prisma Client e compila Next.js. Dopo aver impostato le variabili Production, applica le migrazioni con `npx prisma migrate deploy`, crea l'admin con `npm run create-admin` e rimuovi `ADMIN_PASSWORD` dall'ambiente prima del deploy pubblico. Per Preview configura un database separato e `APP_ENV=preview`, con chiavi Stripe test.

`vercel.json` programma `/api/cron/daily` alle 07:00 UTC e `/api/cron/cleanup` ogni cinque minuti. Impostando `CRON_SECRET` nel progetto Vercel, Vercel lo invia automaticamente come `Authorization: Bearer …`; le route confrontano il valore in tempo costante. La frequenza di cinque minuti richiede un piano Vercel che la supporti. Vedi [sicurezza dei cron Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Stripe

Registra in Stripe un endpoint webhook live a `https://<dominio-produzione>/api/stripe/webhook` e abilita questi eventi. La [documentazione Stripe sugli endpoint webhook](https://docs.stripe.com/api/webhook_endpoints/create) descrive configurazione e signing secret.

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

Copia il signing secret `whsec_…` mostrato nei dettagli di quell'endpoint e impostalo come `STRIPE_WEBHOOK_SECRET` in Vercel Production. La chiave `STRIPE_SECRET_KEY` di produzione deve iniziare con `sk_live_`. Gli ordini diventano pagati soltanto dopo la verifica della firma del webhook.

## Sicurezza e dati

- Gli header applicativi includono CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Referrer-Policy`.
- Il cookie admin usa `httpOnly`, `secure` in deploy HTTPS e `sameSite=strict`; le pagine `/admin` e `/admin/login` chiedono autenticazione e dichiarano `noindex`.
- `app/robots.ts` impedisce l'indicizzazione di `/admin`, delle API admin e dei cron. `robots.txt` non sostituisce l'autenticazione.
- Login e checkout richiedono rate limiting Upstash in produzione; se Redis manca, la funzione fallisce senza passare al limite solo in memoria.
- Vercel forza HTTPS per il dominio. Configura il dominio personalizzato e verifica il certificato prima di attivare vendite live.
- Le pagine legali devono essere riviste per i dati reali dell'attività, i cookie, le condizioni di vendita e il trattamento delle fotografie inviate alla prova AI.

## Backup del database

Abilita nel provider PostgreSQL la conservazione automatica e il ripristino point-in-time secondo il piano scelto. Se usi Neon, configura e verifica la frequenza delle snapshot automatiche nel progetto: la [configurazione della pianificazione snapshot](https://api-docs.neon.tech/reference/setsnapshotschedule) richiede un piano che supporti questa funzione. Controlla la retention disponibile e prova il ripristino su un branch/database non di produzione. In aggiunta, pianifica un export PostgreSQL cifrato giornaliero (`pg_dump` in formato custom) verso uno storage esterno con accesso ristretto e retention, conserva una copia separata per una finestra concordata ed esegui periodicamente una prova di restore. Non salvare dump nel repository o nell'artefatto Vercel.

## Verifiche

```powershell
npm run lint
npm test
$env:APP_ENV = 'production'; npm run build
```

La build di produzione richiede variabili d'ambiente sintatticamente valide, ma non contatta Stripe o i provider. `instrumentation.ts` rifiuta di avviare il server quando le variabili di produzione richieste mancano o la chiave Stripe non è live.
