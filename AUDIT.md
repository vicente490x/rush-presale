# AUDIT ? RUSH PRE-SALE

Data: 16 ottobre 2026. SPEC.md letto integralmente (sezioni 1?18). Audit iniziale sulle implementazioni, prima delle correzioni. Le sezioni ripetute 17/18 sono ricondotte ai requisiti atomici seguenti; le estensioni richieste sono separate da SPEC.

## Ricognizione

Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3, Prisma/PostgreSQL 6.12.0, Stripe SDK 18.5.0, Resend 6.32.1, bcrypt/jose, Upstash, Turnstile. Node locale 24.21.0. Versioni effettive da npm ls, non dalle sole dichiarazioni. Frontend app/components, backend app/api, DB prisma; configurazione Vercel presente.

Branch iniziale preview; modifiche locali preesistenti in 12 file, .env.preview.example, script create-admin e prisma/dev.db non versionati. Nessuna sovrascrittura/rimozione dei dati. Branch proposto staging con checkpoint dei soli sorgenti verificati; database e .env esclusi.

Problemi principali: proxy blocca pubblico/webhook; rimborso confermato prematuramente; webhook senza validazione importo/valuta, asincroni e ordine eventi; mancano condizioni/versioni e impostazioni centralizzate; nessun gate staging distinto; suite iniziale limitata a due test sulle date.

SPEC non richiede try-on n? animazioni specifiche: la funzione AI gi? esistente viene conservata ma disattivata, senza aggiungere provider simulati. La configurabilit? richiesta estende i default di SPEC (25 ?, 15 pezzi, due mesi); nessun cambiamento retroattivo. Nessuna incompatibilit? che richieda una decisione del committente rilevata.

Stati indicano evidenza locale, non certificazione dei servizi esterni. I test citati sono identificativi pianificati, NON risultati gi? ottenuti.

## Requisiti SPEC

### SPEC-001 ? Sito semplice, veloce, mobile-first esclusivamente PRE-SALE

- Sezione: SPEC.md ?1,18.
- Implementazione: components/Storefront.tsx; app/globals.css.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Responsive presente; browser non verificato.
- Correzione: QA mobile e console.
- Test associato: E2E-mobile.

### SPEC-002 ? Prezzo iniziale 25 euro per maglietta deciso dal server

- Sezione: SPEC.md ?1,3,6,18.
- Implementazione: app/api/orders/route.ts.
- Route/componente: POST /api/orders.
- Stato iniziale: **PARZIALE**.
- Problema: Prezzo hardcoded senza impostazioni/storico unitario.
- Correzione: Listino DB e snapshot ordine.
- Test associato: checkout-price.

### SPEC-003 ? Soglia minima 15 configurabile, distinta dalla disponibilit? massima

- Sezione: SPEC.md ?1,4,18.
- Implementazione: lib/settings.ts.
- Route/componente: /api/status.
- Stato iniziale: **PARZIALE**.
- Problema: Soglia non modificabile da admin.
- Correzione: Impostazioni validate e test soglia.
- Test associato: threshold.

### SPEC-004 ? Logo Rush immediato e accesso principale denominato PRE-SALE verso prodotto

- Sezione: SPEC.md ?2,18.
- Implementazione: components/HomeHero.tsx; public/assets/logo.png.
- Route/componente: /.
- Stato iniziale: **OK**.
- Problema: Implementazione presente; proxy blocca accesso pubblico.
- Correzione: Riparare proxy senza alterare branding.
- Test associato: E2E-home.

### SPEC-005 ? Mockup fronte/retro, identit? nera/rossa, gallery e animazioni esistenti

- Sezione: SPEC.md ?3,14.
- Implementazione: components/ImageGallery.tsx; components/ScrollReveal.tsx; app/globals.css.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Dialog senza gestione tastiera/focus.
- Correzione: Accessibilit? e reduced motion.
- Test associato: E2E-gallery.

### SPEC-006 ? Taglie XS S M L XL XXL e quantit? selezionabile

- Sezione: SPEC.md ?3,18.
- Implementazione: components/Storefront.tsx.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Taglie e limiti hardcoded/env.
- Correzione: Configurazione DB; controlli server.
- Test associato: quantity-size.

### SPEC-007 ? Contatore automatico solo quantit? pagate valide non rimborsate

- Sezione: SPEC.md ?3,4,17,18.
- Implementazione: lib/settings.ts; app/api/status/route.ts.
- Route/componente: GET /api/status.
- Stato iniziale: **PARZIALE**.
- Problema: Polling presente; rimborsi parziali conteggiati come totali.
- Correzione: Riconciliare rimborsi reali.
- Test associato: paid-count.

### SPEC-008 ? Barra, quantit? mancanti e SOGLIA RAGGIUNTA; ordini 16/15 e successivi accettati

- Sezione: SPEC.md ?3,4,17.
- Implementazione: components/Storefront.tsx; app/api/orders/route.ts.
- Route/componente: /presale.
- Stato iniziale: **OK**.
- Problema: Nessun limite pari alla soglia; manca test.
- Correzione: Conservare separazione apertura/soglia.
- Test associato: above-threshold.

### SPEC-009 ? Notifica admin una volta al raggiungimento e possibilit? avvio produzione

- Sezione: SPEC.md ?4,12,17,18.
- Implementazione: app/api/stripe/webhook/route.ts.
- Route/componente: POST /api/stripe/webhook.
- Stato iniziale: **BUG**.
- Problema: Notifica pu? retrocedere produzione; destinatario solo env.
- Correzione: Transazione con timestamp monotono e destinatari DB.
- Test associato: threshold-notice.

### SPEC-010 ? PRE-SALE inizialmente aperta; chiusura/riapertura manuale indipendente produzione

- Sezione: SPEC.md ?5,9,17,18.
- Implementazione: app/api/admin/presale/route.ts.
- Route/componente: POST /api/admin/presale.
- Stato iniziale: **PARZIALE**.
- Problema: Checkout aperti vengono scaduti senza riconciliazione affidabile.
- Correzione: Gestione concorrenza e retry annullamenti.
- Test associato: closed-checkout.

### SPEC-011 ? Chiusura impedisce nuovi ordini e nuovi pagamenti; conserva ordini precedenti

- Sezione: SPEC.md ?5,17.
- Implementazione: app/api/orders/route.ts; app/api/admin/presale/route.ts.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Race tra chiusura e creazione sessione; scadenza Stripe pu? fallire.
- Correzione: Lock impostazioni, doppio controllo e riconciliazione.
- Test associato: concurrent-checkout.

### SPEC-012 ? Messaggio PRE-SALE CHIUSA sostituisce pulsante

- Sezione: SPEC.md ?5.
- Implementazione: components/Storefront.tsx.
- Route/componente: /presale.
- Stato iniziale: **OK**.
- Problema: Nessun messaggio personalizzato.
- Correzione: Testo DB.
- Test associato: closed-ui.

### SPEC-013 ? Ordine con numero univoco, nome cognome email taglia quantit? importo date e stati

- Sezione: SPEC.md ?6.
- Implementazione: prisma/schema.prisma; app/api/orders/route.ts.
- Route/componente: Order.
- Stato iniziale: **PARZIALE**.
- Problema: Manca snapshot prezzo valuta termini e durata.
- Correzione: Migrazione additiva.
- Test associato: order-snapshot.

### SPEC-014 ? PENDING prima del checkout; sessione Stripe persistita; conferma soltanto webhook

- Sezione: SPEC.md ?6,17.
- Implementazione: app/api/orders/route.ts; app/api/stripe/webhook/route.ts; components/Confirmation.tsx.
- Route/componente: /conferma.
- Stato iniziale: **PARZIALE**.
- Problema: Nessun confronto importo/valuta/sessione nel webhook.
- Correzione: Verificare ordine e pagamento.
- Test associato: webhook-validation.

### SPEC-015 ? Gestione falliti/scaduti/asincroni e ritentativi sicuri

- Sezione: SPEC.md ?6,15.
- Implementazione: app/api/stripe/webhook/route.ts; app/api/cron/daily/route.ts.
- Route/componente: Stripe.
- Stato iniziale: **BUG**.
- Problema: Evento pagato tardivo ignorato dopo FAILED; async success assente.
- Correzione: Stato pagato monotono e checkout idempotente.
- Test associato: webhook-ordering.

### SPEC-016 ? Conferma pagamento via email una volta per evento

- Sezione: SPEC.md ?6,12,18.
- Implementazione: lib/mail.ts; app/api/stripe/webhook/route.ts.
- Route/componente: EmailOutbox.
- Stato iniziale: **PARZIALE**.
- Problema: Outbox deduplicata ma invii concorrenti duplicabili.
- Correzione: Lease, idempotenza provider, quarantena ambigui.
- Test associato: email-once.

### SPEC-017 ? Condizioni visibili e fedeli al testo indicativo SPEC, consenso esplicito

- Sezione: SPEC.md ?7,16,17.
- Implementazione: components/Storefront.tsx; app/rimborsi/page.tsx.
- Route/componente: /presale.
- Stato iniziale: **PARZIALE**.
- Problema: Checkbox HTML richiesta; bottone abilitato senza consenso.
- Correzione: Disabilitare bottone e validare server.
- Test associato: terms-checkbox.

### SPEC-018 ? Termini produzione minima, indisponibilit? immediata, consegna Rush/PR, rimborso due mesi

- Sezione: SPEC.md ?7.
- Implementazione: components/Storefront.tsx; app/termini/page.tsx.
- Route/componente: /termini; /rimborsi.
- Stato iniziale: **PARZIALE**.
- Problema: Testi hardcoded non versionati.
- Correzione: Versioni immutabili e snapshot accettato.
- Test associato: terms-history.

### SPEC-019 ? Scadenza individuale due mesi calendario dalla data pagamento

- Sezione: SPEC.md ?8,18.
- Implementazione: lib/dates.ts; app/api/stripe/webhook/route.ts.
- Route/componente: Order.expiresAt.
- Stato iniziale: **PARZIALE**.
- Problema: Solo due test; durata fissa.
- Correzione: Snapshot durata e test bisestili/fine mese.
- Test associato: calendar-months.

### SPEC-020 ? Alla scadenza identificare, avviare rimborso, aggiornare, avvisare cliente e admin

- Sezione: SPEC.md ?8,12,18.
- Implementazione: app/api/cron/daily/route.ts.
- Route/componente: GET /api/cron/daily.
- Stato iniziale: **BUG**.
- Problema: REFUNDED prima della conferma Stripe.
- Correzione: REFUND_PENDING e storico riconciliazione.
- Test associato: refund-pending.

### SPEC-021 ? Nessun rimborso automatico dopo avvio produzione

- Sezione: SPEC.md ?8,17.
- Implementazione: app/api/cron/daily/route.ts; app/api/admin/production/route.ts.
- Route/componente: Settings.
- Stato iniziale: **BUG**.
- Problema: Manca timestamp persistente; race con avvio.
- Correzione: Lock condiviso avvio/rimborso e timestamp.
- Test associato: production-refund-race.

### SPEC-022 ? Stati raccolta/soglia/avviata/completata e avvio soltanto amministratore

- Sezione: SPEC.md ?9,17,18.
- Implementazione: app/api/admin/production/route.ts.
- Route/componente: POST /api/admin/production.
- Stato iniziale: **PARZIALE**.
- Problema: Sequenza presente ma update concorrente non protetto.
- Correzione: Transazione, conferma, audit e timestamp.
- Test associato: production-transitions.

### SPEC-023 ? Pannello admin protetto da login

- Sezione: SPEC.md ?10,15,18.
- Implementazione: lib/admin-auth.ts; proxy.ts; components/AdminLogin.tsx.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Controlli demandati soltanto al proxy; CSRF assente.
- Correzione: Guard server su ogni handler.
- Test associato: admin-unauthorized.

### SPEC-024 ? Dashboard pezzi/soglia/percentuale/numero ordini/quantit? per taglia

- Sezione: SPEC.md ?10.
- Implementazione: app/api/admin/dashboard/route.ts; components/AdminDashboard.tsx.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Metriche base presenti; nessun test.
- Correzione: Verifica aggregati.
- Test associato: dashboard.

### SPEC-025 ? Incassato, stato PRE-SALE/produzione, prossime scadenze e rimborsi

- Sezione: SPEC.md ?10.
- Implementazione: app/api/admin/dashboard/route.ts.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Lordo e netto confusi; preavviso fisso.
- Correzione: Aggregati distinti e configurazione.
- Test associato: dashboard-finance.

### SPEC-026 ? Gestione ordini completa con dati cliente, importo, date, produzione, rimborso e consegna

- Sezione: SPEC.md ?11,18.
- Implementazione: components/AdminDashboard.tsx; app/api/admin/orders/route.ts.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Mancano Stripe, prezzo, data ordine; fetch illimitato.
- Correzione: Filtri, ordinamento e paginazione server.
- Test associato: orders-query.

### SPEC-027 ? Export CSV ed Excel con riepilogo taglie per produttore

- Sezione: SPEC.md ?11,18.
- Implementazione: app/api/admin/export/route.ts.
- Route/componente: GET /api/admin/export.
- Stato iniziale: **PARZIALE**.
- Problema: Solo CSV; escaping quote errato su formule.
- Correzione: CSV sicuro e vero XLSX.
- Test associato: export.

### SPEC-028 ? Avviso admin prima scadenza, inizialmente 7 giorni, solo senza produzione

- Sezione: SPEC.md ?12.
- Implementazione: app/api/cron/daily/route.ts.
- Route/componente: /api/cron/daily.
- Stato iniziale: **BUG**.
- Problema: Claim non atomico con outbox; giorni hardcoded.
- Correzione: Transazione e giorni DB.
- Test associato: expiry-warning.

### SPEC-029 ? Consegne Da consegnare, serata Rush, PR, Consegnata modificabili

- Sezione: SPEC.md ?13,18.
- Implementazione: app/api/admin/orders/[id]/delivery/route.ts.
- Route/componente: /admin.
- Stato iniziale: **PARZIALE**.
- Problema: Assente audit; ordini non pagati modificabili.
- Correzione: Guard e validazione stato ordine.
- Test associato: delivery.

### SPEC-030 ? Percorso LOGO ? PRE-SALE ? TAGLIA ? CHECKOUT ? PAGAMENTO ? CONFERMA

- Sezione: SPEC.md ?14.
- Implementazione: app/page.tsx; components/Storefront.tsx; components/Confirmation.tsx.
- Route/componente: pubblico.
- Stato iniziale: **BUG**.
- Problema: Proxy protegge ogni route incluso webhook e immagini.
- Correzione: Separare gate condiviso/admin/webhook.
- Test associato: E2E-flow.

### SPEC-031 ? HTTPS, headers, cookie HttpOnly Secure SameSite e sessioni protette

- Sezione: SPEC.md ?15.
- Implementazione: next.config.ts; lib/admin-auth.ts.
- Route/componente: globale.
- Stato iniziale: **PARZIALE**.
- Problema: HTTPS non verificabile su hosting; CSP e CSRF da controllare.
- Correzione: Guard origine, session audience, QA headers.
- Test associato: security.

### SPEC-032 ? Protezione dati personali e backup database

- Sezione: SPEC.md ?15.
- Implementazione: .gitignore; lib/prisma.ts.
- Route/componente: DB; Git.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: Backup/PITR esterno non configurato localmente; dev.db non ignorato.
- Correzione: Ignorare DB e documentare backup.
- Test associato: secret-scan.

### SPEC-033 ? Pagamento sicuro senza memorizzazione dati carta

- Sezione: SPEC.md ?15.
- Implementazione: lib/stripe.ts; app/api/orders/route.ts.
- Route/componente: Stripe Checkout.
- Stato iniziale: **PARZIALE**.
- Problema: Nessuna carta nel modello; Stripe esterno non testato.
- Correzione: Solo chiavi test e webhook firmato.
- Test associato: stripe-test-only.

### SPEC-034 ? Anti-spam/bot, rate limiting e validazione dati lato server

- Sezione: SPEC.md ?15.
- Implementazione: lib/ratelimit.ts; lib/turnstile.ts; app/api/orders/route.ts.
- Route/componente: API.
- Stato iniziale: **PARZIALE**.
- Problema: Upstash richiesto; errori JSON non distinguibili.
- Correzione: Rate limit DB gate e input bounded.
- Test associato: input-validation.

### SPEC-035 ? Privacy, cookie, termini, condizioni PRE-SALE e rimborsi

- Sezione: SPEC.md ?16.
- Implementazione: app/privacy/page.tsx; app/cookie/page.tsx; app/termini/page.tsx; app/rimborsi/page.tsx.
- Route/componente: pagine legali.
- Stato iniziale: **PARZIALE**.
- Problema: Identit? venditore e contatti segnaposto.
- Correzione: Conservare segnalazione; completamento committente prima commercio.
- Test associato: legal-review.

### SPEC-036 ? Flusso end-to-end e venti priorit? assolute

- Sezione: SPEC.md ?17,18.
- Implementazione: app; lib; prisma.
- Route/componente: intero progetto.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: Mancano test integrazione/E2E e servizi test.
- Correzione: Suite DB temporaneo; checklist esterna.
- Test associato: E2E-checkout.

## Estensioni richieste e staging

### ADM-01 ? Impostazioni centralizzate DB: prezzo EUR, soglia, apertura, chiusura, manutenzione, limiti

- Sezione: Richiesta fase 2 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-02 ? Taglie attive, ordine, disponibilit? per taglia distinta dalla soglia minima

- Sezione: Richiesta fase 2A (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-03 ? Avvio/completamento produzione con conferma, timestamp e storico; irreversibilit?

- Sezione: Richiesta fase 2B (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-04 ? Durata default 2 mesi e preavviso 7 giorni; modifiche solo nuovi ordini

- Sezione: Richiesta fase 2C (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-05 ? Anteprima/dry-run rimborsi, manuale confermato, registro errori e retry idempotente

- Sezione: Richiesta fase 2C (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-06 ? Destinatari e modelli email configurabili; test invio con mittente verificato

- Sezione: Richiesta fase 2D (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-07 ? Testi consegna/condizioni versionati, storico, versione accettata su ordine immutabile

- Sezione: Richiesta fase 2E (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-08 ? AI soltanto se prevista SPEC; privacy, abuso e limiti costi se presente

- Sezione: Richiesta fase 2F (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-09 ? Diagnostica Stripe mascherata, ultimo webhook, DB, errori, email prova

- Sezione: Richiesta fase 2G (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-10 ? Controllo scadenze manuale protetto e dry-run; esecuzione previa conferma esplicita

- Sezione: Richiesta fase 2G (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-11 ? Ricerca filtri ordinamento paginazione e CSV/XLSX senza formula injection

- Sezione: Richiesta fase 2H (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### ADM-12 ? Audit log con identit? admin, data, operazione, prima/dopo senza segreti

- Sezione: Richiesta fase 2 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### DB-01 ? Vincoli, relazioni, univocit? Stripe/numero ordine, transazioni e concorrenza

- Sezione: Richiesta fase 3 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### DB-02 ? Migrazioni minime versionate non distruttive; niente db push n? seed in build

- Sezione: Richiesta fase 3 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### DB-03 ? Storico notifiche e rimborsi; idempotency keys persistenti; prezzo pagato immutabile

- Sezione: Richiesta fase 3 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### SEC-01 ? Auth server ogni API admin, bcrypt, CSRF, cookie sicuri, rate limit

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### SEC-02 ? Firma raw body Stripe, CRON_SECRET e nessun segreto frontend/Git

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### SEC-03 ? Scansione segreti storici; revoca/rigenerazione se esposti

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### SEC-04 ? Upload bounded, MIME/magic, protezione API AI

- Sezione: Richiesta fase 4 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-01 ? APP_ENV development/staging/production; Stripe solo TEST anche senza opt-in live

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **BUG**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-02 ? Banner ANTEPRIMA ? PAGAMENTI DI TEST; robots noindex e robots.txt

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-03 ? Password condivisa distinta admin, cookie firmato HttpOnly sicuro lato server

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-04 ? DB staging separato senza clienti veri; seed demo identificato; cancellazione solo seed

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-05 ? Nessun reset automatico o email a destinatari reali non autorizzati

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-06 ? Deployment Protection con bypass webhook firmato senza sbloccare l'intero sito

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### STG-07 ? Cron predisposti Production; demo dry-run/manuale; nessun effetto reale automatico

- Sezione: Richiesta fase 5 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### QA-01 ? npm ci, validate/generate, migrazioni temporanee, typecheck, lint, unit/integrazione/E2E, build

- Sezione: Richiesta fase 6 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### QA-02 ? 25 scenari richiesti inclusi concorrenza, webhook, rimborsi, export, termini ed email

- Sezione: Richiesta fase 6 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### QA-03 ? Responsive, console e API realmente controllati; servizi mancanti NON ESEGUITO

- Sezione: Richiesta fase 6 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **NON VERIFICABILE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### DEP-01 ? Vercel Next/Prisma runtime/timeouts, DB persistente, upload serverless, log e build sicura

- Sezione: Richiesta fase 7 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **PARZIALE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### DEP-02 ? .env.staging.example, DEPLOY_VERCEL.md, STRIPE_SETUP.md con route vere

- Sezione: Richiesta fase 7 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

### REP-01 ? STAGING_REPORT.md con risultati effettivi, limiti, migrazioni e verdetto motivato

- Sezione: Richiesta fase 8 (estensione, non contenuto inventato di SPEC).
- Implementazione: app/api/admin, lib, prisma/schema.prisma, proxy.ts, documentazione secondo area.
- Route/componente: /admin/impostazioni, /admin o infrastruttura relativa.
- Stato iniziale: **MANCANTE**.
- Problema: copertura iniziale incompleta o non verificata, come descritto nel requisito.
- Correzione necessaria: implementazione e verifica del requisito prima di dichiararlo coperto.
- Test associato: suite locale e checklist STAGING_REPORT.md; esterni da dichiarare NON ESEGUITI se non disponibili.

