# Preparazione Vercel — staging RUSH

Questa procedura prepara una demo privata con Stripe TEST. Nessun deploy, creazione di servizi, modifica di account o migrazione su database esterni è stato eseguito durante l'audit. Il verdetto e i controlli ancora necessari sono in STAGING_REPORT.md.

## 1. Repository e branch

Il branch locale è `staging`. Il checkpoint `3b5bc6c` conserva il lavoro preesistente prima delle correzioni. SPEC.md, logo, mockup e stile esistente sono preservati.

Il remote `origin` è `vicente490x/rush-presale` su GitHub, senza credenziali incorporate nella URL. Il 16 ottobre 2026 il connettore GitHub ha confermato visibilità **private**, repository non archiviato e permessi push/admin dell'account collegato. Nessun push eseguito. Se ne serve uno nuovo, crearlo nell'account concordato senza sovrascrivere il remote esistente senza autorizzazione. Prima del primo push controllare i file inclusi con `git status --short`, `git diff --cached --stat` e verificare che compaiano soltanto sorgenti e modelli `.env.*.example` senza valori reali. Non aggiungere `.env.local`, database, file credenziali, log o backup.

Configurare il remote del nuovo repository solo dopo l'autorizzazione del proprietario, quindi pubblicare esclusivamente il branch:

```powershell
git push -u origin staging
```

Non usare `git push --mirror` o `--all`: gli altri branch non sono oggetto di questo audit. Alcune snapshot locali `refs/codex/turn-diffs/*` contengono un vecchio SQLite di test con un account admin; non fanno parte dei commit dei branch e non vanno trasferite. Non è stata riscritta o eliminata la cronologia.

## 2. Database separato

Creare un database PostgreSQL persistente **nuovo**, dedicato a RUSH staging. Non usare il database locale esistente né quello destinato ai futuri clienti; non importare dati reali. Configurare un pool compatibile Prisma per `DATABASE_URL` e la connessione diretta per `DIRECT_URL`, con TLS secondo le istruzioni del provider.

Verificare nel pannello del provider progetto, database e permessi dell'utente. Solo dopo questa verifica impostare `STAGING_DATABASE_CONFIRMED=true`. È un'attestazione operativa: il codice può bloccare una conferma mancante, ma non può dimostrare che due URL diversi non puntino allo stesso database.

Attivare backup/PITR e verificare un ripristino su una seconda istanza prima di conservare dati importanti. Backup e ripristino del provider non sono stati verificati localmente.

La migrazione nuova è `prisma/migrations/20261016000100_staging_hardening/migration.sql`: aggiunge colonne, tabelle, indici, FK e controlli senza eliminare dati. Lo schema iniziale viene mantenuto. Leggere il SQL e fare un backup prima di applicarlo a un DB con dati. I vincoli CHECK sono inizialmente NOT VALID per non invalidare righe storiche; un'eventuale validazione dei dati pregressi richiede una verifica separata. Il trigger rende irreversibile l'avvio produzione anche attraverso aggiornamenti diretti al DB.

Le righe storiche non ricevono condizioni accettate inventate: `termsSnapshot`/versione rimangono null se non disponibili. Per produzione già avviata prima della migrazione, viene conservato come riferimento prudenziale il precedente `Settings.updatedAt`, perché il vero istante di avvio non era registrato. I nuovi avvii hanno il timestamp effettivo. I prezzi unitari storici sono ricavati da importo/quantità e i rimborsi già registrati valorizzano l'importo rimborsato.

## 3. Credenziali e variabili

Da terminale interattivo locale:

```powershell
npm ci
npm run staging:credentials
```

Il secondo comando chiede due password diverse, minimo 16 caratteri e massimo 72 byte UTF-8. Scrive hash bcrypt e segreti casuali in `.env.staging.credentials.local`, ignorato da Git, e rifiuta di sovrascrivere un file esistente. Nessuna password in chiaro viene salvata o stampata. Non inviare questo file al committente: condividere solo la password dell'anteprima tramite un canale concordato. Il login admin rimane riservato all'amministratore. Proteggere il file locale con i permessi del proprio account Windows.

Importare il repository in Vercel come Next.js, root del repository, Node 24.x, installazione `npm ci`, build `npm run build`. La build genera Prisma Client e compila Next; **non applica migrazioni né seed**. Verificare che il piano supporti le funzioni con `maxDuration=300` utilizzate dalle operazioni amministrative a lotti.

Nel progetto Vercel configurare le seguenti variabili per **Preview**, preferibilmente limitate al branch `staging`:

- `APP_ENV=staging`, anche quando `NODE_ENV=production` è impostato da Vercel. I deployment con `VERCEL_ENV=preview` ricadono su staging e rifiutano configurazioni esplicitamente development/production.
- `NEXT_PUBLIC_SITE_URL`: origine HTTPS reale e stabile del branch staging, senza slash finale; aggiornarla prima della build. È usata per redirect, controllo Origin e hostname Turnstile.
- `DATABASE_URL`, `DIRECT_URL`, `STAGING_DATABASE_CONFIRMED=true`, solo per il DB separato.
- `STRIPE_SECRET_KEY` **sk_test_**, `STRIPE_WEBHOOK_SECRET` dell'endpoint test. Le chiavi live sono sempre rifiutate, anche con `ALLOW_LIVE_PAYMENTS=true`.
- `ADMIN_ID`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`: valori admin generati. Non impostare `ADMIN_PASSWORD` su Vercel.
- `STAGING_PASSWORD_HASH`, `STAGING_SESSION_SECRET`: distinti da admin; il cookie anteprima è firmato, HttpOnly, Secure e SameSite=Lax. Il cookie admin è SameSite=Strict.
- `CRON_SECRET`: almeno 32 caratteri casuali; `ENABLE_AUTOMATIC_JOBS=false`.
- `ADMIN_EMAIL`: destinatario iniziale al primo accesso; successivamente modificarlo dall'admin, non dall'ambiente.
- `RESEND_API_KEY`, `MAIL_FROM` con mittente verificato nel provider.
- `EMAIL_ALLOWLIST`: indirizzi esatti autorizzati per la demo, separati da virgola. In staging vengono rifiutati ordini con altri indirizzi e non vengono inviate email ad altri destinatari. Lasciare la lista vuota blocca questi flussi in sicurezza.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: registrare l'hostname staging; verifica anche l'hostname restituito dal provider.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: rate limit checkout. Login admin e gate usano il rate limit atomico nel DB.

Usare `.env.staging.example` come checklist. Prezzo, soglia, taglie, quantità, scadenze, preavvisi, destinatari e testi operativi si gestiscono in `/admin/impostazioni` dopo la prima inizializzazione. Non configurare provider AI: la funzione non è prevista da SPEC.md ed è esclusa dalla demo.

Preparare un file locale ignorato `.env.staging.local` dal modello, aggiungere i valori reali e controllarlo prima di caricare le variabili:

```powershell
npm run staging:check -- --env-file .env.staging.local
```

Il controllo legge esclusivamente il file indicato, senza ereditare `.env.local` o variabili della shell. Non stampa valori e non contatta servizi, database o destinatari. Segnala campi mancanti, placeholder, URL locali, chiavi live, vecchie opzioni mock, password in chiaro, segreti condivisi e destinatari admin fuori allowlist. Un esito positivo verifica solo il formato: non dimostra validità delle credenziali, separazione del DB, domini autorizzati o recapito email. Hash diversi non dimostrano password diverse; usare il generatore interattivo previsto.

## 4. Migrazioni e primo avvio

Le migrazioni devono essere applicate **esplicitamente** sul DB staging autorizzato prima di usare il deployment. In una shell con le variabili staging del DB corretto:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate
```

Gli script Prisma caricano `.env.local` come Next, ma le variabili già impostate nella shell hanno precedenza. Verificare quindi che un vecchio `.env.local` di sviluppo non venga usato per sbaglio. Non usare `prisma db push`, `migrate reset`, reset automatici o seed nella build. Su database temporanei i test applicano entrambe le migrazioni in schemi nuovi; non modificano il DB dell'app esistente.

L'amministratore è unico e viene identificato da `ADMIN_ID` nel registro operazioni; l'hash resta in ambiente. Non esiste un pulsante di creazione account o una tabella utenti admin da popolare. Il vecchio database SQLite non viene usato.

## 5. Protezione e accesso del committente

Mantenere attiva Vercel Deployment Protection se disponibile. Per il committente usare un invito autorizzato o un link condivisibile Vercel previsto dal piano: dopo la protezione Vercel rimane comunque il gate RUSH `/anteprima`. La password del gate non concede accesso a `/admin`.

Per Stripe usare il **Protection Bypass for Automation** e aggiungere il token alla sola URL del webhook come parametro `x-vercel-protection-bypass`. Stripe non deve effettuare il login al sito. Il codice esclude soltanto `/api/stripe/webhook` dal gate RUSH e continua a verificare firma e modalità test. Non creare un'eccezione pubblica per tutto il dominio. Il token di bypass è un segreto: inserirlo solo nella configurazione privata Stripe; oscurarlo in log e screenshot e ruotarlo se esposto. Vercel documenta questo meccanismo nella [guida ufficiale](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

Anche `/api/cron/daily` e `/api/cron/cleanup` sono esclusi dal gate e richiedono sempre `Authorization: Bearer CRON_SECRET`. I soli asset pubblici del brand (`/assets/logo.png`, `/assets/mockup-fronte.png`, `/assets/mockup-retro.png`) sono accessibili per consentire le richieste interne dell'ottimizzatore immagini Next, che non trasmette i cookie del visitatore. Non contengono dati clienti o upload privati. Le pagine del sito, le API ordini e l'admin restano protetti in staging. Banner, meta robots, header X-Robots-Tag e robots.txt impediscono l'indicizzazione senza sostituire la protezione con password.

## 6. Demo, cron e dati sintetici

I [Vercel Cron vengono eseguiti sui deployment Production](https://vercel.com/docs/cron-jobs), non sui normali Preview. `vercel.json` registra `GET /api/cron/daily` alle 07:00 UTC. In staging e con `ENABLE_AUTOMATIC_JOBS=false` il cron restituisce soltanto un dry-run. Non abilitare job operativi durante questa preparazione.

Per la demo usare `/admin/impostazioni` → Rimborsi → SIMULA. Il controllo effettivo richiede il pulsante e una conferma esplicita: `POST /api/admin/expiry` con `confirm:true`. Può richiedere rimborsi **TEST**, riconciliare checkout e inviare email solo alla allowlist. Gli esiti pending non vengono presentati come rimborsi conclusi. Se un lotto segnala altri elementi, ripetere il controllo; la diagnostica permette di ritentare la chiusura dei checkout.

Il seed è opzionale e non eseguito dall'audit:

```powershell
$env:SEED_STAGING_CONFIRMED='true'
npm run seed:staging
npm run seed:staging -- --cleanup
```

Il seed crea tre ordini **PENDING sintetici**, etichettati `RUSH-DEMO-V1-*`/`demoSeedId=rush-staging-v1`, con email example.invalid e senza Stripe/email. Non altera il contatore pagato e non simula pagamenti. `--cleanup` senza conferma è un dry-run. Solo se si intende eliminare quei dati demo, dopo verifica e autorizzazione:

```powershell
npm run seed:staging -- --cleanup --confirm-delete-demo=rush-staging-v1
```

La cancellazione filtra insieme marker, prefisso numero ordine e assenza di identificativi Stripe. Non elimina ordini di checkout test, clienti, impostazioni, termini o log. Nessuna cancellazione del seed è stata eseguita durante questo lavoro.

## 7. Verifica e pubblicazione autorizzata

Prima di autorizzare il deploy finale verificare localmente:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
$env:RUSH_TEST_DATABASE_URL='postgresql://UTENTE@127.0.0.1:PORTA/rush_audit_test'
npm run test:integration
npm run test:migration
npm run test:http
```

I test DB/HTTP rifiutano database non locali o con nome diverso da `rush_audit*` e creano uno schema casuale nuovo a ogni esecuzione. `test:http` richiede una build staging con `NEXT_PUBLIC_SITE_URL=https://rush-staging.example.invalid` oppure una build con origine test nota e `RUSH_HTTP_EXPECTED_ORIGIN` uguale. Usa la porta 3100 e la libera alla fine. Non esercita rendering browser o servizi reali.

In Preview eseguire tutta la procedura in STRIPE_SETUP.md, provare login/gate, conferme email, responsive a 360/390/768/1440 px, gallery da tastiera, console browser, errori API, chiusura, cambio listino/termini, export e dry-run rimborsi. Le verifiche visive e il checkout esterno sono ancora da eseguire: non presentarli come conclusi.

Solo con consenso esplicito creare il Preview deployment. Per rollback usare un precedente deployment staging verificato nel pannello Vercel; non ripristinare distruttivamente il DB. La migrazione è additiva, ma il codice precedente non applica le nuove protezioni: chiudere la PRE-SALE e mantenere il gate durante un rollback. Tenere un backup e correggere avanti lo schema; non eliminare colonne o termini accettati per ripristinare una vecchia UI.
