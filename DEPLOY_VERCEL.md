# Deploy Vercel — RUSH PRE-SALE

Guida corrente del 26 ottobre 2026. Seguire [SECURITY_DEPLOY_CHECKLIST.md](SECURITY_DEPLOY_CHECKLIST.md), [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md) e [STRIPE_SETUP.md](STRIPE_SETUP.md).

## Progetti da distinguere

Il vecchio staging `2be69ba` aveva stato GitHub Vercel positivo su `wrath5/rush-presale`. Il commit `ed9e464` ha ricevuto `Deployment was blocked` su `vicente-8f24/rush-presale`. Il connettore vede `prj_97dQzkl8OOPj6ZEz8irYoQQFOZxe` nel team `Wrath` (`team_SKxnY92xE706MucgyGfoLfmb`); il deployment fallito dell’altro ambito non è accessibile con questa connessione. Sono riferimenti diversi: uno stato positivo storico non chiude il problema attuale.

È richiesto l’accesso specifico al team Wrath prima di leggere configurazione e log o avviare una build lì. Nessun team trasferito, account aggiunto o piano a pagamento attivato. Il consenso temporaneo va completato dall’account proprietario; non salvare link temporanei di autorizzazione nel repository.

## Build

- Framework Next.js, Node 24 (`.nvmrc`), installazione `npm ci`, build `npm run build`, output predefinito Next.
- Root directory: radice del repository, dove si trova `package.json`.
- Le migrazioni DB non vengono eseguite nel build command: applicarle una volta sul database esatto prima di distribuire il candidato compatibile.
- Staging richiede `STAGING_DATABASE_CONFIRMED=true`; produzione richiede `PRODUCTION_DATABASE_CONFIRMED=true`. Le conferme non vanno impostate senza verifica del DB.
- Il push su `staging` può avviare una Preview. Un Redeploy del vecchio deployment usa il vecchio commit: selezionare la nuova revisione Git.
- La password condivisa RUSH è rimossa. Eventuale Vercel Authentication appartiene a Deployment Protection, non all’app.

## Configurazione

Copiare i nomi da `.env.staging.example` o `.env.production.example` nello scope corretto senza caricare i file reali su GitHub. I valori bcrypt in Vercel sono letterali: niente virgolette aggiunte o backslash prima di `$`. Solo `NEXT_PUBLIC_SITE_URL` e la site key Turnstile sono pubblici.

I controlli statici leggono solo il file esplicito, non ereditano valori mancanti dalla shell e non contattano provider:

```sh
npm run staging:check -- --env-file .env.staging.local
npm run production:check -- --env-file .env.production.local
npm run db:validate -- --env-file .env.staging.local
npm run db:migrate -- --env-file .env.staging.local
node --import tsx scripts/prisma-cli.ts migrate status --env-file .env.staging.local
```

Per produzione usare il file `.env.production.local` nei tre comandi Prisma, dopo controllo destinazione e backup. Con `--env-file` sono ammessi solo validate, migrate status e migrate deploy.

## Dopo il deploy

Verificare READY, commit e ambiente; poi accesso pubblico, admin 401 senza sessione, login/logout, CAPTCHA, checkout, webhook, email e cron. Il workflow GitHub esegue test locali con PostgreSQL isolato: non certifica i servizi Vercel/Stripe/Resend reali e non è ancora un Deployment Check obbligatorio finché non configurato nel progetto.
