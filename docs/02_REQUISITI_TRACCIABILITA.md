# REQ-01 — Requisiti e matrice di tracciabilità

**Release 2.1.0 · Fonte: [SPEC.md](../SPEC.md) · 26 ottobre 2026**

**V** = verificato localmente; **O** = osservato online; **P** = prova operativa ancora necessaria. Questi stati possono coesistere: un comportamento implementato e testato non certifica il provider reale.

| ID | SPEC | Requisito / criterio di accettazione | Implementazione | Evidenza | Stato |
|---|---|---|---|---|---|
| FR01 | 1, 2, 18 | Logo immediato e accesso principale PRE-SALE | HomeHero, app/page | HTTP logo prima dell’idratazione; browser home | V/O |
| FR02 | 2, 14, 17 | Percorso diretto home → presale | Link e pagine pubbliche | Navigazione browser e HTTP 200 | V/O |
| FR03 | 3, 6, 18 | Prezzo iniziale 25 EUR e totale server-side | Settings, reserveOrder, Storefront | Snapshot importi; status online 2500 centesimi | V/O |
| FR04 | 3, 18 | Taglie XS/S/M/L/XL/XXL e quantità valida | orderInput, sizesSchema | Validazione taglia/quantità, rendering browser | V/O |
| FR05 | 3, 4 | Conteggio della quantità pagata e valida | paidPieces, API status | Esclusione pending/failed/rimborsati; polling 15 secondi | V/O |
| FR06 | 4, 18 | Soglia iniziale 15, configurabile | Settings, saveSettings | Aggiornamento soglia e condizioni coerenti | V |
| FR07 | 4, 12 | Notifica admin al raggiungimento soglia | checkThreshold, outbox | Deduplicazione accodamento | V/P invio remoto |
| FR08 | 4, 17 | Soglia raggiunta non chiude la raccolta | Stati indipendenti | Ordini oltre soglia; vendita aperta | V |
| FR09 | 5, 17 | Apertura/chiusura manuale | setPresaleOpen, backoffice | Chiusura, conservazione ordine, annullamento checkout aperto | V |
| FR10 | 5 | Chiusura blocca nuovi checkout e cambia il messaggio | reserveOrder, Storefront | Rifiuto richieste e messaggio chiuso; riconciliazione Stripe | V/P condizioni di gara remote |
| FR11 | 6, 17 | Checkout online e pagamento confermato dal provider | createCheckout, webhook | Firme SDK, importi/PI/sessione, eventi fuori ordine | V/P Stripe TEST reale |
| FR12 | 6 | Registrazione completa ordine e date | Order, processStripeEvent | Test DB e migrazione | V |
| FR13 | 6, 18 | Conferma email al cliente | EmailOutbox, deliverPendingEmails | Lease e dedupe; richiesta invio accodata una volta | V/P Resend reale |
| FR14 | 7, 16 | Condizioni visibili e accettazione obbligatoria | Storefront, orderInput | Checkbox obbligatorio; termini versionati | V/O testo visibile |
| FR15 | 7 | Le condizioni accettate restano immutabili | TermsVersion, snapshot Order | Modifiche successive non alterano ordini precedenti | V |
| FR16 | 8, 18 | Due mesi individuali dal pagamento | addCalendarMonths, expiresAt | Fine mese, anno bisestile, date preservate | V |
| FR17 | 8, 12 | Rimborso automatico alla scadenza senza produzione | runExpiry, requestRefund | Workflow scadenza → rimborso → stato e due notifiche | V/P cron e Stripe reali |
| FR18 | 8 | Nessun rimborso automatico anticipato | requestRefund | Scadenza futura rifiutata | V |
| FR19 | 9, 17 | Produzione avviata solo da admin e dopo soglia | changeProduction | Soglia richiesta e transizioni monotone | V |
| FR20 | 9 | Avvio produzione ferma i nuovi rimborsi per mancato avvio | runExpiry, requestRefund | Gara avvio/rimborso e timestamp irreversibile | V |
| FR21 | 10, 18 | Login backoffice | Sessioni e bcrypt | Accesso anonimo negato, logout/revoca, rotazione password | V/O protezione anonima |
| FR22 | 10 | Dashboard con pezzi, soglia, percentuale, ordini e incassi | API dashboard, AdminDashboard | Verifica totali e per taglia | V |
| FR23 | 10 | Evidenza ordini prossimi/scaduti e rimborsi | expiryPreview e dashboard | Date, preavvisi e stati rimborso | V |
| FR24 | 11 | Elenco ordini, filtri, paginazione | orderQuery e API orders | Ricerca, filtri, limite 25 record | V |
| FR25 | 11 | Export CSV/Excel e riepilogo produttore | makeCsv, makeXlsx, API export | Workbook distinto, taglie/quantità e neutralizzazione formule | V |
| FR26 | 12 | Avviso sette giorni prima della scadenza | warningDays, runExpiry | Accodamento atomico e deduplicato | V/P recapito remoto |
| FR27 | 13 | Consegna serata/PR/consegnata | DeliveryStatus e API delivery | Aggiornamento persistito e audit; gare con rimborso | V |
| FR28 | 14 | Responsive e accessibilità essenziale | CSS, label, focus, reduced-motion | Desktop osservato; revisione CSS | V/O/P mobile completo |
| NFR01 | 15 | HTTPS e protezione dati/carte | Stripe ospitato, header, output minimo | HTTPS reale, CSP/no-store; nessun campo carta nel DB | V/O |
| NFR02 | 15 | Anti-bot, rate limit, gestione errori | Turnstile, Upstash, DomainError | Hostname, body limitati, timeout fail-closed | V/P distribuzione reale |
| NFR03 | 15 | Backup e ripristino | Procedura operativa provider | Runbook disponibile; prova su destinazione separata necessaria | P |
| NFR04 | 16 | Privacy, cookie, termini e rimborsi | Pagine legali e seller config | Pagine presenti; dati autentici/revisione testi mancanti | V/O/P approvazione |
| NFR05 | 17, 18 | Funzionamento continuo e riconciliazione | Cron, diagnostica, outbox e ledger | Test concorrenza/idempotenza; monitoraggio da configurare | V/P esercizio |

## Esito del confronto

Le funzioni applicative sono coperte dalla suite descritta nel [rapporto di collaudo](08_COLLAUDO.md). La disponibilità online in TEST è osservata. Restano aperte le prove sui provider e i requisiti organizzativi: pagamento completo, email, scheduler, backup/ripristino, dispositivo mobile e revisione dei dati del venditore.

Il requisito di blocco pagamenti va verificato anche su Checkout già aperti e durante errori di rete: la chiusura ne richiede l’annullamento a Stripe, con riconciliazione e possibili esiti in corso. Un messaggio browser non può garantire da solo lo stato del provider.
