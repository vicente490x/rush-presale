> **Stato corrente del 26 ottobre 2026:** questo documento conserva evidenze storiche. Per requisiti ed esiti del candidato attuale vedere [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md), [SECURITY_TEST_RESULTS.md](SECURITY_TEST_RESULTS.md) e [SECURITY_DEPLOY_CHECKLIST.md](SECURITY_DEPLOY_CHECKLIST.md). Il gate condiviso è rimosso e LIVE è ora supportato con guard di produzione; le precedenti istruzioni TEST-only o di mancata autorizzazione al lavoro sono storiche.

> Aggiornamento 26 ottobre 2026: accesso pubblico senza password condivisa. Le istruzioni storiche sul gate di staging sono superate; vedere [PUBLIC_ACCESS_RELEASE.md](./PUBLIC_ACCESS_RELEASE.md). Amministrazione ancora protetta.

---
noteId: "86aa8780ccac11f1841093d920410d9b"
tags: []

---

# RUSH PRE-SALE — Preparazione finale Vercel Preview

**Data: 20 ottobre 2026. Verdetto: SECURITY NOT READY FOR STAGING.**

La preparazione locale è completata. Database remoto, credenziali autentiche, servizi e verifiche online restano necessari. Nessun deploy, push, creazione di risorse esterne, migrazione remota, pagamento reale, attivazione AI o rimborso automatico remoto eseguito.

Gli allegati ripetuti della richiesta sono identici, verificati tramite SHA-256. SPEC.md e i cinque report SECURITY sono stati letti insieme a STAGING_REPORT.md, DEPLOY_VERCEL.md, modello ambiente, manifest, schema e configurazione cron. I risultati precedenti sono evidenze storiche: sotto sono indicati i controlli effettivamente ripetuti sul codice corrente.

## Stati usati

- **COMPLETATO LOCALMENTE:** codice/procedura preparati e verificati nell'ambiente locale indicato.
- **DA CONFIGURARE ESTERNAMENTE:** richiede proprietario, credenziali o interventi sui provider; nessuna modifica effettuata.
- **DA VERIFICARE ONLINE:** richiede l'ambiente autorizzato effettivo; i mock non valgono come prova.
- **BLOCCANTE:** impedisce il verdetto READY o la pubblicazione richiesta.

## 1. Repository corrente

**COMPLETATO LOCALMENTE.** Branch `staging`, HEAD `7a6794d`, sette commit raggiungibili. Le patch dell'audit e di questa preparazione sono nel working tree, incluse nuove migrazioni/test/report **ancora da aggiungere e committare**. Non confondere HEAD con il candidato locale appena testato.

Remote locale: `origin`, GitHub `vicente490x/rush-presale`, senza credenziali incorporate nella URL. La visibilità privata era stata verificata il 16 ottobre; non è stata ricertificata online in questa fase. Non è stata riscritta la cronologia.

Nessun `.env` reale o SQLite nei file tracciati. `.env.staging.local` è stato creato dal modello, è ignorato da Git, non contiene credenziali operative e mantiene `STAGING_DATABASE_CONFIRMED=false`. `.env.local` di sviluppo è distinto dalla configurazione staging; nel successivo intervento admin autorizzato sono stati corretti l'escaping dell'hash esistente e il `DIRECT_URL` locale.

## 2. Patch presenti e correzioni mirate

**COMPLETATO LOCALMENTE.** Verificata la presenza dei venti gruppi di modifiche dichiarate, poi rieseguiti i test applicabili:

- Next.js e @next/env **16.4.2**, React/React DOM **19.3.0**, Prisma/Client **6.12.0**, Stripe **18.5.0**, Sharp **0.35.5**.
- Sessioni admin con jti casuale, digest DB, revoca al logout, scadenza, attore/issuer/audience e firma legata alla password. Gate distinto; UI non nasconde un logout fallito.
- Webhook sul body originale con firma SDK e rifiuto live; ledger/outbox, associazione rigorosa PI/valuta/importi, rimborsi idempotenti e riconciliazione degli esiti incerti.
- Nonce CSP, rendering dinamico, no-store HTML/API/CDN, referrer disabilitato, optimizer ristretto ai tre asset.
- IP fidato solo su Vercel, login/gate con rate limit DB atomico; limiti multipart/pixel/Origin e cleanup intent prima dell'upload nel try-on disabilitato.
- Guard indipendenti sulle API/pagine admin, CSRF, log minimizzati, lock consegna/rimborsi e migrazione AdminSession.

Correzioni aggiuntive necessarie emerse durante questa verifica:

1. **SEC-14 — MEDIUM, CORRETTO:** Upstash può restituire `success:true` con `reason:"timeout"`. Il codice ora rifiuta questo risultato e il checkout risponde 503 tramite il suo error handler. Test con SDK reale, timer controllato e fetch sostituito, senza rete. [Comportamento documentato da Upstash](https://upstash.com/docs/redis/sdks/ratelimit-ts/features).
2. **SEC-15 — MEDIUM, CORRETTO:** il form gate senza metodo poteva usare GET prima dell'idratazione/senza JavaScript, mettendo la password nella query. Gate e admin ora dichiarano POST e action esplicita; avviso noscript. Nessun bypass del CAPTCHA: il fallback form non JSON viene rifiutato. Verificato l'HTML servito dalla build, non il rendering browser.
3. `staging:credentials`: validazione anche della funzione generatrice, rifiuto controlli/oltre 72 byte, cinque valori distinti fra password e segreti, gestione annullamento/EOF, hash bcrypt costo 12 e `$` conservati letteralmente. Nessuna password operativa generata o richiesta dall'agente.
4. Prisma CLI: aggiunto `--env-file` esplicito senza fallback agli URL shell/sviluppo; consentiti in questa modalità soltanto validate, migrate status e migrate deploy, con conferma staging nel file.
5. Preflight: controllo di `sslmode=require&sslaccept=strict` su entrambi gli URL per il connettore Prisma 6; rifiutati parametri TLS duplicati/incoerenti e override socket `host`. Il controllo di formato non verifica rete, CA o privilegi.

## 3. SEC-12 e problemi residui

**COMPLETATO LOCALMENTE:** verificati branch, ignore, diff e raggiungibilità. La nuova scansione euristica ha esaminato 122 file tracciati e 329 blob Git incluse refs tree: confermato l'oggetto `0259ba428ab5`, `prisma/dev.db`, in una snapshot interna. Non è raggiungibile da `staging` né dalla cronologia branch/tag/remote esaminata. Le URL candidate nei sorgenti sono fixture/interpolazioni; nessun valore segreto è riportato qui.

**BLOCCANTE — conferma proprietario:** stabilire se la vecchia password è riutilizzata. La sostituzione di eventuali password ancora valide e l'invalidazione delle sessioni richiedono conferma e azione del proprietario. La sola esclusione dal trasferimento non prova il mancato riuso. Nessuna eliminazione delle refs, garbage collection o riscrittura eseguita.

**BLOCCANTE — SEC-13:** non esiste ancora una configurazione autentica verificata del DB e dei provider. I 28 problemi segnalati dal precedente audit riguardavano `.env.local` di sviluppo; non sono stati usati per fingere un preflight del nuovo file. Il preflight è stato ulteriormente rafforzato e verrà eseguito sul file dedicato quando completo.

## 4. Variabili Vercel: nomi esatti

**DA CONFIGURARE ESTERNAMENTE / BLOCCANTE.** Scope **Preview**, override del solo branch `staging` quando disponibile; niente riuso delle credenziali commerciali.

- `APP_ENV=staging`.
- `NEXT_PUBLIC_SITE_URL`: origine HTTPS canonica e stabile, senza path/query, coerente con browser, redirect, Origin e hostname Turnstile; impostarla prima della build.
- `DATABASE_URL`: PostgreSQL staging via pool compatibile, credenziali runtime e TLS verificato.
- `DIRECT_URL`: stesso DB/schema staging tramite connessione diretta, ruolo migrazioni; privilegi DDL separati se il provider lo consente.
- `STAGING_DATABASE_CONFIRMED=true` **solo dopo verifica manuale dell'isolamento**. Il modello resta false.
- `STRIPE_SECRET_KEY`: chiave `sk_test_` dell'ambiente TEST scelto.
- `STRIPE_WEBHOOK_SECRET`: signing secret dell'esatto endpoint Dashboard TEST.
- `ALLOW_LIVE_PAYMENTS=false`: guard legacy; il codice rifiuta comunque le chiavi live.
- `ADMIN_ID`: identificatore admin, ad esempio quello del modello; non è una password.
- `ADMIN_PASSWORD_HASH`: hash bcrypt della nuova password admin.
- `STAGING_PASSWORD_HASH`: hash bcrypt di una diversa password demo.
- `SESSION_SECRET`, `STAGING_SESSION_SECRET`, `CRON_SECRET`: tre valori casuali distinti, 32 byte generati ciascuno.
- `ENABLE_AUTOMATIC_JOBS=false`.
- `ADMIN_EMAIL`: destinatario iniziale incluso nell'allowlist; dopo inizializzazione i destinatari si gestiscono nelle impostazioni.
- `RESEND_API_KEY`: chiave server del progetto/provider autorizzato.
- `MAIL_FROM`: mittente sul dominio verificato.
- `EMAIL_ALLOWLIST`: indirizzi demo esatti autorizzati, separati da virgola; non wildcard.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: chiave pubblica del widget staging.
- `TURNSTILE_SECRET_KEY`: chiave privata per Siteverify.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: endpoint HTTPS e token read/write del Redis dedicato allo staging.
- `TRYON_REVIEWED=false`; nessuna chiave fal.ai/Supabase richiesta per questa demo.

`NODE_ENV=production`, `VERCEL=1` e `VERCEL_ENV=preview` sono contesto runtime della piattaforma, non credenziali da inventare. Non impostare VERCEL=1 su un server diretto.

**Stripe pk_test:** esiste fra le chiavi pubbliche dell'account TEST, ma il codice corrente non la legge. Il server crea Checkout e il browser segue `checkoutUrl`; non è integrato Stripe.js. Non è richiesta una variabile `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` né altra variabile inventata. [Chiavi Stripe](https://docs.stripe.com/keys).

## 5. Endpoint effettivi

`ORIGINE_STAGING` significa il dominio HTTPS effettivo ancora da concordare/configurare, non un URL già pubblicato.

- **POST `ORIGINE_STAGING/api/orders`**: crea il checkout dopo gate, Origin, rate limit e Turnstile; restituisce checkoutUrl. Nessun `/api/checkout`.
- **POST `ORIGINE_STAGING/api/stripe/webhook`**: endpoint da registrare su Stripe; body originale e header `stripe-signature`. Bypassa solo il gate applicativo, non la firma.
- **GET `ORIGINE_STAGING/conferma?code=…`**: ritorno browser, non conferma pagamenti.
- **GET `/api/orders/[orderNumber]`**: stato minimizzato, in sola lettura e dietro il gate staging.
- **POST `/api/admin/orders/[id]/refund`**: rimborso manuale TEST, sessione admin/Origin e conferma esplicita.
- **GET `/api/admin/expiry`**: simulazione; **POST** sullo stesso percorso con `confirm:true` può avere effetti Stripe/email TEST e richiede autorizzazione alla prova.
- **POST `/api/admin/diagnostics`**: azioni `email-test` o `reconcile-checkouts`, con conferma e autorizzazione; **GET**: diagnostica.
- **POST `/api/staging/login`**, **POST `/api/admin/login`**, **POST `/api/admin/logout`**: accessi e revoca.
- **GET `/api/cron/daily`**, **GET `/api/cron/cleanup`**: Bearer CRON_SECRET. Daily è dry-run in staging; cleanup cancella risorse/sessioni scadute e non è un dry-run.

## 6. Procedura Git sicura

**COMPLETATO LOCALMENTE: procedura preparata. Commit/push NON eseguiti.**

Prima di trasferire qualsiasi branch, verificare nel progetto Vercel se un push attiva un deployment automatico. In tal caso il consenso al deploy deve precedere il push, oppure l'automazione deve essere sospesa dal proprietario. Non collegare/importare il progetto come scorciatoia: può avviare una prima build/deploy.

Controlli locali:

```powershell
git branch --show-current
git status --short
git diff --check
git diff --stat
git ls-files -- .env* '*.db' '*.sqlite' '*.sqlite3'
git check-ignore .env.staging.local .env.staging.credentials.local
git rev-list staging --objects
```

Il primo comando deve indicare staging; nella lista ambiente sono ammissibili solo i tre modelli `.example`. Il comando sugli oggetti elenca nomi/ID, non valori segreti; verificare nuovamente l'assenza dell'oggetto SQLite storico prima del push finale.

Per includere il candidato revisionato, usare una selezione esplicita, senza `git add .`, senza `-f`:

```powershell
$stagingFiles = @(
  '.env.staging.example', 'AUDIT.md', 'DEPLOY_VERCEL.md', 'STAGING_REPORT.md',
  'SECURITY_AUDIT.md', 'SECURITY_FIX_REPORT.md', 'SECURITY_TEST_RESULTS.md',
  'SECURITY_DEPLOY_CHECKLIST.md', 'SECURITY_REMAINING_RISKS.md', 'STAGING_FINAL_PREPARATION.md',
  'app/api/admin/logout/route.ts', 'app/api/admin/orders/[id]/delivery/route.ts',
  'app/api/cron/cleanup/route.ts', 'app/api/stripe/webhook/route.ts',
  'app/api/tryon/route.ts', 'app/layout.tsx',
  'components/AdminDashboard.tsx', 'components/AdminLogin.tsx', 'components/StagingLogin.tsx',
  'lib/admin-auth.ts', 'lib/http.ts', 'lib/prisma.ts', 'lib/ratelimit.ts',
  'lib/refunds.ts', 'lib/staging-auth.ts', 'lib/storage.ts', 'lib/stripe-events.ts',
  'lib/security-headers.ts', 'next.config.ts', 'package.json', 'package-lock.json',
  'prisma/schema.prisma', 'prisma/migrations/20261016000200_security_sessions/migration.sql',
  'proxy.ts', 'scripts/prisma-cli.ts', 'scripts/staging-prisma-env.ts',
  'scripts/staging-check.ts', 'scripts/staging-credentials.ts', 'scripts/test-http.ts', 'scripts/setup-local-admin.ts',
  'tests/integration.test.ts', 'tests/security-hardening.test.ts',
  'tests/staging-check.test.ts', 'tests/staging-preparation.test.ts', 'tests/local-admin-env.test.ts'
)
git --literal-pathspecs add -- $stagingFiles
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "Harden security and prepare protected staging"
```

Ispezionare il diff in un terminale privato prima del commit e fermarsi se contiene file o valori non attesi. Rivedere la selezione se intervengono ulteriori modifiche; questa lista descrive il candidato del 20 ottobre.

Soltanto dopo autorizzazione al trasferimento e verifica delle automazioni:

```powershell
git -c remote.origin.mirror=false -c push.followTags=false push --dry-run --no-follow-tags origin refs/heads/staging:refs/heads/staging
git -c remote.origin.mirror=false -c push.followTags=false push --no-follow-tags origin refs/heads/staging:refs/heads/staging
```

Refspec esplicito, niente tag aggiunti, mirror disattivato per il comando, niente force/all. In caso di non-fast-forward fermarsi e revisionare le differenze: non forzare. Le refs interne non sono incluse. Un diff vuoto all'indice da solo non dimostra la sicurezza della storia: resta valido il controllo di raggiungibilità.

## 7. Credenziali e file dedicato

**COMPLETATO LOCALMENTE:** generatore e test. **DA CONFIGURARE ESTERNAMENTE / BLOCCANTE:** scelta delle due nuove password da parte del proprietario.

In terminale interattivo privato:

```powershell
npm.cmd run staging:credentials
```

Scegliere due password nuove, diverse, preferibilmente create dal password manager, almeno 16 caratteri e al massimo 72 byte UTF-8. Il comando le chiede due volte con input nascosto; rifiuta uguaglianza e caratteri di controllo, genera tre segreti distinti e scrive soltanto hash/segreti in `.env.staging.credentials.local`. Rifiuta la sovrascrittura. Proteggere il file con ACL del proprio account Windows; il mode POSIX non certifica le ACL Windows.

Copiare i valori nel file dedicato `.env.staging.local` e nel pannello Preview usando un editor locale privato. Niente password in chiaro nel file, codice o chat. Nei due flussi `staging:check` e Prisma `--env-file`, il parser Node conserva `$` letteralmente. Su Vercel incollare il valore bcrypt completo **senza virgolette aggiunte e senza backslash prima di `$`**. Non usare sostituzioni della shell o riutilizzare questo file come `.env.local` del loader Next.

Il modello locale preparato non è una configurazione autentica. Quando il proprietario avrà completato i valori e confermato il DB:

```powershell
npm.cmd run staging:check -- --env-file .env.staging.local
```

**NON ESEGUITO su configurazione autentica**, perché non ancora disponibile. Il comando non stampa valori e non contatta provider. PASS significa solo formato coerente; occorrono comunque tutte le prove online.

## 8. Database staging

**DA CONFIGURARE ESTERNAMENTE / BLOCCANTE.**

1. Creare un progetto/database nuovo dedicato alla demo, con credenziali non riutilizzate; scegliere consapevolmente regione, backup e retention. Non clonare clienti reali né puntare i test automatici al futuro staging.
2. Verificare nel provider identificativo progetto, database e schema. Confrontarli con quelli commerciali. Solo il proprietario può confermare `STAGING_DATABASE_CONFIRMED=true`; URL diversi possono condurre allo stesso DB.
3. Configurare DATABASE_URL via pool compatibile Prisma e DIRECT_URL diretto verso lo stesso database/schema. Usare ruolo runtime con DML soltanto sulle tabelle applicative e ruolo migrazioni con DDL richiesto, senza superuser/CREATEDB/CREATEROLE se non indispensabile al provider. Verificare accessi di rete e che nessun client anonimo possa leggere le tabelle.
4. Usare URL con password percent-encoded e `sslmode=require&sslaccept=strict`; installare/configurare la CA prevista se necessaria. Testare la connessione sia diretta sia pooled dal runtime autorizzato. Un errore certificato va risolto nel certificato/hostname, non disabilitando la verifica. [Connettore PostgreSQL Prisma 6](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql).
5. Verificare backup e ripristino su una seconda destinazione prima di conservare dati da preservare.

Le tre migrazioni esistono e sono state lette:

- `20261013000100_initial`: schema iniziale.
- `20261016000100_staging_hardening`: aggiunte, snapshot, indici/FK, backfill e trigger produzione monotona.
- `20261016000200_security_sessions`: sola tabella AdminSession e indice, nuovo login obbligatorio.

Dopo verifica della destinazione e **autorizzazione esplicita alla migrazione remota**, in workspace revisionato:

```powershell
npm.cmd run db:validate -- --env-file .env.staging.local
node node_modules/tsx/dist/cli.mjs scripts/prisma-cli.ts migrate status --env-file .env.staging.local
npm.cmd run db:migrate -- --env-file .env.staging.local
node node_modules/tsx/dist/cli.mjs scripts/prisma-cli.ts migrate status --env-file .env.staging.local
```

Questa modalità legge gli URL esclusivamente dal file indicato, richiede APP_ENV staging e conferma nel file, e non ammette reset/dev/db push. La build genera il client ma non migra/seed. Non modificare migrazioni già applicate.

Verifiche read-only nella console SQL autorizzata:

```sql
SELECT current_database(), current_user;
SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();
SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user;
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations" ORDER BY started_at;
SELECT to_regclass('"AdminSession"');
SELECT tgname FROM pg_trigger WHERE tgname = 'rush_production_monotonic';
```

Controllare TLS anche sul collegamento client→pool: la vista del DB può descrivere solo pool→DB. La console del provider non prova da sola la connessione del runtime. Verificare privilegi DML/table/schema con il ruolo runtime effettivo. `migrate status` prova la storia delle migrazioni, non l'assenza di ogni drift.

Non c'è un account admin da inserire in una tabella utenti: ADMIN_ID/hash/secret configurano l'unico admin. Al primo login viene creata AdminSession. Dopo deploy autorizzato provare password corretta/errata, CAPTCHA, tabella sessione, logout e rifiuto del vecchio cookie; rotazione hash invalida i cookie precedenti.

## 9. Vercel Preview protetta

**DA CONFIGURARE ESTERNAMENTE / DA VERIFICARE ONLINE / BLOCCANTE.**

Preparare un progetto separato dalla futura produzione commerciale; Next.js, root repository, Node 24.x, install `npm ci`, build `npm run build`. Verificare supporto del piano ai maxDuration dichiarati (fino a 300 secondi). Non promuovere staging a Production per far partire cron.

Configurare le variabili Preview del branch staging e un'origine HTTPS stabile prima della build. Le variabili NEXT_PUBLIC vengono incorporate nel bundle e richiedono una nuova build dopo modifiche. Accedere tramite l'origine canonica: alias differenti possono fallire correttamente il controllo Origin. [Ambienti Vercel](https://vercel.com/docs/deployments/environments), [variabili](https://vercel.com/docs/environment-variables).

**L'importazione/collegamento Git e il primo deploy vanno eseguiti solo dopo autorizzazione.** Mantenere Deployment Protection e gate RUSH; concedere accesso al committente con gli strumenti previsti dal piano. La password anteprima non autorizza l'admin.

Per webhook di terze parti che non possono aggiungere header custom, Vercel supporta `x-vercel-protection-bypass` nella query dell'URL. Configurarlo solo nell'endpoint privato Stripe, senza aggiungere `x-vercel-set-bypass-cookie` o redirect. Il token bypass ha ambito di progetto, **non è limitato tecnicamente alla route webhook**: trattarlo come segreto privilegiato, evitare log/screenshot, revocarlo se esposto. Il gate RUSH e la firma Stripe restano attivi. Non aprire tutto il dominio per risolvere la consegna. [Bypass Vercel ufficiale](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

Verificare online: HTTPS, Secure/HttpOnly/SameSite, gate/API/admin, CSP senza errori necessari al flusso, no-store/CDN, robots e noindex, logout e form POST senza JavaScript. Il test HTTP locale non dimostra cache o protezione hosting.

Cron corrente: `GET /api/cron/daily` alle 07:00 UTC; su Vercel i cron invocano deployment Production, non i normali Preview. In staging il codice restituisce comunque dry-run. Cleanup non è pianificato: definire retention/pulizia autorizzata successivamente. Non attivare job economici. [Cron Vercel](https://vercel.com/docs/cron-jobs).

## 10. Stripe TEST

**DA CONFIGURARE ESTERNAMENTE / DA VERIFICARE ONLINE / BLOCCANTE.**

Nel sandbox/account TEST scelto verificare sk_test e pk_test; inserire soltanto la sk_test nel server, pk_test non utilizzata dal codice. Creare l'endpoint POST all'origine reale più `/api/stripe/webhook`, includendo l'eventuale bypass Vercel nella configurazione privata. Impostare il signing secret dell'endpoint; quello della CLI locale è diverso.

Eventi gestiti da selezionare:

```text
checkout.session.completed
checkout.session.expired
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
charge.refunded
refund.created
refund.updated
refund.failed
```

Firma sul body originale, tolleranza temporale SDK e rifiuto livemode devono restare attivi. Non modificare l'endpoint in `/api/webhook`. [Webhook Stripe](https://docs.stripe.com/webhooks).

Dopo autorizzazione alle prove esterne: ordine dall'app con dati sintetici/email allowlist → Checkout usando strumenti di test ufficiali → webhook consegnato → PAID e quantità corretta → conferma email. Verificare duplicate/retry, importo/valuta/PI, annullato/non pagato, due ordini simultanei, chiusura e soglia senza chiusura. La sola pagina di ritorno non deve modificare il DB.

Poi provare un rimborso manuale TEST dall'admin con conferma: stato pending fino all'esito, contatore aggiornato solo al totale, una notifica, retry senza duplicazione. Non lanciare l'esecuzione massiva delle scadenze per sostituire questa prova. La procedura dettagliata esistente è in [STRIPE_SETUP.md](STRIPE_SETUP.md).

## 11. Turnstile

**DA CONFIGURARE ESTERNAMENTE / DA VERIFICARE ONLINE / BLOCCANTE.**

Creare widget sul dominio staging canonico; site key in NEXT_PUBLIC_TURNSTILE_SITE_KEY, secret in TURNSTILE_SECRET_KEY. Evitare di autorizzare indiscriminatamente tutti gli hostname Preview. Il server chiama Siteverify con timeout 8 secondi e richiede success=true e hostname uguale al dominio configurato. Token vuoti, scaduti o riutilizzati vanno rifiutati; verificare anche indisponibilità del provider.

Senza JavaScript il widget non produce token e checkout/login admin non possono completarsi; nessun bypass staging. I form password ora usano POST anche prima dell'idratazione e mostrano un avviso noscript; il fallback form non JSON non effettua login. Verificare in browser JavaScript disattivato e console CSP. Il gate usa password e rate limit DB, non Turnstile. [Validazione token Cloudflare](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## 12. Upstash

**DA CONFIGURARE ESTERNAMENTE / DA VERIFICARE ONLINE / BLOCCANTE.**

Creare Redis separato, scegliere regione/limiti coerenti con Vercel e inserire URL REST HTTPS/token con permessi per gli script di rate limit. Non usare token read-only. Verificare quote e budget nel provider.

Checkout usa sliding window 5 tentativi/15 minuti, prefisso `rush:checkout` e digest IP. Login admin/gate usano invece PostgreSQL, non Upstash. Testare più istanze/restart con la stessa identità, oltre budget, credenziali errate e indisponibilità: nessun checkout deve essere creato quando il controllo non può essere completato. Timeout SDK di 5 secondi ora provoca errore applicativo; budget esaurito restituisce 429, errore/timeout 503. Le scritture Redis dopo un timeout possono consumare conservativamente un tentativo.

Confermare che Vercel sovrascriva l'IP inoltrato; fuori Vercel il bucket condiviso è intenzionale. Il test locale del timeout prova il guard, non latenza o distribuzione del servizio reale.

## 13. Resend

**DA CONFIGURARE ESTERNAMENTE / DA VERIFICARE ONLINE / BLOCCANTE.**

Configurare dominio mittente e verifiche DNS richieste da Resend; MAIL_FROM deve appartenere al dominio verificato. Generare API key con permesso invio per il dominio necessario. EMAIL_ALLOWLIST deve contenere sia l'acquirente demo sia ADMIN_EMAIL; nessuna email fuori lista in staging. [Domini verificati Resend](https://resend.com/docs/dashboard/domains/introduction).

Dopo autorizzazione all'invio reale di prova, usare diagnostica admin `email-test` con conferma e destinatario consentito. Verificare ID provider, delivered/bounce e ricezione effettiva; una risposta API positiva non prova recapito. Con il Checkout TEST verificare conferma e poi notifica del rimborso, una sola volta per evento logico. Dedupe, lease e idempotenza provider restano necessari; messaggi ambigui oltre 23 ore richiedono riconciliazione, non reinvio cieco.

## 14. Test ripetuti sul candidato attuale

**COMPLETATO LOCALMENTE**, PostgreSQL 18 temporaneo su loopback porta 55439; runtime Node 24.21.0. Nessun test DB indirizzato a uno staging con dati da preservare.

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS.
- `npm.cmd test`: **19 PASS**, un contenitore integrazione SKIP intenzionale quando eseguito senza ambiente isolato.
- `npm.cmd run test:integration`: **34 casi + contenitore = 35 PASS**, zero skip/fallimenti; schema `audit_07d280a36109e17c`.
- `npm.cmd run test:migration`: PASS, upgrade con fixture preservate; schema `migration_24d319ec8bff28d7`.
- `npm.cmd run build`: PASS Next 16.4.2 e Prisma generate.
- `npm.cmd run test:http`: **28 PASS**, schema finale `http_ebb7ca190dcac865`; comprende form POST/noscript, gate, admin, revoca, CSP/cache, firma e duplica webhook, dashboard/export e cron dry-run.
- `npm.cmd audit --json`: **0 vulnerabilità**; risultato `.test-results/staging-final-npm-audit.json`.
- `npm.cmd run db:validate -- --env-file .test-results/staging-prisma-fixture.env`: PASS.
- `node node_modules/tsx/dist/cli.mjs scripts/prisma-cli.ts migrate status --env-file .test-results/staging-prisma-fixture.env`: tre migrazioni applicate, schema aggiornato.
- Controllo Git/ignore/segreti: completato; nessuna nuova credenziale concreta identificata con i pattern usati. SEC-12 resta distinto dalla storia pubblicabile.

La build/HTTP finale usa variabili sintetiche, origine `https://rush-staging.example.invalid` e `__NEXT_PROCESSED_ENV=true` per impedire il caricamento dei valori dotenv di sviluppo. Next può comunque elencare `.env.local` nel riepilogo dei file: non significa che esso sia la configurazione del test finale. Il flag interno è confinato al test, non va configurato su Vercel. I test HTTP generano credenziali effimere in memoria e non chiamano Stripe/Resend.

Durante lo sviluppo dei nuovi test, typecheck ha rilevato tipi opzionali delle fixture e lint una regex di controllo; corretti, poi entrambi ripetuti con successo. Il primo HTTP di questa fase aveva 27 controlli; dopo il fix form la build e l'intero HTTP sono stati ripetuti, ottenendo 28 PASS. Nessun fallimento locale essenziale rimasto aperto.

Non eseguiti: preflight autentico, login del proprietario nel generatore TTY, TLS/privilegi/backup DB remoto, servizi reali, browser, Vercel/CDN/bypass e scheduler. La disponibilità di un file modello non equivale a credenziali valide.

Aggiornamento admin locale, successivamente autorizzato dal proprietario: PostgreSQL 18 è attivo sulla porta 5432 e la connessione configurata in `.env.local` al database `rush_presale_local` riesce. La prima verifica in sola lettura ha rilevato le migrazioni `20261013000100_initial` e `20261013000200_golive_hardening`. Il successivo `migrate deploy` ha applicato entrambe le migrazioni pendenti del repository, `20261016000100_staging_hardening` e `20261016000200_security_sessions`; `migrate status` conferma ora lo schema aggiornato. Il primo riepilogo aveva menzionato soltanto la migrazione delle sessioni, omettendo quella di hardening.

È stato corretto un problema concreto di login: Next espandeva i caratteri `$` dell'hash bcrypt in `.env.local`. L'hash originale è stato preservato ed escapato per Next, senza cambiare la password. Il generatore `setup-local-admin.ts` applica ora lo stesso escaping; un test di regressione verifica il caricamento effettivo con Next e il confronto bcrypt. Aggiunto `DIRECT_URL` verso lo stesso database locale per il CLI Prisma.

Verifica successiva: **20 test unitari PASS**, un contenitore integrazione SKIP intenzionale, lint e typecheck PASS; **17 controlli HTTP admin locali PASS** su login, redirect anonimo, API protette, dashboard, ordini, filtri, impostazioni, diagnostica database, anteprima scadenze, esportazioni CSV/XLSX, parametri non validi e logout con revoca. Evidenza in `.test-results/admin-local-smoke.json`. La sessione di verifica è stata creata tramite il modulo applicativo e revocata al termine: non è stato verificato l'inserimento della password del proprietario né il rendering nel browser. La prima lettura delle impostazioni inizializza termini e configurazione mancanti secondo il normale flusso applicativo; le esportazioni registrano le normali voci di audit. Nessuna operazione manuale su ordini, pagamenti o rimborsi; nessuna email inviata.

Il server di sviluppo è disponibile su `http://localhost:3000/admin/login`, vincolato al loopback. Next ha generato `AGENTS.md` e aggiornato i riferimenti dei tipi in `next-env.d.ts` per la modalità dev; questi file generati non sono inclusi nel manifest di pubblicazione delle patch. Questo database è distinto dal cluster temporaneo dei test sulla porta 55439. Gli URL in `.env.staging.local` sono ancora vuoti: il blocco di staging riguarda la destinazione dedicata e raggiungibile da Vercel, non il funzionamento del PostgreSQL locale. L'indirizzo `127.0.0.1` del PC non identifica un database raggiungibile da Vercel.

Al termine delle verifiche il cluster PostgreSQL temporaneo è stato arrestato, conservando dati e fixture.

## 15. Checklist finale e operazioni manuali

- [x] **COMPLETATO LOCALMENTE:** documenti letti, patch presenti, tre migrazioni disponibili.
- [x] **COMPLETATO LOCALMENTE:** fix timeout Upstash e form POST, regressioni superate.
- [x] **COMPLETATO LOCALMENTE:** generatore credenziali, loader Prisma dedicato e preflight TLS verificati.
- [x] **COMPLETATO LOCALMENTE:** `.env.staging.local` preparato senza valori autentici e ignorato; nessun dato di produzione usato.
- [x] **COMPLETATO LOCALMENTE:** procedura Git con refspec unico; SQLite interno escluso dal branch.
- [ ] **BLOCCANTE:** conferma proprietario sul riuso della vecchia password SEC-12 ed eventuale sostituzione.
- [ ] **DA CONFIGURARE ESTERNAMENTE / BLOCCANTE:** DB isolato, TLS/ruoli/backup, credenziali nuove e variabili Preview.
- [ ] **BLOCCANTE:** preflight sul file autentico con zero problemi; conferma isolamento nel file solo dopo verifica.
- [ ] **DA CONFIGURARE ESTERNAMENTE:** autorizzazione e applicazione delle tre migrazioni remote; verifica schema e sessioni.
- [ ] **DA CONFIGURARE ESTERNAMENTE:** account/domain/API key TEST per Stripe, Turnstile, Upstash e Resend.
- [ ] **DA VERIFICARE ONLINE / BLOCCANTE:** Stripe TEST e rimborsi, webhook protetto, email, CAPTCHA e rate limit distribuito.
- [ ] **DA VERIFICARE ONLINE / BLOCCANTE:** login/logout/revoca, browser desktop/mobile, CSP, cookie, HTTPS, cache/noindex.
- [ ] **BLOCCANTE:** consenso specifico prima di importazione Vercel/deploy o push che possa attivarlo.
- [ ] **DA CONFIGURARE ESTERNAMENTE:** policy conservazione dati/log, pulizia sessioni e revisione informative.
- [x] **COMPLETATO LOCALMENTE:** nessuna attivazione Stripe Live, try-on o rimborsi automatici remoti.

La preparazione può essere revisionata e completata dal proprietario senza ricominciare l'audit. I punti online rimangono aperti finché esistono evidenze reali.

**SECURITY NOT READY FOR STAGING**
