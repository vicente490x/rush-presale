# RUSH PRE-SALE — Requisiti di sicurezza per il rilascio

Versione 26 ottobre 2026. Questo documento è la matrice corrente; i precedenti audit rimangono evidenze storiche. Il sito pubblico è accessibile senza password condivisa. Solo il backoffice richiede autenticazione.

**Stato: verifiche locali completabili; rilascio commerciale non attestato finché restano i requisiti OPERATIVI.** Un test con fixture non prova che un provider reale sia configurato. Nessuna conformità normativa è certificata da questo file.

| ID | Requisito e criterio di accettazione | Implementazione / prova | Stato |
|---|---|---|---|
| SEC-R01 | Home, presale e API pubbliche non richiedono password; admin anonimo negato | `proxy.ts`, `public-access.test.ts`, test HTTP | CODICE VERIFICATO |
| SEC-R02 | Ogni pagina e handler admin verifica autonomamente sessione e ruolo | `lib/admin-auth.ts`, `lib/http.ts`, `lib/admin-page.ts`, integrazione | CODICE VERIFICATO |
| SEC-R03 | JWT firmato HS256, issuer/audience/sub/jti/iat/exp, durata 12h, ID casuale digest nel DB; copia del token negata dopo logout/rotazione | test integrazione e HTTP | CODICE VERIFICATO |
| SEC-R04 | Password admin solo hash bcrypt costo 12–16; segreti sessione e cron distinti, almeno 32 caratteri, nessun segreto nel client | preflight, generatore, test bcrypt/$ | CODICE VERIFICATO; nuove credenziali OPERATIVE da confermare |
| SEC-R05 | Mutazioni richiedono Origin canonica; assente/esterna/cross-site negata | `lib/http.ts`, test richieste e HTTP | CODICE VERIFICATO |
| SEC-R06 | Rate limit persistente login; checkout distribuito, timeout Redis nega l’operazione; IP client non fidato fuori Vercel | DB atomico, Upstash timeout, test spoofing/HTTP | CODICE VERIFICATO; distribuzione reale OPERATIVA |
| SEC-R07 | Turnstile verificato dal server, success e hostname esatto obbligatori; nessun bypass di produzione | `lib/turnstile.ts`, `request-security.test.ts` | CODICE VERIFICATO; widget/dominio OPERATIVI |
| SEC-R08 | JSON/multipart/webhook limitati anche senza Content-Length; campi, importi, taglie e quantità validati dal server | Zod 4.6.7, `readBytes`, unità/integrazione | CODICE VERIFICATO |
| SEC-R09 | Stripe TEST predefinito; LIVE vietato in sviluppo, staging e Vercel Preview; chiave ed evento coerenti | `lib/config.ts`, preflight, test produzione e integrazione LIVE sintetica | CODICE VERIFICATO; LIVE non attivato |
| SEC-R10 | LIVE richiede configurazione completa, DB produzione confermato, dati venditore, revisione testi, cron attivo e conferma lancio | `production:check`, `productionProblems`, guard runtime | CODICE VERIFICATO; attestazioni OPERATIVE |
| SEC-R11 | Solo webhook firmato sul body originale o riconciliazione API Stripe autentica confermano pagamento; redirect browser non conferma | importo/valuta/sessione/PI/mode confrontati; SDK firma reale, duplicati e fuori ordine | CODICE VERIFICATO; webhook remoto OPERATIVO |
| SEC-R12 | Prenotazioni stock e limiti cliente atomici; checkout idempotente e condizioni versionate nell’ordine | transazioni PostgreSQL e lock; test concorrenza, prezzi/termini snapshot | CODICE VERIFICATO |
| SEC-R13 | Rimborso con intento persistente e chiave idempotente; timeout rimane ambiguo; nessun nuovo rimborso automatico dopo produzione | test rimborso/produzione concorrenti, retry, parziali, metadata e timeout | CODICE VERIFICATO; prova provider OPERATIVA |
| SEC-R14 | Email outbox con dedupe, lease e idempotency key; staging limitato a email esatte autorizzate | test worker concorrenti e allowlist | CODICE VERIFICATO; mittente/invio remoto OPERATIVI |
| SEC-R15 | CSP con nonce diverso per richiesta, no unsafe-inline/eval negli script di produzione, no-store HTML/API/CDN; referrer disabilitato | test CSP, HTML compilato e header HTTP | CODICE VERIFICATO; browser/CDN OPERATIVI |
| SEC-R16 | HTTPS e cookie HttpOnly/Secure/SameSite, optimizer limitato ai tre asset di marca | configurazione e HTTP; verifica dominio effettivo | CODICE VERIFICATO; HTTPS online OPERATIVO |
| SEC-R17 | DB staging/produzione separati; TLS con verifica certificato; ruoli minimi, backup e ripristino provato | preflight e migrazioni temporanee | FORMATO VERIFICATO; rete/ruoli/ripristino OPERATIVI |
| SEC-R18 | Cron autenticato; staging daily dry-run; cleanup sessioni/rate limit scaduti, senza eliminare ordini | `cronAuthorized`, due schedule Vercel, HTTP cleanup | CODICE VERIFICATO; esecuzione online OPERATIVA |
| SEC-R19 | Dipendenze senza advisory noti alla verifica; build e test ripetibili senza segreti provider | lockfile, npm audit, `.github/workflows/security-tests.yml` | LOCALE E CI VERIFICATI sul candidato codice 4d61f8a |
| SEC-R20 | Export sicuro da formula injection; conferma pubblica senza nome/email; log applicativi minimizzati | CSV/XLSX, HTTP lookup, errori fissi | CODICE VERIFICATO; retention/accessi provider OPERATIVI |
| SEC-R21 | AI disabilitata, nessun upload foto; riattivazione richiede revisione indipendente | `TRYON_REVIEWED=false`, API status, integrazione | CODICE VERIFICATO |
| SEC-R22 | Dati venditore/contact e procedura recesso autentici; testi coerenti con i servizi usati | pagine server leggono `lib/seller.ts`; preflight rifiuta dati mancanti | STRUTTURA PRONTA; dati/revisione OPERATIVI |
| SEC-R23 | Staging noindex; produzione indicizzabile solo secondo configurazione; sito di test mostra banner anche con APP_ENV=production | layout, robots e HTTP | CODICE VERIFICATO |
| SEC-R24 | Team/progetto/branch/commit corretti; deployment READY, smoke online e procedura rollback verificati | checklist Vercel con ID e commit | OPERATIVO — accesso team necessario |

## Regole di accettazione

1. Eseguire i comandi di `SECURITY_TEST_RESULTS.md` sul candidato esatto e richiedere zero errori.
2. Il preflight verifica solo formato e coerenza; le variabili `*_CONFIRMED` sono attestazioni del proprietario, non rilevazioni automatiche.
3. Non trasformare un campo OPERATIVO in PASS senza data, responsabile ed evidenza del provider o del test online.
4. Nessuna credenziale in report, commit, screenshot o log. Sostituire password riutilizzate e revocare le sessioni prima del lancio.
5. Pubblicare prima una versione staging TEST verificata. Vendite LIVE soltanto dopo checklist produzione completata.
