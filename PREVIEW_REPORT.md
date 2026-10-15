# Report preparazione preview Vercel

**Data verifica:** 2026-10-15  
**Branch:** `preview`  
**Deploy Vercel eseguito:** no. Nessun commit o push è stato fatto.

## Esito

La build preview è stata compilata e avviata localmente, con Stripe ancora limitato alle chiavi di test. La pagina pubblica, il prodotto, l’endpoint health, il noindex, l’autenticazione admin e il blocco del cron non autenticato sono stati verificati. Non dichiaro completato il deploy: le chiavi reali di test/provider non sono disponibili in questa sessione, e restano da configurare backup database e dati legali del titolare.

## Requisiti anteprima

| Requisito | Esito | Evidenza / nota |
|---|---|---|
| `postinstall` esegue `prisma generate` | OK | `npm ci` ha eseguito il lifecycle hook con generazione Prisma riuscita. |
| Build senza seed o `migrate reset` | OK | Script build: `prisma generate && next build`; seed e reset sono comandi manuali distinti. |
| Stripe test mode | OK con prerequisito | Le route rifiutano chiavi live fuori dalla configurazione di produzione autorizzata; impostare solo `sk_test_` su Vercel Preview. |
| Email reale oppure log | OK con prerequisito | Supporta provider Resend o console; scegliere e configurare il provider per preview. |
| Try-on con limite basso o provider mock | OK con prerequisito | Provider mock consentito fuori production; impostare mock e limite piccolo, oppure provider reale con budget. |
| Admin da `ADMIN_EMAIL`/`ADMIN_PASSWORD` | OK con prerequisito | Password richiesta di almeno 12 caratteri e diversa da `admin`; creare l’utente con seed demo manuale. |
| Cron giornaliero con `CRON_SECRET` | OK | `vercel.json` usa `/api/cron/daily`; route risponde 401 senza segreto. |
| Health `/api/health` senza segreti | OK | Risposta verificata: `{"status":"ok"}`; in errore DB restituisce 503 senza dettagli. |
| Noindex su tutto il sito preview e `/admin` | OK | Meta robots e `X-Robots-Tag` verificati su `/`, `/presale` e `/admin/login`. |
| `.env.example` completo e `.env*` ignorati | OK | `.env.example` è l’unico file ambiente tracciato; `.env.local` e `.env.test` risultano ignorati. |
| Segreti in codice, cronologia Git e bundle client | OK per i pattern controllati | Nessun pattern chiave live/webhook reale nei file tracciati o cronologia; i bundle client statici sono stati inclusi nel controllo prima della pubblicazione. |

## Comandi eseguiti

| Comando / controllo | Risultato reale |
|---|---|
| `npm ci` | Exit 0; 100 pacchetti aggiunti; audit npm: 0 vulnerabilità; `postinstall` ha generato Prisma Client 6.12.0. |
| `npx prisma validate` con `DATABASE_URL` e `DIRECT_URL` segnaposto | Exit 0; schema valido. Una prima invocazione senza `DIRECT_URL` è fallita con P1012, poi è stata correttamente ripetuta con entrambi gli URL. |
| `npx prisma migrate deploy` su URL loopback e schema `rush_presale_test` | Exit 0; 2 migrazioni trovate, nessuna migrazione pendente. |
| `npm run lint` | Exit 0; `tsc --noEmit` completato senza errori. |
| `npm test` | Exit 0; 23 test passati, 0 falliti, 0 saltati. DB di test isolato nello schema locale `rush_presale_test`; provider esterni mock nei test. |
| `npm run build` con `APP_ENV=preview` e URL HTTPS | Exit 0; Prisma generate, compilazione Next.js, typecheck e generazione route completati. |
| HTTP runtime: `/api/health`, `/api/status` | Entrambi 200; health restituisce `{"status":"ok"}`. |
| HTTP runtime: `/`, `/presale`, `/admin/login` | Tutti 200 con `X-Robots-Tag: noindex, nofollow, noarchive`. |
| HTTP runtime senza sessione/secret: dashboard admin, setting soglia, cron | Tutti 401. |
| Verifica browser prodotto | Titolo pagina corretto, prezzo 25€, consenso visibile, pulsante PRE-SALE; CTA disabilitato se Turnstile non è configurato. |
| Verifica browser responsive | A 360px e 390px `scrollWidth` equivale alla larghezza di layout disponibile; nessun overflow orizzontale rilevato. `prefers-reduced-motion` riconosciuto. |
| `git diff --check` e `git diff --cached --check` | Exit 0; solo warning Git di conversione LF/CRLF su `.gitignore`. |
| Ricerca stringhe “Acquista/Compra” nei componenti e route UI | Nessuna corrispondenza. |
| Controllo file ambiente Git | `git ls-files -- .env .env.*` mostra solo `.env.example`; `.env.local` e `.env.test` ignorati. |

### Ambiente di test

- Node.js: `v24.15.0` (compatibile con `engines: >=22 <25`).
- Docker: non disponibile; servizio PostgreSQL locale utilizzato solo sullo schema isolato di test.
- Browser: Chromium disponibile nell’ambiente integrato.
- Nessun E2E Playwright preesistente nel repository; il percorso UI è stato verificato nel browser integrato. Nessun pagamento remoto è stato completato.

## Variabili da impostare su Vercel

Creare le variabili nell’ambiente **Preview** (non Production) e non salvarne i valori nei file versionati:

| Variabile | Necessaria | Indicazione |
|---|---|---|
| `APP_ENV` | sì | `preview` |
| `NEXT_PUBLIC_SITE_URL` | sì | URL HTTPS esatto del deployment preview/dominio assegnato |
| `DATABASE_URL`, `DIRECT_URL` | sì | PostgreSQL raggiungibile da Vercel, connessione runtime pooled e URL diretto per migrazioni |
| `STRIPE_SECRET_KEY` | sì per checkout | Chiave `sk_test_`; mai una `sk_live_` in Preview |
| `STRIPE_WEBHOOK_SECRET` | sì per conferme | Segreto webhook dell’endpoint Stripe test che punta a `/api/stripe/webhook` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` | sì | Password univoca di almeno 12 caratteri; `SESSION_SECRET` almeno 32 caratteri |
| `CRON_SECRET` | sì | Valore casuale lungo; configurarlo anche come variabile runtime Vercel per il cron |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | sì per checkout pubblico | Chiavi Cloudflare Turnstile associate al dominio preview; `TURNSTILE_MODE=live` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | sì | Rate limit distribuito in esecuzione serverless Vercel |
| `EMAIL_PROVIDER` | sì | `console` per log demo oppure `resend` con `RESEND_API_KEY` e `MAIL_FROM` verificato |
| `TRYON_PROVIDER`, `TRYON_DAILY_LIMIT`, `TRYON_MAX_DAILY_SPEND_USD` | se try-on attivo | Preferire mock e limite basso per demo; per FAL servono anche `FAL_KEY`, modello e storage Supabase |
| `PRESALE_THRESHOLD`, `PRESALE_MAX_QUANTITY` | opzionale | Default 15 e 5; la soglia si può poi configurare dal pannello prima del primo pagamento. |

## Checklist manuale deploy Preview

1. Selezionare il branch `preview` in Vercel e verificare Node.js 22 o 24.
2. Impostare tutte le variabili sopra **solo per Preview**; non copiare le chiavi live.
3. Creare PostgreSQL e abilitare backup automatici, retention e prova di restore; salvare gli URL nelle variabili Preview.
4. Eseguire `npm run db:migrate` contro il database preview prima di usare le route; il build non migra il database.
5. Dopo aver impostato `ADMIN_EMAIL` e `ADMIN_PASSWORD`, eseguire manualmente `npm run seed:demo` solo sul database Preview per creare l’utente admin e pochi ordini fittizi `@example.com`. Non lanciarlo in build.
6. Configurare il webhook Stripe in modalità test verso `https://<preview-domain>/api/stripe/webhook` e impostare gli eventi checkout/pagamento usati dall’app.
7. Verificare Turnstile sul dominio Vercel preview; senza chiavi valide l’ordine viene intenzionalmente bloccato.
8. Controllare che il cron giornaliero risulti registrato nel piano Vercel e che invii il bearer `CRON_SECRET`; verificare una chiamata autorizzata nei log.
9. Scegliere provider email e verificare conferma ordine, soglia, avviso scadenza e rimborso con destinatari di prova.
10. Inserire ragione sociale, indirizzo, P.IVA e contatti reali nelle pagine legali; far verificare i testi prima della pubblicazione.
11. Fare smoke test su home, pagina prodotto, login/admin, chiusura PRE-SALE, pagamento Stripe test, webhook, conferma, export e health.
12. Verificare `X-Robots-Tag`/meta noindex e configurazione backup prima di condividere l’URL preview al committente.

## Problemi residui / limiti della verifica

- Non è stato effettuato un deploy né un checkout Stripe remoto: mancano credenziali/provider configurati in questa sessione.
- Il browser locale mostra il CTA disabilitato finché Turnstile non è configurato; è il comportamento di sicurezza previsto, non un fallback che aggira anti-bot.
- Backup e restore dipendono dal provider PostgreSQL e devono essere dimostrati manualmente.
- Pagine privacy, cookie e termini contengono placeholder del titolare: non sono pronte per uso commerciale.
- Nessun file è stato aggiunto allo staging da questa attività; nessun commit o push è stato effettuato. I report restano file locali e non vanno inclusi nel push del branch.
