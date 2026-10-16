# AUDIT — RUSH PRE-SALE

Data: 16 ottobre 2026. SPEC.md letto integralmente (sezioni 1–18). Audit iniziale conservato per confronto, seguito dallo stato finale e dalle evidenze delle verifiche locali del 16 ottobre 2026. Le sezioni ripetute 17/18 sono ricondotte ai requisiti atomici seguenti; le estensioni richieste sono separate da SPEC.

## Ricognizione

Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3, Prisma/PostgreSQL 6.12.0, Stripe SDK 18.5.0, Resend 6.32.1, bcrypt/jose, Upstash, Turnstile. Node locale 24.21.0. Versioni effettive da npm ls, non dalle sole dichiarazioni. Frontend app/components, backend app/api, DB prisma; configurazione Vercel presente.

Branch iniziale preview; modifiche locali preesistenti in 12 file, .env.preview.example, script create-admin e prisma/dev.db non versionati. Nessuna sovrascrittura/rimozione dei dati. Branch proposto staging con checkpoint dei soli sorgenti verificati; database e .env esclusi.

Problemi principali: proxy blocca pubblico/webhook; rimborso confermato prematuramente; webhook senza validazione importo/valuta, asincroni e ordine eventi; mancano condizioni/versioni e impostazioni centralizzate; nessun gate staging distinto; suite iniziale limitata a due test sulle date.

SPEC non richiede try-on né animazioni specifiche: la funzione AI già esistente viene conservata ma disattivata, senza aggiungere provider simulati. La configurabilità richiesta estende i default di SPEC (25 €, 15 pezzi, due mesi); nessun cambiamento retroattivo. Nessuna incompatibilità che richieda una decisione del committente rilevata.

Stati indicano evidenza locale, non certificazione dei servizi esterni. I test citati sono identificativi pianificati, NON risultati già ottenuti.

## Requisiti SPEC

### SPEC-001 — Sito semplice, veloce, mobile-first esclusivamente PRE-SALE

- Sezione: SPEC.md §1,18.
- Implementazione: components/Storefront.tsx; app/globals.css.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Responsive presente; browser non verificato.
- Correzione: QA mobile e console.
- Test associato: E2E-mobile.
- Stato finale: **PARZIALE**.
- File finali: components/Storefront.tsx; app/globals.css; proxy.ts.
- Evidenza finale / test eseguito: HTTP produzione locale PASS; responsive e performance browser NON ESEGUITI.


### SPEC-002 — Prezzo iniziale 25 euro per maglietta deciso dal server

- Sezione: SPEC.md §1,3,6,18.
- Implementazione: app/api/orders/route.ts.
- Route/componente: POST /api/orders.
- Stato iniziale: **PARZIALE**.
- Problema: Prezzo hardcoded senza impostazioni/storico unitario.
- Correzione: Listino DB e snapshot ordine.
- Test associato: checkout-price.
- Stato finale: **OK**.
- File finali: lib/checkout.ts; lib/admin-operations.ts; prisma/schema.prisma.
- Evidenza finale / test eseguito: Snapshot prezzo e cambio listino: integrazione 4/5; HTTP lordo/netto PASS.


### SPEC-003 — Soglia minima 15 configurabile, distinta dalla disponibilità massima

- Sezione: SPEC.md §1,4,18.
- Implementazione: lib/settings.ts.
- Route/componente: /api/status.
- Stato iniziale: **PARZIALE**.
- Problema: Soglia non modificabile da admin.
- Correzione: Impostazioni validate e test soglia.
- Test associato: threshold.
- Stato finale: **OK**.
- File finali: lib/operational-schema.ts; lib/admin-operations.ts; components/AdminSettings.tsx.
- Evidenza finale / test eseguito: Soglia DB modificata e salvata da API HTTP; nessun massimo pari alla soglia.


### SPEC-004 — Logo Rush immediato e accesso principale denominato PRE-SALE verso prodotto

- Sezione: SPEC.md §2,18.
- Implementazione: components/HomeHero.tsx; public/assets/logo.png.
- Route/componente: /.
- Stato iniziale: **OK**.
- Problema: Implementazione presente; proxy blocca accesso pubblico.
- Correzione: Riparare proxy senza alterare branding.
- Test associato: E2E-home.
- Stato finale: **PARZIALE**.
- File finali: components/HomeHero.tsx; proxy.ts.
- Evidenza finale / test eseguito: Logo/CTA presenti nel markup HTTP; ottimizzatore immagini PASS. Resa visiva NON ESEGUITA.


### SPEC-005 — Mockup fronte/retro, identità nera/rossa, gallery e animazioni esistenti

- Sezione: SPEC.md §3,14.
- Implementazione: components/ImageGallery.tsx; components/ScrollReveal.tsx; app/globals.css.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Dialog senza gestione tastiera/focus.
- Correzione: Accessibilità e reduced motion.
- Test associato: E2E-gallery.
- Stato finale: **PARZIALE**.
- File finali: components/ImageGallery.tsx; components/ScrollReveal.tsx; app/globals.css.
- Evidenza finale / test eseguito: Asset originali invariati; dialog nativo, reduced motion e target touch; QA visivo/tastiera browser NON ESEGUITO.


### SPEC-006 — Taglie XS S M L XL XXL e quantità selezionabile

- Sezione: SPEC.md §3,18.
- Implementazione: components/Storefront.tsx.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Taglie e limiti hardcoded/env.
- Correzione: Configurazione DB; controlli server.
- Test associato: quantity-size.
- Stato finale: **OK**.
- File finali: lib/operational-schema.ts; lib/checkout.ts; components/Storefront.tsx; components/AdminSettings.tsx.
- Evidenza finale / test eseguito: Test limiti/taglia, stock concorrente e quantità; configurazione sei taglie validata.


### SPEC-007 — Contatore automatico solo quantità pagate valide non rimborsate

- Sezione: SPEC.md §3,4,17,18.
- Implementazione: lib/settings.ts; app/api/status/route.ts.
- Route/componente: GET /api/status.
- Stato iniziale: **PARZIALE**.
- Problema: Polling presente; rimborsi parziali conteggiati come totali.
- Correzione: Riconciliare rimborsi reali.
- Test associato: paid-count.
- Stato finale: **OK**.
- File finali: lib/settings.ts; lib/refunds.ts; app/api/status/route.ts.
- Evidenza finale / test eseguito: Test 1, rimborsi parziali/integrali e HTTP contatore PASS. I parziali mantengono i pezzi fino al rimborso integrale, convenzione documentata.


### SPEC-008 — Barra, quantità mancanti e SOGLIA RAGGIUNTA; ordini 16/15 e successivi accettati

- Sezione: SPEC.md §3,4,17.
- Implementazione: components/Storefront.tsx; app/api/orders/route.ts.
- Route/componente: /presale.
- Stato iniziale: **OK**.
- Problema: Nessun limite pari alla soglia; manca test.
- Correzione: Conservare separazione apertura/soglia.
- Test associato: above-threshold.
- Stato finale: **OK**.
- File finali: lib/checkout.ts; components/Storefront.tsx; app/api/status/route.ts.
- Evidenza finale / test eseguito: Test 2/3: 20 pezzi su soglia 15 con vendita aperta; HTTP soglia raggiunta PASS.


### SPEC-009 — Notifica admin una volta al raggiungimento e possibilità avvio produzione

- Sezione: SPEC.md §4,12,17,18.
- Implementazione: app/api/stripe/webhook/route.ts.
- Route/componente: POST /api/stripe/webhook.
- Stato iniziale: **BUG**.
- Problema: Notifica può retrocedere produzione; destinatario solo env.
- Correzione: Transazione con timestamp monotono e destinatari DB.
- Test associato: threshold-notice.
- Stato finale: **PARZIALE**.
- File finali: lib/notifications.ts; lib/admin-operations.ts; lib/mail.ts.
- Evidenza finale / test eseguito: Notifica outbox univoca e avvio amministrativo PASS; recapito reale admin NON ESEGUITO.


### SPEC-010 — PRE-SALE inizialmente aperta; chiusura/riapertura manuale indipendente produzione

- Sezione: SPEC.md §5,9,17,18.
- Implementazione: app/api/admin/presale/route.ts.
- Route/componente: POST /api/admin/presale.
- Stato iniziale: **PARZIALE**.
- Problema: Checkout aperti vengono scaduti senza riconciliazione affidabile.
- Correzione: Gestione concorrenza e retry annullamenti.
- Test associato: closed-checkout.
- Stato finale: **PARZIALE**.
- File finali: lib/presale.ts; app/api/admin/presale/route.ts.
- Evidenza finale / test eseguito: Chiusura/riapertura indipendente e stato salvato PASS locale; scadenza sessioni su API Stripe reale NON ESEGUITA.


### SPEC-011 — Chiusura impedisce nuovi ordini e nuovi pagamenti; conserva ordini precedenti

- Sezione: SPEC.md §5,17.
- Implementazione: app/api/orders/route.ts; app/api/admin/presale/route.ts.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Race tra chiusura e creazione sessione; scadenza Stripe può fallire.
- Correzione: Lock impostazioni, doppio controllo e riconciliazione.
- Test associato: concurrent-checkout.
- Stato finale: **PARZIALE**.
- File finali: lib/checkout.ts; lib/presale.ts.
- Evidenza finale / test eseguito: Lock prenotazione, ricontrollo post-sessione, retry e lotti con esito incompleto implementati/test locali; chiamate Stripe test esterne NON ESEGUITE.


### SPEC-012 — Messaggio PRE-SALE CHIUSA sostituisce pulsante

- Sezione: SPEC.md §5.
- Implementazione: components/Storefront.tsx.
- Route/componente: /presale.
- Stato iniziale: **OK**.
- Problema: Nessun messaggio personalizzato.
- Correzione: Testo DB.
- Test associato: closed-ui.
- Stato finale: **PARZIALE**.
- File finali: components/Storefront.tsx; app/api/status/route.ts.
- Evidenza finale / test eseguito: Messaggio DB/assenza apertura verificati HTTP e codice; pulsante nel browser NON ESEGUITO.


### SPEC-013 — Ordine con numero univoco, nome cognome email taglia quantità importo date e stati

- Sezione: SPEC.md §6.
- Implementazione: prisma/schema.prisma; app/api/orders/route.ts.
- Route/componente: Order.
- Stato iniziale: **PARZIALE**.
- Problema: Manca snapshot prezzo valuta termini e durata.
- Correzione: Migrazione additiva.
- Test associato: order-snapshot.
- Stato finale: **OK**.
- File finali: prisma/schema.prisma; lib/checkout.ts; lib/stripe-events.ts.
- Evidenza finale / test eseguito: Dati e snapshot nuovi ordini verificati. Test upgrade preserva righe storiche senza inventare termini mancanti.


### SPEC-014 — PENDING prima del checkout; sessione Stripe persistita; conferma soltanto webhook

- Sezione: SPEC.md §6,17.
- Implementazione: app/api/orders/route.ts; app/api/stripe/webhook/route.ts; components/Confirmation.tsx.
- Route/componente: /conferma.
- Stato iniziale: **PARZIALE**.
- Problema: Nessun confronto importo/valuta/sessione nel webhook.
- Correzione: Verificare ordine e pagamento.
- Test associato: webhook-validation.
- Stato finale: **OK**.
- File finali: lib/stripe-events.ts; lib/checkout.ts; components/Confirmation.tsx.
- Evidenza finale / test eseguito: Firma SDK reale su fixture HTTP, controlli importo/valuta/sessione e sola lettura conferma PASS.


### SPEC-015 — Gestione falliti/scaduti/asincroni e ritentativi sicuri

- Sezione: SPEC.md §6,15.
- Implementazione: app/api/stripe/webhook/route.ts; app/api/cron/daily/route.ts.
- Route/componente: Stripe.
- Stato iniziale: **BUG**.
- Problema: Evento pagato tardivo ignorato dopo FAILED; async success assente.
- Correzione: Stato pagato monotono e checkout idempotente.
- Test associato: webhook-ordering.
- Stato finale: **OK**.
- File finali: lib/stripe-events.ts; lib/presale.ts.
- Evidenza finale / test eseguito: Asincroni, duplicati, evento scaduto prima del pagato e fallito dopo il pagato PASS. FAILED comprende scaduti/non completati, distinguibili nel ledger eventi.


### SPEC-016 — Conferma pagamento via email una volta per evento

- Sezione: SPEC.md §6,12,18.
- Implementazione: lib/mail.ts; app/api/stripe/webhook/route.ts.
- Route/componente: EmailOutbox.
- Stato iniziale: **PARZIALE**.
- Problema: Outbox deduplicata ma invii concorrenti duplicabili.
- Correzione: Lease, idempotenza provider, quarantena ambigui.
- Test associato: email-once.
- Stato finale: **PARZIALE**.
- File finali: lib/mail.ts; lib/notifications.ts; app/api/stripe/webhook/route.ts.
- Evidenza finale / test eseguito: Outbox atomica, lease e chiave provider: test 24 PASS con sender test double; recapito Resend NON ESEGUITO.


### SPEC-017 — Condizioni visibili e fedeli al testo indicativo SPEC, consenso esplicito

- Sezione: SPEC.md §7,16,17.
- Implementazione: components/Storefront.tsx; app/rimborsi/page.tsx.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Checkbox HTML richiesta; bottone abilitato senza consenso.
- Correzione: Disabilitare bottone e validare server.
- Test associato: terms-checkbox.
- Stato finale: **PARZIALE**.
- File finali: components/Storefront.tsx; lib/operational-schema.ts; lib/checkout.ts.
- Evidenza finale / test eseguito: Consenso obbligatorio e revisione server verificati; bottone disabilitato nel codice; UI browser NON ESEGUITA.


### SPEC-018 — Termini produzione minima, indisponibilità immediata, consegna Rush/PR, rimborso due mesi

- Sezione: SPEC.md §7.
- Implementazione: components/Storefront.tsx; app/termini/page.tsx.
- Route/componente: /termini; /rimborsi.
- Stato iniziale: **PARZIALE**.
- Problema: Testi hardcoded non versionati.
- Correzione: Versioni immutabili e snapshot accettato.
- Test associato: terms-history.
- Stato finale: **OK**.
- File finali: lib/operational-schema.ts; lib/admin-operations.ts; app/rimborsi/page.tsx.
- Evidenza finale / test eseguito: Core clausole preservato, versioni immutabili e snapshot consegna; test 25 e HTTP termini PASS.


### SPEC-019 — Scadenza individuale due mesi calendario dalla data pagamento

- Sezione: SPEC.md §8,18.
- Implementazione: lib/dates.ts; app/api/stripe/webhook/route.ts.
- Route/componente: Order.expiresAt.
- Stato iniziale: **PARZIALE**.
- Problema: Solo due test; durata fissa.
- Correzione: Snapshot durata e test bisestili/fine mese.
- Test associato: calendar-months.
- Stato finale: **OK**.
- File finali: lib/dates.ts; lib/stripe-events.ts; lib/checkout.ts.
- Evidenza finale / test eseguito: Test 12/fine mese/bisestili PASS; mesi calendario UTC; durata fotografata alla creazione del checkout.


### SPEC-020 — Alla scadenza identificare, avviare rimborso, aggiornare, avvisare cliente e admin

- Sezione: SPEC.md §8,12,18.
- Implementazione: app/api/cron/daily/route.ts.
- Route/componente: GET /api/cron/daily.
- Stato iniziale: **BUG**.
- Problema: REFUNDED prima della conferma Stripe.
- Correzione: REFUND_PENDING e storico riconciliazione.
- Test associato: refund-pending.
- Stato finale: **PARZIALE**.
- File finali: lib/refunds.ts; lib/expiry.ts; lib/stripe-events.ts.
- Evidenza finale / test eseguito: Pending, successo, retry, timeout e outbox PASS locali; API/recapito Stripe/Resend veri NON ESEGUITI.


### SPEC-021 — Nessun rimborso automatico dopo avvio produzione

- Sezione: SPEC.md §8,17.
- Implementazione: app/api/cron/daily/route.ts; app/api/admin/production/route.ts.
- Route/componente: Settings.
- Stato iniziale: **BUG**.
- Problema: Manca timestamp persistente; race con avvio.
- Correzione: Lock condiviso avvio/rimborso e timestamp.
- Test associato: production-refund-race.
- Stato finale: **OK**.
- File finali: lib/refunds.ts; lib/admin-operations.ts; prisma/migrations/20261016000100_staging_hardening/migration.sql.
- Evidenza finale / test eseguito: Test 14, gara avvio/rimborso e trigger anti-retrocessione PASS.


### SPEC-022 — Stati raccolta/soglia/avviata/completata e avvio soltanto amministratore

- Sezione: SPEC.md §9,17,18.
- Implementazione: app/api/admin/production/route.ts.
- Route/componente: POST /api/admin/production.
- Stato iniziale: **PARZIALE**.
- Problema: Sequenza presente ma update concorrente non protetto.
- Correzione: Transazione, conferma, audit e timestamp.
- Test associato: production-transitions.
- Stato finale: **OK**.
- File finali: lib/admin-operations.ts; components/AdminSettings.tsx; app/api/admin/production/route.ts.
- Evidenza finale / test eseguito: Avvio con soglia, timestamp e passaggio irreversibile verificati; conferma server obbligatoria.


### SPEC-023 — Pannello admin protetto da login

- Sezione: SPEC.md §10,15,18.
- Implementazione: lib/admin-auth.ts; proxy.ts; components/AdminLogin.tsx.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Controlli demandati soltanto al proxy; CSRF assente.
- Correzione: Guard server su ogni handler.
- Test associato: admin-unauthorized.
- Stato finale: **PARZIALE**.
- File finali: lib/admin-auth.ts; lib/http.ts; lib/admin-page.ts; app/api/admin/login/route.ts.
- Evidenza finale / test eseguito: Guard indipendente su ogni handler e sessione firmata PASS; login completo Turnstile staging NON ESEGUITO.


### SPEC-024 — Dashboard pezzi/soglia/percentuale/numero ordini/quantità per taglia

- Sezione: SPEC.md §10.
- Implementazione: app/api/admin/dashboard/route.ts; components/AdminDashboard.tsx.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Metriche base presenti; nessun test.
- Correzione: Verifica aggregati.
- Test associato: dashboard.
- Stato finale: **OK**.
- File finali: app/api/admin/dashboard/route.ts; components/AdminDashboard.tsx.
- Evidenza finale / test eseguito: HTTP verifica pezzi, ordini pagati, taglie, lordo/rimborsato/netto; UI visuale da verificare separatamente.


### SPEC-025 — Incassato, stato PRE-SALE/produzione, prossime scadenze e rimborsi

- Sezione: SPEC.md §10.
- Implementazione: app/api/admin/dashboard/route.ts.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Lordo e netto confusi; preavviso fisso.
- Correzione: Aggregati distinti e configurazione.
- Test associato: dashboard-finance.
- Stato finale: **OK**.
- File finali: app/api/admin/dashboard/route.ts; lib/expiry.ts.
- Evidenza finale / test eseguito: Metriche separate e scadenze da snapshot per ordine; HTTP e test preview PASS.


### SPEC-026 — Gestione ordini completa con dati cliente, importo, date, produzione, rimborso e consegna

- Sezione: SPEC.md §11,18.
- Implementazione: components/AdminDashboard.tsx; app/api/admin/orders/route.ts.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Mancano Stripe, prezzo, data ordine; fetch illimitato.
- Correzione: Filtri, ordinamento e paginazione server.
- Test associato: orders-query.
- Stato finale: **OK**.
- File finali: app/api/admin/orders/route.ts; lib/order-query.ts; components/AdminDashboard.tsx.
- Evidenza finale / test eseguito: HTTP ricerca/filtri/paginazione PASS; colonne richieste e dettagli Stripe presenti nel codice.


### SPEC-027 — Export CSV ed Excel con riepilogo taglie per produttore

- Sezione: SPEC.md §11,18.
- Implementazione: app/api/admin/export/route.ts.
- Route/componente: GET /api/admin/export.
- Stato iniziale: **PARZIALE**.
- Problema: Solo CSV; escaping quote errato su formule.
- Correzione: CSV sicuro e vero XLSX.
- Test associato: export.
- Stato finale: **OK**.
- File finali: lib/export.ts; app/api/admin/export/route.ts.
- Evidenza finale / test eseguito: CSV/formule/quote e XLSX con foglio Produttore verificati unit/HTTP. Nessuna verifica in applicazione Excel desktop.


### SPEC-028 — Avviso admin prima scadenza, inizialmente 7 giorni, solo senza produzione

- Sezione: SPEC.md §12.
- Implementazione: app/api/cron/daily/route.ts.
- Route/componente: /api/cron/daily.
- Stato iniziale: **BUG**.
- Problema: Claim non atomico con outbox; giorni hardcoded.
- Correzione: Transazione e giorni DB.
- Test associato: expiry-warning.
- Stato finale: **OK**.
- File finali: lib/expiry.ts; lib/notifications.ts.
- Evidenza finale / test eseguito: Test 13 preavviso e outbox atomica una volta PASS; giorni fotografati sui nuovi ordini.


### SPEC-029 — Consegne Da consegnare, serata Rush, PR, Consegnata modificabili

- Sezione: SPEC.md §13,18.
- Implementazione: app/api/admin/orders/[id]/delivery/route.ts.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Assente audit; ordini non pagati modificabili.
- Correzione: Guard e validazione stato ordine.
- Test associato: delivery.
- Stato finale: **OK**.
- File finali: app/api/admin/orders/[id]/delivery/route.ts; components/AdminDashboard.tsx.
- Evidenza finale / test eseguito: HTTP consegna persistita con audit PASS; enum e guard pagato senza rimborso.


### SPEC-030 — Percorso LOGO → PRE-SALE → TAGLIA → CHECKOUT → PAGAMENTO → CONFERMA

- Sezione: SPEC.md §14.
- Implementazione: app/page.tsx; components/Storefront.tsx; components/Confirmation.tsx.
- Route/componente: pubblico.
- Stato iniziale: **BUG**.
- Problema: Proxy protegge ogni route incluso webhook e immagini.
- Correzione: Separare gate condiviso/admin/webhook.
- Test associato: E2E-flow.
- Stato finale: **PARZIALE**.
- File finali: proxy.ts; app; components.
- Evidenza finale / test eseguito: Flusso HTTP locale PASS incluso webhook firmato/conferma; percorso utente completo browser/Stripe reale NON ESEGUITO.


### SPEC-031 — HTTPS, headers, cookie HttpOnly Secure SameSite e sessioni protette

- Sezione: SPEC.md §15.
- Implementazione: next.config.ts; lib/admin-auth.ts.
- Route/componente: globale.
- Stato iniziale: **PARZIALE**.
- Problema: HTTPS non verificabile su hosting; CSP e CSRF da controllare.
- Correzione: Guard origine, session audience, QA headers.
- Test associato: security.
- Stato finale: **PARZIALE**.
- File finali: lib/http.ts; lib/admin-auth.ts; lib/staging-auth.ts; next.config.ts.
- Evidenza finale / test eseguito: CSRF, cookie e headers verificati HTTP; HTTPS effettivo Vercel NON ESEGUITO. CSP conserva unsafe-inline per bootstrap Next.


### SPEC-032 — Protezione dati personali e backup database

- Sezione: SPEC.md §15.
- Implementazione: .gitignore; lib/prisma.ts.
- Route/componente: DB; Git.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: Backup/PITR esterno non configurato localmente; dev.db non ignorato.
- Correzione: Ignorare DB e documentare backup.
- Test associato: secret-scan.
- Stato finale: **PARZIALE**.
- File finali: .gitignore; lib/prisma.ts; DEPLOY_VERCEL.md.
- Evidenza finale / test eseguito: DB applicativo esistente preservato; snapshot Git locali con SQLite test documentate. Backup provider NON VERIFICABILE.


### SPEC-033 — Pagamento sicuro senza memorizzazione dati carta

- Sezione: SPEC.md §15.
- Implementazione: lib/stripe.ts; app/api/orders/route.ts.
- Route/componente: Stripe Checkout.
- Stato iniziale: **PARZIALE**.
- Problema: Nessuna carta nel modello; Stripe esterno non testato.
- Correzione: Solo chiavi test e webhook firmato.
- Test associato: stripe-test-only.
- Stato finale: **PARZIALE**.
- File finali: lib/config.ts; lib/stripe.ts; prisma/schema.prisma.
- Evidenza finale / test eseguito: Nessun dato carta nel modello; chiavi live sempre respinte nei test. Checkout esterno NON ESEGUITO.


### SPEC-034 — Anti-spam/bot, rate limiting e validazione dati lato server

- Sezione: SPEC.md §15.
- Implementazione: lib/ratelimit.ts; lib/turnstile.ts; app/api/orders/route.ts.
- Route/componente: API.
- Stato iniziale: **PARZIALE**.
- Problema: Upstash richiesto; errori JSON non distinguibili.
- Correzione: Rate limit DB gate e input bounded.
- Test associato: input-validation.
- Stato finale: **PARZIALE**.
- File finali: lib/db-ratelimit.ts; lib/ratelimit.ts; lib/turnstile.ts; lib/http.ts.
- Evidenza finale / test eseguito: Validazione e gate locale PASS; integrazioni Turnstile/Upstash non eseguite sul provider.


### SPEC-035 — Privacy, cookie, termini, condizioni PRE-SALE e rimborsi

- Sezione: SPEC.md §16.
- Implementazione: app/privacy/page.tsx; app/cookie/page.tsx; app/termini/page.tsx; app/rimborsi/page.tsx.
- Route/componente: pagine legali.
- Stato iniziale: **PARZIALE**.
- Problema: Identità venditore e contatti segnaposto.
- Correzione: Conservare segnalazione; completamento committente prima commercio.
- Test associato: legal-review.
- Stato finale: **PARZIALE**.
- File finali: app/privacy/page.tsx; app/cookie/page.tsx; app/termini/page.tsx; app/rimborsi/page.tsx.
- Evidenza finale / test eseguito: Route HTTP 200 e condizioni DB; ragione sociale/contatti legali restano da fornire prima della vendita reale.


### SPEC-036 — Flusso end-to-end e venti priorità assolute

- Sezione: SPEC.md §17,18.
- Implementazione: app; lib; prisma.
- Route/componente: intero progetto.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: Mancano test integrazione/E2E e servizi test.
- Correzione: Suite DB temporaneo; checklist esterna.
- Test associato: E2E-checkout.
- Stato finale: **PARZIALE**.
- File finali: tests; scripts/test-http.ts; scripts/test-migration.ts; STRIPE_SETUP.md.
- Evidenza finale / test eseguito: 25 scenari richiesti coperti da test locali/fixture secondo matrice nel report. Browser e servizi esterni NON ESEGUITI.


## Estensioni richieste e staging

### ADM-01 — Impostazioni centralizzate DB: prezzo EUR, soglia, apertura, chiusura, manutenzione, limiti

- Sezione: Richiesta fase 2 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Evidenza finale / test eseguito: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.


### ADM-02 — Taglie attive, ordine, disponibilità per taglia distinta dalla soglia minima

- Sezione: Richiesta fase 2A (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Evidenza finale / test eseguito: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.


### ADM-03 — Avvio/completamento produzione con conferma, timestamp e storico; irreversibilità

- Sezione: Richiesta fase 2B (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Evidenza finale / test eseguito: Conferma e timestamp irreversibile verificati API/DB.


### ADM-04 — Durata default 2 mesi e preavviso 7 giorni; modifiche solo nuovi ordini

- Sezione: Richiesta fase 2C (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/checkout.ts; lib/stripe-events.ts; components/AdminSettings.tsx.
- Evidenza finale / test eseguito: Durata/preavviso solo nuovi snapshot, date vecchie immutate: test 25 PASS.


### ADM-05 — Anteprima/dry-run rimborsi, manuale confermato, registro errori e retry idempotente

- Sezione: Richiesta fase 2C (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Evidenza finale / test eseguito: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.


### ADM-06 — Destinatari e modelli email configurabili; test invio con mittente verificato

- Sezione: Richiesta fase 2D (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Evidenza finale / test eseguito: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.


### ADM-07 — Testi consegna/condizioni versionati, storico, versione accettata su ordine immutabile

- Sezione: Richiesta fase 2E (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Evidenza finale / test eseguito: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.


### ADM-08 — AI soltanto se prevista SPEC; privacy, abuso e limiti costi se presente

- Sezione: Richiesta fase 2F (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: app/api/tryon/route.ts; app/api/status/route.ts.
- Evidenza finale / test eseguito: SPEC non richiede AI: nessuna attivazione nella demo, nessun MOCK presentato come generazione. API test 23 restituisce 503 prima di leggere immagini.


### ADM-09 — Diagnostica Stripe mascherata, ultimo webhook, DB, errori, email prova

- Sezione: Richiesta fase 2G (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Evidenza finale / test eseguito: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.


### ADM-10 — Controllo scadenze manuale protetto e dry-run; esecuzione previa conferma esplicita

- Sezione: Richiesta fase 2G (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: app/api/admin/expiry/route.ts; lib/expiry.ts.
- Evidenza finale / test eseguito: GET dry-run e POST con confirm:true, auth e CSRF; HTTP confirm:false respinto.


### ADM-11 — Ricerca filtri ordinamento paginazione e CSV/XLSX senza formula injection

- Sezione: Richiesta fase 2H (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Evidenza finale / test eseguito: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.


### ADM-12 — Audit log con identità admin, data, operazione, prima/dopo senza segreti

- Sezione: Richiesta fase 2 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Evidenza finale / test eseguito: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.


### DB-01 — Vincoli, relazioni, univocità Stripe/numero ordine, transazioni e concorrenza

- Sezione: Richiesta fase 3 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Evidenza finale / test eseguito: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.


### DB-02 — Migrazioni minime versionate non distruttive; niente db push né seed in build

- Sezione: Richiesta fase 3 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: prisma/migrations/20261016000100_staging_hardening/migration.sql; scripts/test-migration.ts.
- Evidenza finale / test eseguito: Migrazione additiva testata fresh e upgrade popolato. Nessuna migrazione esterna o db push.


### DB-03 — Storico notifiche e rimborsi; idempotency keys persistenti; prezzo pagato immutabile

- Sezione: Richiesta fase 3 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: prisma/schema.prisma; lib/mail.ts; lib/refunds.ts.
- Evidenza finale / test eseguito: Ledger, ricevute, outbox/lease/provider ID, intenti e audit; prezzo/snapshot immutati nei test.


### SEC-01 — Auth server ogni API admin, bcrypt, CSRF, cookie sicuri, rate limit

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: lib/http.ts; lib/admin-auth.ts; lib/db-ratelimit.ts.
- Evidenza finale / test eseguito: Guard di ogni handler, firma sessioni, CSRF/cookie verificati; autenticazione completa con Turnstile esterno da validare.


### SEC-02 — Firma raw body Stripe, CRON_SECRET e nessun segreto frontend/Git

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: app/api/stripe/webhook/route.ts; lib/cron-auth.ts; .gitignore.
- Evidenza finale / test eseguito: Raw body bounded/firma SDK, chiavi test, cron token e assenza di .env reali nei file tracked del branch verificati.


### SEC-03 — Scansione segreti storici; revoca/rigenerazione se esposti

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: DEPLOY_VERCEL.md; STAGING_REPORT.md.
- Evidenza finale / test eseguito: Scansione pattern su commit e riferimenti Git. Nessuna chiave operativa reale identificata; fixture storiche e DB demo in snapshot locali. Non verificate credenziali degli account esterni.


### SEC-04 — Upload bounded, MIME/magic, protezione API AI

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: app/api/tryon/route.ts; lib/http.ts.
- Evidenza finale / test eseguito: AI staging rifiutata prima di elaborare body; JSON/raw webhook limitati. Upload provider escluso da questo rilascio.


### STG-01 — APP_ENV development/staging/production; Stripe solo TEST anche senza opt-in live

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **BUG**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/config.ts; lib/stripe.ts.
- Evidenza finale / test eseguito: Tre APP_ENV canonici, alias preview compatibile; Vercel Preview fail-closed; test anti-live PASS anche con vecchio opt-in.


### STG-02 — Banner ANTEPRIMA — PAGAMENTI DI TEST; robots noindex e robots.txt

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: app/layout.tsx; app/robots.ts; proxy.ts.
- Evidenza finale / test eseguito: Banner esatto, noindex metadata/headers e robots verificati HTTP.


### STG-03 — Password condivisa distinta admin, cookie firmato HttpOnly sicuro lato server

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Evidenza finale / test eseguito: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.


### STG-04 — DB staging separato senza clienti veri; seed demo identificato; cancellazione solo seed

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Evidenza finale / test eseguito: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.


### STG-05 — Nessun reset automatico o email a destinatari reali non autorizzati

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: lib/mail.ts; lib/checkout.ts; package.json.
- Evidenza finale / test eseguito: Allowlist ordine/email staging; nessun reset/seed/migrate in build; script fixture isolati; test PASS.


### STG-06 — Deployment Protection con bypass webhook firmato senza sbloccare l'intero sito

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: DEPLOY_VERCEL.md; proxy.ts.
- Evidenza finale / test eseguito: Bypass automation per sola URL webhook documentato su fonti Vercel; configurazione su account esterno NON ESEGUITA.


### STG-07 — Cron predisposti Production; demo dry-run/manuale; nessun effetto reale automatico

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Evidenza finale / test eseguito: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.


### QA-01 — npm ci, validate/generate, migrazioni temporanee, typecheck, lint, unit/integrazione/E2E, build

- Sezione: Richiesta fase 6 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: package.json; eslint.config.mjs; tests; scripts/test-*.
- Evidenza finale / test eseguito: npm ci, Prisma, lint, typecheck, unit, integrazione, upgrade e build PASS; E2E browser/Stripe esterno NON ESEGUITO.


### QA-02 — 25 scenari richiesti inclusi concorrenza, webhook, rimborsi, export, termini ed email

- Sezione: Richiesta fase 6 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: tests/integration.test.ts; tests/security.test.ts; scripts/test-http.ts.
- Evidenza finale / test eseguito: Matrice 25 scenari nel report: copertura locale con fixture dichiarate; provider/immagini AI attive non verificati perché esclusi.


### QA-03 — Responsive, console e API realmente controllati; servizi mancanti NON ESEGUITO

- Sezione: Richiesta fase 6 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: scripts/test-http.ts; STAGING_REPORT.md.
- Evidenza finale / test eseguito: 23 verifiche HTTP, pagine/API e ottimizzatore immagini PASS. Browser inventory vuota; creazione IAB fallita: responsive/console NON ESEGUITI.


### DEP-01 — Vercel Next/Prisma runtime/timeouts, DB persistente, upload serverless, log e build sicura

- Sezione: Richiesta fase 7 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **PARZIALE**.
- File finali: package.json; next.config.ts; vercel.json; DEPLOY_VERCEL.md.
- Evidenza finale / test eseguito: Build Next e runtime/timeouts verificati localmente. Hosting, TLS, database/provider esterni NON VERIFICABILI in questa sessione.


### DEP-02 — .env.staging.example, DEPLOY_VERCEL.md, STRIPE_SETUP.md con route vere

- Sezione: Richiesta fase 7 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: .env.staging.example; DEPLOY_VERCEL.md; STRIPE_SETUP.md.
- Evidenza finale / test eseguito: Modelli senza segreti, procedura completa e route presenti nel build output.


### REP-01 — STAGING_REPORT.md con risultati effettivi, limiti, migrazioni e verdetto motivato

- Sezione: Richiesta fase 8 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.
- Stato finale: **OK**.
- File finali: STAGING_REPORT.md; AUDIT.md.
- Evidenza finale / test eseguito: Risultati effettivi e limitazioni riportati, verdetto NOT READY FOR STAGING per QA essenziale esterna/visiva ancora mancante.


## Copertura delle priorità SPEC §18

- Priorità 1: SPEC-004.
- Priorità 2: SPEC-004.
- Priorità 3: SPEC-005.
- Priorità 4: SPEC-006.
- Priorità 5: SPEC-002.
- Priorità 6: SPEC-014.
- Priorità 7: SPEC-013.
- Priorità 8: SPEC-007.
- Priorità 9: SPEC-003.
- Priorità 10: SPEC-009.
- Priorità 11: SPEC-008.
- Priorità 12: SPEC-010.
- Priorità 13: SPEC-011.
- Priorità 14: SPEC-019.
- Priorità 15: SPEC-020.
- Priorità 16: SPEC-023.
- Priorità 17: SPEC-026.
- Priorità 18: SPEC-027.
- Priorità 19: SPEC-016.
- Priorità 20: SPEC-022 / SPEC-029.

## Dettaglio dei singoli controlli operativi aggiuntivi

Questi sottorequisiti esplicitano ogni campo/strumento delle macroaree; stato e test della macroarea valgono solo nell'ambito locale descritto sopra. L'interfaccia è stata letta nel codice e compilata, ma non verificata visivamente.

### ADM-01.01 — Soglia iniziale 15 modificabile

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Soglia iniziale 15 modificabile.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.02 — Prezzo iniziale 2500 centesimi EUR modificabile

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Prezzo iniziale 2500 centesimi EUR modificabile.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.03 — Valuta EUR validata server

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Valuta EUR validata server.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.04 — Apertura manuale indipendente produzione

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Apertura manuale indipendente produzione.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.05 — Chiusura manuale indipendente soglia

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Chiusura manuale indipendente soglia.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.06 — Messaggio di chiusura configurabile

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Messaggio di chiusura configurabile.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.07 — Manutenzione blocca nuovi checkout

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Manutenzione blocca nuovi checkout.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.08 — Massimo per ordine 1–100

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Massimo per ordine 1–100.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-01.09 — Massimo per cliente facoltativo per email normalizzata

- Sezione: richiesta operativa, macrorequisito ADM-01; rinvii SPEC riportati sopra.
- Descrizione: Massimo per cliente facoltativo per email normalizzata.
- File: components/AdminSettings.tsx; app/api/admin/settings/route.ts; lib/admin-operations.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Impostazioni operative DB, schema stretto, revisione e audit; test save/price/threshold PASS.

### ADM-02.01 — Sei taglie XS/S/M/L/XL/XXL

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Sei taglie XS/S/M/L/XL/XXL.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-02.02 — Abilitazione della singola taglia

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Abilitazione della singola taglia.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-02.03 — Disponibilità massima per taglia facoltativa

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Disponibilità massima per taglia facoltativa.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-02.04 — Ordine di visualizzazione secondo array salvato

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Ordine di visualizzazione secondo array salvato.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-02.05 — Soglia minima non è stock massimo

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Soglia minima non è stock massimo.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-02.06 — Prenotazioni concorrenti conteggiate senza overselling locale

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Prenotazioni concorrenti conteggiate senza overselling locale.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-02.07 — Ordini seed esclusi dallo stock operativo

- Sezione: richiesta operativa, macrorequisito ADM-02; rinvii SPEC riportati sopra.
- Descrizione: Ordini seed esclusi dallo stock operativo.
- File: lib/operational-schema.ts; lib/checkout.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Sei taglie uniche, ordine array, attivazione e stock; prenotazioni concorrenti PASS; seed escluso dallo stock reale.

### ADM-03.01 — Stato corrente produzione

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Stato corrente produzione.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-03.02 — Avvio manuale con soglia raggiunta

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Avvio manuale con soglia raggiunta.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-03.03 — Completamento dopo avvio

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Completamento dopo avvio.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-03.04 — Conferma esplicita richiesta server

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Conferma esplicita richiesta server.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-03.05 — Timestamp avvio persistente

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Timestamp avvio persistente.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-03.06 — Storico operazioni

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Storico operazioni.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-03.07 — Retrocessioni impedite dal DB

- Sezione: richiesta operativa, macrorequisito ADM-03; rinvii SPEC riportati sopra.
- Descrizione: Retrocessioni impedite dal DB.
- File: lib/admin-operations.ts; app/api/admin/production/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Conferma e timestamp irreversibile verificati API/DB.

### ADM-04.01 — Default scadenza due mesi calendario

- Sezione: richiesta operativa, macrorequisito ADM-04; rinvii SPEC riportati sopra.
- Descrizione: Default scadenza due mesi calendario.
- File: lib/checkout.ts; lib/stripe-events.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Durata/preavviso solo nuovi snapshot, date vecchie immutate: test 25 PASS.

### ADM-04.02 — Default preavviso sette giorni

- Sezione: richiesta operativa, macrorequisito ADM-04; rinvii SPEC riportati sopra.
- Descrizione: Default preavviso sette giorni.
- File: lib/checkout.ts; lib/stripe-events.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Durata/preavviso solo nuovi snapshot, date vecchie immutate: test 25 PASS.

### ADM-04.03 — Modifica durata soltanto nuovi ordini

- Sezione: richiesta operativa, macrorequisito ADM-04; rinvii SPEC riportati sopra.
- Descrizione: Modifica durata soltanto nuovi ordini.
- File: lib/checkout.ts; lib/stripe-events.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Durata/preavviso solo nuovi snapshot, date vecchie immutate: test 25 PASS.

### ADM-04.04 — Scadenze già confermate inalterate

- Sezione: richiesta operativa, macrorequisito ADM-04; rinvii SPEC riportati sopra.
- Descrizione: Scadenze già confermate inalterate.
- File: lib/checkout.ts; lib/stripe-events.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Durata/preavviso solo nuovi snapshot, date vecchie immutate: test 25 PASS.

### ADM-04.05 — Fine mese e anni bisestili

- Sezione: richiesta operativa, macrorequisito ADM-04; rinvii SPEC riportati sopra.
- Descrizione: Fine mese e anni bisestili.
- File: lib/checkout.ts; lib/stripe-events.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Durata/preavviso solo nuovi snapshot, date vecchie immutate: test 25 PASS.

### ADM-05.01 — Anteprima ordini scaduti e in preavviso

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Anteprima ordini scaduti e in preavviso.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.02 — Dry-run senza richieste finanziarie

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Dry-run senza richieste finanziarie.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.03 — Rimborso singolo con conferma

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Rimborso singolo con conferma.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.04 — Registro intenti/rimborsi

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Registro intenti/rimborsi.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.05 — Errori e tentativi esposti

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Errori e tentativi esposti.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.06 — Retry ambiguo con stessa chiave

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Retry ambiguo con stessa chiave.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.07 — Retry manuale dopo fallimento definitivo con nuova chiave auditata

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Retry manuale dopo fallimento definitivo con nuova chiave auditata.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.08 — Nessun REFUNDED prima di esito Stripe

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Nessun REFUNDED prima di esito Stripe.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-05.09 — Blocco creazione cieca oltre finestra idempotenza

- Sezione: richiesta operativa, macrorequisito ADM-05; rinvii SPEC riportati sopra.
- Descrizione: Blocco creazione cieca oltre finestra idempotenza.
- File: lib/refunds.ts; lib/expiry.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Dry-run, manuale, retry fallito con nuova chiave e storico PASS locali; provider reale NON ESEGUITO.

### ADM-06.01 — Destinatari amministrativi DB

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Destinatari amministrativi DB.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.02 — Modello conferma pagamento

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Modello conferma pagamento.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.03 — Modello soglia

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Modello soglia.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.04 — Modello rimborso

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Modello rimborso.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.05 — Modello preavviso

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Modello preavviso.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.06 — Oggetto e testo configurabili

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Oggetto e testo configurabili.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.07 — Invio prova esplicito e con destinatario autorizzato

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Invio prova esplicito e con destinatario autorizzato.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-06.08 — Stato mittente verificato demandato al provider e non simulato

- Sezione: richiesta operativa, macrorequisito ADM-06; rinvii SPEC riportati sopra.
- Descrizione: Stato mittente verificato demandato al provider e non simulato.
- File: lib/notifications.ts; lib/mail.ts; app/api/admin/diagnostics/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Destinatari/modelli e invio di prova implementati; mittente verificato e invio esterno NON ESEGUITI.

### ADM-07.01 — Condizioni PRE-SALE editabili preservando clausole concordate

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Condizioni PRE-SALE editabili preservando clausole concordate.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-07.02 — Testo consegna configurabile

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Testo consegna configurabile.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-07.03 — Versione incrementale dei termini

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Versione incrementale dei termini.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-07.04 — Storico versioni

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Storico versioni.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-07.05 — Versione e testo accettati sul singolo ordine

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Versione e testo accettati sul singolo ordine.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-07.06 — Snapshot consegna

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Snapshot consegna.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-07.07 — Nessuna modifica retroattiva

- Sezione: richiesta operativa, macrorequisito ADM-07; rinvii SPEC riportati sopra.
- Descrizione: Nessuna modifica retroattiva.
- File: prisma/schema.prisma; lib/admin-operations.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Versioni, storico e snapshot testo/consegna; test 25 e upgrade PASS.

### ADM-08.01 — AI non prevista SPEC: controllo di scope

- Sezione: richiesta operativa, macrorequisito ADM-08; rinvii SPEC riportati sopra.
- Descrizione: AI non prevista SPEC: controllo di scope.
- File: app/api/tryon/route.ts; app/api/status/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: SPEC non richiede AI: nessuna attivazione nella demo, nessun MOCK presentato come generazione. API test 23 restituisce 503 prima di leggere immagini.

### ADM-08.02 — Attivazione AI nella demo assente

- Sezione: richiesta operativa, macrorequisito ADM-08; rinvii SPEC riportati sopra.
- Descrizione: Attivazione AI nella demo assente.
- File: app/api/tryon/route.ts; app/api/status/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: SPEC non richiede AI: nessuna attivazione nella demo, nessun MOCK presentato come generazione. API test 23 restituisce 503 prima di leggere immagini.

### ADM-08.03 — Nessun mock presentato come generazione

- Sezione: richiesta operativa, macrorequisito ADM-08; rinvii SPEC riportati sopra.
- Descrizione: Nessun mock presentato come generazione.
- File: app/api/tryon/route.ts; app/api/status/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: SPEC non richiede AI: nessuna attivazione nella demo, nessun MOCK presentato come generazione. API test 23 restituisce 503 prima di leggere immagini.

### ADM-08.04 — Rifiuto upload prima di lettura corpo in staging

- Sezione: richiesta operativa, macrorequisito ADM-08; rinvii SPEC riportati sopra.
- Descrizione: Rifiuto upload prima di lettura corpo in staging.
- File: app/api/tryon/route.ts; app/api/status/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: SPEC non richiede AI: nessuna attivazione nella demo, nessun MOCK presentato come generazione. API test 23 restituisce 503 prima di leggere immagini.

### ADM-08.05 — Nessun costo provider AI attivato

- Sezione: richiesta operativa, macrorequisito ADM-08; rinvii SPEC riportati sopra.
- Descrizione: Nessun costo provider AI attivato.
- File: app/api/tryon/route.ts; app/api/status/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: SPEC non richiede AI: nessuna attivazione nella demo, nessun MOCK presentato come generazione. API test 23 restituisce 503 prima di leggere immagini.

### ADM-09.01 — Stato configurazione Stripe senza chiavi

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Stato configurazione Stripe senza chiavi.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.02 — Ultima ricezione webhook verificata e relativo esito

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Ultima ricezione webhook verificata e relativo esito.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.03 — Ultimo evento processato

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Ultimo evento processato.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.04 — Test connessione DB

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Test connessione DB.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.05 — Errori applicativi con soli codici/ID opachi

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Errori applicativi con soli codici/ID opachi.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.06 — Errori outbox e tentativi

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Errori outbox e tentativi.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.07 — Registro rimborsi e identificativi

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Registro rimborsi e identificativi.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.08 — Test email con risultato effettivo del provider o errore

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Test email con risultato effettivo del provider o errore.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-09.09 — Connessione provider esplicitamente non verificata

- Sezione: richiesta operativa, macrorequisito ADM-09; rinvii SPEC riportati sopra.
- Descrizione: Connessione provider esplicitamente non verificata.
- File: app/api/admin/diagnostics/route.ts; components/AdminSettings.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: HTTP DB, configurazione non segreta, ultima ricezione verificata/duplicato e errori PASS; connessione provider dichiarata non testata.

### ADM-10.01 — Controllo scadenze manuale autenticato

- Sezione: richiesta operativa, macrorequisito ADM-10; rinvii SPEC riportati sopra.
- Descrizione: Controllo scadenze manuale autenticato.
- File: app/api/admin/expiry/route.ts; lib/expiry.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: GET dry-run e POST con confirm:true, auth e CSRF; HTTP confirm:false respinto.

### ADM-10.02 — GET preview/dry-run

- Sezione: richiesta operativa, macrorequisito ADM-10; rinvii SPEC riportati sopra.
- Descrizione: GET preview/dry-run.
- File: app/api/admin/expiry/route.ts; lib/expiry.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: GET dry-run e POST con confirm:true, auth e CSRF; HTTP confirm:false respinto.

### ADM-10.03 — POST effettivo con confirm:true

- Sezione: richiesta operativa, macrorequisito ADM-10; rinvii SPEC riportati sopra.
- Descrizione: POST effettivo con confirm:true.
- File: app/api/admin/expiry/route.ts; lib/expiry.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: GET dry-run e POST con confirm:true, auth e CSRF; HTTP confirm:false respinto.

### ADM-10.04 — CSRF e autorizzazione server

- Sezione: richiesta operativa, macrorequisito ADM-10; rinvii SPEC riportati sopra.
- Descrizione: CSRF e autorizzazione server.
- File: app/api/admin/expiry/route.ts; lib/expiry.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: GET dry-run e POST con confirm:true, auth e CSRF; HTTP confirm:false respinto.

### ADM-10.05 — Contatori separano verifiche/pending/confermati/errori

- Sezione: richiesta operativa, macrorequisito ADM-10; rinvii SPEC riportati sopra.
- Descrizione: Contatori separano verifiche/pending/confermati/errori.
- File: app/api/admin/expiry/route.ts; lib/expiry.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: GET dry-run e POST con confirm:true, auth e CSRF; HTTP confirm:false respinto.

### ADM-11.01 — Numero ordine

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Numero ordine.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.02 — Nome e cognome

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Nome e cognome.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.03 — Email

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Email.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.04 — Taglia

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Taglia.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.05 — Quantità

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Quantità.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.06 — Prezzo unitario storicizzato

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Prezzo unitario storicizzato.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.07 — Importo ordine

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Importo ordine.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.08 — Data creazione

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Data creazione.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.09 — Data pagamento

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Data pagamento.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.10 — Data scadenza

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Data scadenza.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.11 — Stato pagamento

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Stato pagamento.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.12 — Produzione globale applicabile

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Produzione globale applicabile.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.13 — Stato rimborso e importo

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Stato rimborso e importo.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.14 — Stato consegna

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Stato consegna.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.15 — Identificativi sessione/intent Stripe

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Identificativi sessione/intent Stripe.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.16 — Ricerca numero/nome/email

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Ricerca numero/nome/email.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.17 — Filtri pagamento/rimborso/taglia/consegna

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Filtri pagamento/rimborso/taglia/consegna.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.18 — Ordinamento consentito su sei campi

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Ordinamento consentito su sei campi.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.19 — Paginazione server di 25 righe

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Paginazione server di 25 righe.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.20 — Export CSV

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Export CSV.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.21 — Export XLSX reale

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Export XLSX reale.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.22 — Riepilogo produttore per taglia

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Riepilogo produttore per taglia.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.23 — Neutralizzazione formule CSV e celle stringa XLSX

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Neutralizzazione formule CSV e celle stringa XLSX.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-11.24 — Limite export esplicito 10.000 con errore anziché troncamento silenzioso

- Sezione: richiesta operativa, macrorequisito ADM-11; rinvii SPEC riportati sopra.
- Descrizione: Limite export esplicito 10.000 con errore anziché troncamento silenzioso.
- File: lib/order-query.ts; lib/export.ts; components/AdminDashboard.tsx.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Filtri server/ordinamento/pagine 25; export max 10.000 con errore esplicito; CSV/XLSX PASS.

### ADM-12.01 — Identità admin da subject JWT/ADMIN_ID

- Sezione: richiesta operativa, macrorequisito ADM-12; rinvii SPEC riportati sopra.
- Descrizione: Identità admin da subject JWT/ADMIN_ID.
- File: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.

### ADM-12.02 — Data/ora log

- Sezione: richiesta operativa, macrorequisito ADM-12; rinvii SPEC riportati sopra.
- Descrizione: Data/ora log.
- File: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.

### ADM-12.03 — Nome operazione

- Sezione: richiesta operativa, macrorequisito ADM-12; rinvii SPEC riportati sopra.
- Descrizione: Nome operazione.
- File: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.

### ADM-12.04 — Valore precedente

- Sezione: richiesta operativa, macrorequisito ADM-12; rinvii SPEC riportati sopra.
- Descrizione: Valore precedente.
- File: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.

### ADM-12.05 — Valore nuovo

- Sezione: richiesta operativa, macrorequisito ADM-12; rinvii SPEC riportati sopra.
- Descrizione: Valore nuovo.
- File: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.

### ADM-12.06 — Nessuna password/chiave in audit

- Sezione: richiesta operativa, macrorequisito ADM-12; rinvii SPEC riportati sopra.
- Descrizione: Nessuna password/chiave in audit.
- File: prisma/schema.prisma; lib/admin-operations.ts; app/api/admin.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Audit attore/data/operazione/prima/dopo per modifiche; campi impostazioni consentiti escludono segreti.

### DB-01.01 — Numero ordine univoco

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Numero ordine univoco.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.02 — Sessione Stripe univoca

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Sessione Stripe univoca.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.03 — Payment intent univoco

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Payment intent univoco.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.04 — Chiave tentativo checkout univoca

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Chiave tentativo checkout univoca.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.05 — Evento Stripe univoco

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Evento Stripe univoco.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.06 — Chiave outbox univoca

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Chiave outbox univoca.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.07 — Operazione rimborso unica per ordine

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Operazione rimborso unica per ordine.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.08 — FK termini e rimborso

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: FK termini e rimborso.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.09 — Vincoli quantità/importi positivi

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Vincoli quantità/importi positivi.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### DB-01.10 — Lock transazioni su singleton settings

- Sezione: richiesta operativa, macrorequisito DB-01; rinvii SPEC riportati sopra.
- Descrizione: Lock transazioni su singleton settings.
- File: prisma/schema.prisma; lib/db-lock.ts; lib/checkout.ts; lib/refunds.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Vincoli unici, FK, quantità positive e lock globale; concorrenza e diff schema senza differenze PASS.

### STG-01.01 — APP_ENV development

- Sezione: richiesta operativa, macrorequisito STG-01; rinvii SPEC riportati sopra.
- Descrizione: APP_ENV development.
- File: lib/config.ts; lib/stripe.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Tre APP_ENV canonici, alias preview compatibile; Vercel Preview fail-closed; test anti-live PASS anche con vecchio opt-in.

### STG-01.02 — APP_ENV staging

- Sezione: richiesta operativa, macrorequisito STG-01; rinvii SPEC riportati sopra.
- Descrizione: APP_ENV staging.
- File: lib/config.ts; lib/stripe.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Tre APP_ENV canonici, alias preview compatibile; Vercel Preview fail-closed; test anti-live PASS anche con vecchio opt-in.

### STG-01.03 — APP_ENV production

- Sezione: richiesta operativa, macrorequisito STG-01; rinvii SPEC riportati sopra.
- Descrizione: APP_ENV production.
- File: lib/config.ts; lib/stripe.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Tre APP_ENV canonici, alias preview compatibile; Vercel Preview fail-closed; test anti-live PASS anche con vecchio opt-in.

### STG-01.04 — Vercel Preview sempre staging

- Sezione: richiesta operativa, macrorequisito STG-01; rinvii SPEC riportati sopra.
- Descrizione: Vercel Preview sempre staging.
- File: lib/config.ts; lib/stripe.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Tre APP_ENV canonici, alias preview compatibile; Vercel Preview fail-closed; test anti-live PASS anche con vecchio opt-in.

### STG-01.05 — Rifiuto chiavi live in ogni ambiente

- Sezione: richiesta operativa, macrorequisito STG-01; rinvii SPEC riportati sopra.
- Descrizione: Rifiuto chiavi live in ogni ambiente.
- File: lib/config.ts; lib/stripe.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Tre APP_ENV canonici, alias preview compatibile; Vercel Preview fail-closed; test anti-live PASS anche con vecchio opt-in.

### STG-02.01 — Banner ANTEPRIMA — PAGAMENTI DI TEST

- Sezione: richiesta operativa, macrorequisito STG-02; rinvii SPEC riportati sopra.
- Descrizione: Banner ANTEPRIMA — PAGAMENTI DI TEST.
- File: app/layout.tsx; app/robots.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Banner esatto, noindex metadata/headers e robots verificati HTTP.

### STG-02.02 — Meta robots noindex

- Sezione: richiesta operativa, macrorequisito STG-02; rinvii SPEC riportati sopra.
- Descrizione: Meta robots noindex.
- File: app/layout.tsx; app/robots.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Banner esatto, noindex metadata/headers e robots verificati HTTP.

### STG-02.03 — X-Robots-Tag noindex

- Sezione: richiesta operativa, macrorequisito STG-02; rinvii SPEC riportati sopra.
- Descrizione: X-Robots-Tag noindex.
- File: app/layout.tsx; app/robots.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Banner esatto, noindex metadata/headers e robots verificati HTTP.

### STG-02.04 — robots.txt disallow staging

- Sezione: richiesta operativa, macrorequisito STG-02; rinvii SPEC riportati sopra.
- Descrizione: robots.txt disallow staging.
- File: app/layout.tsx; app/robots.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Banner esatto, noindex metadata/headers e robots verificati HTTP.

### STG-03.01 — Password gate verificata bcrypt lato server

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: Password gate verificata bcrypt lato server.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-03.02 — Password gate distinta admin

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: Password gate distinta admin.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-03.03 — Segreti di firma distinti

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: Segreti di firma distinti.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-03.04 — Cookie gate HttpOnly/Secure/SameSite

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: Cookie gate HttpOnly/Secure/SameSite.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-03.05 — JWT con issuer/audience/ruolo e scadenza

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: JWT con issuer/audience/ruolo e scadenza.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-03.06 — Rate limit gate DB

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: Rate limit gate DB.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-03.07 — Nessun accesso admin con solo gate

- Sezione: richiesta operativa, macrorequisito STG-03; rinvii SPEC riportati sopra.
- Descrizione: Nessun accesso admin con solo gate.
- File: lib/staging-auth.ts; app/api/staging/login/route.ts; proxy.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Login password vero locale, cookie firmato Secure/HttpOnly, segreto e password distinti; token alterati/ruolo admin separato PASS.

### STG-04.01 — DB staging indipendente da creare

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: DB staging indipendente da creare.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-04.02 — Guard conferma esplicita DB

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: Guard conferma esplicita DB.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-04.03 — Nomi/email inventati per demo

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: Nomi/email inventati per demo.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-04.04 — Ordini demo con marker seed

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: Ordini demo con marker seed.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-04.05 — Seed non altera pagamenti/contatori

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: Seed non altera pagamenti/contatori.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-04.06 — Cleanup filtra soltanto seed e nessun ID Stripe

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: Cleanup filtra soltanto seed e nessun ID Stripe.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-04.07 — Cleanup prima dry-run, cancellazione mai automatica

- Sezione: richiesta operativa, macrorequisito STG-04; rinvii SPEC riportati sopra.
- Descrizione: Cleanup prima dry-run, cancellazione mai automatica.
- File: scripts/seed-staging.ts; lib/prisma.ts; lib/checkout.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **PARZIALE** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Guard attestazione DB, email test e seed PENDING marcato con cleanup ristretto implementati; seed/cleanup NON ESEGUITI per non eliminare dati. DB Vercel ancora da creare.

### STG-05.01 — Nessun reset DB in build

- Sezione: richiesta operativa, macrorequisito STG-05; rinvii SPEC riportati sopra.
- Descrizione: Nessun reset DB in build.
- File: lib/mail.ts; lib/checkout.ts; package.json.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Allowlist ordine/email staging; nessun reset/seed/migrate in build; script fixture isolati; test PASS.

### STG-05.02 — Nessun seed DB in build

- Sezione: richiesta operativa, macrorequisito STG-05; rinvii SPEC riportati sopra.
- Descrizione: Nessun seed DB in build.
- File: lib/mail.ts; lib/checkout.ts; package.json.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Allowlist ordine/email staging; nessun reset/seed/migrate in build; script fixture isolati; test PASS.

### STG-05.03 — Nessuna migrazione DB in build

- Sezione: richiesta operativa, macrorequisito STG-05; rinvii SPEC riportati sopra.
- Descrizione: Nessuna migrazione DB in build.
- File: lib/mail.ts; lib/checkout.ts; package.json.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Allowlist ordine/email staging; nessun reset/seed/migrate in build; script fixture isolati; test PASS.

### STG-05.04 — Allowlist invii non-production

- Sezione: richiesta operativa, macrorequisito STG-05; rinvii SPEC riportati sopra.
- Descrizione: Allowlist invii non-production.
- File: lib/mail.ts; lib/checkout.ts; package.json.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Allowlist ordine/email staging; nessun reset/seed/migrate in build; script fixture isolati; test PASS.

### STG-05.05 — Allowlist email ordini staging

- Sezione: richiesta operativa, macrorequisito STG-05; rinvii SPEC riportati sopra.
- Descrizione: Allowlist email ordini staging.
- File: lib/mail.ts; lib/checkout.ts; package.json.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Allowlist ordine/email staging; nessun reset/seed/migrate in build; script fixture isolati; test PASS.

### STG-07.01 — Cron daily futuro in vercel.json

- Sezione: richiesta operativa, macrorequisito STG-07; rinvii SPEC riportati sopra.
- Descrizione: Cron daily futuro in vercel.json.
- File: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.

### STG-07.02 — Cron su Vercel Production documentati

- Sezione: richiesta operativa, macrorequisito STG-07; rinvii SPEC riportati sopra.
- Descrizione: Cron su Vercel Production documentati.
- File: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.

### STG-07.03 — Nessun cron automatico Preview presunto

- Sezione: richiesta operativa, macrorequisito STG-07; rinvii SPEC riportati sopra.
- Descrizione: Nessun cron automatico Preview presunto.
- File: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.

### STG-07.04 — CRON_SECRET protetto

- Sezione: richiesta operativa, macrorequisito STG-07; rinvii SPEC riportati sopra.
- Descrizione: CRON_SECRET protetto.
- File: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.

### STG-07.05 — Staging cron dry-run anche con bearer valido

- Sezione: richiesta operativa, macrorequisito STG-07; rinvii SPEC riportati sopra.
- Descrizione: Staging cron dry-run anche con bearer valido.
- File: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.

### STG-07.06 — Esecuzione effettiva solo admin con conferma

- Sezione: richiesta operativa, macrorequisito STG-07; rinvii SPEC riportati sopra.
- Descrizione: Esecuzione effettiva solo admin con conferma.
- File: vercel.json; app/api/cron/daily/route.ts; app/api/admin/expiry/route.ts.
- Route/componente: /admin/impostazioni o /admin e API corrispondenti; per DB/staging lib/proxy e schema come nella macroarea.
- Stato: **OK** nel perimetro locale della macroarea.
- Problema residuo / correzione: nessuna simulazione di verifiche esterne; completare le verifiche ancora indicate nella macroarea e in STAGING_REPORT.md.
- Test associato / evidenza: Cron futuro Production predisposto, staging dry-run protetto verificato HTTP; controllo effettivo richiede conferma.

