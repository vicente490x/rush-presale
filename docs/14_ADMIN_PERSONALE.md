# Amministratore personale — provisioning e collaudo

Il comando `admin:provision` crea un account distinto in `AdminUser`, con ruolo ADMIN, bcrypt costo 12 e ID deterministico derivato dall’email normalizzata. Riutilizza le tabelle e il servizio esistenti: nessuna migrazione aggiuntiva, duplicazione dell’autenticazione o modifica degli account presenti.

## Destinazione autorizzata

Per il candidato usare esclusivamente Neon `rush`, branch **staging** (`br-small-silence-b4yadi7i`), database `neondb`, schema `public`. Host diretto verificato: `ep-sparkling-shape-b4ke4md1.c-6.us-east-2.aws.neon.tech`.

Il ruolo runtime `rush_staging_app` ha SELECT su AdminUser e INSERT su AdminSession, ma non INSERT/UPDATE su AdminUser. Per il provisioning serve una connessione amministrativa autorizzata al solo staging, per esempio il proprietario disponibile nel pannello Neon. Non aumentare i privilegi runtime e non inserire la connessione del proprietario in DATABASE_URL di Vercel.

## Password attraverso un canale sicuro

1. Confermare l’email personale, distinta dall’account principale. Non inviare password o hash in chat.
2. Nel computer del gestore, preparare `.env.staging.admin.local`, ignorato da Git e accessibile soltanto al gestore. Copiare le connessioni dal pannello Neon dopo aver selezionato il branch staging. Non usare questo file come ambiente runtime Next.

```dotenv
APP_ENV=staging
STAGING_DATABASE_CONFIRMED=true
DATABASE_URL=<connessione-staging-con-sslmode=require&sslaccept=strict>
DIRECT_URL=<connessione-diretta-amministrativa-staging-con-sslmode=require&sslaccept=strict>
```

3. In un terminale interattivo locale, nella repository:

```powershell
npm.cmd run admin:provision -- --env-file .env.staging.admin.local --environment staging --expected-host ep-sparkling-shape-b4ke4md1.c-6.us-east-2.aws.neon.tech --email "<email-personale-confermata>"
```

4. Digitare due volte una password unica di almeno 16 caratteri e massimo 72 byte UTF-8, senza caratteri di controllo. Il terminale mostra soltanto asterischi. La password non entra negli argomenti, nella cronologia, nei log o nei file. Solo bcrypt viene persistito in Neon; non viene stampato.

Il comando rifiuta esecuzioni senza terminale interattivo, URL mancanti, host non confermato, TLS non rigoroso, database/schema differenti e conflitti d’identità. Non eredita URL mancanti dalla shell e usa DIRECT_URL per questa operazione. Un account personale già presente e attivo produce un esito idempotente senza modifiche; un account disattivato non viene riattivato. Non impostare ADMIN_PASSWORD o sostituire ADMIN_PASSWORD_HASH del vecchio account.

## Verifica sul candidato

Accedere a `/admin/login` con email e password, completando Turnstile. Controllare dashboard e ordini, uscire con ESCI e verificare che un cookie copiato non conceda più accesso. Confermare che l’account principale continui a funzionare e che un browser anonimo sia respinto da pagine e API admin. Non registrare cookie, password o hash nelle evidenze.

Le suite locali verificano questi controlli con identità temporanee in schemi isolati di PostgreSQL: non creano utenti demo su Neon e non sostituiscono il collaudo dell’account personale.

## Rollback

Se il candidato non supera i gate, mantenere la PR aperta e il deployment di produzione invariato. Un rollback applicativo al commit precedente ripristina il login del solo account principale, conservando i dati e l’account personale; quest’ultimo non sarà utilizzabile con quel codice. Non cancellare AdminUser, sessioni, ordini o migrazioni. Per revocare un account personale realmente creato, seguire un’operazione separata autorizzata e mirata, lasciando invariato l’admin principale.
