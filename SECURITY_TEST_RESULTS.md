# Risultati dei test — 26 ottobre 2026

Esecuzione sul candidato successivo a `ed9e464`, Node 24.22.1, Next 16.4.2, Prisma 6.12.0, Zod 4.6.7. Database PostgreSQL 16.15 temporaneo su loopback, database `rush_audit_release`, schemi casuali distinti per integrazione/migrazione/HTTP. Nessun database remoto, pagamento, rimborso o invio email reale utilizzato.

## Risultati effettivi

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| `npm run lint` | PASS | Zero warning ammessi |
| `npm run typecheck` | PASS | Nessun errore TypeScript |
| `npm test` | PASS: 30 test | 1 contenitore integrazione saltato intenzionalmente nel comando unitario; eseguito separatamente sotto |
| `npm run test:integration` | PASS: 34 casi + contenitore = 35 | PostgreSQL reale; Stripe/Resend double espliciti; nessuna API finanziaria chiamata |
| `npm run test:migration` | PASS | Migrazione iniziale → schema corrente; importi/date preservati e stato produzione monotono |
| `npm run build` con ambiente staging | PASS | Build ottimizzata Next, pagine/API dinamiche; variabili sintetiche |
| `npm run build` con fixture produzione LIVE | PASS | Solo configurazione sintetica nel processo build; nessuna chiave o chiamata LIVE reale |
| `npm run test:http` | PASS: 32 controlli nominati | Server Next compilato + PostgreSQL temporaneo; firme con SDK Stripe vero e payload sintetici |
| `npm audit --json` dopo aggiornamento | PASS: 0 vulnerabilità note | info/low/moderate/high/critical tutti zero al momento della verifica; non prova assenza di vulnerabilità sconosciute |
| Browser desktop/mobile | NON ESEGUITO | Chromium non presente; download del binario non completato. HTTP non dimostra rendering, interazione CAPTCHA o assenza di errori nella console |
| Provider e dominio pubblicato | NON ESEGUITO | Configurazione autentica, flussi Stripe/Resend/Turnstile/Upstash e cron online ancora da verificare |
| GitHub Actions | CONFIGURATO, ESITO REMOTO DA VERIFICARE | Workflow senza segreti reali; PostgreSQL di servizio isolato e azioni fissate a SHA |

## Copertura

- Storefront senza cookie; redirect `/anteprima` alla home; endpoint gate ritirato con 410 senza cookie. Vecchie variabili gate non ripristinano la password.
- Admin protetto sia nel proxy sia negli handler; bcrypt, cookie, JWT, revoca/logout, password rotation e sessione copiata.
- CSRF, quantità/taglia/termini, body oltre limite anche chunked con Content-Length falsificato, hostname Turnstile esatto, cron con segreto assente/errato.
- IP non fidato, rate limit DB atomico e timeout reale SDK Upstash simulato senza rete; checkout HTTP fallisce chiuso senza Redis e non crea ordini.
- Prenotazioni concorrenti, checkout ripetuto, soglia e produzione, snapshot prezzi/condizioni, pagamento incompleto, importo incoerente, evento duplicato e fuori ordine.
- Rimborsi parziali, PI errato, metadata incongruenti, timeout dopo accettazione, retry, gare rimborso/produzione e consegna/rimborso; outbox email e worker concorrenti.
- TEST/LIVE: LIVE bloccato in sviluppo/staging/Preview; configurazione incompleta negata; evento e sessione di modalità errata non modificano il DB. Un evento LIVE sintetico è accettato e deduplicato solo con la fixture produzione completa; questo non è una prova Stripe LIVE.
- CSP/nonce nell’HTML compilato, no-store/referrer/noindex, immagini consentite e optimizer ristretto, pagine legali, export CSV/XLSX senza formule eseguibili, stato ordine senza PII.
- Cron daily staging dry-run; cleanup autenticato elimina sessioni e rate limit scaduti mantenendo la sessione valida.

## Riproduzione

Usare Node 24 e un database PostgreSQL temporaneo locale denominato `rush_audit*`. Ogni runner crea uno schema casuale; non puntare questi test al DB commerciale. Sul runner CI il servizio viene eliminato al termine.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm audit --audit-level=high
# Impostare APP_ENV=staging, STAGING_DATABASE_CONFIRMED=true,
# NEXT_PUBLIC_SITE_URL=https://rush-staging.example.invalid e URL DB locali.
npm run build
# Impostare RUSH_TEST_DATABASE_URL sul solo DB temporaneo localhost rush_audit*.
npm run test:integration
npm run test:migration
npm run test:http
```

Il contenitore di questa verifica non permetteva cambio utente e socket Unix. PostgreSQL è stato estratto temporaneamente, avviato soltanto su loopback con un adattatore locale dell’identità utente del processo, senza modificare sorgenti o motore SQL; dati sintetici e fsync disabilitato solo nel cluster usa e getta. Queste impostazioni non fanno parte dell’app o delle istruzioni di produzione. Il server temporaneo è arrestato al termine. I log locali sotto `.test-results/` non vengono trasferiti come report pubblici.

I primi tentativi hanno rilevato un cache store Turbopack locale non leggibile e l’assenza degli asset nella copia di test. La build è stata rieseguita con output locale nuovo e asset originali del repository; gli esiti PASS riportati si riferiscono all’esecuzione finale, non ai tentativi falliti. Il controllo dipendenze iniziale ha rilevato Zod vulnerabile: aggiornato e ricontrollato.

Non usare i conteggi dei report del 20 ottobre come esiti di questa esecuzione.
