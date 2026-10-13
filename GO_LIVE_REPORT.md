---
noteId: "e582fcc0c71a11f1b61ef337c0afc52f"
tags: []

---

# Report preparazione PRE-SALE Rush

Data: 13 ottobre 2026

Branch: `release/go-live`
Commit di backup iniziale: `70253e6` (`chore: backup pre go-live`)

## Interventi completati

- Rimossi il seed admin e lo script di setup admin insicuro; introdotta la creazione esplicita dell’admin con password robusta e hash bcrypt.
- Aggiunta la validazione delle variabili obbligatorie in produzione all’avvio; mock, bypass anti-bot e rate limiter in memoria non sono ammessi in produzione.
- Protette le API admin con verifica della sessione, cookie sicuro in produzione, cron con segreto, logger strutturato con redazione e `robots.txt` per le aree riservate.
- Aggiunte migrazioni PostgreSQL, marcatori dei dati di test, strumenti di pulizia con anteprima predefinita e controllo del database prima del go-live.
- Impostata la PRE-SALE chiusa per default. La pulizia dei dati lascia la PRE-SALE chiusa salvo opzione esplicita.
- Aggiornati README, esempio env di produzione, esclusioni Vercel/Docker e script npm per deploy e controlli DB.

## Verifiche eseguite

- `npm ci`: completato.
- `npx prisma validate` e generazione client Prisma: completati.
- `npm run lint`: completato senza errori.
- `npm test`: 7 test superati.
- `npm run build` con `APP_ENV=production` e valori fittizi per la sola build: completata.
- Build ripetuta dopo un errore su `/robots.txt`: la prima esecuzione ha usato l'URL HTTP locale da `.env.local` e ha rifiutato correttamente HTTPS mancante; la build e' passata con URL HTTPS segnaposto e valori fittizi impostati solo nel processo, senza modificare `.env.local`.
- Avvio in produzione con configurazione obbligatoria mancante: rifiutato correttamente.
- Smoke HTTP: home, PRE-SALE, pagine legali e login admin hanno risposto 200; admin non autenticato rediretto al login; API admin e cron senza credenziali hanno risposto 401; endpoint di test/debug non presenti hanno risposto 404.
- Verificati header di sicurezza (CSP, HSTS, nosniff, anti-framing, referrer policy) e regole robots.
- Lighthouse: home 92 performance, 95 accessibilità, 100 best practices e SEO; PRE-SALE 96 performance, 96 accessibilità, 96 best practices e 100 SEO. La verifica `errors-in-console` della PRE-SALE è fallita perché il database di test non era raggiungibile.
- `git diff --check`: pulito.

## Da completare prima del go-live

1. **PostgreSQL locale configurato e migrato.** Il database dedicato `rush_presale_local` risponde; `setup-local-postgres.ps1` ha creato utente/database, applicato le migrazioni e generato Prisma Client. La pulizia confermata sul database vuoto ha creato il backup `data/backups/test-data-2026-10-13T15-35-00-245Z.json` e impostato soglia 15 con PRE-SALE chiusa. Il controllo DB conferma zero ordini/job di test e contatore coerente.
2. **Admin locale configurato.** `db-check-production` ora passa: nessun ordine o record di test, admin non debole, soglia 15 e contatore coerente. L’indirizzo email e l’hash non vengono riportati.
3. **Status locale verificato.** Con Next dev e PostgreSQL configurati, `/api/status` ha restituito HTTP 200, zero ordini pagati, soglia 15 e PRE-SALE chiusa.
4. Configurare manualmente su Vercel le credenziali reali e i segreti. Non sono stati forniti né inseriti segreti live.
5. Configurare webhook Stripe verso `/api/stripe/webhook` e verificare firma, pagamento, fallimento e rimborso in ambiente di staging.
6. Verificare email, storage, anti-bot, cron e rate limiting con i provider reali; controllare log e monitoraggio.
7. Rieseguire smoke test e Lighthouse con PostgreSQL raggiungibile; pubblicare solo dopo i controlli legali indicati nel README. La PRE-SALE resta chiusa finché non viene aperta manualmente.

## Note su dati e repository

- `.env.local` e `.env.test` non sono stati letti nei contenuti né modificati; `.env.test` e file DB locali sono esclusi dal versionamento/build.
- È stato fatto un controllo mirato della history: il commit di backup conserva il vecchio `TEST_REPORT.md`, contenente credenziali di esempio non live. Il file è stato rimosso dalla working tree e non sono stati trovati prefissi di chiavi live nel controllo eseguito. Se quel report non deve rimanere nella history del branch, occorre riscrivere la history prima della pubblicazione.
- Lo smoke test e Lighthouse iniziali usavano una DSN fittizia; la connettività PostgreSQL e `/api/status` sono state verificate successivamente sul database locale.
