---
noteId: "454364b0cc8411f1a8d8071bcfefd596"
tags: []

---

# RUSH PRE-SALE — Correzioni di sicurezza

> Preparazione successiva del 20 ottobre: [STAGING_FINAL_PREPARATION.md](STAGING_FINAL_PREPARATION.md). Aggiunti guard sul timeout Upstash, POST/noscript nei form login, verifica TLS nel preflight, generatore credenziali verificabile e caricamento Prisma con `--env-file` senza fallback. Nuove regressioni in `tests/staging-preparation.test.ts`, `tests/staging-check.test.ts` e test HTTP; risultati aggiornati nel documento finale.

Aggiornamento finale: 20 ottobre 2026. Base: `7a6794d`, branch `staging`.

## Modifiche applicate

- `package.json`, `package-lock.json`: Next.js e @next/env 16.4.2 esatti; nessun `audit fix --force`.
- `lib/admin-auth.ts`, `lib/staging-auth.ts`: firme legate alla password corrente, claim e durata verificati; sessioni admin casuali persistite e revocabili.
- `prisma/schema.prisma`, `prisma/migrations/20261016000200_security_sessions/migration.sql`: tabella AdminSession e indice di scadenza; nessuna alterazione distruttiva degli ordini.
- `app/api/admin/logout/route.ts`, `components/AdminDashboard.tsx`: revoca lato server prima della cancellazione cookie; errore visibile se il logout fallisce.
- `app/api/cron/cleanup/route.ts`: rimozione sessioni scadute nel cleanup autenticato; pianificazione remota non modificata.
- `lib/refunds.ts`, `lib/stripe-events.ts`: verifica rigorosa dei rimborsi e del PaymentIntent, eventi anticipati ritentabili, rollback delle incongruenze.
- `lib/security-headers.ts`, `proxy.ts`, `app/layout.tsx`, `next.config.ts`: CSP con nonce, rendering dinamico, cache privata/no-store, referrer disabilitato; optimizer limitato ai tre asset del brand.
- `lib/http.ts`: parser multipart limitato sullo stream; no-store anche sugli errori admin.
- `app/api/tryon/route.ts`: Origin, limite token/pixel e log minimizzati; try-on ancora escluso dalla demo.
- `lib/storage.ts`: intento di pulizia registrato prima dell'upload.
- `lib/prisma.ts`: niente logging automatico degli errori query; restano codici diagnostici fissi negli handler.
- `lib/ratelimit.ts`: identità IP fidata soltanto sul proxy Vercel; fallback condiviso su server diretti.
- `app/api/admin/orders/[id]/delivery/route.ts`: lock comune con i rimborsi prima della verifica stato.
- `app/api/stripe/webhook/route.ts`: firma errata non genera scritture DB.
- `tests/security-hardening.test.ts`, `tests/integration.test.ts`, `scripts/test-http.ts`: regressioni sui nuovi controlli, pagamenti simultanei, timeout dopo accettazione rimborso e login bcrypt.

I cinque report SECURITY documentano esiti e limiti. Le note aggiunte ad AUDIT.md, STAGING_REPORT.md e DEPLOY_VERCEL.md collegano questo aggiornamento senza riscrivere i risultati storici.

## Compatibilità

La migrazione sessioni è additiva e va applicata al database staging verificato prima di servire il nuovo codice. Le sessioni precedenti richiedono un nuovo login. Se manca la tabella o il DB è indisponibile, l'accesso admin viene negato. Le letture DB aggiuntive richiedono un pool adeguato.

Prezzi, soglia, consenso, scadenze, produzione e design richiesti da SPEC.md sono preservati. I test verificano che il superamento della soglia non chiuda la vendita e che prezzi/condizioni degli ordini esistenti restino invariati. Nessuna migrazione, reset o seed eseguito sul database applicativo esistente.

La CSP richiede rendering dinamico e impedisce il caching delle pagine: costo prestazionale intenzionale. Turnstile, animazioni e navigazione devono essere provati in un browser reale.

## Regressioni emerse e risolte

Il test HTTP inizialmente rifiutava una sessione sintetica nel rendering admin: Next riespandeva tramite `.env.local` i caratteri `$` nell'hash bcrypt passato al processo figlio. Il test ora fornisce l'ambiente completo e impedisce il ricaricamento dotenv con il flag interno Next `__NEXT_PROCESSED_ENV`. È isolamento del test, non un bypass di autenticazione o una raccomandazione per il deployment. Le diagnostiche temporanee sono state rimosse.

Per Vercel inserire gli hash letteralmente nel pannello ambiente. Nei file dotenv letti da Next occorre l'escape previsto dal loader; non copiare automaticamente un file di credenziali destinato al pannello dentro `.env.local`.

Il test consegna concorrente attendeva 400: corretto a 409, il conflitto previsto da DomainError. Il controllo non è stato indebolito.

## Risultato

Build, lint, typecheck, unità, integrazione, migrazione, validazione e confronto schema passano. HTTP di produzione locale: 27 controlli passati. Nessuna vulnerabilità CRITICAL/HIGH di codice individuata rimane senza patch; restano il rischio operativo HIGH SEC-13 e SEC-12 da gestire. I controlli esterni e visivi non sono stati simulati come riusciti.

**SECURITY NOT READY FOR STAGING** — vedere checklist e rischi residui.
