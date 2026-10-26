> Aggiornamento 26 ottobre 2026: accesso pubblico senza password condivisa. Le istruzioni storiche sul gate di staging sono superate; vedere [PUBLIC_ACCESS_RELEASE.md](./PUBLIC_ACCESS_RELEASE.md). Amministrazione ancora protetta.

# RUSH — PRE-SALE

Progetto esistente Next.js 16 / React 19 / Prisma 6 / PostgreSQL. Logo, mockup, home e stile RUSH sono preservati. SPEC.md è la fonte funzionale; AUDIT.md riporta requisito, implementazione, stato iniziale/finale e test.

La preparazione riguarda una demo privata con **Stripe esclusivamente TEST**. Le chiavi live sono rifiutate dal codice. Nessun deploy o modifica di servizi esterni è stato eseguito. Leggere il verdetto in [STAGING_REPORT.md](STAGING_REPORT.md) prima di presentare il progetto come pronto.

## Documentazione

- [AUDIT.md](AUDIT.md): requisiti SPEC e richieste aggiuntive, problemi e verifiche.
- [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md): repository privato, database separato, credenziali, variabili Preview, protezione, deploy autorizzato e rollback.
- [STRIPE_SETUP.md](STRIPE_SETUP.md): route reale `/api/stripe/webhook`, eventi test, prova completa e riconciliazione.
- [STAGING_REPORT.md](STAGING_REPORT.md): risultati effettivi e verifiche ancora da eseguire.

## Sviluppo locale

Node 22/24 supportati (verificato con Node 24.21.0); PostgreSQL richiesto. Su Windows con restrizioni PowerShell usare `npm.cmd` al posto di `npm`.

```powershell
npm ci
npm run dev
```

Next carica `.env.local`, ignorato da Git. Se manca, partire da `.env.example` e compilare le variabili: non sovrascrivere una configurazione esistente. L'eventuale script `scripts/setup-local-postgres.ps1` modifica un DB locale dedicato e chiede la password PostgreSQL: leggerlo prima di eseguirlo. Non è stato eseguito durante questo audit; i test hanno usato un cluster temporaneo diverso.

Per creare un nuovo admin locale usare `npm run admin:setup` nel proprio terminale: salva hash e segreto in `.env.local` senza mostrarli. Il bypass Turnstile per il solo login admin locale richiede APP_ENV=development, hostname localhost e modalità non-production. Non esiste bypass del pagamento o della firma Stripe. Il checkout richiede sempre configurazione Stripe TEST, Turnstile e Upstash.

- Home: http://localhost:3000
- PRE-SALE: http://localhost:3000/presale
- Login amministratore: http://localhost:3000/admin/login
- Dashboard: /admin
- Impostazioni: /admin/impostazioni
- Gate staging: /anteprima

Per generare credenziali staging senza password in chiaro: `npm run staging:credentials`. Usare `.env.staging.example` e la procedura Vercel; non impostare APP_ENV=staging su un database che contiene clienti.

## Verifiche

```powershell
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

`lint` è ESLint (TypeScript/React Hooks), distinto dal typecheck. Postinstall e build generano soltanto Prisma Client: nessuna migrazione o seed automatico.

I test con database richiedono una connessione PostgreSQL temporanea su localhost, con nome `rush_audit*`:

```powershell
$env:RUSH_TEST_DATABASE_URL='postgresql://UTENTE@127.0.0.1:PORTA/rush_audit_test'
npm run test:migration
npm run test:integration
npm run test:http
```

Ogni esecuzione crea uno schema nuovo; il DB dell'app non viene usato. Stripe e Resend sono test double dichiarati. La suite HTTP avvia la build di produzione su 127.0.0.1:3100, poi la arresta; richiede la build/origine test descritta in DEPLOY_VERCEL.md. Non equivale al test visivo in un browser o al checkout esterno.

## Logica e limiti

Prezzo iniziale 25 EUR, soglia 15, taglie XS–XXL, durata due mesi calendario e preavviso sette giorni sono default nel DB. Le impostazioni operative si modificano dall'admin. Soglia minima e disponibilità sono indipendenti; superare la soglia non chiude la PRE-SALE.

Il checkout crea prima PENDING e salva uno snapshot di prezzo, quantità, condizioni, consegna e durata. Solo eventi Stripe verificati confermano il pagamento. La pagina di successo legge lo stato. Gli ordini pagati non cambiano quando cambia il listino.

I rimborsi restano PENDING fino a esito Stripe confermato, con chiavi e riconciliazione persistenti. L'avvio produzione ha un timestamp irreversibile e non riapre la condizione di rimborso automatico. I cron staging eseguono dry-run; l'admin può autorizzare esplicitamente un controllo TEST.

Le email non-production sono limitate alla allowlist. La prova AI è esclusa perché non prevista da SPEC.md; il codice precedente è conservato ma non è presentato come attivo nella demo. Le pagine legali contengono ancora dati del venditore da completare prima di qualsiasi attività commerciale. Nessuna autorizzazione a pagamenti reali è implicita in questo lavoro.
