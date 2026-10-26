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
| Pipeline remota del candidato | Da associare al commit pubblicato e attendere prima del merge |

Ambiente locale: Linux in contenitore, Node 24.22.1, PostgreSQL 16.15 temporaneo. L’esecuzione finale segue la rimozione dei moduli fuori perimetro e comprende i nuovi casi SPEC-05/SPEC-08. I controlli provider/online restano separati.

Il dominio https://rush-presale.vercel.app/ è stato osservato senza cookie: `/` e `/presale` 200, `/api/status` 200 con 0/15 pezzi e 25 EUR, `/admin` 307 verso login, API admin 401, `/anteprima` 307 verso home. Nel browser desktop il passaggio home → presale mostra immagini, prezzo, contatore, taglie, quantità e condizioni. La piattaforma mantiene il banner PAGAMENTI DI TEST.

## Verifiche operative aperte

Non sono stati completati pagamento TEST remoto, ricezione email, rimborso provider, token Turnstile del flusso completo, carico su più istanze, dispositivo mobile o ripristino backup. Sono criteri di ingresso alle vendite LIVE, non motivi per trasformare un esito non eseguito in PASS.

## Gestione anomalie

Registrare ID, requisito, gravità, passi, atteso/osservato, commit, ambiente ed evidenza priva di segreti. P1 economici/autorizzativi impediscono il rilascio; P2 richiede valutazione del referente. Dopo una correzione ripetere il caso e la regressione pertinente. Usare il registro rischi per punti organizzativi che non rappresentano un difetto di codice.
