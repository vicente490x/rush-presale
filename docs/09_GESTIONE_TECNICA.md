# OPS-TECH-01 — Installazione, esercizio e manutenzione

**Release 2.1.0 · 26 ottobre 2026**

## Installazione e configurazione

1. Usare Node 24 e PostgreSQL. Eseguire `npm ci` nella radice del repository.
2. Preparare un file locale ignorato partendo dal modello dell’ambiente corretto. Non caricare file reali su GitHub.
3. Configurare URL DB runtime/diretto, origine canonica e servizi. Confermare la destinazione prima di usare Prisma.
4. Eseguire il preflight dedicato; verificare separatamente rete, credenziali e titolarità nei provider.
5. Applicare le migrazioni alla destinazione confermata e controllare lo stato.
6. Avviare sviluppo con `npm run dev` oppure effettuare build e avvio production con `npm run build` e `npm start`.

```sh
npm run staging:check -- --env-file .env.staging.local
npm run production:check -- --env-file .env.production.local
npm run db:validate -- --env-file .env.staging.local
npm run db:migrate -- --env-file .env.staging.local
node --import tsx scripts/prisma-cli.ts migrate status --env-file .env.staging.local
```

Per la produzione sostituire il percorso con il file produzione esplicito e confermato. Non usare reset, seed o db push sul database commerciale. La build non esegue migrazioni.

## Catalogo variabili

| Gruppo | Variabili | Regola |
|---|---|---|
| Ambiente | APP_ENV, NEXT_PUBLIC_SITE_URL | Origine HTTPS senza path/query; Preview richiede staging |
| Database | DATABASE_URL, DIRECT_URL, STAGING_DATABASE_CONFIRMED, PRODUCTION_DATABASE_CONFIRMED | DB separati, pool e connessione diretta, TLS con verifica certificato |
| Pagamenti | STRIPE_MODE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ALLOW_LIVE_PAYMENTS | Chiave e webhook dell’ambiente esatto; test predefinito |
| Lancio | PRODUCTION_LAUNCH_CONFIRMED, LEGAL_REVIEW_CONFIRMED | Conferme del proprietario dopo le prove e revisione, non bypass tecnici |
| Amministrazione | ADMIN_ID, ADMIN_PASSWORD_HASH, SESSION_SECRET | Hash bcrypt e segreto casuale; nessuna password in chiaro |
| Pianificazione | CRON_SECRET, ENABLE_AUTOMATIC_JOBS | Bearer distinto; true in produzione commerciale |
| Email | RESEND_API_KEY, MAIL_FROM, ADMIN_EMAIL, EMAIL_ALLOWLIST | Mittente verificato; allowlist esatta nei soli ambienti non-production |
| Anti-bot | NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY | Dominio effettivo autorizzato |
| Rate limit | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN | Redis dedicato, errore/timeout nega checkout |
| Venditore | SELLER_NAME, SELLER_ADDRESS, SELLER_TAX_ID, PRIVACY_EMAIL, SUPPORT_EMAIL, WITHDRAWAL_POLICY | Dati autentici e testi revisionati, renderizzati come testo dal server |

Usare il generatore interattivo `npm run staging:credentials` per hash/segreti e `npm run admin:setup` per il solo accesso locale. Proteggere i file creati; non riutilizzare i segreti tra ambienti.

## Audit operativo ripetibile

Il comando `npm run release:audit -- --env-file .env.staging.local --online` esegue controlli in sola lettura sui servizi effettivi. Su Vercel usare `npm run release:audit -- --process-env --online`, con le variabili protette già presenti nel deployment. L’output contiene solo esiti, problemi a testo fisso e identificativo account Stripe; non stampa credenziali, URL database, destinatari o risposte provider. I controlli online leggono database/migrazioni, connessione diretta, TLS osservabile da PostgreSQL, account e webhook Stripe, domini Resend e PING Redis. Nessuna sessione, email, modifica o rimborso viene creato.

L’audit è un rapporto osservativo: termina regolarmente anche se alcuni requisiti sono FAIL/OPEN, così può essere eseguito nella build del sito TEST. Non sostituisce il preflight bloccante `production:check`, il collaudo completo o l’accettazione del titolare. Un token Resend limitato agli invii potrebbe non consentire la lettura dei domini: in quel caso la verifica resta OPEN.

Il valore pg_stat_ssl descrive l’ultimo collegamento al backend PostgreSQL: dietro un pooler TLS non rappresenta necessariamente il tratto applicazione → provider. Un valore false mantiene aperta la verifica del trasporto; confrontare configurazione TLS del client, endpoint diretto e documentazione/impostazioni del provider prima di certificare o modificare il servizio.

## Verifica anti-bot e browser

Cliente e login amministratore mostrano errori, scadenze e un messaggio dopo 15 secondi di attesa. `Riprova verifica` ricrea il widget; se lo script non è caricato, `Ricarica pagina` ritenta il caricamento. Il pagamento resta disabilitato fino alla verifica e il server valida sempre token e hostname. Le restrizioni del browser possono interferire; non si richiede di disabilitare globalmente le protezioni del dispositivo. Provare prima ad aprire la pagina direttamente in un browser aggiornato.

Riferimenti tecnici: [configurazione widget Cloudflare](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/) e [browser supportati](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/).

## Stripe e notifiche

Registrare POST `/api/stripe/webhook` sul dominio canonico e usare il signing secret dell’endpoint esatto. Sono gestiti completamento/successo asincrono/scadenza/fallimento Checkout e gli eventi rimborso previsti dalle route. Il browser non invia un importo autorevole e il ritorno a conferma non prova il pagamento.

Verificare mittente e dominio Resend. L’outbox separa l’accodamento dall’accettazione del provider. Per invii ambigui oltre 23 ore serve revisione, senza reinvio cieco. Configurare un processo operativo per esaminare backlog, `lastError`, rimborsi pendenti e ricevute webhook FAILED.

## Job e monitoraggio

| Job | Schedule UTC | Comportamento |
|---|---|---|
| `/api/cron/daily` | 07:00 ogni giorno | Preavvisi, scadenze, rimborsi, riconciliazione e invio batch; staging in anteprima |
| `/api/cron/cleanup` | 07:30 ogni giorno | Sessioni scadute e limitatori vecchi; nessuna cancellazione ordini |

Daily ha budget complessivo e batch limitati: fino a 50 preavvisi, 25 rimborsi esaminati, 50 checkout per riconciliazione e 5 email per invocazione. Verificare che i volumi e il timeout del piano siano compatibili; monitorare `moreDue`, errori e outbox. Una pianificazione definita nel file non prova che il provider l’abbia eseguita.

## Backup e ripristino

Il titolare deve definire frequenza, retention, cifratura, autorizzati, RPO e RTO. RPO/RTO non sono stati misurati e non devono essere dichiarati garantiti. Abilitare backup/snapshot del provider; conservare almeno una copia con accesso separato dalla credenziale runtime.

La prova di ripristino deve usare una nuova destinazione isolata, senza sostituire il DB attivo. Verificare conteggi, importi, relazioni, migrazioni e lettura applicativa; registrare durata ed esito. Con strumenti PostgreSQL usare un profilo libpq protetto e `pg_dump` in formato custom, evitando URL con password negli argomenti o nei log. Testare `pg_restore` sul DB isolato e chiuderlo secondo le regole di conservazione autorizzate.

### Prova automatica locale

`npm run test:backup` richiede un PostgreSQL locale `rush_audit*` indicato da RUSH_TEST_DATABASE_URL e client pg_dump/pg_restore compatibili (PG_BIN_DIR può indicarne la cartella). Crea sorgente e destinazione con nomi casuali, applica le migrazioni, inserisce dati di collaudo confinati, genera un archivio custom e ripristina in un database nuovo e vuoto. Confronta ordini, importi, date, termini, outbox e checksum; modifica la copia per provare l’indipendenza dalla sorgente. Elimina soltanto i due database creati dal runner. L’archivio temporaneo ha accesso limitato all’utente.

Questa prova valida la procedura sullo schema applicativo; non certifica backup, retention o RPO/RTO del database commerciale. Per questi ultimi servono accesso al provider e una destinazione effettivamente separata.

## Incidenti e rollback

1. Valutare impatto economico, dati e disponibilità; bloccare nuove operazioni se necessario dal backoffice.
2. Conservare evidenze minimizzate e identificare l’ultimo commit/deployment funzionante.
3. Riconciliare esiti Stripe prima di ripetere pagamenti/rimborsi; non modificare stati per supposizione.
4. Per regressioni applicative, ripristinare il deployment precedente compatibile con lo schema. Un rollback del codice non annulla dati o effetti provider.
5. Ripetere smoke e test interessati, poi riaprire il servizio con autorizzazione del responsabile.

Le migrazioni storiche sono conservate. Le strutture non più usate dal client non vanno cancellate automaticamente: la loro dismissione fisica richiede una migrazione successiva con controllo dati e piano di ripristino.
