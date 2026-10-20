---
noteId: "45d9b140cc8411f1a8d8071bcfefd596"
tags: []

---

# RUSH PRE-SALE — Checklist prima della pubblicazione

> Procedura consolidata, nomi variabili, comandi Git con refspec esplicito e Prisma `--env-file`: [STAGING_FINAL_PREPARATION.md](STAGING_FINAL_PREPARATION.md). Il nuovo file staging è solo un modello ignorato; preflight autentico e conferma proprietario SEC-12 restano aperti.

20 ottobre 2026. **Nessun deploy autorizzato o eseguito da questo audit.** Le caselle vuote richiedono evidenza operativa; questa checklist non concede autorizzazione a modificare infrastrutture.

## Repository e credenziali

- [x] Patch locali e regression test completati; report disponibili.
- [x] `.env*` reali, database, backup, build e log esclusi dal tracciamento ordinario.
- [x] Dipendenze corrette, lockfile coerente e audit npm finale senza segnalazioni.
- [ ] Confermare che la password admin del vecchio SQLite non sia riutilizzata; altrimenti sostituirla e invalidare le sessioni interessate.
- [ ] Controllare il diff da condividere. Trasferire soltanto il branch revisionato; mai refs interne `refs/codex/turn-diffs/*`, push mirror o archivio completo della directory `.git`.
- [ ] Preparare password admin/anteprima nuove e diverse, bcrypt costo 12, tre segreti casuali distinti per admin/gate/cron. Usare `npm.cmd run staging:credentials` interattivamente; non condividere il file generato.
- [ ] Su Vercel inserire gli hash letteralmente, conservando `$`; non confondere l'escape dotenv con le variabili del provider.
- [ ] Rimuovere password in chiaro e vecchi flag mock. Nessuna `NEXT_PUBLIC_*` con segreti; solo URL sito e site key pubblica Turnstile.

## Database e ambiente

- [ ] Verificare PostgreSQL nuovo e separato da sviluppo/produzione. STAGING_DATABASE_CONFIRMED è un'attestazione manuale, non prova automatica dell'isolamento.
- [ ] Configurare TLS, pool runtime, connessione diretta migrazioni, privilegi minimi, backup e prova ripristino; nessun accesso anonimo.
- [ ] Preparare APP_ENV=staging, origine HTTPS definitiva e STAGING_DATABASE_CONFIRMED=true dopo la verifica.
- [ ] Eseguire `npm.cmd run staging:check -- --env-file <file-locale-ignorato>` sull'esatta configurazione staging: zero problemi richiesti, senza considerarlo un test provider.
- [ ] Applicare le tre migrazioni al solo DB staging confermato, inclusa `20261016000200_security_sessions`, prima di avviare il nuovo codice.
- [ ] Verificare nuovo login, sessioni revocate, blocco con DB indisponibile e pool per i controlli sessione.
- [ ] Mantenere TRYON_REVIEWED=false e ENABLE_AUTOMATIC_JOBS=false per la demo.

## Servizi TEST

- [ ] Verificare account e chiavi Stripe solo TEST; il codice rifiuta chiavi/eventi live anche con vecchi flag opt-in.
- [ ] Configurare webhook TEST sull'URL esatto; verificare firma, retry, duplicati, fuori ordine e che la protezione hosting non blocchi gli eventi firmati.
- [ ] Con autorizzazione ai test esterni, provare Checkout TEST → webhook → PAID → admin, quindi rimborso TEST e riconciliazione. Solo identità sintetiche e indirizzi consentiti.
- [ ] Provare pagamento incompleto, importo/quantità alterati, presale chiusa e due completamenti simultanei nello staging reale.
- [ ] Configurare Turnstile per il dominio esatto; verificare token valido/scaduto, hostname e comportamento senza JavaScript.
- [ ] Configurare Upstash; verificare fail-closed e limiti su più istanze. Verificare header IP Vercel senza fidarsi di header client.
- [ ] Configurare Resend, mittente verificato e allowlist esatta; provare conferma/rimborso senza duplicazione e riconciliazione degli invii ambigui.

## Hosting, UI e gestione

- [ ] Ottenere autorizzazione specifica prima di pubblicare; questo audit si ferma alla preparazione.
- [ ] Verificare gate su home/presale/API, admin separato, noindex, cookie Secure, HTTPS, CSP, cache CDN e redirect sul dominio reale.
- [ ] Provare in browser desktop/mobile: gate, login/CAPTCHA, navigazione, animazioni, Checkout, ritorno, conferma, admin, export e logout. Controllare risorse bloccate dalla CSP.
- [ ] Provare API admin senza cookie e con sessione revocata anche dietro la protezione hosting.
- [ ] Verificare cron con segreto corretto/errato e dry-run. `vercel.json` pianifica soltanto daily; cleanup sessioni/rate limit non pianificato. Definire pulizia periodica autorizzata senza attivare effetti finanziari automatici.
- [ ] Definire retention/accessi per ordini, outbox, webhook, audit, errori, sessioni e backup. Verificare minimizzazione log Vercel/provider.
- [ ] Fare rivedere informative, consenso, conservazione, ruoli fornitori e richieste degli interessati da un referente competente; nessuna conformità GDPR certificata.
- [ ] Ripetere audit dipendenze e test se cambia codice/configurazione; registrare versione, data, evidenze e responsabile dei controlli esterni.

Il try-on resta disabilitato. Riattivarlo richiede verifica separata di bucket privato, URL firmati, SSRF/provider, quote, pixel, cancellazione, scheduler e informativa.

**Verdetto corrente: SECURITY NOT READY FOR STAGING.**
