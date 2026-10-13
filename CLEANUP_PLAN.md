# Piano di pulizia PRE-SALE Rush

Inventario iniziale del 13 ottobre 2026. Questa fase non rimuove né modifica codice applicativo, dati o configurazioni. Le azioni sotto sono proposte e richiedono l'ok dell'utente prima di iniziare la pulizia.

## Backup richiesto

- Branch creato: `release/go-live`.
- Commit di backup dello stato versionato presente al momento dell'inventario: `70253e6` (`chore: backup pre go-live state`).
- `.env.test` e `prisma/dev.db` sono rimasti fuori dal commit per non versionare configurazioni locali/segreti o dati di database. `.env.local` è ignorato da Git e non è stato letto.

## Inventario e azioni proposte

| Elemento | File / posizione rilevata | Azione proposta |
| --- | --- | --- |
| Seed e reset DB | `prisma/seed.ts` contiene seed di admin, ordini e impostazioni di esempio; `package.json` espone `seed` e `db:reset` | RIMUOVERE seed/reset pericolosi dai comandi di produzione; sostituire la creazione admin con `create-admin`; conservare solo una fixture isolata per DEV/test se necessaria |
| Utente admin/password debole | `prisma/seed.ts` usa `admin@example.com`, predefinisce `ADMIN_PASSWORD` a `admin` e stampa `admin / admin`; `TEST_REPORT.md` documenta credenziali deboli di test; `app/api/admin/login/route.ts` accetta anche `ADMIN_PASSWORD` in chiaro | RIMUOVERE credenziali hardcoded e fallback in chiaro; mantenere la creazione account solo tramite script sicuro |
| Dati/ordini finti | `prisma/seed.ts` crea ordini con email `@example.com` e nomi fittizi; `tests/` contiene record inline di test; `TEST_REPORT.md` contiene esempi | RIMUOVERE dal seed/deploy; MANTENERE SOLO IN DEV nei test; escludere report/documentazione di test dal deploy |
| Provider Stripe mock | `lib/stripe.ts` implementa Stripe mock e URL `example.com`; selezione con `STRIPE_MOCK`; `lib/config.ts` limita chiavi di default a test e consente override `ALLOW_LIVE_PAYMENTS` | MANTENERE SOLO IN DEV/test e bloccare in produzione; validare chiave live all'avvio |
| Provider email mock | `lib/mail.ts` accetta `MAIL_PROVIDER=console` o assenza di `RESEND_API_KEY`, marca l'email come inviata e stampa destinatario/contenuto con `console.log` | MANTENERE SOLO IN DEV/test; in produzione richiedere provider reale e rimuovere log con dati personali |
| Provider try-on mock | `lib/tryon-provider.ts` implementa `MockTryOnProvider`, selezionato da `TRYON_PROVIDER_MODE`; `lib/storage.ts` ripiega su filesystem locale se manca Supabase; `app/api/tryon/route.ts` ammette modalità mock | MANTENERE SOLO IN DEV/test; richiedere FAL e storage reale in produzione |
| Anti-bot di test | `lib/turnstile.ts` bypassa la verifica con `TURNSTILE_MODE=test` o chiave assente; `components/AdminLogin.tsx` invia un token locale in sviluppo | MANTENERE SOLO IN DEV/test; fallire all'avvio in produzione se le chiavi Turnstile mancano |
| Clock fake / override data | Nessuna sostituzione globale del clock (`Date.now`, fake timers o `setSystemTime`) trovata nella scansione del codice. `prisma/seed.ts` costruisce date relative per gli ordini finti; `tests/business.test.ts` e `tests/dates.test.ts` usano date fisse | RIMUOVERE le date seed insieme al seed; MANTENERE date fisse nei test. Nessun override runtime individuato |
| Route e pagine debug/test | Route applicative individuate: `app/api/status/route.ts` (stato pubblico), `app/api/cron/daily/route.ts` e `app/api/cron/cleanup/route.ts` (cron con `CRON_SECRET`), route amministrative sotto `app/api/admin/` (protette da `proxy.ts`); pagine pubbliche in `app/`. Non risultano `/api/test`, `/dev` o `/debug`. `app/api/admin/production/route.ts` cambia lo stato di produzione tramite l'admin, non è un endpoint di forzatura anonimo | MANTENERE route operative e protette; verificare protezioni cron/admin; nessuna route debug evidente da rimuovere |
| Cron configurato | `vercel.json` pianifica `/api/cron/daily` e `/api/cron/cleanup`; entrambe le route verificano `CRON_SECRET`; nessun parametro per cambiare data rilevato | MANTENERE cron protetti; verificare configurazione del secret sul deploy |
| Log, TODO/FIXME e dati sensibili nei commenti | `lib/mail.ts` contiene `console.log` mock con oggetto email; più route usano `console.error` operativo. Nessun TODO/FIXME critico è emerso dalla scansione iniziale. Nessun commento con segreti identificato; scansione storico mirata a prefissi Stripe/provider ha trovato solo `TEST_REPORT.md` (esempi documentali) e `.env.example`, senza file di implementazione corrispondenti | RIMUOVERE log di debug e sostituire logging operativo con logger strutturato e redatto; verificare i commenti durante la pulizia |
| File env e segreti | `.env.local` presente localmente e ignorato da Git; `.env.test` presente non tracciato; `.env.example` tracciato con chiavi vuote e URL localhost; la scansione mirata dello storico Git ha segnalato `TEST_REPORT.md` e `.env.example`, non codice applicativo. Il contenuto di `.env.local` e `.env.test` non è stato letto né mostrato | RIMUOVERE `.env.test` dal contesto/deploy e tenerlo fuori dai commit; MANTENERE `.env.example` solo come riferimento senza valori reali; aggiungere esempio production con soli nomi/segnaposto; eseguire scansione segreti dedicata prima del rilascio |
| Test e dipendenze | `tests/` (`dates.test.ts`, `business.test.ts`); `package.json` ha `test` e `tsx`/TypeScript/Prisma fra gli strumenti di sviluppo; `TEST_REPORT.md` contiene output e configurazioni di test | ESCLUDERE DAL BUILD/deploy test e report; MANTENERE test e dipendenze di test in repository/devDependencies |
| Vecchia applicazione statica/server | `public/` contiene solo gli asset attuali; `server/` e le pagine legacy `public/*.html`, `public/css`, `public/js`, `public/img` risultano nella cronologia ma non sono presenti nel checkout corrente | Nessuna azione sui file assenti; verificare che non vengano reintrodotti né inclusi nel deploy |
| Banner e testi/immagini placeholder | Nessuna stringa `DEMO` o `lorem ipsum` individuata in app/componenti. Le immagini attive `public/assets/logo.png`, `mockup-fronte.png`, `mockup-retro.png` corrispondono agli asset Rush presenti anche in `assets/`; “mockup” è il nome della foto prodotto, non un provider fittizio | MANTENERE gli asset reali; ricontrollare banner e stringhe dopo la rimozione dei mock |

## Note sui risultati

- `rg` ha trovato esempi di `admin`, `password`, `test`, `mock`, `example.com` e log mock nei seed, nei provider e nei documenti di test. Sono riportati sopra senza ripetere valori segreti.
- La scansione della cronologia è mirata a prefissi/nomi comuni per chiavi Stripe e provider: non equivale a una scansione completa di credenziali. Non sono stati stampati contenuti di file `.env`.
- In questo checkout Prisma dichiara SQLite (`prisma/schema.prisma`) e c'è `prisma/dev.db` non tracciato; il backup git non include quel database.

## Stato della fase

Inventario e piano completati. Nessun file applicativo o database è stato cancellato o ripulito. Attendere l'ok dell'utente prima di eseguire le azioni proposte.
