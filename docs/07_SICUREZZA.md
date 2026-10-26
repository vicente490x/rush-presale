# SEC-01 — Piano e requisiti di sicurezza

**Release 2.1.0 · 26 ottobre 2026**

## Beni da proteggere e confini di fiducia

I beni principali sono dati personali degli ordini, stato economico, credenziali amministrative, segreti provider e disponibilità del servizio. Browser e richieste pubbliche non sono fonti autorevoli per prezzo, pagamento o ruolo. Il server verifica ogni confine prima di applicare un effetto.

| Rischio | Controllo | Evidenza / verifica residua |
|---|---|---|
| Accesso amministrativo non autorizzato | Bcrypt, JWT HS256 con claim obbligatori, digest sessione nel DB, revoca e scadenza 12h | Unità, integrazione, HTTP; login anonimo negato online |
| CSRF e richieste cross-site | Origin canonica e controllo sec-fetch-site, SameSite strict | Test origine assente/estranea e API HTTP |
| Brute force / abuso ordine | Budget DB login/lookup, Redis distribuito per checkout, Turnstile server-side | Concorrenza, spoofing IP e timeout; distribuzione e token reali da provare |
| Falsificazione pagamento | Firma Stripe sul body originale, modalità, importo/valuta/Session ID/PI verificati | SDK firma, rollback eventi incoerenti, duplicati e fuori ordine |
| Doppio ordine o rimborso | Lock, chiavi idempotenti, ledger e intento persistente | Test concorrenti e timeout dopo accettazione provider |
| Esaurimento risorse | Body limitato prima del parsing, schema input, limiti righe/batch/timeout | Richieste chunked e Content-Length falsificato rifiutate |
| Esecuzione script / fuga cache | CSP nonce per richiesta, no-store HTML/API/CDN, referrer disabilitato, optimizer ristretto | HTML compilato e header osservati sul dominio |
| Formula injection export | Celle testuali e quoting CSV | CSV e workbook XLSX verificati |
| Fuga dati o segreti nei log | Errori fissi/minimizzati, niente password/token o URL DB nei report | Revisione applicativa; retention e accessi provider da confermare |
| Perdita dati | Backup provider e ripristino su destinazione separata | Procedura predisposta; prova ripristino ancora aperta |
| Vulnerabilità dipendenze | Lockfile, npm ci, audit e pipeline | Audit corrente: zero advisory noti; aggiornamenti periodici necessari |

## Requisiti di configurazione

- Staging e produzione devono usare database e credenziali distinti, con TLS e verifica certificato. Il ruolo runtime non deve avere privilegi amministrativi non necessari.
- `SESSION_SECRET` e `CRON_SECRET` devono essere casuali, distinti e di almeno 32 caratteri. L’hash admin deve avere costo bcrypt 12–16. Scegliere una password nuova e non riutilizzata.
- I segreti devono rimanere nelle variabili server del provider o in file locali ignorati. Soltanto URL canonico e site key Turnstile sono pubblici. In Vercel l’hash bcrypt va inserito letteralmente, conservando `$`.
- LIVE richiede APP_ENV production, STRIPE_MODE live, opt-in espliciti, DB confermato, provider e dati venditore completi. Un deployment Vercel nel target Production può ancora eseguire l’applicazione in TEST.
- Webhook e cron devono essere raggiungibili dai rispettivi servizi, mantenendo firma o Bearer. L’accesso pubblico alla home non concede accesso amministrativo.
- Non effettuare pagamenti LIVE o migrazioni commerciali dai runner di test. I test accettano soltanto un DB locale temporaneo `rush_audit*`.

## Gestione delle sessioni e degli incidenti

Logout revoca la sessione prima di cancellare il cookie. La rotazione dell’hash password invalida le firme precedenti. Un errore DB nella verifica sessione nega l’accesso.

In caso di sospetta esposizione, sospendere le operazioni interessate, ruotare il segreto nel provider, revocare sessioni e verificare audit e operazioni pendenti. Non pubblicare payload, dati carta o credenziali nel repository. Il ripristino del servizio richiede la verifica del provider, non soltanto una nuova build.

## Accettazione sicurezza

Per il rilascio sono richiesti: test essenziali superati, zero vulnerabilità alte/critiche note non accettate, configurazione coerente, dominio HTTPS, prova di backup/ripristino, flussi reali verificati e responsabile operativo assegnato. La pipeline non sostituisce le approvazioni organizzative o la verifica delle informative.
