# QA-01 — Piano e rapporto di collaudo

**Release 2.1.0 · 26 ottobre 2026**

## Strategia

| Livello | Obiettivo | Ambiente / confine |
|---|---|---|
| Statico | Qualità, tipi e pacchetti coerenti | ESLint, TypeScript, npm audit |
| Unitario | Date, schemi, sicurezza, formato configurazione e file tabellari | Processi Node; rete provider sostituita nei casi controllati |
| Integrazione | Stato economico, transazioni, idempotenza e concorrenza | PostgreSQL reale temporaneo; adattatori Stripe/Resend controllati |
| Migrazione | Aggiornamento senza perdita di ordini/importi/date | Schema casuale con baseline precedente |
| HTTP | Contratti reali Next e autorizzazione | Server compilato + PostgreSQL isolato; firme SDK Stripe |
| Browser | Percorso e rendering pubblico | Dominio reale, nessun ordine o pagamento inviato |
| Operativo | Servizi e responsabilità esterne | Stripe TEST, Resend, Turnstile, Redis, cron e backup effettivi |

I dati sintetici dei test sono confinati negli schemi casuali del database temporaneo; non appartengono al servizio commerciale. Nessuna prova con adattatori controllati viene classificata come transazione Stripe reale.

## Copertura di accettazione

| Gruppo | Casi principali | Priorità |
|---|---|---|
| Home e percorso | Logo disponibile prima di JavaScript, CTA PRE-SALE, accesso pubblico | P1 |
| Ordine | Prezzo/snapshot, taglie, quantità, stock concorrente, termini correnti e retry | P1 |
| Pagamenti | Firma, modalità, importi, PI/sessione, duplicati e fuori ordine | P1 |
| Soglia/produzione | Conteggio quantità, oltre soglia, avvio autorizzato, monotonicità | P1 |
| Chiusura | Nuove richieste negate, checkout aperto annullato, ordine conservato | P1 |
| Scadenze/rimborsi | Mesi calendario, rifiuto anticipato, scadenza → rimborso → due notifiche, timeout e retry | P1 |
| Backoffice | Login, revoca, handler indipendenti, filtri, dashboard, consegna e audit | P1 |
| Email | Outbox deduplicata, lease worker, destinatari staging limitati | P1 |
| Sicurezza | Origin, body limitati, IP, limiti, hostname, CSP e cron | P1 |
| Export | CSV/XLSX, riepilogo produttore, formule, esclusione lotti non commerciali | P1 |
| Operazioni | Migrazione conservativa, cleanup e dry-run staging | P1 |
| UI dispositivi | Desktop, mobile, zoom, tastiera e accessibilità | P2 |

## Comandi ripetibili

Node 24. Configurare DATABASE_URL/DIRECT_URL e RUSH_TEST_DATABASE_URL su un PostgreSQL locale usa e getta denominato `rush_audit*`. I runner rifiutano destinazioni remote o nomi non previsti.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm audit --audit-level=high
npm run build
npm run test:integration
npm run test:migration
npm run test:backup
npm run test:http
```

Per build e HTTP staging usare APP_ENV=staging, STAGING_DATABASE_CONFIRMED=true, STRIPE_MODE=test e NEXT_PUBLIC_SITE_URL=https://rush-staging.example.invalid. Il server HTTP di collaudo è su loopback; ogni runner crea uno schema casuale. `.test-results/` è ignorata e contiene log/report locali, non segreti commerciali.

## Risultati e baseline

| Controllo candidato 2.1.0 | Esito locale del 26 ottobre 2026 |
|---|---|
| Lint e TypeScript | PASS, nessun errore e zero warning ammessi |
| Test unitari | 29 PASS; contenitore integrazione saltato solo in questo comando |
| Integrazione PostgreSQL | 37 casi PASS più contenitore, 38 risultati complessivi, zero skip |
| Migrazione | PASS, importi/date e ordini preservati |
| Build Next staging | PASS |
| HTTP Next compilato | 33 controlli nominati PASS, oltre alle asserzioni sui singoli endpoint |
| Dipendenze | npm audit: zero vulnerabilità note |
| Link documentazione | PASS, destinazioni locali esistenti |
| Pipeline remota del candidato | PASS sul codice `ff34c4b`: [run PR 40310047372](https://github.com/vicente490x/rush-presale/actions/runs/40310047372), installazione, audit, verify, integrazione, migrazioni e HTTP riusciti |

Ambiente locale: Linux in contenitore, Node 24.22.1, PostgreSQL 16.15 temporaneo. L’esecuzione finale segue la rimozione dei moduli fuori perimetro e comprende i nuovi casi SPEC-05/SPEC-08. I controlli provider/online restano separati.

Il dominio https://rush-presale.vercel.app/ è stato osservato senza cookie: `/` e `/presale` 200, `/api/status` 200 con 0/15 pezzi e 25 EUR, `/admin` 307 verso login, API admin 401, `/anteprima` 307 verso home. Nel browser desktop il passaggio home → presale mostra immagini, prezzo, contatore, taglie, quantità e condizioni. La piattaforma mantiene il banner PAGAMENTI DI TEST.

## Verifiche operative aperte

Non sono stati completati pagamento TEST remoto, ricezione email, rimborso provider, token Turnstile del flusso completo, carico su più istanze, dispositivo mobile o ripristino backup. Sono criteri di ingresso alle vendite LIVE, non motivi per trasformare un esito non eseguito in PASS.

## Gestione anomalie

Registrare ID, requisito, gravità, passi, atteso/osservato, commit, ambiente ed evidenza priva di segreti. P1 economici/autorizzativi impediscono il rilascio; P2 richiede valutazione del referente. Dopo una correzione ripetere il caso e la regressione pertinente. Usare il registro rischi per punti organizzativi che non rappresentano un difetto di codice.

## Estensione operativa 2.1.1

- Nuovi test server: token anti-bot oltre limite rifiutato senza rete, IP non valido omesso, errori e timeout provider mai autorizzativi. La copertura hostname esatto resta nel collaudo esistente.
- Prova locale backup/ripristino del 26 ottobre: PASS su PostgreSQL 16.15; archivio custom 33.287 byte, dump 61 ms, ripristino 40 ms. Importi, date, relazioni termini, outbox e checksum migrazioni identici; la modifica della copia non altera la sorgente. Tempi del solo archivio di collaudo, non RPO/RTO del servizio commerciale.
- Stripe TEST: account Sandbox di eccomerce confermato; webhook canonico enabled con tutti gli eventi attesi. Nessuna sessione Checkout presente al momento della verifica: pagamento/rimborso provider completo ancora aperto.
- Screenshot cliente: verifica Cloudflare in corso con modalità Isolamento del browser. Il dato è un’indicazione di possibile incompatibilità, non una diagnosi certa. La correzione aggiunge recupero e feedback, senza bypassare la protezione.

Regressione locale 2.1.1: lint, TypeScript e build PASS; 31 test unitari PASS (contenitore integrazione escluso dal solo comando unitario), 37 casi di integrazione più contenitore PASS senza skip, migrazione PASS, backup/ripristino PASS, 33 controlli HTTP PASS, npm audit zero vulnerabilità note.

## Riscontro online e consegna 2.1.1

Candidato con audit aggiornato: `5dbf6fc`. Deployment di verifica `dpl_3pZhsehQqesao6hibjx9sfUry7tv`, dominio pubblico canonico. Pipeline push [40341391208](https://github.com/vicente490x/rush-presale/actions/runs/40341391208) e PR [40341398571](https://github.com/vicente490x/rush-presale/actions/runs/40341398571): completate con successo, inclusi installazione, audit, verify, integrazione, migrazione, backup e HTTP.

| Controllo effettivo | Esito | Evidenza e limite |
|---|---|---|
| Vercel | PASS | Deployment READY del candidato esatto; modalità applicativa TEST mantenuta |
| Configurazione staging | PASS | Preflight sul processo del deployment senza problemi; valori sensibili non divulgati |
| Database Neon | Connessione/migrazioni PASS; trasporto OPEN | DATABASE_URL e DIRECT_URL raggiungibili, migrazioni applicate; pg_stat_ssl vede false sull’ultimo hop. Un pooler può terminare TLS prima di tale hop: serve verifica provider, non si deduce che il percorso cliente sia in chiaro |
| Stripe TEST | PASS per connettività/configurazione | Account confermato corrispondente alla chiave runtime; modalità TEST coerente; webhook canonico abilitato e copertura eventi completa |
| Redis | PASS per connettività | PING autenticato restituisce PONG |
| Resend | OPEN | Lettura del dominio mittente non disponibile con la configurazione/permessi attuali; invio e recapito non provati |
| Browser desktop | PASS per rendering e feedback | Presale mostra 25 EUR, 0/15, taglie, quantità, dati e condizioni; dopo attesa mostra aiuto e pulsante Riprova verifica. Checkout disabilitato senza token; nessun challenge risolto o ordine inviato |
| Flusso economico completo | OPEN | Nessuna sessione Checkout o evento pagamento/rimborso pertinente presente nel sandbox alla verifica; non dichiarare completato ordine → webhook → email → rimborso |
| Backup commerciale | OPEN | La prova pg_dump/pg_restore è locale; snapshot, retention e ripristino Neon effettivi richiedono accesso al provider |

L’audit non ha modificato ordini, schemi, cron, email o pagamenti. I test locali continuano a usare destinazioni temporanee separate. Non sono state abilitate vendite LIVE o cambiate conferme commerciali.

## Collaudo Neon — 26 ottobre 2026

Progetto `holy-bar-39211424` (`rush`), PostgreSQL 18.6. L’identificativo delle condizioni e la revisione letti dal database coincidono con l’API pubblica del sito.

| Controllo | Esito ed evidenza |
|---|---|
| Snapshot effettivo | Creato `snap-curly-pond-b4i463rm` dalla sorgente `br-green-haze-b4fwjiqd`; scadenza 2 novembre 2026, 18:00 UTC |
| Ripristino provider | Ripristinato in `br-small-silence-b4yadi7i`; entrambe le destinazioni risultano READY |
| Conservazione dati | Confrontati conteggio e impronta aggregata di tutte le 14 tabelle: identici. Conservati l’ordine pendente esistente, importi, termini, ricevute webhook e tre migrazioni |
| Separazione ambienti | `production` = branch originale e predefinito; `staging` = copia ripristinata collegata all’endpoint attuale del sito TEST |
| Pianificazione snapshot | OPEN: il provider risponde “backup schedule creation is not enabled for this project”; calendario rimasto vuoto |
| Autosospensione | Modifica a 300 secondi rifiutata dall’account; configurazione esistente conservata |
| Privilegi | Ruoli applicativo/migrazione separati non creati; il controllo catalogo conferma zero nuovi ruoli. Serve approvazione della configurazione con privilegi minimi |
| TLS client | Aggiunta verifica PostgreSQL SSLRequest → handshake TLS con CA/hostname verificati, TLS minimo 1.2, senza inviare credenziali o SQL; esito online nella pipeline di rilascio |

La chiamata di ripristino ha restituito il nuovo branch in circa 10,7 secondi; prontezza e finalizzazione sono state verificate successivamente. Questo intervallo non è un RTO commerciale misurato.

**Nota di esercizio:** la finalizzazione del ripristino ha riassegnato endpoint e nome del branch originale alla copia. Il branch originale è rimasto conservato. Sono stati corretti nomi e branch predefinito; il confronto completo delle 14 tabelle ha confermato l’assenza di differenze nei dati al controllo. Non è stata eseguita alcuna cancellazione, migrazione o sovrascrittura dei record originali. Per una futura prova esclusivamente isolata usare sempre `finalize: false`, senza branch di destinazione esistente, e verificare gli endpoint prima di ogni eventuale finalizzazione.

## Chiusura verifica TLS 2.1.2

Sul deployment del commit `909c71a` entrambi i controlli client sono PASS: protocollo TLS 1.3, certificato e hostname verificati, database raggiungibile e migrazioni aggiornate. `postgresHopTls=false` resta il dato del backend dietro il proxy e non viene classificato come mancata cifratura del collegamento applicativo.

Pipeline push [40347022194](https://github.com/vicente490x/rush-presale/actions/runs/40347022194) e PR [40347046917](https://github.com/vicente490x/rush-presale/actions/runs/40347046917): completate con successo. Validati lint, TypeScript, build, audit, test unitari (33 PASS), integrazione PostgreSQL (37 casi più contenitore), migrazione, backup/ripristino locale e 33 controlli HTTP. I due nuovi casi TLS passano anche nell’esecuzione locale mirata.

Il collaudo provider ha inoltre confermato Stripe TEST/webhook e Redis; restano aperti recapito Resend, flusso cliente completo e prerequisiti LIVE. Le due azioni rifiutate dal provider — calendario snapshot e modifica autosospensione — sono riportate come non eseguite.
