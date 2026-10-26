# RUSH PRE-SALE

Sito Next.js per la pre-sale delle magliette RUSH, con PostgreSQL/Prisma, Checkout Stripe ospitato, email Resend, Turnstile e rate limit Upstash. Il sito pubblico non richiede una password; `/admin` rimane autenticato. La prova virtuale AI è disabilitata.

Staging usa pagamenti TEST e email autorizzate. Produzione può usare LIVE soltanto con ambiente, chiavi, database, provider e conferme di lancio coerenti. Nessun segreto operativo è incluso nel repository.

## Documentazione corrente

- [Requisiti di sicurezza](SECURITY_REQUIREMENTS.md)
- [Checklist di pubblicazione](SECURITY_DEPLOY_CHECKLIST.md)
- [Test eseguiti e limiti](SECURITY_TEST_RESULTS.md)
- [Rischi aperti](SECURITY_REMAINING_RISKS.md)
- [Deploy Vercel](DEPLOY_VERCEL.md) · [Configurazione Stripe](STRIPE_SETUP.md)

## Sviluppo e verifica

Node 24 e PostgreSQL. Per sviluppo, compilare un file ambiente locale ignorato da Git partendo da `.env.example`; non usare credenziali o ordini commerciali. Installare con `npm ci` e generare il client Prisma con `npm run db:generate` se necessario. Configurare DB e origine prima di avviare `npm run dev`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run verify` esegue i quattro controlli in sequenza con l’ambiente configurato. L’integrazione usa esclusivamente un database locale temporaneo denominato `rush_audit*`, indicato da `RUSH_TEST_DATABASE_URL`:

```sh
npm run test:integration
npm run test:migration
npm run test:http
```

Il test HTTP richiede prima una build staging compilata con l’origine indicata in `SECURITY_TEST_RESULTS.md`. Ogni runner crea uno schema casuale, conservato per ispezione nel DB temporaneo. Il workflow GitHub crea il proprio PostgreSQL isolato e non riceve segreti provider.

## Preparazione del rilascio

Usare i modelli `.env.staging.example` / `.env.production.example` senza committare i file reali. I controlli seguenti leggono soltanto il file esplicito e non contattano provider:

```sh
npm run staging:check -- --env-file .env.staging.local
npm run production:check -- --env-file .env.production.local
```

Zero errori significa formato coerente; non certifica account, credenziali, dominio o stato del database. Applicare le migrazioni alla destinazione confermata prima del deploy, secondo la checklist. Il consenso e la configurazione effettiva di Stripe LIVE non sono sostituiti dai test con fixture.
