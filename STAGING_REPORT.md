# STAGING REPORT — RUSH PRE-SALE

Data verifiche: **16 ottobre 2026** (Europe/Rome). Branch locale: **staging**. SPEC.md è stato letto integralmente e non modificato. Richieste duplicate nei due allegati: contenuto identico verificato tramite SHA-256.

## Verdetto

**NOT READY FOR STAGING** per la presentazione finale al committente.

Il candidato locale supera build e verifiche automatizzate eseguite. Restano essenziali il checkout effettivo su Stripe TEST, ricezione webhook dal servizio esterno, mittente/recapito Resend, Turnstile/Upstash sul dominio staging e verifica visiva/mobile/console in browser. Non è stato configurato o pubblicato un ambiente Vercel autorizzato. Non risultano test locali falliti alla conclusione; questo verdetto non attribuisce risultati ai controlli esterni non eseguiti.

Nessun pagamento reale è stato abilitato. Nessun deploy pubblico, push remoto, creazione/modifica di account o servizi esterni, migrazione del database applicativo esistente o cancellazione di dati preesistenti è stato eseguito.

### Prosecuzione dopo il checkpoint a054410

Il 16 ottobre 2026, su richiesta di proseguire, il connettore GitHub ha verificato `vicente490x/rush-presale`: repository **privato**, non archiviato, account collegato con permessi push/admin. Nessuna modifica remota effettuata.

La ricerca delle integrazioni ha individuato Vercel disponibile ma **non installato/collegato**; proposta l'integrazione per consentire l'accesso dell'utente. Nessun tool Vercel di elenco progetti o deploy è attualmente disponibile. Nessuna CLI Vercel, GitHub o Stripe rilevata nel PATH; nessun collegamento `.vercel/project.json` presente. L'inventario UI restituisce zero browser: verifica visiva tuttora non eseguita.

Aggiunto `npm run staging:check -- --env-file .env.staging.local`: controllo statico esplicito, senza fallback all'ambiente locale/shell, richieste di rete o stampa di valori. Due test dedicati PASS; lint e typecheck PASS. Eseguito in sola lettura sul preesistente `.env.local`: esito **CONFIGURAZIONE INCOMPLETA**, 28 controlli da risolvere, uscita 1 prevista. Il file resta una configurazione di sviluppo con opzioni mock pregresse, database locale e provider staging incompleti; non è stato modificato. Un eventuale PASS del comando verifica solo il formato, non l'autenticità delle credenziali o la separazione del DB.

I due comandi tsx inizialmente bloccati dal sandbox Windows (`uv_os_get_passwd ENOMEM`) sono stati rieseguiti nel contesto consentito. Nessuna nuova build necessaria per questo script isolato; i risultati della build applicativa e delle suite DB/HTTP sottostanti restano riferiti al checkpoint precedente. Il verdetto resta **NOT READY FOR STAGING** fino al collegamento Vercel, configurazione e prove dei servizi effettivi e verifica browser.

## Ricognizione e conservazione del lavoro

- Framework effettivo: Next.js **16.4.0**, React/React DOM **19.3.0**, TypeScript **5.9.3**.
- DB: Prisma/Client **6.12.0**, provider PostgreSQL. Test sul PostgreSQL **18** locale temporaneo, porta **55439**, diverso dal DB esistente.
- Servizi: Stripe SDK **18.5.0**, Resend **6.32.1**, Upstash Redis/Ratelimit e Cloudflare Turnstile. Codice AI preesistente fal.ai/Supabase conservato ma escluso dalla demo richiesta.
- Runtime verificato: Node **24.21.0**, npm **11.19.0**. Su questa macchina usare `npm.cmd` perché PowerShell blocca npm.ps1; non sono state modificate le policy di sistema.
- Stato iniziale: branch preview, modifiche locali già presenti in 12 file, modello preview/script admin e DB SQLite non tracciati. Preservati nel checkpoint locale **3b5bc6c**, escludendo DB e credenziali; successivamente creato staging.
- Esiste un remote origin GitHub senza credenziali nella URL; proprietà e visibilità privata non verificate sul servizio. Nessuna modifica al remote e nessun push.
- Logo, mockup, asset e SPEC preservati. Modifiche UI limitate a controlli necessari, accessibilità, banner e funzioni amministrative richieste.
- AUDIT.md contiene **68 macrorequisiti**, **145 sottorequisiti operativi**, stato iniziale/finale, file, problemi, correzioni e test; le venti priorità SPEC §18 sono rinviate ai rispettivi requisiti senza inventare altre sezioni.

## Implementazioni e bug corretti

1. Proxy pubblico riparato: login admin richiesto solo per back office, gate staging distinto, webhook/cron autenticati dal proprio meccanismo. Corretto anche il blocco delle richieste interne Next Image Optimizer: i soli tre asset ufficiali del brand sono pubblici; nessun dato ordine è esposto da questa eccezione.
2. APP_ENV canonici development/staging/production; vecchio valore preview riconosciuto come alias sicuro. Vercel Preview ricade su staging e rifiuta override development/production. **Ogni chiave Stripe live è rifiutata**, anche con il precedente opt-in true.
3. Checkout: validazione stretta, consenso/revisione termini, prezzo server, snapshot di quantità/importo/valuta/durata/preavviso/consegna, UUID tentativo e sessione persistente. Lock DB per concorrenza, stock e limite per email. Ordini PENDING prima della chiamata Stripe. La soglia minima non limita la quantità vendibile.
4. Webhook: raw body limitato e firma SDK, no eventi live, controlli importo/valuta/sessione/intent, supporto completato/asincrono/scaduto/fallito e rimborsi. Ledger atomico; eventi duplicati/fuori ordine non duplicano pezzi/email e non retrocedono PAID. Ricevute separate per ultimo tentativo verificato e relativo esito.
5. Rimborsi: intento persistente con chiave stabile, stato PENDING fino a esito reale, aggregazione rimborsi Stripe, errori/timeout da riconciliare, cron e manuale sullo stesso flusso. Retry manuale dopo fallimento definitivo con nuova chiave e storico. Nessuna ricreazione cieca di intenti ambigui oltre 23 ore. I rimborsi parziali esterni aggiornano gli importi e non vengono scambiati per rimborsi integrali.
6. Produzione: timestamp persistente, conferma server e transizioni irreversibili con trigger DB. Lock condiviso con rimborsi; avvio bloccato in presenza di intenti automatici ambigui. Il rimborso sotto soglia ripristina IN_RACCOLTA soltanto prima dell'avvio; un pagamento successivo ripristina SOGLIA_RAGGIUNTA senza duplicare la notifica.
7. /admin: metriche complete, lordo/rimborsato/netto distinti dalle commissioni, taglie, ordini pagati/totali, scadenze, pending/falliti, consegne, ultime operazioni. Ordini con dettagli Stripe, prezzo, date e stati, ricerca/filtri/ordinamento e pagine server di 25 righe.
8. /admin/impostazioni: prezzo, soglia, limiti, manutenzione, chiusura/testo, taglie attive/ordine/stock, produzione, scadenze/preavvisi, destinatari/modelli email, termini/consegna/versioni/storico, diagnostica, dry-run e controllo effettivo esplicitamente confermato.
9. CSV con escaping completo e neutralizzazione formule; XLSX vero con celle stringa e foglio Produttore. Limite export 10.000 esplicito, senza troncamento silenzioso; riepilogo dei risultati filtrati pagati non rimborsati.
10. Sicurezza: guard server indipendente su ogni handler e pagina admin, JWT con ruolo/issuer/audience, bcrypt, CSRF Origin, cookie Secure/HttpOnly/SameSite, rate limit DB atomico per login e gate, payload limitati, segreti fuori dai modelli admin e audit con soli campi consentiti.
11. Email: outbox nella transazione evento, lease tra worker, idempotency key Resend, primo tentativo/provider ID/sentAt e quarantena degli invii ambigui oltre la finestra sicura. Allowlist obbligatoria fuori produzione; gli ordini staging accettano solo email test autorizzate. Invio prova effettivo separato e confermato, senza simulare ricezione/mittente verificato.
12. Staging: banner richiesto, metadata/header noindex e robots, password distinta dall'admin e cookie firmato, guard conferma database separato, seed PENDING marcato senza pagamenti/email e cleanup ristretto prima in dry-run. Nessun reset o seed automatico.
13. UX: consenso richiesto anche per abilitare il pulsante, reset consenso alla revisione cambiata, prezzi/condizioni/consegna dal DB, nessun contatore fittizio durante caricamento, dialog gallery nativo con Escape/focus e target touch ampliati. Rendering browser ancora da verificare.
14. Lint reale ESLint separato dal typecheck; Prisma CLI locale carica le stesse variabili Next; documentazione Vercel/Stripe, modelli ambiente e creazione credenziali con input nascosto. Dipendenze aggiunte per funzioni richieste: fflate 0.8.3 per ZIP/XLSX, @next/env esplicita per script, tooling ESLint/TypeScript/React Hooks.

## Migrazione necessaria

`prisma/migrations/20261016000100_staging_hardening/migration.sql` è nuova; la migrazione iniziale non è stata riscritta.

Aggiunge snapshot e chiavi ordine, impostazioni centralizzate, TermsVersion, RefundOperation, AuditLog, ApplicationError, WebhookReceipt, lease e metadati invio outbox, indici/FK e vincoli. Mantiene l'enum RefundStatus.PENDING: è lo stato di rimborso in corso, separato dal pagamento PAID, equivalente funzionale a REFUND_PENDING richiesto.

I prezzi unitari pregressi sono ricavati da importo/quantità; i rimborsi già integrali valorizzano refundedAmountCents. Le condizioni storiche ignote restano null. Per una produzione già avviata quando il vero timestamp non esisteva si usa prudentemente il precedente updatedAt, senza presentarlo come istante storico esatto. I nuovi avvii memorizzano la data reale. I CHECK NOT VALID non invalidano automaticamente righe storiche, ma proteggono nuovi inserimenti/aggiornamenti; il trigger impedisce retrocessioni produzione.

Verificata su schemi vuoti e su schema iniziale popolato con fixture pagate/rimborsate. Nessun dato applicativo reale toccato. Il cluster temporaneo locale usato per i test è stato arrestato al termine senza eliminare le fixture. Eseguire su un DB staging nuovo solo dopo autorizzazione e verifica della destinazione; per DB con dati servono backup e revisione preventiva. Nessun prisma db push utilizzato.

## Test realmente eseguiti

- **npm ci**: PASS dal lockfile finale; 230 pacchetti installati e Prisma generato. Gli avvisi npm sulle allowScripts di pacchetti sono informativi; generazione e build sono state eseguite realmente.
- **Prisma validate**: PASS con URL del DB temporaneo espliciti. Il primo tentativo senza DIRECT_URL era fallito; la ripetizione con ambiente corretto è passata.
- **Prisma generate**: PASS dopo schema finale e nella build.
- **Migrazioni fresh**: PASS, entrambe le migrazioni in schema casuale nuovo a ogni suite DB/HTTP.
- **npm run test:migration**: PASS upgrade non distruttivo con due ordini fixture, date/importi preservati, backfill e protezione produzione. Il primo tentativo ha evidenziato l'effetto del fuso host sulle date delle fixture raw SQL; corrette con cast UTC espliciti e rieseguito con successo.
- **Prisma migrate diff --from-url [DB temporaneo] --to-schema-datamodel prisma/schema.prisma --exit-code**: PASS, `No difference detected`. Non verifica le policy del futuro provider esterno.
- **npm run typecheck**: PASS; anche il typecheck della build finale passa.
- **npm run lint**: PASS con ESLint e zero warning alla chiusura, separato da tsc.
- **npm test**: **9 PASS**, zero falliti; **1 SKIP intenzionale** del contenitore integrazione quando manca l'ambiente isolato. Non è una suite DB saltata nel risultato complessivo: è stata poi eseguita col comando dedicato seguente.
- **npm run test:integration**: **26 sottotest PASS** e contenitore PASS (**27 test riportati dal runner**), zero skip/fallimenti. PostgreSQL reale temporaneo, Stripe/Resend test double espliciti. I messaggi attesi `STRIPE_WEBHOOK_REJECTED`, `REFUND_RECONCILIATION_REQUIRED` e l'eventuale errore del trigger sono test negativi riusciti.
- **npm run build**: PASS Next 16.4.0/Turbopack, Prisma Client, compilazione TS e generazione pagine. Ambiente staging con DB temporaneo, nessuna migrazione/seed in build.
- **npm run test:http** sulla build finale: **23 controlli nominati PASS**, oltre alle asserzioni di supporto. Server Next di produzione locale, login gate reale, cookie/CSRF, pagine legali, Next image optimizer, admin/sessioni, salvataggio impostazioni, payload Stripe firmati di fixture, contatori, dashboard, consegna, query ordini, CSV/XLSX, cron dry-run, produzione, chiusura, diagnostica e logout. Server arrestato al termine. Il test aveva rilevato il bug immagini e lo ha verificato dopo correzione; l'ultimo log server non contiene errori.
- **npm audit --json**: PASS, **0 vulnerabilità note** (prod e dev) sul lockfile verificato. fflate è 0.8.3; non sono rimaste dipendenze lint con advisory introdotte durante la preparazione.
- **Git**: scansione euristica dei pattern credenziali su tutti i commit e inventario riferimenti, file .env effettivi esclusi dal branch, database esistente ignorato, `git diff --check` senza errori alla chiusura. Nessun reset distruttivo.

I runner tsx inizialmente incontravano `uv_os_get_passwd` nel sandbox Windows; i comandi sono stati eseguiti con il contesto consentito e completati. I test HTTP sono integrazione di processo/API; **non sono E2E visivi in browser né un pagamento nel servizio Stripe**.

## Matrice dei 25 scenari richiesti

1. Quantità solo pagate/non rimborsate: PASS locale DB/HTTP.
2. Soglia senza chiusura: PASS DB/HTTP.
3. Ordini oltre soglia: PASS DB, 20/15.
4. Cambio soglia admin: PASS servizio e API HTTP.
5. Cambio prezzo e storico: PASS DB.
6. Checkout simultanei: PASS prenotazione/stock e due sessioni con provider test double.
7. Webhook duplicato: PASS concorrenza DB e firma fixture HTTP.
8. Webhook fuori ordine: PASS scaduto → pagato asincrono → fallito.
9. Firma non valida: PASS SDK Stripe effettivo nella route.
10. Vendita chiusa: PASS rifiuto servizio e stato HTTP; annullamento sessione esterna da verificare.
11. Manutenzione: PASS rifiuto servizio.
12. Due mesi, fine mese e bisestili: PASS unit.
13. Preavviso: PASS outbox una volta e dry-run senza richieste finanziarie.
14. Nessun rimborso automatico dopo avvio: PASS, inclusa concorrenza e trigger.
15. Rimborso idempotente: PASS pending → succeeded, richieste concorrenti e riconciliazione.
16. Errore/timeout Stripe: PASS con test double che produce esito ambiguo; rete/API effettive NON ESEGUITE.
17. Rimborso manuale: PASS servizio e conferma server; provider effettivo NON ESEGUITO.
18. Export: PASS CSV e pacchetto XLSX/foglio produttore, unit e endpoint HTTP; apertura in Excel desktop NON ESEGUITA.
19. Admin non autorizzato: PASS handler indipendenti/HTTP; CSRF origine estranea respinto.
20. Gate staging: PASS verifica password locale, firma/ruoli/tampering e cookie protetti.
21. Limiti quantità: PASS massimo ordine/cliente/stock concorrente.
22. Email/taglia/checkbox: PASS schema/server; flusso UI browser NON ESEGUITO.
23. Foto try-on: funzione non prevista SPEC, esclusa; PASS rifiuto 503 prima di leggere upload. Generazione/provider immagini NON ESEGUITI e non richiesti per questa demo.
24. Email una sola volta: PASS dedupe/worker lease con sender test double; recapito reale NON ESEGUITO.
25. Cambio condizioni senza retroattività: PASS versioni/snapshot/date e rifiuto consenso obsoleto.

Ulteriori regressioni: rimborsi parziali esterni, nessuna conferma con sessione unpaid/importo errato, retry di fallimento definitivo con storico e ripristino raccolta/soglia dopo rimborso.

## Controlli NON ESEGUITI e sblocco

- **E2E browser, responsive 360/390/768/1440, focus/zoom gallery, console JavaScript, Lighthouse/metriche reali**: nessun browser nella inventory; tentativo di creare tab IAB restituisce `Browser is not available: iab`. Non sono stati inventati screenshot o risultati. Servono browser collegato e QA della build; segnare esiti nella checklist prima della demo.
- **Checkout, 3DS/rifiuti, session expiration e rimborsi su Stripe TEST effettivo**: nessuna operazione autorizzata sul servizio esterno; i test locali hanno chiavi/payload di fixture. Seguire STRIPE_SETUP.md su account test e dominio reali dopo autorizzazione.
- **Resend, dominio mittente, consegna/bounce**, **Turnstile** e **Upstash reali**: non modificati né testati sugli account. Configurare variabili protette, allowlist, hostname e mittente, quindi verificare invio/ricezione e limiti sullo staging.
- **Vercel Preview, Deployment Protection/bypass, HTTPS effettivo e rollback**, **DB esterno, backup/PITR e restore**: risorse non create/modificate; compatibilità locale verificata, infrastruttura da verificare col proprietario.
- **Seed e cleanup demo**: implementati e ispezionati, non eseguiti; nessuna cancellazione autorizzata necessaria per questa verifica. Usare prima il dry-run della procedura.
- **AI attiva/privacy provider e pulizia file remoti**: fuori perimetro perché SPEC non la richiede e la demo la disabilita. Non presentata come funzionante.

## Limiti e vulnerabilità residue

- Nessun bug bloccante noto nei percorsi locali testati; resta un blocco di accettazione per le verifiche essenziali esterne e visive non eseguite.
- Il DB staging separato è una responsabilità operativa: la conferma d'ambiente impedisce configurazioni incomplete, ma non certifica l'indipendenza del provider. Non importare clienti veri.
- La CSP esistente usa unsafe-inline per bootstrap Next/style; restano nosniff, frame-ancestors none, DENY, referrer policy, HSTS e controlli server. Non è stata aggiunta una politica nonce/strict-dynamic. Non sono presenti nuovi punti HTML arbitrario nell'UI.
- Audit storico Git: nessuna chiave operativa reale identificata dai pattern analizzati nei commit; alcune stringhe del vecchio TEST_REPORT sono fixture con STRIPE_MOCK=true. In **riferimenti locali tree `refs/codex/turn-diffs/*`**, non nei commit dei branch, esiste un vecchio prisma/dev.db (21 ordini con indirizzi chiaramente test/example e un account admin con hash). Non pubblicare tali riferimenti o backup; non riusare le credenziali demo. Se quel vecchio account è ancora usato altrove, revocare/rigenerare la relativa password. Nessuna riscrittura storia o revoca esterna eseguita.
- Invii email e rimborsi ambigui oltre la finestra di idempotenza richiedono controllo operatore nel provider: il sistema preferisce mantenere pending/quarantena a rischiare duplicazioni. Non viene promessa una semantica exactly-once sul recapito esterno.
- Gli export hanno riepilogo dei risultati filtrati e un massimo di 10.000 righe. Gli ordini con rimborso parziale restano come pezzi interi finché non integralmente rimborsati; i resi per singola unità richiederebbero un modello ulteriore prima del commercio.
- Il limite cliente usa email normalizzata e non riconosce la stessa persona attraverso email diverse.
- Chiusura: una sessione aperta può richiedere retry se Stripe non risponde; lo stato chiuso rimane salvato. Una transazione già completata non è retroattivamente annullabile. API/limiti di hosting sono gestiti a lotti con esito incompleto esplicito.
- Le pagine legali conservano segnaposto per ragione sociale, sede e contatti: farle completare/revisionare prima di vendite reali. I testi accettati dagli ordini non vengono retroattivamente riscritti.

## Variabili Vercel e route operative

Variabili Preview necessarie (valori esclusivamente protetti, modello `.env.staging.example`):

- APP_ENV=staging; NEXT_PUBLIC_SITE_URL HTTPS reale.
- DATABASE_URL; DIRECT_URL; STAGING_DATABASE_CONFIRMED=true dopo verifica reale.
- STRIPE_SECRET_KEY sk_test_; STRIPE_WEBHOOK_SECRET test. ALLOW_LIVE_PAYMENTS=false, comunque nessun bypass live nel codice.
- ADMIN_ID; ADMIN_PASSWORD_HASH; SESSION_SECRET.
- STAGING_PASSWORD_HASH; STAGING_SESSION_SECRET (password e secret distinti da admin).
- CRON_SECRET; ENABLE_AUTOMATIC_JOBS=false.
- ADMIN_EMAIL iniziale; RESEND_API_KEY; MAIL_FROM verificato; EMAIL_ALLOWLIST test esplicita.
- NEXT_PUBLIC_TURNSTILE_SITE_KEY; TURNSTILE_SECRET_KEY.
- UPSTASH_REDIS_REST_URL; UPSTASH_REDIS_REST_TOKEN.

Nessuna chiave AI richiesta. Impostazioni operative nel DB, non hardcoded nell'ambiente.

- Checkout effettivo: **POST /api/orders**.
- Webhook effettivo: **POST /api/stripe/webhook**.
- Eventi richiesti: checkout.session.completed, checkout.session.expired, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, charge.refunded, refund.created, refund.updated, refund.failed.
- Stato pubblico: GET /api/status; conferma in sola lettura GET /api/orders/[orderNumber].
- Cron: **GET /api/cron/daily**, registrato alle **07:00 UTC** in vercel.json; in staging è solo dry-run. **GET /api/cron/cleanup**, protetto dallo stesso CRON_SECRET, disponibile ma non registrato come cron automatico nella configurazione corrente.
- Dry-run admin: **GET /api/admin/expiry**; esecuzione effettiva con conferma: **POST /api/admin/expiry**.
- Diagnostica: GET/POST /api/admin/diagnostics; configurazione GET/POST /api/admin/settings.
- Login gate: POST /api/staging/login; login admin: POST /api/admin/login.

Non esiste ancora una URL Vercel pubblicata da questo lavoro; comporre la URL webhook usando il dominio autorizzato e la route esatta sopra.

## Comandi e pubblicazione

```powershell
npm ci
npm run db:validate
npm run db:generate
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

Migrazioni solo esplicite sul DB autorizzato: `npm run db:migrate`. Credenziali staging: `npm run staging:credentials` in terminale interattivo; nessuna password in chiaro su Vercel. Test DB/HTTP: impostare RUSH_TEST_DATABASE_URL su un DB temporaneo localhost rush_audit*, poi `npm run test:migration`, `npm run test:integration`, `npm run test:http` (ultima build con origine test corretta).

Procedura completa in DEPLOY_VERCEL.md: verificare/creare repository privato, branch staging, DB separato, variabili solo Preview, migrazione autorizzata fuori build, protezione Vercel + gate, webhook test con bypass limitato, QA completo e rollback non distruttivo. Prima di push/deploy o cambiamenti ai servizi esterni serve il consenso esplicito richiesto dal proprietario. Nessuna attivazione commerciale prevista.

## File modificati/aggiunti rispetto al checkpoint iniziale

- `.env.example`
- `.env.preview.example`
- `.env.staging.example`
- `.gitignore`
- `AUDIT.md`
- `DEPLOY_VERCEL.md`
- `README.md`
- `STAGING_REPORT.md`
- `STRIPE_SETUP.md`
- `app/admin/impostazioni/page.tsx`
- `app/admin/login/page.tsx`
- `app/admin/page.tsx`
- `app/anteprima/page.tsx`
- `app/api/admin/dashboard/route.ts`
- `app/api/admin/diagnostics/route.ts`
- `app/api/admin/expiry/route.ts`
- `app/api/admin/export/route.ts`
- `app/api/admin/login/route.ts`
- `app/api/admin/logout/route.ts`
- `app/api/admin/orders/[id]/delivery/route.ts`
- `app/api/admin/orders/[id]/refund/route.ts`
- `app/api/admin/orders/route.ts`
- `app/api/admin/presale/route.ts`
- `app/api/admin/production/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/settings/tryon/route.ts`
- `app/api/cron/cleanup/route.ts`
- `app/api/cron/daily/route.ts`
- `app/api/orders/[orderNumber]/route.ts`
- `app/api/orders/route.ts`
- `app/api/staging/login/route.ts`
- `app/api/status/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/tryon/route.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/presale/page.tsx`
- `app/rimborsi/page.tsx`
- `app/robots.ts`
- `app/termini/page.tsx`
- `components/AdminDashboard.tsx`
- `components/AdminLogin.tsx`
- `components/AdminSettings.tsx`
- `components/Confirmation.tsx`
- `components/ImageGallery.tsx`
- `components/StagingLogin.tsx`
- `components/Storefront.tsx`
- `components/TryOn.tsx`
- `eslint.config.mjs`
- `lib/admin-auth.ts`
- `lib/admin-operations.ts`
- `lib/admin-page.ts`
- `lib/checkout.ts`
- `lib/config.ts`
- `lib/cron-auth.ts`
- `lib/db-lock.ts`
- `lib/db-ratelimit.ts`
- `lib/errors.ts`
- `lib/expiry.ts`
- `lib/export.ts`
- `lib/http.ts`
- `lib/mail.ts`
- `lib/notifications.ts`
- `lib/operational-schema.ts`
- `lib/order-query.ts`
- `lib/presale.ts`
- `lib/prisma.ts`
- `lib/refunds.ts`
- `lib/settings.ts`
- `lib/staging-auth.ts`
- `lib/stripe-events.ts`
- `lib/stripe.ts`
- `lib/turnstile.ts`
- `package-lock.json`
- `package.json`
- `prisma/migrations/20261016000100_staging_hardening/migration.sql`
- `prisma/schema.prisma`
- `proxy.ts`
- `scripts/create-admin.ts`
- `scripts/prisma-cli.ts`
- `scripts/seed-staging.ts`
- `scripts/staging-credentials.ts`
- `scripts/test-http.ts`
- `scripts/test-integration.ts`
- `scripts/test-migration.ts`
- `tests/integration.test.ts`
- `tests/security.test.ts`
