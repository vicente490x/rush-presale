# Audit requisiti PRE-SALE RUSH

Audit eseguito il 13 ottobre 2026 su codice, route, schema Prisma e suite esistente. I requisiti sono valutati prima delle correzioni.

| Requisito | File / route che lo implementa | Stato |
|---|---|---|
| 1. Home con logo RUSH e unico pulsante “PRE-SALE”, senza “Acquista/Compra” | `app/page.tsx`, `components/HomeHero.tsx`, `components/BrandFooter.tsx` | OK |
| 2. PRE-SALE con mockup fronte/retro, 25€, taglie XS–XXL, quantità, contatore X / 15, condizioni e checkbox verificata server-side | `components/Storefront.tsx`, `components/ImageGallery.tsx`, `app/api/orders/route.ts`, `app/api/status/route.ts` | OK |
| 3. Intro logo, transizioni, count-up, barra progresso, reveal a scroll e `prefers-reduced-motion` | `components/HomeHero.tsx`, `components/ScrollReveal.tsx`, `app/globals.css` | PARZIALE — intro, reveal, barra e reduced-motion presenti; animazione count-up e celebrazione al raggiungimento soglia mancanti |
| 4. Try-on AI: upload, consenso, rate limit, kill-switch, cancellazione foto e fallback | `components/TryOn.tsx`, `app/api/tryon/route.ts`, `lib/tryon-provider.ts`, `lib/storage.ts`, `lib/ratelimit.ts`, `app/api/admin/settings/tryon/route.ts` | PARZIALE — flusso reale protetto presente, ma manca un provider MOCK locale verificabile senza servizi a pagamento |
| 5. Stripe Checkout e webhook idempotente con firma verificata; contatore aggiornato solo dal webhook | `app/api/orders/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/stripe.ts`, `lib/settings.ts` | PARZIALE — checkout e firma/idempotenza presenti; manca la gestione dell’evento di pagamento fallito e un gateway mock per test offline |
| 6. Soglia 15 configurabile; ordini oltre soglia accettati; email admin una sola volta | `lib/config.ts`, `lib/settings.ts`, `app/api/orders/route.ts`, `app/api/stripe/webhook/route.ts` | OK |
| 7. Chiusura solo manuale; UI chiusa e API ordini rifiuta nuovi ordini | `app/api/admin/presale/route.ts`, `app/api/orders/route.ts`, `components/Storefront.tsx` | OK |
| 8. Scadenza individuale a due mesi; cron avviso a 7 giorni e rimborso automatico solo se la produzione non è avviata | `lib/dates.ts`, `app/api/stripe/webhook/route.ts`, `app/api/cron/daily/route.ts` | PARZIALE — logica presente, ma l’orologio non è iniettabile e non ci sono test cron/idempotenza |
| 9. Stati produzione e consegna gestibili da admin | `app/api/admin/production/route.ts`, `app/api/admin/orders/[id]/delivery/route.ts`, `components/AdminDashboard.tsx` | OK |
| 10. Admin protetto, tabella completa, filtri, rimborso, export CSV/Excel e riepilogo taglie | `proxy.ts`, `app/api/admin/**`, `components/AdminDashboard.tsx`, `app/api/admin/export/route.ts` | PARZIALE — protezione, ricerca, rimborso, CSV e riepilogo presenti; mancano filtri strutturati, tutti i campi nell’elenco e file XLSX |
| 11. Email conferma, pagine legali, HTTPS-ready, anti-bot, rate limiting e nessun dato carta salvato | `lib/mail.ts`, `app/{privacy,cookie,termini,rimborsi}/page.tsx`, `next.config.ts`, `app/api/**`, `prisma/schema.prisma` | PARZIALE — invio Resend live e protezioni presenti; manca una modalità email locale sicura, le pagine legali hanno dati segnaposto e non esiste ancora un ambiente di test isolato |
| 12. Seed admin e ordini dimostrativi; reset DB e dataset distinti | `prisma/schema.prisma`, `scripts/`, `package.json` | MANCANTE — non esiste seed, utente admin persistito, reset protetto o dataset di sviluppo |
| 13. Test unitari/integration ed E2E richiesti, report coverage | `tests/dates.test.ts`, `package.json` | MANCANTE — presenti solo due test data; assenti suite business/API, Playwright e coverage |
| 14. Audit Lighthouse e controlli di sicurezza eseguiti | `next.config.ts`, configurazione applicativa | MANCANTE — da eseguire dopo l’allestimento dell’ambiente di test |

## Evidenza iniziale

Comando eseguito: `npm test`

```text
✔ adds calendar months and clamps to the last day of shorter months
✔ preserves the day when the target month has it
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

Node.js rilevato: `v24.15.0`; npm: `11.12.1`. Il servizio PostgreSQL locale risulta avviato. Il daemon Docker non è raggiungibile; l’ambiente di test userà PostgreSQL locale e provider mock, non chiamate Stripe live, email, Turnstile o try-on commerciali.
