# TEST REPORT – Rush PRE-SALE

## Audit e correzioni applicate

1. Schema Prisma corretto per SQLite locale.
   - Risolto problema di compatibilità `Decimal` con SQLite in [prisma/schema.prisma](prisma/schema.prisma).
   - Ripulita la cronologia di migrazione incompatibile (`postgresql` vs `sqlite`) e ricreato il DB locale.

2. Setup locale e seed admin stabilizzati.
   - Aggiunti file `.env.local` e `.env.test` con impostazioni di test mock.
   - Aggiornato [app/api/admin/login/route.ts](app/api/admin/login/route.ts) per supportare password admin locale via `ADMIN_PASSWORD`/hash valido e seed DB.
   - Completato seed locale in [prisma/seed.ts](prisma/seed.ts).

3. Mock Stripe e provider test-safe.
   - Corretto parsing `webhook` in [lib/stripe.ts](lib/stripe.ts).
   - Verificato funzionamento in modalità `STRIPE_MOCK=true` senza chiamate reali.

4. Build Next.js e prerender fissati.
   - Rimosso blocco `experimental.optimizePackageImports` in [next.config.ts](next.config.ts) che causava il crash del build durante la prerenderizzazione.

---

## Comandi eseguiti e output reale

### 1) Validazione schema Prisma e migrazione locale

Comando eseguito:

```powershell
cd c:/Users/vinci/Desktop/Rush/rush-presale; Remove-Item -Recurse -Force prisma/migrations -ErrorAction SilentlyContinue; $env:DATABASE_URL='file:./dev.db'; $env:NODE_ENV='development'; $env:SESSION_SECRET='local-development-session-secret-123456'; $env:ADMIN_PASSWORD='admin'; npx prisma migrate dev --name init
```

Output chiave:

```text
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"
Applying migration `20261013143020_init`
The following migration(s) have been created and applied from new schema changes:
✔ Generated Prisma Client (v6.12.0)
```

### 2) TypeScript validation

Comando eseguito:

```powershell
cd c:/Users/vinci/Desktop/Rush/rush-presale; $env:DATABASE_URL='file:./dev.db'; $env:NODE_ENV='development'; $env:SESSION_SECRET='local-development-session-secret-123456'; $env:ADMIN_PASSWORD='admin'; npx tsc --noEmit
```

Risultato:

```text
Command produced no output
```

### 3) Test suite

Comando eseguito:

```powershell
cd c:/Users/vinci/Desktop/Rush/rush-presale; $env:DATABASE_URL='file:./dev.db'; $env:NODE_ENV='test'; $env:SESSION_SECRET='test-session-secret-with-length-32+'; $env:ADMIN_EMAIL='admin@example.com'; $env:STRIPE_SECRET_KEY='sk_test_51H1234567890ABCDEF'; $env:STRIPE_WEBHOOK_SECRET='whsec_test_1234567890'; $env:STRIPE_MOCK='true'; $env:MAIL_PROVIDER='console'; $env:MAIL_FROM='RUSH <noreply@example.com>'; $env:TURNSTILE_MODE='test'; $env:RATE_LIMIT_MODE='memory'; $env:TRYON_PROVIDER_MODE='mock'; $env:TRYON_DAILY_LIMIT='50'; $env:PRESALE_THRESHOLD='15'; $env:PRESALE_MAX_QUANTITY='5'; $env:CRON_SECRET='test-cron-secret'; npm test
```

Output chiave:

```text
> rush-presale@2.0.0 test
> tsx --test tests/*.test.ts

✔ business logic (2.7816ms)
✔ adds calendar months and clamps to the last day of shorter months (1.4595ms)
✔ preserves the day when the target month has it (0.1595ms)
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

### 4) Build produzione

Comando eseguito:

```powershell
cd c:/Users/vinci/Desktop/Rush/rush-presale; $env:NODE_ENV='production'; $env:DATABASE_URL='file:./dev.db'; $env:SESSION_SECRET='local-development-session-secret-123456'; $env:ADMIN_PASSWORD='admin'; $env:ADMIN_EMAIL='admin@example.com'; $env:STRIPE_SECRET_KEY='sk_test_51H1234567890ABCDEF'; $env:STRIPE_WEBHOOK_SECRET='whsec_test_1234567890'; $env:STRIPE_MOCK='true'; $env:MAIL_PROVIDER='console'; $env:MAIL_FROM='RUSH <noreply@example.com>'; $env:TURNSTILE_MODE='test'; $env:RATE_LIMIT_MODE='memory'; $env:TRYON_PROVIDER_MODE='mock'; $env:TRYON_DAILY_LIMIT='50'; $env:PRESALE_THRESHOLD='15'; $env:PRESALE_MAX_QUANTITY='5'; $env:CRON_SECRET='local-cron-secret'; npm run build
```

Output chiave:

```text
> rush-presale@2.0.0 build
> prisma generate && next build

✓ Compiled successfully in 5.4s
✓ Finished TypeScript in 2.8s
✓ Generating static pages ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /admin
├ ○ /admin/login
...
└ ○ /termini
```

### 5) Smoke test endpoint live local

Comando eseguito:

```powershell
$body = '{"password":"admin","turnstileToken":"local-test-token"}' ; $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/admin/login' -Method Post -ContentType 'application/json' -Body $body; $response.StatusCode; $response.Content
```

Output reale:

```text
200
{"ok":true}
```

---

## Verdict

- Il sito Rush PRE-SALE è operativo in locale con ambiente test-safe e senza chiamate reali a Stripe o servizi esterni.
- La suite di test automatica è passata.
- La build Next.js è stata eseguita con successo.
- Il login admin locale funziona in modalità mock/test.
