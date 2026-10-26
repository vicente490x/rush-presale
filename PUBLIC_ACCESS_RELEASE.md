# Accesso pubblico e rebuild Vercel — 26 ottobre 2026

## Modifiche pronte

Il sito pubblico non richiede più una password, anche con vecchie variabili STAGING_PASSWORD_HASH e STAGING_SESSION_SECRET ancora presenti su Vercel. /anteprima rimanda alla home; POST /api/staging/login risponde 410 senza emettere cookie. Schermata e modulo di autenticazione condivisa rimossi. Login e sessioni amministratore restano necessari per /admin e /api/admin. Preflight, modelli ambiente, generatore credenziali e test aggiornati.

## Rebuild

1. Usare il nuovo commit del branch staging nel progetto Vercel rush-presale. Il precedente commit 2be69ba risultava distribuito con successo nel team wrath5; questo non certifica le impostazioni correnti del pannello.
2. Conservare le variabili operative dello staging: APP_ENV=staging, NEXT_PUBLIC_SITE_URL con il dominio HTTPS effettivo, DATABASE_URL e DIRECT_URL, STAGING_DATABASE_CONFIRMED=true solo dopo verifica del database separato, credenziali admin, SESSION_SECRET e CRON_SECRET, Stripe TEST/webhook, Turnstile, Upstash e Resend. Le due variabili STAGING_PASSWORD_HASH e STAGING_SESSION_SECRET possono essere eliminate.
3. Se il push non avvia una build automatica, creare un deployment dal nuovo commit staging. Redeploy di un vecchio deployment ricompila il vecchio commit e non include questa modifica.
4. Aprire / e /presale senza cookie; verificare che /anteprima rimandi a /. /admin deve chiedere il login e /api/admin/settings deve rispondere 401 senza sessione. Verificare checkout TEST, webhook, conferma ordine ed email autorizzata.
5. Se compare una schermata Vercel invece del vecchio form RUSH, verificare Deployment Protection nel progetto: è una protezione della piattaforma, indipendente dal codice aggiornato qui.

## Verifiche eseguite

Installazione npm ci, lint, TypeScript e build Next di produzione completati. Build con variabili locali fittizie, senza connessioni a servizi. Test unitari e regressione del proxy verificano accesso pubblico senza cookie, admin protetto, CSP/no-store/noindex e dismissione del login condiviso. Il test HTTP completo è aggiornato ma non eseguito: richiede PostgreSQL temporaneo. Nessuna prova di acquisto, webhook remoto o email reale effettuata.

## Per completare la vendita reale

L'accesso pubblico non abilita i pagamenti reali: lib/config.ts rifiuta sempre chiavi Stripe live, anche in production. Restano da implementare e verificare un passaggio esplicito e coerente a Stripe LIVE (checkout, webhook e rimborsi), configurare i servizi e database di produzione, verificare informative/dati del venditore, collaudare l'intero ordine su staging e poi sul dominio finale. L'allowlist email e i job in dry-run dello staging restano attivi. Non impostare semplicemente APP_ENV=production per aggirare i controlli. Nessuna modifica a database o provider esterni effettuata.
