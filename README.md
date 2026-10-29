# RUSH PRE-SALE

Prevendita della maglietta RUSH con pagamento Stripe, backoffice e modello 3D nel carosello. Prezzo iniziale **25 EUR**, soglia **15 pezzi**, taglie **XS–XXL**. Il raggiungimento della soglia consente l’avvio della produzione e **non chiude la raccolta**. Ogni pagamento conserva una scadenza individuale iniziale di **due mesi di calendario**.

La release **2.2.0** aggiunge identità ADMIN persistente, bootstrap sicuro, viewer GLB e dossier Office. La fonte funzionale è [SPEC.md](SPEC.md). Il candidato è sul branch `feature/rush-final-release`; la validazione commerciale dei servizi remoti è distinta dal collaudo locale.

## Funzionalità

- Home RUSH e percorso PRE-SALE, fotografie con zoom e modello 3D caricato su richiesta.
- Prezzo e disponibilità verificati dal server, condizioni versionate, Checkout e webhook idempotenti.
- Contatore pagato, soglia configurabile, produzione e chiusura indipendenti.
- Scadenze, rimborso automatico, outbox email e riconciliazione.
- Login, sessioni revocabili, dashboard, ordini, consegne, export CSV/XLSX e impostazioni del prodotto unico.
- Origin, Turnstile, rate limiting, CSP, cookie protetti e audit amministrativo.

## Stack e prerequisiti

Node **24** (supportato >=22 <25), Next.js **16.4.2**, React **19**, TypeScript, Prisma **6.12**, PostgreSQL, bcrypt, jose, Zod e model-viewer **4.4.0**. Stripe, Resend, Cloudflare Turnstile e Upstash Redis sono necessari per il flusso di vendita completo. Vercel ospita applicazione e cron. Versioni risolte nel [lockfile](package-lock.json) e nel TAD.

Il 3D richiede WebGL2; il fallback mantiene le fotografie. I test browser richiedono Chromium Playwright. Il test backup richiede pg_dump e pg_restore compatibili. Python serve solo a rigenerare i documenti.

## Installazione e ambiente

```sh
npm ci
```

Copiare `.env.example` in `.env.local`, ignorato da Git. Configurare DATABASE_URL e DIRECT_URL su un database di sviluppo separato, NEXT_PUBLIC_SITE_URL, ADMIN_EMAIL e i provider. In PowerShell usare `npm.cmd` se la policy blocca npm.ps1.

| Gruppo | Variabili principali |
|---|---|
| Ambiente | APP_ENV, NEXT_PUBLIC_SITE_URL |
| Database | DATABASE_URL, DIRECT_URL, conferma staging/production |
| Admin | ADMIN_ID, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET |
| Stripe | STRIPE_MODE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| Email | RESEND_API_KEY, MAIL_FROM, EMAIL_ALLOWLIST in staging |
| Protezione | Chiavi Turnstile, URL/token Upstash |
| Cron | CRON_SECRET, ENABLE_AUTOMATIC_JOBS |
| Produzione | Dati venditore, contatti, policy e conferme del modello production |

Il [runbook](docs/09_GESTIONE_TECNICA.md) contiene il catalogo completo. Solo URL del sito e site key Turnstile sono pubblici. Non inserire segreti nel frontend o nei commit.

## Database e amministratore

```sh
npm run db:validate
npm run db:migrate
npm run admin:setup
npm run create-admin
npm run dev
```

`admin:setup` chiede la password senza mostrarla e salva hash/segreto in .env.local già configurato. `create-admin` crea realmente AdminUser con ruolo ADMIN nel database: generare l’hash da solo non crea l’account. L’account esistente resta invariato, i conflitti sono rifiutati e le esecuzioni concorrenti non duplicano l’identità. create-admin non stampa password o hash. Accedere a `/admin/login` con la password scelta.

Per bootstrap non interattivo fornire ADMIN_PASSWORD al solo processo tramite gestione protetta dei segreti, oppure ADMIN_PASSWORD_HASH bcrypt valido. La password deve avere almeno 16 caratteri e massimo 72 byte UTF-8; non conservarla nel runtime. ADMIN_ID identifica l’account abilitato dal servizio: il nome predefinito non fornisce una password.

Per staging/production, dopo verifica della destinazione:

```sh
npm run db:migrate -- --env-file .env.staging.local
npm run create-admin -- --env-file .env.staging.local
```

Sostituire il file con quello production solo nell’ambiente corretto. La migrazione aggiunge AdminUser e l’impronta credenziale alle sessioni, conservando ordini e dati storici. Le vecchie sessioni richiedono un nuovo login. Il bootstrap **non è un reset password**: cambiare il solo hash nell’ambiente non aggiorna l’account DB. Nessun amministratore commerciale è stato creato nel collaudo locale.

## Build e avvio

```sh
npm run build
npm start
```

Per build di collaudo impostare APP_ENV=staging, STAGING_DATABASE_CONFIRMED=true, un’origine HTTPS in NEXT_PUBLIC_SITE_URL e URL DB di test. Il [workflow](.github/workflows/security-tests.yml) contiene una configurazione completa isolata. NEXT_PUBLIC_* è incorporato nella build: ricompilare quando cambia. La build non esegue migrazioni.

## Test

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:migration
npm run test:backup
npm run test:http
npx playwright install chromium
npm run test:browser
```

I runner DB accettano soltanto RUSH_TEST_DATABASE_URL su PostgreSQL **localhost/127.0.0.1**, database **rush_audit***. Creano schemi casuali; il test backup usa destinazioni dedicate. Non usare il database dell’applicazione. PG_BIN_DIR può indicare i client PostgreSQL; RUSH_BROWSER_EXECUTABLE un Chromium già installato.

`npm run verify:release` esegue installazione da lockfile, audit, lint, tipi, test, validazione schema, build, integrazione, migrazione, backup, HTTP e browser. Registra exit code e hash dei log in .test-results/release e si arresta al primo errore. Integrazione e HTTP sostituiscono i provider esterni: non certificano pagamento o recapito remoto.

Per riprendere una verifica interrotta si può usare `npm run verify:release -- --from=test-http`: i risultati precedenti devono essere PASS e i loro log devono mantenere gli hash registrati. Usare la ripresa soltanto se le modifiche successive non invalidano quei controlli; altrimenti ripartire dall’inizio.

## Modello 3D

[RushShirt360](components/RushShirt360.tsx) è la quarta voce di [ImageGallery](components/ImageGallery.tsx); `RushShirt3D` resta un alias compatibile. Il file `RUSH_Oversized_Tee_Web.glb` del pacchetto `RUSH_Tee_3D_Studio_Premium(2).zip` sostituisce byte per byte il precedente asset in `public/assets/models/rush-oversized-shirt.glb`: 7.465.188 byte, SHA-256 `f32fdbc136cc4d1c049e9ec22950e98df3a35043365fcfd350a9fd4dbb8c8aa6`. L'URL include una versione per evitare copie obsolete in cache.

Libreria e modello sono caricati solo alla selezione. Sono presenti anteprima fotografica, avanzamento, timeout, fallback e riprova, fronte/retro, rotazione, pausa/ripresa, reset e zoom proporzionato al modello. I gesti del modello non cambiano slide; lo scorrimento verticale della pagina resta disponibile. La rotazione rispetta il movimento ridotto e si ferma quando la pagina viene nascosta. Stili e tipi del custom element sono in `RushShirt360.module.css` e `types/model-viewer.d.ts`.

La CSP autorizza WebAssembly del decoder e blob locali delle texture; eval JavaScript resta vietato in produzione. Le fotografie originali sono conservate. Il modello fornito è approssimato e non viene ricostruito.

La suite browser controlla anche l'hash dell'asset servito, caricamento lento, recupero dagli errori e layout da 320 a 1440 px. Vedi il [report dell'integrazione Premium](docs/13_MODELLO_3D_PREMIUM.md); i documenti precedenti descrivono il vecchio modello.

## Deploy Vercel

1. Preparare branch e PR, verificando CI e documenti del candidato.
2. Configurare ambienti separati, TLS, provider e origine canonica dai modelli staging/production.
3. Provare il backup, applicare la migrazione additiva sulla destinazione verificata e inizializzare l’admin autorizzato.
4. Distribuire il commit approvato e verificare login, API, GLB e log.
5. Completare pagamento TEST, webhook, email, rimborso e cron prima di LIVE.

vercel.json pianifica daily alle 07:00 UTC e cleanup alle 07:30 UTC. I job richiedono CRON_SECRET; daily è in anteprima fuori production. Il banner TEST scompare solo con APP_ENV=production e STRIPE_MODE=live: non viene nascosta una modalità ancora in collaudo.

Il candidato non è stato pubblicato né unito a main. Prima del lancio completare [preflight e piano di rilascio](docs/10_PIANO_RILASCIO.md), dati venditore e prove remote. I riscontri storici sul dominio esistente non certificano il nuovo branch.

## Struttura e documentazione

app/ pagine/API; components/ UI; lib/ servizi e sicurezza; prisma/ dati/migrazioni; public/assets/ immagini/GLB; scripts/ operazioni; tests/ regressioni; docs/ dossier ed evidenze.

- [Manuale d’uso](docs/Manuale_Uso_RUSH_Presale.docx)
- [BUR](docs/BUR_RUSH_Presale.docx) e [FUD](docs/FUD_RUSH_Presale.docx)
- [TAD](docs/TAD_Architettura_Tecnica_RUSH_Presale.docx)
- [Casi di test Excel](docs/Casi_di_Test_RUSH_Presale.xlsx)
- [Rapporto di collaudo](docs/Rapporto_Collaudo_RUSH_Presale.docx)
- [Indice](docs/README.md), [sorgenti](docs/sorgenti), [evidenze](docs/evidenze) e [descrizione PR](docs/PULL_REQUEST.md)

Rigenerazione dalle evidenze versionate:

```sh
python -m pip install -r scripts/requirements-docs.txt
python scripts/generate-docs.py
```

Dopo una nuova verifica completa, `python scripts/generate-docs.py --capture` acquisisce log e screenshot e rigenera i documenti. Una cattura incompleta viene rifiutata; i servizi remoti non ricevono PASS impliciti.
