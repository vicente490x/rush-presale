# DEV-01 — Documentazione del codice

**Release 2.1.0 · 26 ottobre 2026**

## Struttura del repository

| Percorso | Contenuto |
|---|---|
| app | Pagine, layout, route API e stili globali |
| components | Componenti del sito e del backoffice |
| lib | Servizi, regole di dominio, autorizzazione, validazione e integrazioni |
| prisma | Schema e migrazioni versionate |
| scripts | Configurazione locale, preflight, migrazioni e runner di collaudo |
| tests | Test automatici e dati sintetici isolati |
| public/assets | Logo e fotografie prodotto |
| docs | Documentazione di progetto e gestione |
| .github/workflows | Controlli ripetibili sul repository |

## Moduli e invarianti

| Modulo / funzione | Responsabilità | Vincolo da preservare |
|---|---|---|
| config / assertStripeConfiguration | Ambiente e modalità provider | LIVE solo in produzione esplicitamente configurata; Preview non può aggirare lo staging |
| deployment-config | Controllo formato e coerenza variabili | Nessun valore segreto nei messaggi; conferme manuali non sono prove provider |
| prisma | Client DB condiviso per processo | Destinazione ambiente confermata; nessuna connessione commerciale nei runner test |
| http / requireAdmin, adminRoute | Autorizzazione e contratti HTTP | Sessione lato server e Origin prima della mutazione |
| admin-auth | Creazione, verifica e revoca sessioni | JWT firmato, digest DB, scadenza e rotazione password |
| settings / settings, paidPieces | Configurazione iniziale e contatori | Solo ordini commerciali pagati e non rimborsati per intero |
| checkout / reserveOrder | Prenotazione e snapshot | Lock, stock, quantità, termini correnti e chiave idempotente |
| checkout / createCheckout | Sessione di pagamento | Riutilizzo su retry; ricontrollo raccolta dopo il provider |
| stripe-events / processStripeEvent | Conferma e riconciliazione eventi | Firma al confine HTTP, modalità coerente, controlli economici e dedupe |
| refunds / requestRefund, applyRefunds | Intento e riconciliazione rimborso | PI/valuta/importi verificati; timeout resta ambiguo |
| expiry / expiryPreview, runExpiry | Scadenze, avvisi e batch | Anteprima senza effetti; produzione avviata ferma nuovi rimborsi automatici |
| notifications / checkThreshold, queueNotice | Soglia e testi notifiche | Soglia non chiude la raccolta; accodamento transazionale |
| mail / deliverPendingEmails | Worker email | Lease, dedupe e finestra prudenziale di reinvio |
| presale / setPresaleOpen, reconcileCheckouts | Apertura e sessioni Stripe aperte | Non eliminare ordini; esiti provider incerti da riconciliare |
| dates / addCalendarMonths | Scadenza individuale | Mesi di calendario e fine mese corretti |
| export | Generazione CSV/XLSX | Testo non interpretato come formula; riepilogo produttore separato |

## Regole di sviluppo

- Tenere la logica economica nei servizi e le route concentrate su input, autorizzazione, risposta ed errori.
- Usare transazioni per stato ordine, ledger e outbox. Chiamate a provider esterni non fanno parte della transazione SQL: persistere l’intento prima dell’effetto e riconciliare dopo interruzioni.
- Non calcolare un totale autorevole dai dati del browser. Prezzo e condizioni provengono dalle impostazioni/snapshot lato server.
- Mantenere distinti chiusura della raccolta e avanzamento produzione. Non azzerare `productionStartedAt` per riaprire una raccolta.
- Non rimuovere un vincolo di sicurezza per far passare un ambiente incompleto. Gli errori devono impedire l’operazione quando il controllo non è disponibile.
- Limitare il body prima di effettuare parsing; non serializzare errori Prisma o provider nel client.
- Aggiungere commenti sulle decisioni e sugli invarianti, non una descrizione di ogni riga. I nomi di funzione devono esprimere l’azione.

## Configurazione e manutenzione

Node 24, Next 16.4.2, Prisma 6.12.0 e Zod 4.6.7 costituiscono la baseline verificata. Il lockfile è obbligatorio. Le variabili `NEXT_PUBLIC_*` sono parte del bundle pubblico; nessun segreto deve usare quel prefisso.

Next carica l’ambiente delle pagine, mentre i comandi preflight/Prisma leggono il file esplicito. Il loader Prisma non recupera URL mancanti da sviluppo e ammette soltanto validate, migrate status e migrate deploy con il file dedicato.

Le migrazioni applicate non vanno riscritte: aggiungere una nuova migrazione quando cambia il contratto DB. Le mappature storiche ignorate dal client non sono una richiesta di cancellazione delle relative tabelle.

I test con PostgreSQL esercitano le transazioni reali; i servizi Stripe/Resend sono sostituiti da adattatori controllati nei soli runner. Questo consente prove di timeout, concorrenza e doppio evento senza pagamenti o messaggi reali.
