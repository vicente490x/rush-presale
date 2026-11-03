# Finalizzazione RUSH Presale — 28 ottobre 2026

**Valutazione: RILASCIO BLOCCATO.** La conferma pagamento è implementata sul branch `feature/rush-final-release`; il merge su `main` richiede ancora collaudo esterno e configurazione LIVE. Nessun pagamento LIVE, reset di credenziali, modifica distruttiva o promozione è stato eseguito.

## Baseline e modifiche

Analizzati PR #4, documentazione tecnica e operativa, configurazione CI/Vercel, flusso Stripe, schema/migrazioni e autenticazione. PR #4 è stata integrata il 26 ottobre; `main` alla lettura iniziale è `0e3ee3698c2abd36e2d15ea85d3718019cedd3b4`. Il candidato iniziale `b30f303357167e8ba093f2448b737d0204766861` è avanti di cinque commit e non indietro rispetto a main; comprende già account admin persistente e viewer 3D. Queste funzionalità sono conservate.

Modifiche di questa finalizzazione:

- `lib/payment-confirmation.ts`: verifica corrispondenza fra ordine, Checkout Session, PaymentIntent e Charge; restituisce soltanto esito e dati minimizzati del pagamento.
- `lib/order-access.ts`, `app/api/orders/route.ts`: autorizzazione tramite cookie firmato HMAC, HttpOnly, Secure negli ambienti pubblici, SameSite=Lax, durata sette giorni e percorso `/api/orders`. Cookie distinto per ordine, senza segreti nell'URL.
- `app/api/orders/[orderNumber]/route.ts`: richiede il cookie prima di cercare l'ordine, recupera Stripe sul server, verifica modalità/importo/valuta/riferimenti e richiede anche l'avvenuta registrazione PAID tramite webhook. Risposte non memorizzabili, errori senza dati dell'ordine.
- `lib/checkout.ts`: restituisce internamente il riferimento per emettere il cookie; conserva redirect di successo e annullamento, idempotenza e modalità carta. Apple Pay/Google Pay vengono identificati dai dettagli effettivi della carta; disponibilità dipendente da Stripe/dispositivo. Nessun nuovo metodo abilitato automaticamente.
- `components/Confirmation.tsx`, `app/conferma/page.tsx`, `app/globals.css`: importo, prodotto/taglia/quantità, circuito/ultime quattro cifre quando disponibili, metodo/wallet, data in Europe/Rome, esiti attesa/fallimento/successo, polling limitato, riprova e home; nessun successo derivato dal parametro URL.
- `app/cookie/page.tsx`: informativa sul cookie tecnico della conferma.
- `tests/payment-confirmation.test.ts`, `scripts/test-http.ts`, `scripts/confirmation-browser-checks.ts`, `scripts/test-browser.ts`: casi di sicurezza e contratto UI desktop/mobile. Le risposte simulate UI non rappresentano transazioni Stripe.
- `package-lock.json`: aggiornamento transitivo mirato `qs` 6.16.0 → 6.17.0 per advisory GHSA-6pq8-jhm2-2vcw. Nessun cambio API Stripe, framework o dipendenza diretta.

Nessuna nuova migrazione. Documentazione aggiornata nei sorgenti Markdown di manuale, TAD, rapporto e matrice casi. Gli Office e gli screenshot precedenti restano evidenze della baseline del 27 ottobre; non attestano questa estensione.

## Risultati e limiti delle prove

| Verifica | Esito osservato | Evidenza / limite |
|---|---|---|
| Lint e TypeScript | PASS locale | `npm run lint`, `npm run typecheck` |
| Test unitari | PASS locale | 41 passati, 1 contenitore integrazione saltato senza DB locale; cinque nuovi casi aggregati |
| Build Next di produzione | PASS con APP_ENV=staging | Artefatto ottimizzato, URL DB loopback fittizi; non prova connettività Neon. Il primo tentativo senza ambiente è stato rifiutato dal gate produzione, poi ripetuto con staging esplicito |
| Dipendenze | PASS | Audit iniziale: una moderata in qs. Dopo aggiornamento: `npm audit --audit-level=moderate`, zero vulnerabilità alla data della verifica |
| PostgreSQL, migrazioni, backup, HTTP, browser sul candidato 579b2b0 | PASS CI | 41 test integrazione, upgrade migrazioni, backup/restore isolato, 34 controlli HTTP, 12 gruppi browser inclusi conferma 1440/390px. Esecuzione su PostgreSQL 16 isolato; provider simulati |
| Stato pubblico del prodotto | PASS limitato | Browser su `/presale`: banner TEST, prezzo 25€, soglia 15, 0 pezzi pagati; non è un collaudo dell'acquisto |
| Checkout TEST esterno | BLOCCATO | Browser: «La verifica di sicurezza non è stata completata». Nessun aggiramento di Turnstile; account Stripe collegato ha due sessioni scadute/unpaid e nessuna pagata alla lettura |
| Stripe webhook | CONFIGURATO TEST | Account sandbox, endpoint abilitato verso `/api/stripe/webhook`, otto eventi checkout/rimborso; non equivale a consegna webhook di un pagamento reale TEST |
| Neon staging | PASS letture | Quattro migrazioni completate, `AdminUser` presente, ruolo runtime limitato verificato tramite catalogo |
| Admin persistente | PRESENTE; accesso remoto non collaudato | Account attivo `rush-admin`, ruolo ADMIN, email scelta dal proprietario già associata. Nessun duplicato o reset; password non letta/esposta |
| Email/Redis | PARZIALE | Redis PONG documentato in PR #4; nessuna nuova prova di consegna in inbox o PONG in questa sessione |
| Vercel | Baseline TEST attiva; Preview incompleto | Baseline pubblica `dpl_AsGb9nhd9dGKBtfaHEZvf9LfPfzB`. Preview `dpl_3Z3JbK8tKv6HHfF4DhfmVpZY1Gzv`, SHA 579b2b0, READY ma `/api/status` restituisce 503. Credenziali dei servizi nello scope Production, non Preview |

CI sul commit `579b2b050cbec51ca20fd034180debc5dfdde065`: [push 40661350454](https://github.com/vicente490x/rush-presale/actions/runs/40661350454) e [PR 40661448184](https://github.com/vicente490x/rush-presale/actions/runs/40661448184), entrambi SUCCESS. [PR #5](https://github.com/vicente490x/rush-presale/pull/5) aperta in bozza; GitHub rileva assenza di conflitti, sei commit avanti e zero indietro rispetto a main a questa revisione. Nessun merge.

Per il collaudo sul dominio TEST esistente viene usato `scripts/deploy-staging-check.ts` prima della build: verifica configurazione staging, chiave TEST, job disattivati, endpoint Neon staging esatto, ruolo runtime `rush_staging_app` e URL canonico. Il target tecnico Vercel si chiama Production ma l'applicazione resta TEST. Il comando non è adatto al futuro deployment LIVE e non cambia i segreti né le impostazioni permanenti del progetto. Una prima richiesta con controllo inline è stata rifiutata dalla validazione Vercel (buildCommand massimo 256 caratteri), prima di creare deployment; il controllo è stato trasferito in questo script versionato. L'audit successivo effettua soltanto letture provider, senza pagamenti o invii email.

## Controlli PR #4: chiusi e ancora aperti

| Controllo | Stato aggiornato | Condizione residua |
|---|---|---|
| TLS client Neon | CHIUSO nelle evidenze PR #4 | TLS 1.3, certificato/hostname verificati su endpoint pooled/direct; ripetere dopo cambio URL/ruolo |
| Snapshot e ripristino | CHIUSO come prova storica | Ripristino verificato; snapshot `snap-curly-pond-b4i463rm` scade il 2 novembre 2026 alle 18:00 UTC. Occorre copertura continuativa; retention PITR sei ore |
| Pipeline e test precedenti | CHIUSI sui rispettivi SHA | Nuovo candidato richiede propria CI verde |
| Stripe TEST e Redis | Configurazione/probe documentati | Non chiudono acquisto completo, ricezione email e riconciliazione esterna |
| ACCESS-01 runtime staging | APPLICATO, diversamente dalla PR #4 | `rush_staging_app`: non superuser, no CREATE ROLE/DB, replication o BYPASSRLS, non membro owner, no CREATE nello schema public. Grant operativi limitati e AdminUser SELECT. Metadato DATABASE_URL Vercel descrive questo ruolo; credenziale sensibile non letta. Ripetere con il runtime effettivo su LIVE |
| Isolamento Neon | Due branch distinti presenti | Staging `br-small-silence-b4yadi7i`; production `br-green-haze-b4fwjiqd`, default. URL/ruoli/servizi del futuro LIVE devono essere verificati come separati |
| Protezione branch production Neon | APERTA | Entrambi i branch risultano non protetti. Il precedente tentativo era stato rifiutato dal piano. Il titolare deve abilitare una protezione supportata o approvare e documentare controlli compensativi con backup/ruoli/accessi adeguati |
| Email cliente | BLOCCANTE | Verificare dominio/mittente e ricezione effettiva di conferma, amministrazione, avvisi e rimborso; correlare outbox/provider/inbox |
| Percorso cliente e admin remoto | BLOCCANTE | TEST autorizzato dal modulo fino a Stripe, ritorno, DB, webhook duplicato, email, login/logout reale e controllo ordini |
| Dati venditore, testi legali e LIVE | BLOCCANTE | Dati autentici e approvazioni del titolare; valori LIVE non disponibili/verificati |

## Sequenza prioritaria e approvazioni

1. **Chiudere CI sul candidato.** Prerequisiti: branch aggiornato e PostgreSQL isolato del workflow. Verificare build, unità, concorrenza, migrazioni, backup/ripristino, HTTP, admin e browser. Non ignorare controlli rossi o protezioni GitHub.
2. **Pubblicare e collaudare lo stesso SHA in TEST.** Configurare un ambiente Vercel esplicito con URL canonico coerente con il dominio del checkout e Turnstile; i segreti attuali sono principalmente nello scope Production di Vercel benché l'app sia staging. Non copiare alla cieca segreti production nei Preview. Controllare DB separato, modalità test, Redis, mittente allowlist e firma webhook. Autorizzazione del titolare necessaria per segreti/configurazioni mancanti.
3. **Completare acquisto TEST assistito.** Il proprietario completa la verifica Turnstile nel browser. Usare esclusivamente una carta TEST e un destinatario autorizzato. Verificare ritorno automatico, cookie, importo/method/card/date, refresh, pending→PAID, evento duplicato senza doppi ordini/email, annullamento e accesso da altro browser negato. Registrare codici non sensibili, timestamp e SHA; non credenziali o URL di sessione. Wallet da provare su dispositivi compatibili, senza dichiararli collaudati sulla sola fixture.
4. **Verificare l'amministratore già esistente.** Solo dopo il pagamento TEST: accesso `/admin`, dati dell'ordine, filtri/export, logout e rifiuto della sessione revocata. Il proprietario inserisce la password in un'interfaccia sicura. Se serve recupero/rotazione, concordare operazione mirata e inserirla senza chat/log/commit. `create-admin` è idempotente e non reimposta un account esistente; non è una procedura di recupero. L'app utilizza un'identità configurata da ADMIN_ID, non una gestione multi-admin.
5. **Chiudere comunicazioni e operatività.** Verificare consegna in inbox e retry outbox; cron con autenticazione e idempotenza, rimborso esclusivamente TEST, allarmi e responsabilità operative. Rinnovare snapshot prima della scadenza e provare restore isolato senza sostituire endpoint attivi.
6. **Preparare LIVE con approvazione esplicita del titolare.** Compilare `.env.production.example` nel gestore segreti: dati venditore e recapiti veri, revisione legale, connessione DB production e ruolo minimo, Stripe LIVE con webhook LIVE dedicato, Redis/email/Turnstile e cron. Nel collegamento Stripe disponibile compare solo il sandbox: nessun accesso LIVE verificato. Eseguire `production:check` e `release:audit` sull'ambiente reale, senza stampare valori. I flag LEGAL_REVIEW_CONFIRMED, PRODUCTION_DATABASE_CONFIRMED, PRODUCTION_LAUNCH_CONFIRMED e ALLOW_LIVE_PAYMENTS sono attestazioni da impostare solo dopo le verifiche e l'approvazione corrispondenti.
7. **Decisione di rilascio.** Riesaminare diff verso main e SHA, conflitti, CI, segregazione, backup, evidenze E2E e assenza di gate critici. Solo allora togliere la bozza e fondere secondo le regole GitHub. Verificare deployment sul commit risultante, dominio, health, accesso admin e webhook senza effettuare pagamenti LIVE in questo collaudo.

## Rollback e sicurezza

La modifica non cambia lo schema. Un rollback applicativo al deployment precedente preserva gli ordini; quel deployment non offre i nuovi dettagli e la nuova protezione cookie: valutare chiusura checkout/manutenzione in caso di incidente. Non ripristinare il DB production per annullare una modifica UI e non cancellare ordini/eventi. Dopo un incidente economico riconciliare Stripe con DB prima di riaprire.

Non ci sono account demo creati da questa attività. Le fixture restano nei test su DB loopback; la vecchia route staging login restituisce 410, le diagnostiche sono amministrative. La scansione statica e i test non certificano da soli l'assenza di rischi in configurazioni esterne. Non disattivare TLS, CAPTCHA, rate limiting o protezioni per ottenere un PASS.

## Fonti

- [PR #4](https://github.com/vicente490x/rush-presale/pull/4), `docs/10_PIANO_RILASCIO.md`, `docs/evidenze/verifica-deploy-2026-10-27.md`.
- Codice del candidato b30f303 e letture tramite API GitHub, Vercel, Neon e Stripe del 28 ottobre 2026.
- [Casi di test aggiornati](12_CASI_TEST_FINALI.md), [manuale](sorgenti/Manuale_Uso_RUSH_Presale.md), [TAD](sorgenti/TAD_Architettura_Tecnica_RUSH_Presale.md).
