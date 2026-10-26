# Checklist di pubblicazione RUSH PRE-SALE

26 ottobre 2026. Fonte corrente: [requisiti di sicurezza](SECURITY_REQUIREMENTS.md) e [risultati effettivi](SECURITY_TEST_RESULTS.md). Le istruzioni storiche sul gate condiviso non si applicano più.

## Codice e controlli

- [x] Accesso pubblico senza password e backoffice autenticato separatamente.
- [x] Revoca sessioni, CSRF, validazione input, rate limit fail-closed e Turnstile server-side.
- [x] Stripe TEST/LIVE separati; opt-in LIVE multiplo e coerente, verificato con fixture.
- [x] Migrazioni versionate e prova di aggiornamento conservativo su DB temporaneo.
- [x] Modelli `.env.staging.example` / `.env.production.example` privi di segreti; file reali ignorati.
- [x] Workflow GitHub per lint, TypeScript, unità, build, audit, integrazione, migrazioni e HTTP; nessuna chiave reale necessaria.
- [ ] Controllare la conclusione del workflow sul nuovo commit. Configurare il check come obbligatorio sul branch di rilascio: la presenza del workflow non impedisce da sola il deploy Vercel.

## Staging pubblico TEST

- [ ] Confermare team e progetto prima del rebuild: nei riferimenti esistenti compaiono due progetti `rush-presale`, uno `Wrath/wrath5` e uno `vicente-8f24`. Non trasferire o cancellare progetti per tentativi.
- [ ] Usare il commit aggiornato di `staging`, scope Vercel Preview, `APP_ENV=staging`, `STRIPE_MODE=test`, `ALLOW_LIVE_PAYMENTS=false`.
- [ ] `NEXT_PUBLIC_SITE_URL` deve corrispondere all’origine HTTPS stabile usata nel browser e in Turnstile. Non aggiungere path, userinfo, query o hash.
- [ ] Configurare DB staging indipendente, pool runtime e URL diretto; TLS `sslmode=require&sslaccept=strict`; impostare `STAGING_DATABASE_CONFIRMED=true` solo dopo controllo effettivo.
- [ ] Inserire nuova password admin come hash bcrypt 12–16, `SESSION_SECRET` e `CRON_SECRET` nuovi e distinti, `ADMIN_EMAIL`, Stripe TEST/webhook, Turnstile, Upstash e Resend con mittente verificato e `EMAIL_ALLOWLIST` esatta.
- [ ] Mantenere `ENABLE_AUTOMATIC_JOBS=false`, `TRYON_REVIEWED=false`. `STAGING_PASSWORD_HASH` e `STAGING_SESSION_SECRET` non sono più usati e possono essere rimossi.
- [ ] Eseguire `npm run staging:check -- --env-file .env.staging.local` sull’ambiente autentico; zero problemi di formato richiesti.
- [ ] Applicare le tre migrazioni allo staging confermato con `npm run db:migrate -- --env-file .env.staging.local`, quindi `node --import tsx scripts/prisma-cli.ts migrate status --env-file .env.staging.local`.
- [ ] Distribuire l’ultimo commit, verificare READY e aprire `/`, `/presale`, informative e logo senza cookie. `/anteprima` deve rimandare a `/`; `/admin` deve chiedere il login; `/api/admin/settings` senza cookie deve rispondere 401.
- [ ] Se compare la schermata Vercel Authentication, verificare Deployment Protection nel progetto corretto. Il webhook Stripe e i cron devono poter raggiungere l’app; non rimuovere autenticazione admin o firma webhook per risolverlo.
- [ ] In browser desktop/mobile verificare CAPTCHA, form, errori, annullamento pagamento, conferma, dashboard, export e logout; controllare console/CSP.
- [ ] Completare un ordine Stripe TEST, verificare evento firmato PAID, email, duplicato webhook, rimborso TEST e aggiornamento contatori.

## Produzione commerciale

- [ ] Scegliere il progetto/dominio finale e un DB produzione separato. Configurare backup/ripristino, privilegi runtime minimi e URL diretto per migrazioni. Non importare ordini di test come vendite.
- [ ] Compilare `.env.production.example` nel provider. `PRODUCTION_DATABASE_CONFIRMED`, `LEGAL_REVIEW_CONFIRMED`, `PRODUCTION_LAUNCH_CONFIRMED` diventano true solo quando i rispettivi controlli sono completati.
- [ ] Inserire dati autentici: `SELLER_NAME`, `SELLER_ADDRESS`, `SELLER_TAX_ID`, `PRIVACY_EMAIL`, `SUPPORT_EMAIL`, `WITHDRAWAL_POLICY`. Verificare informative, recesso, consegna, conservazione e condizioni commerciali; nessun dato è stato inventato.
- [ ] Configurare scope Production: `APP_ENV=production`, `STRIPE_MODE=live`, `ALLOW_LIVE_PAYMENTS=true`, chiave `sk_live_`, signing secret del webhook LIVE del dominio esatto; non promuovere la configurazione Preview.
- [ ] `ENABLE_AUTOMATIC_JOBS=true` necessario per i rimborsi promessi dalle condizioni. Verificare nell’hosting i due cron `daily` e `cleanup`, autenticazione Bearer, timeout, limiti del piano e notifiche degli errori. Daily è pianificato alle 07:00 UTC; cleanup alle 07:30 UTC.
- [ ] Configurare e verificare Turnstile, Upstash e Resend produzione. Non riutilizzare segreti staging. L’allowlist email limita solo ambienti non-production.
- [ ] Eseguire `npm run production:check -- --env-file .env.production.local`: deve riportare FORMATO OK. Non è prova di rete, di titolarità account o di attivazione Stripe.
- [ ] Applicare solo migrazioni `migrate deploy` al DB produzione esplicitamente confermato, poi `migrate status`. Non usare reset/db push/seed sul DB commerciale.
- [ ] Preparare una build Production con il dominio e le variabili definitive, verificarla prima di assegnare il dominio pubblico; mantenere la precedente versione per rollback compatibile con le migrazioni additive.
- [ ] Controllare HTTPS/cookie/CDN e completare una verifica autorizzata LIVE coerente con il piano commerciale; monitorare webhook/email/cron e riconciliare qualsiasi esito ambiguo.
- [ ] Registrare data, commit, URL, responsabile ed evidenza dei controlli online. Solo allora dichiarare produzione operativa.

Non è necessario rendere pubblico il repository per risolvere i permessi Vercel. La modifica della visibilità non fa parte di questo rilascio.
