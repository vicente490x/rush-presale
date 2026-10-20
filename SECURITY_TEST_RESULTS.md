---
noteId: "45915da0cc8411f1a8d8071bcfefd596"
tags: []

---

# RUSH PRE-SALE — Risultati test di sicurezza

> Nuova esecuzione nella fase di chiusura del 20 ottobre: typecheck/lint/build PASS; **19 unitari PASS**, **34 casi + contenitore = 35 integrazione PASS**, migrazione PASS, **28 HTTP PASS**, npm audit zero. Nuovi test coprono timeout SDK Upstash, bcrypt/$, file Prisma senza fallback, TLS e form POST/noscript. Schemi, comandi, limiti e tentativi iniziali corretti sono riportati in [STAGING_FINAL_PREPARATION.md](STAGING_FINAL_PREPARATION.md). Gli esiti sotto sono la precedente esecuzione dell'audit, conservata come evidenza.

Esecuzioni finali: **20 ottobre 2026**, Windows, Node **24.21.0**, PostgreSQL **18** temporaneo su `127.0.0.1:55439`. Dati sintetici; nessuna transazione o email reale.

## Esiti finali

- `npm.cmd run typecheck` — **PASS**, nessun errore TypeScript.
- `npm.cmd run lint` — **PASS**, zero warning ammessi.
- `npm.cmd test` — **PASS**, 15 test unitari; un contenitore integrazione intenzionalmente SKIP senza `RUSH_ISOLATED_TEST`. L'integrazione è eseguita separatamente e non saltata nel risultato seguente.
- `npm.cmd run test:integration` — **PASS**, 34 casi più contenitore, totale runner 35 PASS, 0 FAIL, 0 SKIP. Ultimo schema `audit_c8e0d050d472cc28`.
- `npm.cmd run test:migration` — **PASS**, iniziale → staging hardening → security sessions su `migration_607fe473233c9aec`; preservati ordini sintetici, importi e date, backfill prudenziale, trigger anti-rollback produzione verificato.
- `npm.cmd run db:validate` — **PASS** con DATABASE_URL, DIRECT_URL e conferma del DB temporaneo esplicite.
- `node node_modules/prisma/build/index.js migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code` — **PASS**, nessuna differenza sullo schema di integrazione. Il diff Prisma non certifica policy provider o trigger non modellati; il trigger è provato dai test.
- `npm.cmd run build` — **PASS**, Prisma Client generato e build Next 16.4.2 completata; pagine dinamiche per supportare i nonce.
- `npm.cmd run test:http` — **PASS**, 27 controlli sul server Next compilato loopback porta 3100. Schema `http_96c1830b3ad29fa4`, server terminato dal finally del test.
- `npm.cmd audit --json` — **PASS**, 0 critical/high/moderate/low/info.
- `npm.cmd ls next @next/env react react-dom prisma @prisma/client stripe sharp --depth=0` — **PASS**, versioni riportate nell'audit.
- `git diff --check` — **PASS**; avvisi di normalizzazione LF/CRLF non sono errori del codice.
- Scansione read-only di sorgenti, blob Git e bundle — **COMPLETATA**, hash storico da gestire, nessun segreto concreto nei bundle con i controlli usati. Dettagli in SEC-12; non significa “nessun segreto mai esistito”.
- `npm.cmd run staging:check -- --env-file .env.local` — **FAIL ATTESO / BLOCCANTE PER STAGING**, 28 requisiti non soddisfatti dalla configurazione di sviluppo. Il comando non effettua connessioni e non mostra segreti.

Artefatti `.test-results/security-build.log`, `http-report.json`, `http-server.log`, `security-npm-audit.json` e `security-secret-scan.json`: locali e ignorati da Git. Non pubblicare log o fixture come parte del sito.

Al termine il cluster PostgreSQL temporaneo è stato arrestato; nessun listener residuo rilevato sulle porte 3100 e 55439. Gli schemi sintetici sono conservati nel solo cluster di test per ispezione.

## Configurazione riproducibile

Solo dopo avere predisposto un PostgreSQL temporaneo locale dedicato:

```powershell
$env:RUSH_TEST_DATABASE_URL='postgresql://rush_audit@127.0.0.1:55439/rush_audit_test'
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:migration
$env:DATABASE_URL=$env:RUSH_TEST_DATABASE_URL
$env:DIRECT_URL=$env:RUSH_TEST_DATABASE_URL
$env:APP_ENV='staging'
$env:STAGING_DATABASE_CONFIRMED='true'
$env:NEXT_PUBLIC_SITE_URL='https://rush-staging.example.invalid'
npm.cmd run db:validate
npm.cmd run build
npm.cmd run test:http
npm.cmd run typecheck
npm.cmd run lint
npm.cmd audit
```

L'utente indicato è soltanto quello del cluster di test loopback, senza credenziali reali. Gli script rifiutano host non locali e database privi del prefisso `rush_audit`, creano uno schema casuale e non usano quello dell'applicazione. Su Windows eseguire build/Prisma generate quando nessun test sta usando la DLL del client.

## Copertura

Finanza: firma SDK valida su payload sintetico, firma non valida, webhook duplicati anche concorrenti, evento unpaid, importo errato, quantità/input manipolati, taglie/consenso/email, presale chiusa/manutenzione, checkout distinti e due pagamenti distinti simultanei. Eventi async/fallimento/scadenza fuori ordine, contatori e unica conferma email per ordine.

Rimborsi: scadenza, produzione avviata, concorrenza cron/manuale/produzione, pending/succeeded/failed, retry con chiave persistita, timeout prima della risposta e dopo accettazione provider, associazione PI/valuta/ID, parziali/totale, evento anticipato e rollback incoerenze. Non sono test contro Stripe remoto.

Admin: login bcrypt reale in sviluppo locale, password errata, blocco persistente, tutti i metodi degli handler protetti senza sessione, CSRF, sessioni gate/admin distinte, revoca e rotazione. Login con Turnstile reale ancora da provare; nel test HTTP la sessione admin è creata dalla fixture e verificata dall'applicazione.

HTTP: gate con bcrypt reale, cookie Secure/HttpOnly/SameSite, redirect, robots/noindex, CSP/cache, nonce inline, optimizer, tentativo x-middleware-subrequest, pagine admin/impostazioni, webhook firmato/duplicato, dashboard, consegna con audit, lookup senza PII, CSV/XLSX, filtri/paginazione, cron autenticato dry-run, produzione, chiusura, diagnostica e copia cookie dopo logout.

Unità: limiti JSON/multipart chunked, date/mesi, export, Stripe solo TEST, allowlist email, ambiente Preview, preflight, IP spoofing, CSP e input finanziari strict.

## Tentativi falliti o interrotti

1. Il sandbox Windows ha impedito avvii tsx/Prisma (`uv_os_get_passwd ENOMEM` nella sessione precedente). Ripetuti con autorizzazione runtime ed esito positivo.
2. Il 16 ottobre build/generate concorrente ai test ha dato EPERM sulla DLL Prisma; rese sequenziali le esecuzioni. Un successivo build è stato interrotto dal cambio sessione e non contato come PASS. La build finale del 20 ottobre è completata.
3. Il cluster temporaneo ha richiesto recupero dopo l'interruzione; il log aperto nella directory dati causava una sharing violation. Riavviato soltanto quel cluster con log esterno; nessun dato applicativo toccato.
4. Prima validazione Prisma: DIRECT_URL mancante; secondo tentativo: conferma staging mancante. Il guard ha impedito l'esecuzione. PASS dopo configurazione esplicita del DB isolato.
5. Test consegna concorrente: aspettativa 400 contro risposta corretta 409; corretto il test e ripetuta tutta l'integrazione, ora 35 PASS.
6. Più tentativi HTTP si fermavano al rendering admin con 307: hash fixture modificato dal caricamento dotenv. Isolato l'ambiente, rimosse diagnostiche temporanee, ripetuti build e HTTP, ora 27 PASS.
7. Preflight `.env.local`: resta FAIL con 28 requisiti. Nessuna credenziale inventata e nessuna modifica alla configurazione di sviluppo.

## Non eseguiti

Inventario CUA del 20 ottobre senza browser collegati: nessun rendering/interazione browser, mobile o verifica di esecuzione degli script CSP dichiarato superato.

Non eseguiti: checkout/rimborso Stripe TEST remoto, webhook attraverso Vercel, CAPTCHA reale, Upstash distribuito, Resend/mittente/DNS, TLS/CDN, IAM/ruoli/backup/ripristino DB gestito, scheduler remoto, fal.ai/storage/retention immagini, prove di carico o scansioni intrusive esterne.

**SECURITY NOT READY FOR STAGING**: i PASS locali non sostituiscono questi controlli.
