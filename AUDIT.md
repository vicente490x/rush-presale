# Audit requisito PRE-SALE Rush

| Requisito | File / route che lo implementa | Stato |
| --- | --- | --- |
| 1. Home con logo Rush e unico pulsante "PRE-SALE" | `app/page.tsx`, `components/HomeHero.tsx`, `components/BrandFooter.tsx` | OK |
| 2. Pagina PRE-SALE: mockup fronte/retro, prezzo 25€, taglie XS–XXL, quantità, contatore "X / 15", box condizioni e checkbox obbligatoria (server-side) | `app/presale/page.tsx`, `components/Storefront.tsx`, `app/api/orders/route.ts` | OK |
| 3. Animazioni (intro logo, transizioni, count-up, barra progresso, reveal a scroll) e prefers-reduced-motion | `components/HomeHero.tsx`, `components/ScrollReveal.tsx`, `app/globals.css` | PARZIALE |
| 4. Try-on AI: upload, consenso, rate limit, kill-switch, cancellazione foto, fallback errori | `components/TryOn.tsx`, `app/api/tryon/route.ts`, `lib/tryon-provider.ts`, `lib/storage.ts` | PARZIALE |
| 5. Stripe Checkout + webhook idempotente con verifica firma; il contatore si aggiorna solo dal webhook | `app/api/orders/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/stripe.ts` | OK |
| 6. Soglia 15 configurabile; raggiunta NON chiude la PRE-SALE (16/15, 17/15 accettati); email admin una sola volta | `lib/settings.ts`, `app/api/stripe/webhook/route.ts`, `app/api/admin/dashboard/route.ts` | OK |
| 7. Chiusura PRE-SALE solo manuale; da chiusa: pulsante "PRE-SALE CHIUSA" e API che rifiutano ordini | `app/api/admin/presale/route.ts`, `components/Storefront.tsx`, `app/api/orders/route.ts` | OK |
| 8. Scadenza a 2 mesi per ogni ordine; cron: avviso a 7 giorni, rimborso automatico se produzione non avviata, nessun rimborso se PRODUZIONE AVVIATA | `lib/dates.ts`, `app/api/cron/daily/route.ts`, `lib/business.ts` | PARZIALE |
| 9. Stati produzione e consegna gestibili da admin | `app/api/admin/production/route.ts`, `app/api/admin/orders/[id]/delivery/route.ts`, `components/AdminDashboard.tsx` | OK |
| 10. Admin protetto: dashboard, tabella ordini con tutti i campi, filtri, rimborso manuale, export CSV/Excel, riepilogo per taglia | `app/api/admin/*`, `components/AdminDashboard.tsx` | PARZIALE |
| 11. Email di conferma ordine, pagine legali, HTTPS-ready, anti-bot, rate limiting, nessun dato carta salvato | `lib/mail.ts`, `app/termini/page.tsx`, `app/privacy/page.tsx`, `lib/turnstile.ts`, `lib/ratelimit.ts`, `next.config.ts` | PARZIALE |

## Note

- La base funzionale del progetto è presente e coerente con la logica PRE-SALE richiesta.
- Sono state identificate aree da completare o rafforzare per il pieno rispetto del requisito: animazioni accessibili, provider try-on in test mode, cron e refund robusti, admin/seed locale, gestione env e report di test.
