# Audit della SPEC

**Ambito:** verifica statica delle sezioni 1–18 di `SPEC.md`, con test API/unitari e verifica browser separata.  
**Esito complessivo:** **PARZIALE**. Il flusso applicativo principale è implementato; backup gestito dal provider, dati legali del venditore e credenziali/provider di anteprima richiedono configurazione esterna prima di mostrare un checkout realmente funzionante.

| ID | Requisito | Implementazione | Stato | Note |
|---|---|---|---|---|
| 1.1 | Sito semplice, veloce e mobile-first, dedicato alla PRE-SALE | `app/page.tsx`, `app/presale/page.tsx`, `app/globals.css` | OK | Home e pagina prodotto, senza catalogo e-commerce. |
| 1.2 | Prenotazione e pagamento di una maglietta a 25€ con selezione taglia | `components/Storefront.tsx`, `app/api/orders/route.ts`, `lib/stripe.ts` | PARZIALE | Flusso Stripe test implementato; non è stato possibile completare un checkout Stripe reale senza chiavi test e chiavi Turnstile configurate. |
| 1.3 | Produzione avviabile al raggiungimento di almeno 15 pezzi | `lib/settings.ts`, `lib/presale-logic.ts`, `app/api/stripe/webhook/route.ts` | OK | Il conteggio usa quantità di ordini pagati e non rimborsati. |
| 1.4 | Soglia e chiusura della PRE-SALE sono decisioni distinte | `app/api/admin/settings/threshold/route.ts`, `app/api/admin/presale/route.ts` | OK | La soglia è configurabile prima del primo pagamento; la chiusura resta un’azione manuale separata. |
| 2.1 | Logo Rush visibile immediatamente in home | `app/page.tsx` | OK | Logo verificato anche nel browser. |
| 2.2 | Unico accesso principale alla vendita denominato “PRE-SALE” | `app/page.tsx` | OK | La home presenta un solo CTA principale. |
| 2.3 | Nessun pulsante “Acquista”, “Compra” o equivalente | `app/`, `components/` | OK | Ricerca testuale delle stringhe indicata senza risultati. |
| 2.4 | Il CTA porta alla pagina prodotto | `app/page.tsx`, `app/presale/page.tsx` | OK | Il link punta a `/presale`. |
| 3.1 | Foto/mockup della maglietta | `components/ImageGallery.tsx` | OK | La pagina prodotto mostra mockup frontale, posteriore e dettaglio. |
| 3.2 | Prezzo di 25€ | `components/Storefront.tsx`, `app/api/orders/route.ts` | OK | Prezzo UI e importo server-side sono rispettivamente 2.500 centesimi per pezzo. |
| 3.3 | Taglie XS, S, M, L, XL e XXL | `components/Storefront.tsx`, `prisma/schema.prisma` | OK | La validazione server accetta solo l’enum delle taglie. |
| 3.4 | Selezione opzionale della quantità | `components/Storefront.tsx`, `lib/order-validation.ts` | OK | Quantità minima 1, massima configurabile (default 5, limite assoluto server-side 100). |
| 3.5 | Pulsante di invio “PRE-SALE” | `components/Storefront.tsx` | OK | Il pulsante viene disabilitato finché Turnstile non è verificato. |
| 3.6 | Spiegazione del funzionamento | `components/Storefront.tsx` | OK | La pagina riassume prenotazione, soglia, produzione e consegna. |
| 3.7 | Contatore pezzi prenotati / soglia | `components/Storefront.tsx`, `app/api/status/route.ts` | OK | Il contatore legge dati aggiornati dal server. |
| 3.8 | Contatore aggiornato dopo pagamento confermato | `app/api/stripe/webhook/route.ts`, `components/Storefront.tsx` | OK | Il pagamento viene registrato nel webhook verificato; la pagina interroga lo stato ogni 15 secondi. |
| 4.1 | Soglia predefinita 15 e configurabile | `lib/config.ts`, `prisma/schema.prisma`, `app/api/admin/settings/threshold/route.ts`, `components/AdminDashboard.tsx` | OK | Configurabile dal pannello prima del primo pagamento; validata tra 1 e 1.000.000. |
| 4.2 | Conteggio automatico degli ordini pagati e validi | `lib/settings.ts`, `lib/presale-logic.ts` | OK | Gli ordini rimborsati sono esclusi. |
| 4.3 | Notifica all’amministratore al raggiungimento soglia | `app/api/stripe/webhook/route.ts`, `lib/mail.ts` | OK | Outbox con chiave univoca; richiede `ADMIN_EMAIL` e provider email funzionante. |
| 4.4 | Dashboard indica soglia raggiunta e consente di avviare la produzione | `components/AdminDashboard.tsx`, `app/api/admin/production/route.ts` | OK | Le transizioni di stato sono validate sul server. |
| 4.5 | La soglia non chiude la PRE-SALE | `app/api/stripe/webhook/route.ts`, `app/api/orders/route.ts` | OK | Test d’integrazione copre 15, 16 e 17 pezzi con PRE-SALE aperta. |
| 4.6 | Ordini accettati oltre la soglia fino alla chiusura manuale | `app/api/orders/route.ts` | OK | Nessun limite di capienza alla soglia; resta il limite di quantità per singolo ordine. |
| 5.1 | Stato PRE-SALE aperta/chiusa modificabile dall’admin | `app/api/admin/presale/route.ts`, `components/AdminDashboard.tsx` | OK | Protetto dalla sessione admin. |
| 5.2 | PRE-SALE aperta consente selezione, ordine, pagamento e conferma | `components/Storefront.tsx`, `app/api/orders/route.ts`, webhook Stripe | PARZIALE | Implementato, ma il pagamento reale di anteprima dipende dalla configurazione Vercel di Stripe test e Turnstile. |
| 5.3 | PRE-SALE chiusa blocca nuovi ordini e checkout | `app/api/orders/route.ts`, `app/api/admin/presale/route.ts` | OK | La route server controlla lo stato e l’admin annulla checkout pendenti; test server-side presente. |
| 5.4 | Pulsante sostituito dal messaggio “PRE-SALE CHIUSA” | `components/Storefront.tsx` | OK | Stato server letto dalla pagina prodotto. |
| 5.5 | Ordini già registrati restano gestibili dopo la chiusura | `app/api/admin/orders/route.ts`, `components/AdminDashboard.tsx` | OK | La chiusura non elimina ordini esistenti. |
| 5.6 | La chiusura non è automatica al raggiungimento soglia | `app/api/admin/presale/route.ts`, webhook Stripe | OK | La soglia aggiorna lo stato produzione, non `presaleOpen`. |
| 6.1 | Numero ordine univoco | `prisma/schema.prisma`, `app/api/orders/route.ts` | OK | Vincolo `@unique` e identificativo generato lato server. |
| 6.2 | Nome e cognome | `prisma/schema.prisma`, `lib/order-validation.ts` | OK | Campi obbligatori, trim e lunghezza massima. |
| 6.3 | Email | `prisma/schema.prisma`, `lib/order-validation.ts` | OK | Validazione email e normalizzazione in minuscolo. |
| 6.4 | Taglia e quantità | `prisma/schema.prisma`, `lib/order-validation.ts` | OK | Enum taglie e controlli numerici server-side. |
| 6.5 | Importo pagato | `prisma/schema.prisma`, `app/api/orders/route.ts` | OK | Importo calcolato server-side a 25€ per pezzo. |
| 6.6 | Data/ora pagamento, stato pagamento e stato ordine | `prisma/schema.prisma`, webhook Stripe | OK | Il webhook completa `paidAt`, `paymentStatus` e `orderStatus`. |
| 6.7 | Scadenza individuale a due mesi dal pagamento | `lib/dates.ts`, `lib/presale-logic.ts`, webhook Stripe | OK | Mesi di calendario UTC, con clamp all’ultimo giorno del mese. |
| 6.8 | Email di conferma dopo pagamento | `app/api/stripe/webhook/route.ts`, `lib/mail.ts` | PARZIALE | Outbox idempotente implementata; consegna effettiva richiede Resend configurato o un provider email equivalente. |
| 7.1 | Avviso PRE-SALE visibile prima del pagamento | `components/Storefront.tsx` | OK | Le condizioni sono mostrate nel form prima del CTA. |
| 7.2 | Condizioni riportano soglia, non disponibilità immediata, produzione, consegna e rimborso | `lib/presale-terms.ts` | OK | Test unitario confronta il testo esatto. |
| 7.3 | Accettazione esplicita obbligatoria anche server-side | `components/Storefront.tsx`, `lib/order-validation.ts`, `app/api/orders/route.ts` | OK | Checkbox HTML required e schema `terms: literal(true)`; test negativo presente. |
| 8.1 | Ogni ordine usa la propria data pagamento e scadenza | `prisma/schema.prisma`, webhook Stripe | OK | Le date sono memorizzate per ordine. |
| 8.2 | Alla scadenza, senza produzione avviata, ordine diventa rimborsabile | `app/api/cron/daily/route.ts`, `lib/presale-logic.ts` | OK | Il cron seleziona ordini pagati scaduti. |
| 8.3 | Rimborso Stripe automatico e stato aggiornato | `app/api/cron/daily/route.ts`, `lib/refunds.ts`, `lib/stripe.ts` | OK | Claim atomico e idempotency key Stripe; errori lasciano stato riprovabile. |
| 8.4 | Email ad acquirente e amministratore sul rimborso automatico | `app/api/cron/daily/route.ts`, `lib/mail.ts` | OK | Entrambe le notifiche sono accodate con chiavi dedupe. |
| 8.5 | Ordini rimborsati se soglia non raggiunta entro le rispettive scadenze | `app/api/cron/daily/route.ts` | OK | Lo stato di produzione, non il solo contatore, governa il rimborso. |
| 8.6 | Ordini non rimborsati automaticamente dopo avvio produzione | `app/api/cron/daily/route.ts`, `lib/settings.ts` | OK | Test d’integrazione verifica che produzione avviata escluda il rimborso. |
| 9.1 | Stati raccolta e soglia raggiunta | `prisma/schema.prisma`, webhook, admin dashboard | OK | La soglia imposta automaticamente `SOGLIA_RAGGIUNTA`. |
| 9.2 | Stato PRODUZIONE AVVIATA impostato dall’amministratore | `app/api/admin/production/route.ts`, dashboard | OK | Transizione validata e soglia verificata. |
| 9.3 | Stato PRODUZIONE COMPLETATA | `prisma/schema.prisma`, `app/api/admin/production/route.ts` | OK | Disponibile come transizione successiva. |
| 9.4 | Stato PRE-SALE CHIUSA separato dallo stato produzione | `prisma/schema.prisma`, `app/api/admin/presale/route.ts` | OK | Apertura/chiusura e stato produzione sono indipendenti. |
| 9.5 | L’avvio produzione disattiva il rimborso automatico dei due mesi | `app/api/cron/daily/route.ts` | OK | Condizione verificata prima di reminder e rimborsi; test presente. |
| 10.1 | Pannello admin protetto da login | `proxy.ts`, `lib/admin-auth.ts`, `app/api/admin/login/route.ts` | OK | Route admin e API protette; probe HTTP non autenticato riceve 401. |
| 10.2 | Pezzi, soglia e percentuale | `app/api/admin/dashboard/route.ts`, `components/AdminDashboard.tsx` | OK | Valori mostrati nella dashboard. |
| 10.3 | Numero ordini, quantità per taglia e totale incassato | dashboard admin | OK | Incasso esclude ordini rimborsati; riepilogo per tutte le taglie. |
| 10.4 | Stato PRE-SALE e produzione | dashboard admin | OK | Stati e azioni di transizione visibili. |
| 10.5 | Ordini prossimi alla scadenza e da rimborsare | dashboard admin, `app/api/admin/dashboard/route.ts` | OK | Conteggio finestra 7 giorni e ordini scaduti/falliti. |
| 10.6 | Modifica soglia configurabile | `components/AdminDashboard.tsx`, `app/api/admin/settings/threshold/route.ts` | OK | Disabilitata dopo il primo pagamento, per conservare coerenza con la notifica e gli stati già avviati. |
| 11.1 | Elenco con numero ordine, nome, cognome, email, taglia e quantità | `app/api/admin/orders/route.ts`, dashboard | OK | Tabella e API admin includono i campi. |
| 11.2 | Importo, data pagamento, scadenza, stato pagamento e rimborso | dashboard admin, `app/api/admin/export/route.ts` | OK | Presenti in tabella e nei formati export. |
| 11.3 | Stato produzione e modalità consegna | dashboard admin, `app/api/admin/orders/[id]/delivery/route.ts`, export | OK | Produzione è uno stato globale della PRE-SALE, visualizzato in tabella e incluso negli export. |
| 11.4 | Esportazione CSV e formato Excel | `app/api/admin/export/route.ts` | OK | CSV e Spreadsheet XML `.xls`; test verifica i due output. |
| 11.5 | Riepilogo per taglia per il produttore | export admin | OK | Totali netti escludono ordini rimborsati. |
| 12.1 | Notifica amministratore una sola volta al raggiungimento soglia | webhook Stripe, `EmailOutbox`, `Settings.thresholdNotifiedAt` | OK | Claim e dedupe transazionali; richiede `ADMIN_EMAIL`. |
| 12.2 | Avviso all’amministratore sette giorni prima della scadenza | `app/api/cron/daily/route.ts`, `lib/presale-logic.ts` | OK | Eseguito dal cron giornaliero; deduplicato per ordine. |
| 13.1 | Consegna iniziale senza spedizione standard | dashboard e documentazione UI | OK | Il sistema non richiede indirizzo di spedizione. |
| 13.2 | Consegna tramite serata Rush | `DeliveryStatus.SERATA_RUSH` | OK | Selezionabile dall’admin. |
| 13.3 | Consegna tramite PR | `DeliveryStatus.PR` | OK | Selezionabile dall’admin. |
| 13.4 | Stati “Da consegnare” e “Consegnata” | schema Prisma e dashboard | OK | Disponibili nella gestione ordine. |
| 14.1 | Design minimal, moderno e coerente con identità Rush | `app/globals.css`, componenti home/prodotto | OK | Verificato il percorso visivo home → prodotto. |
| 14.2 | Responsive e ottimizzato per smartphone | `app/globals.css` | OK | Probe browser a 360 e 390 px: nessun overflow orizzontale misurato. |
| 14.3 | Percorso breve logo → PRE-SALE → taglia → checkout → pagamento → conferma | home, storefront, checkout Stripe, pagina conferma | PARZIALE | Il percorso UI e il mock Stripe sono testati; il pagamento Stripe remoto non è stato eseguito senza credenziali test configurate. |
| 14.4 | Non diventare un e-commerce con categorie e sezioni | routing app | OK | Un solo prodotto e landing dedicata. |
| 14.5 | Animazioni leggere e supporto reduced motion | `app/globals.css`, `components/Storefront.tsx` | OK | La media query reduced-motion riduce animazioni/transizioni; rispettata nella verifica browser. |
| 15.1 | HTTPS e trasporto sicuro | `lib/config.ts`, `next.config.ts` | PARZIALE | HTTPS richiesto per `APP_ENV=preview/production` e HSTS impostato; dominio/certificato sono responsabilità del deploy Vercel. |
| 15.2 | Pagamento sicuro senza memorizzare dati carta | `app/api/orders/route.ts`, `lib/stripe.ts`, UI | OK | Checkout ospitato da Stripe; nessun campo carta nello schema. |
| 15.3 | Area amministratore protetta e dati personali non esposti pubblicamente | `proxy.ts`, `lib/admin-auth.ts`, API admin | OK | API admin richiedono sessione HttpOnly. |
| 15.4 | Backup database | configurazione del provider database | MANCANTE | Nessuna policy di backup automatica è verificabile nel repository; va abilitata e provata nel provider scelto prima del deploy. |
| 15.5 | Protezione anti-spam/bot | `lib/turnstile.ts`, `lib/ratelimit.ts`, order/try-on routes | PARZIALE | Turnstile, honeypot e rate limit implementati; preview Vercel richiede chiavi Turnstile e Upstash effettive. |
| 15.6 | Gestione errori di pagamento | checkout, webhook e UI | OK | Errori Stripe restituiscono errori server/UI e gli eventi scaduti/falliti aggiornano l’ordine. |
| 16.1 | Privacy Policy | `app/privacy/page.tsx` | PARZIALE | Struttura presente; identità, sede e contatto del titolare sono placeholder. |
| 16.2 | Cookie Policy | `app/cookie/page.tsx` | PARZIALE | Informativa predisposta; dati titolare/contatto sono placeholder e policy da validare sui servizi effettivamente attivati. |
| 16.3 | Termini e condizioni | `app/termini/page.tsx` | PARZIALE | Presente, ma dati venditore, P.IVA, contatto e verifica legale sono placeholder. |
| 16.4 | Condizioni specifiche PRE-SALE e rimborso | `lib/presale-terms.ts`, `app/rimborsi/page.tsx` | OK | Testo specifico mostrato prima del pagamento e nel form. |
| 16.5 | Condizioni visibili prima del pagamento | `components/Storefront.tsx` | OK | Accettazione obbligatoria prima di proseguire. |
| 17.1 | Fase 1: flusso aperto con selezione, consenso e ordine | storefront, API ordini | OK | Ordini creati solo dopo validazione server-side. |
| 17.2 | Fase 1: contatore aggiornato dopo pagamento | webhook Stripe e API status | OK | Conferma pagamento aggiorna il contatore. |
| 17.3 | Fase 2: soglia raggiunta, notifica admin e PRE-SALE ancora aperta | webhook e dashboard | OK | Test copre il superamento della soglia. |
| 17.4 | Fase 3: admin avvia produzione e sospende il rimborso | API produzione e cron | OK | Test verifica il blocco del rimborso dopo l’avvio. |
| 17.5 | Fase 4: chiusura manuale e gestione ordini preesistenti | API admin PRE-SALE e dashboard | OK | Checkout pendenti vengono annullati quando possibile. |
| 18.1 | Priorità assoluta 1: home con logo Rush | `app/page.tsx` | OK |  |
| 18.2 | Priorità assoluta 2: unico pulsante principale PRE-SALE | `app/page.tsx` | OK |  |
| 18.3 | Priorità assoluta 3: pagina prodotto | `app/presale/page.tsx` | OK |  |
| 18.4 | Priorità assoluta 4: selezione taglia | storefront e schema Prisma | OK |  |
| 18.5 | Priorità assoluta 5: prezzo 25€ | storefront e API ordini | OK |  |
| 18.6 | Priorità assoluta 6: pagamento online | Stripe Checkout | PARZIALE | Integrazione test implementata; chiavi test non configurate in questo ambiente. |
| 18.7 | Priorità assoluta 7: registrazione automatica ordini | API ordini e webhook | OK |  |
| 18.8 | Priorità assoluta 8: contatore ordini pagati | API status e storefront | OK |  |
| 18.9 | Priorità assoluta 9: soglia configurabile di 15 pezzi | API settings soglia e dashboard | OK | Default 15; modificabile prima del primo pagamento. |
| 18.10 | Priorità assoluta 10: notifica al raggiungimento soglia | webhook e outbox | OK |  |
| 18.11 | Priorità assoluta 11: la soglia non chiude la PRE-SALE | webhook e API ordini | OK |  |
| 18.12 | Priorità assoluta 12: chiusura manuale admin | API PRE-SALE e dashboard | OK |  |
| 18.13 | Priorità assoluta 13: ordini accettati finché la PRE-SALE è aperta | API ordini | OK | Nessun blocco al raggiungimento soglia. |
| 18.14 | Priorità assoluta 14: scadenza individuale a due mesi | calcolo date e webhook | OK |  |
| 18.15 | Priorità assoluta 15: rimborso automatico se produzione non avviata | cron e Stripe refund | OK | Idempotente e protetto da claim atomico. |
| 18.16 | Priorità assoluta 16: pannello amministratore | route admin e dashboard | OK |  |
| 18.17 | Priorità assoluta 17: gestione ordini e taglie | dashboard e API admin | OK |  |
| 18.18 | Priorità assoluta 18: esportazione ordini | API export CSV/XLS | OK |  |
| 18.19 | Priorità assoluta 19: conferma ordine email | webhook e outbox | PARZIALE | Dipende dalla configurazione provider email. |
| 18.20 | Priorità assoluta 20: stati produzione e consegna | schema, API e dashboard | OK |  |

## Condizioni di accettazione anteprima

- Build generata con `APP_ENV=preview` e `NEXT_PUBLIC_SITE_URL` HTTPS; header `X-Robots-Tag` verificato su home, prodotto e login admin.
- `vercel.json` pianifica il cron giornaliero; la route rifiuta richieste senza `CRON_SECRET`.
- Il checkout non è da considerarsi verificato end-to-end su Stripe remoto finché non sono inserite chiavi Stripe test e chiavi Turnstile per il dominio preview.
- Completare i placeholder legali e abilitare/verificare backup del database prima di considerare il sistema pronto per vendite reali.
