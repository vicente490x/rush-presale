# DAT-API-01 — Modello dati e contratti HTTP

**Release 2.1.0 · 26 ottobre 2026**

## Modello dati operativo

| Entità | Dati principali | Vincoli e utilizzo |
|---|---|---|
| Order | Codice casuale, cliente/email, taglia/quantità, importi, date, pagamento, rimborso, consegna | Codice e riferimenti Stripe unici; snapshot economico e contrattuale |
| Settings | Apertura, prezzo, soglia, taglie/limiti, produzione, durate, destinatari, testi | Singleton global, revisione ottimistica e lock transazionale |
| TermsVersion | Numero versione, testo, data e attore | Versione corrente referenziata dalle impostazioni; storico accettato nell’ordine |
| RefundOperation | Ordine, importo residuo, automatico/manuale, chiave, tentativi/esito | Un intento per ordine; chiave unica e riconciliazione provider |
| EmailOutbox | Destinatario, oggetto/testo, dedupeKey, lease, tentativi e providerId | Deduplicazione e acquisizione atomica tra worker |
| StripeWebhookEvent | Event ID, tipo e data elaborazione | Ledger per idempotenza |
| WebhookReceipt | Event ID, tipo, data e stato ricezione | Traccia dei tentativi già autenticati |
| AdminSession | Digest identificativo, attore, impronta credenziale, scadenza e revoca | Token non salvato in chiaro; revoca e account controllati dal server |
| AdminUser (2.2.0) | ID, email univoca, ruolo ADMIN, passwordHash, active, date | Identità persistente; login e sessioni richiedono account attivo |
| RateLimitEntry | Chiave, contatore e reset | Budget persistente per login e lookup |
| AuditLog | Attore, azione, entità, prima/dopo, data | Operazioni amministrative ed economiche |
| ApplicationError | Codice fisso, contesto ridotto e data | Diagnostica senza errori provider completi |

Gli importi sono interi in centesimi EUR. Le date persistite sono gestite come UTC; il browser applica la rappresentazione locale. Un rimborso parziale aggiorna l’importo rimborsato; i pezzi vengono esclusi quando il rimborso è completo.

Le migrazioni già applicate sono immutabili. Nel modello Prisma alcune strutture storiche sono ignorate e una mappatura `@map` conserva la compatibilità con la colonna di esclusione dei lotti preesistenti. Non vengono esposte nel form o negli export e non richiedono cancellazioni di dati per questo rilascio.

## API pubbliche

| Metodo e percorso | Input | Risposta / effetti |
|---|---|---|
| GET `/api/status` | Nessuno | Soglia, contatore, apertura, prezzo, taglie, termini/revisione e consegna; no PII |
| POST `/api/orders` | firstName, lastName, email, size, quantity, terms=true, termsVersionId, settingsRevision, checkoutKey UUID, turnstileToken; website vuoto facoltativo | 201 checkoutUrl; registra prenotazione e crea/riutilizza Checkout |
| GET `/api/orders/[orderNumber]` | Codice ordine casuale | Stato minimo, taglia, quantità e scadenza; senza nome/email |
| POST `/api/stripe/webhook` | Body Stripe originale + stripe-signature | Evento verificato, aggiornamento idempotente; 400 se non autentico/coerente |
| POST `/api/staging/login` | Endpoint ritirato | 410 senza emissione cookie; accesso pubblico senza password |

## API amministrative

Tutti i percorsi amministrativi, salvo login, richiedono sessione attiva; le mutazioni richiedono Origin canonica. Gli oggetti input sono validati e non accettano importi/stati arbitrari fuori dai contratti.

| Metodo e percorso | Scopo | Input principale |
|---|---|---|
| POST `/api/admin/login` | Verifica password/hash e Turnstile, crea sessione | password, token anti-bot |
| POST `/api/admin/logout` | Revoca sessione e cancella cookie | Corpo JSON |
| GET `/api/admin/dashboard` | KPI, taglie, incassi, produzione, scadenze e audit recente | Nessuno |
| GET `/api/admin/orders` | Elenco paginato | q, page, payment, refund, size, delivery, sort, direction |
| GET `/api/admin/export` | CSV/XLSX e riepilogo produttore | Filtri elenco + format=csv/xlsx |
| POST `/api/admin/orders/[id]/delivery` | Modifica consegna | status valido |
| POST `/api/admin/orders/[id]/refund` | Rimborso/riconciliazione manuale | confirm=true |
| POST `/api/admin/presale` | Apre/chiude e riconcilia checkout | open boolean, confirm=true |
| POST `/api/admin/production` | Avanza produzione | status, confirm=true |
| GET/POST `/api/admin/settings` | Legge/salva configurazione e condizioni | Revisione e oggetto completo settingsInput per POST |
| GET `/api/admin/expiry` | Anteprima senza effetti finanziari | Nessuno |
| POST `/api/admin/expiry` | Esegue controllo effettivo | confirm=true |
| GET `/api/admin/diagnostics` | DB, configurazione e ultimi esiti | Nessuno |
| POST `/api/admin/diagnostics` | Invio email di verifica o riconciliazione | action e confirm=true; email se richiesta |

Il dettaglio esatto degli input è definito nei rispettivi schemi Zod e nelle route. L’elenco usa 25 righe per pagina. L’export richiede filtri se supera 10.000 ordini e neutralizza formule pericolose nei file tabellari.

## Operazioni pianificate

GET `/api/cron/daily` e GET `/api/cron/cleanup` richiedono `Authorization: Bearer CRON_SECRET`. Daily rimane in sola anteprima fuori produzione o con job automatici disattivati. Cleanup elimina sessioni scadute e vecchie righe dei limitatori, senza cancellare ordini.

## Errori

400 input o firma non validi; 401 sessione assente/non valida; 403 origine o operazione vietata; 404 ordine/percorso assente; 410 endpoint ritirato; 413 body eccessivo; 429 budget superato; 500/503 errore operativo da riprovare o riconciliare. I messaggi pubblici non includono segreti, stack SQL o payload provider completi.
