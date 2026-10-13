'''Costruisci da zero il sito PRE-SALE delle magliette Rush. Le specifiche funzionali complete sono nel file SPEC.md nella cartella corrente: leggilo per intero prima di iniziare e consideralo la fonte di verità per business logic, stati, notifiche e admin. Questo file aggiunge stack, design, animazioni e la funzione AI "Provala addosso". Gli asset sono nella cartella assets (logo.png = logo Rush, mockup-fronte.png e mockup-retro.png = foto della maglietta).

## STACK
- Next.js (App Router) + TypeScript + Tailwind CSS
- Animazioni: Framer Motion (UI/transizioni) + GSAP con ScrollTrigger (scroll e sequenze); opzionale Lenis per smooth scroll
- Database: Postgres (Supabase o Neon) con Prisma
- Pagamenti: Stripe Checkout (nessun dato carta sul sito)
- Email: Resend
- Storage temporaneo foto try-on: Supabase Storage o Vercel Blob, con eliminazione automatica
- AI try-on: provider dietro un'interfaccia astratta (vedi sezione dedicata)
- Auth admin: login protetto, password hashata, rate limiting
- Cron: Vercel Cron
- Deploy: Vercel

## DESIGN E ANIMAZIONI
Identità: nero profondo, rosso Rush (#C00000 dal logo), bianco; tono streetwear/notturno, ispirato alle foto mockup (fuoco, grano, estetica "lick me hard. lick me rush."). Tipografia sans bold, grande, contrastata. Tutto in italiano. Mobile-first, 60fps, nessun layout shift.

Home:
- Intro all'apertura: schermo nero, il logo Rush appare con reveal (scale + glow rosso pulsante, leggero effetto glitch/grain), poi compare il pulsante "PRE-SALE" con animazione di ingresso e hover/tap con effetto magnetico e ripple rosso
- Sfondo vivo ma leggero: grain animato, vignettatura e particelle/braci rosse che salgono lentamente (canvas o CSS, ottimizzate)
- Nessun altro pulsante oltre a "PRE-SALE"

Pagina PRE-SALE:
- Transizione di pagina fluida dalla home (il logo si anima verso l'header)
- Galleria mockup fronte/retro: swipe su mobile, parallax e zoom morbido, flip 3D tra fronte e retro
- Prezzo e titolo con reveal testuale a scroll (split text)
- Selettore taglia con animazioni di selezione (layout animation), quantità con micro-interazioni
- Contatore pezzi: numeri che scorrono (count-up) e barra di progresso rossa animata che si riempie; al raggiungimento soglia effetto celebrativo (flash + coriandoli/braci) senza chiudere la PRE-SALE
- Sezioni "come funziona" a scroll con step animati (Prenota → Soglia 15 → Produzione → Consegna alla serata Rush/PR) e timeline del rimborso a 2 mesi
- Checkbox condizioni con animazione di conferma; pulsante pagamento con stato loading/successo
- Pagina conferma con animazione di successo
- Rispetta prefers-reduced-motion (animazioni ridotte), lazy-load degli asset pesanti, immagini ottimizzate con next/image, Lighthouse mobile ≥ 90

## FUNZIONE AI "PROVALA ADDOSSO" (virtual try-on)
Sulla pagina PRE-SALE, sezione/bottone "PROVALA ADDOSSO":
1. L'utente carica una propria foto (jpg/png/webp, max 8 MB, anche da fotocamera su mobile) con anteprima e ritaglio guidato (consigli: foto frontale, busto visibile, luce buona)
2. Checkbox obbligatoria di consenso: "Accetto che la mia foto venga elaborata da un servizio AI per generare l'anteprima. La foto viene eliminata subito dopo." (con link all'informativa privacy)
3. Il server invia foto + mockup della maglietta (fronte, ed eventualmente retro) al provider AI e riceve l'immagine generata
4. Durante l'elaborazione: loader animato a tema Rush con stato di avanzamento
5. Risultato mostrato con animazione di reveal, slider "prima/dopo", pulsanti: "Prova un'altra foto", "Scarica", "Condividi", "PRE-SALE" (porta al checkout con la taglia scelta)
6. Avviso visibile: "Anteprima generata dall'AI, indicativa. Vestibilità e colori reali possono differire."

Implementazione:
- Interfaccia TryOnProvider { generate(userImage, garmentImage): Promise<image> } con implementazione sostituibile tramite env. Implementa un provider di default (es. modello virtual try-on su Replicate/fal.ai come IDM-VTON, oppure un modello di image-editing generativo come Gemini image) e lascia gli altri come stub documentati. Scegli tu il più adatto e motivalo nel piano
- Chiamate AI SOLO lato server (chiavi in env, mai nel client)
- Rate limiting per IP/sessione (es. 5 generazioni/ora), limite di costo giornaliero configurabile con kill-switch da admin, protezione anti-bot (Turnstile)
- Validazione file (tipo MIME reale, dimensione), strip dei metadati EXIF
- Moderazione base: rifiuta immagini senza persona riconoscibile o contenuti inappropriati; messaggi di errore chiari
- Privacy: la foto originale e il risultato vengono salvati solo temporaneamente e cancellati entro pochi minuti (job di pulizia); nessun riuso o training; nessun salvataggio permanente associato all'utente; aggiorna Privacy Policy con questo trattamento. Funzione disponibile solo per maggiorenni (dichiarazione nel consenso)
- Se il provider fallisce o va in timeout: retry controllato e fallback con messaggio gentile, senza bloccare l'acquisto
- Tracciare solo metriche anonime (numero generazioni, errori, costi)

## PAGINA PRE-SALE E LOGICA BUSINESS
Implementa tutto quanto descritto in SPEC.md, in particolare:
- Prodotto RUSH T-SHIRT 25€, taglie XS/S/M/L/XL/XXL, quantità, contatore "X / 15 PEZZI PRENOTATI", box "ATTENZIONE — PRE-SALE" con testo esatto e checkbox condizioni obbligatoria (validata anche server-side)
- Se PRE-SALE chiusa: pulsante sostituito da "PRE-SALE CHIUSA", API che rifiutano nuovi ordini
- Soglia 15 configurabile; il raggiungimento NON chiude la PRE-SALE; email admin una sola volta alla soglia
- Contatore aggiornato solo dal webhook Stripe (checkout.session.completed), idempotente, firma verificata
- Ordine PENDING → PAID (paidAt, expiresAt = paidAt + 2 mesi); ogni ordine ha la propria scadenza
- Stati produzione manuali da admin: PRE-SALE APERTA → SOGLIA RAGGIUNTA → PRODUZIONE AVVIATA → PRODUZIONE COMPLETATA; chiusura PRE-SALE come flag separato e solo manuale
- Cron giornaliero: avviso admin a 7 giorni dalla scadenza; a scadenza senza produzione avviata rimborso Stripe automatico, stato REFUNDED, email a acquirente e admin ("ORDINE SCADUTO — RIMBORSO AUTOMATICO"); pulizia ordini PENDING scaduti e foto try-on residue
- Email di conferma ordine all'acquirente
- Pagine legali: Privacy Policy (incluso trattamento foto AI), Cookie Policy, Termini e condizioni, condizioni PRE-SALE e rimborso (bozze in italiano da far rivedere)

## MODELLO DATI (minimo)
Order: id, orderNumber, firstName, lastName, email, size, quantity, amountCents, stripeSessionId, stripePaymentIntentId, paymentStatus, paidAt, expiresAt, orderStatus, refundStatus, refundedAt, deliveryStatus (DA_CONSEGNARE | SERATA_RUSH | PR | CONSEGNATA), termsAcceptedAt, createdAt
Settings (singleton): threshold, presaleOpen, productionStatus, thresholdNotifiedAt, tryOnEnabled, tryOnDailyLimit
TryOnJob (solo metadati anonimi): id, status, createdAt, durationMs, provider, costEstimate

## ADMIN (/admin, protetto da login)
- Dashboard: pezzi totali / soglia, % raggiungimento, n. ordini, quantità per taglia, totale incassato, stato PRE-SALE, stato produzione, ordini in scadenza (≤7 giorni), ordini da rimborsare, badge "✓ Soglia raggiunta", statistiche try-on (generazioni, errori, costo stimato)
- Azioni: apri/chiudi PRE-SALE, cambia stato produzione (con conferma), rimborso manuale, cambia stato consegna, attiva/disattiva try-on e limite giornaliero
- Tabella ordini con tutti i campi della sezione 11 di SPEC.md, filtri e ricerca
- Export CSV/Excel degli ordini + riepilogo per taglia per il produttore

## SICUREZZA
HTTPS, validazione server-side (zod), rate limiting e anti-bot su checkout e try-on, secret solo in env, nessun dato carta salvato, middleware su /admin e API admin, istruzioni backup DB.

## COME LAVORARE
1. Prima di scrivere codice, mostrami un piano breve: struttura cartelle, schema Prisma, route, scelta del provider AI con costo stimato per generazione, approccio animazioni. Attendi il mio ok
2. Implementa a fasi: setup + design/animazioni home e presale → DB + checkout + webhook → email + soglia → try-on AI → cron + rimborsi → admin + export → pagine legali
3. Fornisci .env.example completo, README con setup locale (Stripe CLI per i webhook in test mode), deploy su Vercel, configurazione cron
4. Test per: conteggio pezzi, soglia che non chiude la pre-sale, scadenza a 2 mesi, rimborso solo se produzione non avviata, idempotenza webhook, validazione upload try-on, rate limit
5. Lavora sempre in Stripe test mode finché non te lo dico io'''