# Final QA — 29 ottobre 2026

**RILASCIO BLOCCATO — INTERVENTI NECESSARI.** I controlli locali sono superati; i gate remoti sotto indicati non autorizzano ancora il merge.

Baseline: `88c076cad2040081eedb0aacc2609f9d4df56fba`, branch obbligatorio `feature/rush-final-release`, [PR #5](https://github.com/vicente490x/rush-presale/pull/5) aperta in bozza e senza conflitti al controllo iniziale. `main` verificato a `0e3ee3698c2abd36e2d15ea85d3718019cedd3b4`, nessun tag esistente. SHA finale, CI e Preview successivi al push sono riportati nella PR, evitando di attribuire al nuovo commit i check della baseline.

## Modifiche

Login con email opzionale, per aggiungere un ADMIN personale mantenendo il login dell’account principale. JWT e sessione persistente identificano l’utente autenticato; revoca, stato attivo, ruolo e impronta password sono verificati per ciascun account. `admin:provision` usa password nascosta, bcrypt 12, connessioni e host Neon espliciti e operazione idempotente senza aggiornamenti degli account esistenti. Nessuna modifica a Stripe, schema/migrazioni, ordini, configurazioni di produzione o asset Premium.

Manuale, TAD e [procedura admin](14_ADMIN_PERSONALE.md) aggiornati. Gli Office storici non sono stati rigenerati e non costituiscono il report di questa revisione.

## Esecuzione locale

`npm run verify:release`: Node 24, PostgreSQL 18 locale dedicato, schemi isolati, APP_ENV staging, Stripe TEST e LIVE disabilitato. [Manifesto dei risultati](evidenze/final-qa-2026-10-29.json); log completi in `.test-results/release/` nel workspace. Nessuna chiamata economica o email reale nelle suite.

| Controllo | Risultato e limite |
|---|---|
| npm ci, audit | PASS; 0 vulnerabilità segnalate |
| ESLint, TypeScript, build produzione | PASS con ambiente staging esplicito |
| Unitari | 43 PASS; 1 contenitore integrazione saltato per design |
| Integrazione PostgreSQL | 42 PASS, suite separata senza skip; provider Stripe/Resend simulati |
| Prisma e migrazione di aggiornamento | PASS; 4 migrazioni, dati storici preservati |
| Backup/ripristino PostgreSQL | PASS locale; ordini, importi, date, relazioni, outbox e checksum preservati |
| HTTP/API | 35 controlli PASS su Next compilato e PostgreSQL reali |
| Browser | 17 controlli PASS, Chromium 156 desktop/mobile emulato |
| GLB e foto | HTTP 200, MIME e SHA-256 atteso verificati dal browser locale; foto conservate |
| Responsive / accessibilità del viewer | 320/390/768/1440 px, touch, reduced motion, caricamento lento, errore rete/WebGL, riprova e controlli 3D PASS |
| JavaScript / hydration / CSP | Nessun errore nel percorso desktop locale verificato |

La prima build fuori dalla procedura ha incontrato la DLL Prisma occupata da un altro processo e poi una configurazione ambiente non esplicita. L’esecuzione completa e sequenziale con staging ha superato entrambi i problemi senza modificare i controlli di sicurezza. Il nuovo test browser conteneva inizialmente un selettore per un link ordini inesistente: corretto sulla sezione ORDINI effettiva e rieseguito con successo. Nessun risultato fallito è stato trasformato in PASS senza una nuova esecuzione.

## Casi aggiunti e regressioni

| Caso | Evidenza |
|---|---|
| Identità personale stabile e distinta | `tests/admin-provision.test.ts`: normalizzazione, ID deterministico, email invalida |
| Destinazione del provisioning | Staging, host, database/schema e TLS coerenti; input incompleti o discordanti rifiutati |
| Due account indipendenti | Bcrypt reale, login HTTP con email, dashboard e ordini autorizzati, account originale identico prima/dopo |
| Revoca personale | Logout, disattivazione, cambio hash e credenziale obsoleta negano accesso; sessione originale conservata |
| UI amministrativa | Email con autocomplete username; dashboard e ordini renderizzati con seconda sessione locale |
| Sicurezza e pagamenti esistenti | Suite su CSRF, richieste non autorizzate, cookie, firme webhook, replay/idempotenza, rate limit, errori provider, export contro injection e conferma con cookie ordine |

Le fixture con identità temporanee esistono solo negli schemi locali di collaudo. Nessun account demo creato su Neon. Non sono stati collaudati dispositivi fisici, Safari/WebKit o Firefox.

## Riscontri remoti iniziali

- Vercel team `wrath5`, progetto `rush-presale`: Preview della baseline READY su `rush-presale-n61yu8adw-wrath5.vercel.app`, SHA corrispondente. L’accesso autenticato a `/api/status` restituisce **503**, `Stato PRE-SALE non disponibile.`
- La lettura degli scope, senza decifrare segreti, trova soltanto STAGING_DATABASE_CONFIRMED disponibile in Preview; le altre variabili richieste risultano assegnate a production. L’utente sta preparando la configurazione staging Preview. Un nuovo deploy e un nuovo controllo runtime sono necessari dopo l’aggiornamento.
- Il controllo Vercel aggiuntivo del team `vicente` è failure. La connessione non può leggerne i dettagli: 403, tentativo di autorizzazione team non riuscito. Lo storico PR segnala appartenenza al team mancante. È un problema di accesso da chiarire; non è evidenza di un errore del codice nel deploy `wrath5`, che è READY.
- Neon staging: un solo AdminUser ADMIN attivo, bcrypt costo 12; quattro migrazioni applicate, nessuna incompleta o annullata; due ordini, zero PAID, outbox vuota al controllo. Letture prive di email e hash. Ruolo applicativo senza INSERT/UPDATE su AdminUser, connessione amministrativa disponibile al gestore.
- Neon production: la lettura dei nomi delle tabelle non trova AdminUser. Non è stata applicata alcuna migrazione o modifica remota. Staging e production sono branch distinti e risultano non protetti; il candidato non deve essere promosso sulla base di questo solo inventario.
- Stripe: account collegato sandbox con livemode=false; webhook TEST abilitato verso `https://rush-presale.vercel.app/api/stripe/webhook`. Questo endpoint non dimostra la consegna alla nuova Preview. Occorrono destinazione, segreto e raggiungibilità coerenti, preservando Turnstile e protezioni esistenti.

## Gate MAIN e azioni necessarie

| Gate | Stato / azione |
|---|---|
| Nuovo admin personale su Neon | NON ESEGUITO: attendere email confermata e password impostata nel terminale sicuro; poi login/logout e route sul candidato |
| Configurazione Preview | BLOCCATO al riscontro iniziale 503; completare gli scope con sole connessioni staging, APP_ENV=staging, STRIPE_MODE=test, ALLOW_LIVE_PAYMENTS=false, job automatici disabilitati |
| Origine, Turnstile e webhook | Usare URL canonico del candidato, hostname consentito e webhook TEST raggiungibile; non disabilitare le protezioni per superare il test |
| Modello sul deployment | QA locale PASS; ripetere hash e interazioni sul candidato remoto esatto prima del merge |
| Checkout Stripe TEST completo | NON ESEGUITO: pagina → Checkout → pagamento sandbox → webhook → Neon PAID → conferma, poi annullamento/fallimento/replay/accesso negato |
| Recapito email | NON VERIFICATO: manca casella di prova autorizzata; verificare consegna effettiva, contenuto, retry e assenza duplicati |
| CI e Preview del nuovo SHA | Verificare dopo il push; una CI verde da sola non chiude i gate remoti |
| Configurazione futura di main | NON CERTIFICATA: verificare separatamente destinazione DB, migrazioni e flag di pagamento senza esporre i valori dei segreti |

Finché un gate critico resta non eseguito o non verificabile: mantenere PR #5 in bozza, **nessun merge, tag, modifica di main o attivazione LIVE**.

## Prerequisiti LIVE e rollback

Completare prima i gate TEST. LIVE richiede una verifica separata di dati venditore/condizioni, account e chiavi Stripe LIVE, webhook e firma della destinazione production, isolamento e privilegi DB, migrazioni/backup/ripristino, provider email e dominio, Turnstile, rate limiting, job e monitoraggio. Non trasferire dati staging su production e non cambiare automaticamente i flag LIVE.

Per un problema del candidato, conservare il deployment production e correggere sullo stesso branch. Se occorre tornare alla build precedente, utilizzare il deployment verificato precedente senza rollback distruttivi del database. Il codice precedente non abilita l’admin personale: i record restano conservati. Procedura dettagliata in [14_ADMIN_PERSONALE.md](14_ADMIN_PERSONALE.md) e [piano di rilascio](10_PIANO_RILASCIO.md).
