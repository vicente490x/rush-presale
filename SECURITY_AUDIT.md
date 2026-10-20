---
noteId: "44f8a010cc8411f1a8d8071bcfefd596"
tags: []

---

# RUSH PRE-SALE — Security audit

> Chiusura/preparazione del 20 ottobre: [STAGING_FINAL_PREPARATION.md](STAGING_FINAL_PREPARATION.md) verifica il candidato corrente e aggiunge SEC-14/SEC-15, corretti. I conteggi storici sotto non sostituiscono le nuove esecuzioni: 19 unitari, 35 test riportati dall'integrazione e 28 controlli HTTP.

**SECURITY NOT READY FOR STAGING**

Revisione iniziata il 16 ottobre e verifiche finali eseguite il **20 ottobre 2026**, a partire da `7a6794d`, branch `staging`. Le patch locali e i test essenziali passano. Restano da verificare configurazione e servizi dello staging; un hash admin storico richiede inoltre gestione operativa. Questo audit non è una certificazione di sicurezza o GDPR.

## Ambito ed evidenze

Esaminati SPEC.md, AUDIT.md, STAGING_REPORT.md, manifest e lockfile, configurazione Next/Prisma/Vercel, modelli ambiente, route API, componenti admin, autenticazione, checkout, webhook, rimborsi, cron, email, storage e try-on. Le ripetizioni di AUDIT.md sono state deduplicate durante la lettura. Le righe sotto si riferiscono ai sorgenti dopo la patch.

Stack installato: Next.js **16.4.2**, React/React DOM **19.3.0**, Prisma/Client **6.12.0**, PostgreSQL, Stripe SDK **18.5.0**, Sharp **0.35.5**; presenti Resend, Upstash, Turnstile, Supabase e fal.ai. Il try-on resta disabilitato nella demo.

Usati esclusivamente dati sintetici e schemi casuali nel database temporaneo `rush_audit_test` su loopback. Operazioni finanziarie e invio email usano test double espliciti; la verifica delle firme webhook usa il vero SDK Stripe. Nessun deploy, push, pagamento reale, invio email reale, foto a provider o modifica di infrastruttura esterna.

## Rilievi e correzioni

### SEC-01 — CRITICAL upstream: framework antecedente alla patch di sicurezza

- **Evidenza:** `package.json:32`, `package.json:43`, `package-lock.json`. Il checkpoint usava Next e @next/env 16.4.0.
- **Rischio:** gli advisory upstream comprendono RCE condizionale con Cache Components e typed array, RCE dell'optimizer SVG su glibc e DoS tramite Server Actions. Non sono presenti `use cache`, Cache Components o Server Actions applicative; Sharp era già 0.35.5. Non è stata dimostrata una RCE raggiungibile in questa applicazione. La gravità CRITICAL è quella dell'advisory, non una prova di compromissione.
- **Patch e stato:** **CORRETTO**. Next e @next/env fissati a 16.4.2, lockfile aggiornato senza major indiscriminati. Sharp verificato a 0.35.5.
- **Regressione:** build, typecheck, lint, unità, integrazione e HTTP passano; `npm audit` riporta zero vulnerabilità. L'assenza di segnalazioni npm non sostituisce la lettura degli advisory.
- **Fonte:** [aggiornamento ufficiale Next.js del 14 ottobre 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026), consultato nuovamente il 20 ottobre; [advisory del progetto](https://github.com/vercel/next.js/security/advisories).

### SEC-02 — MEDIUM: logout senza revoca della copia del cookie

- **Evidenza:** `lib/admin-auth.ts:5`, `app/api/admin/logout/route.ts:1`, `prisma/schema.prisma:239`, `components/AdminDashboard.tsx:41`, `lib/staging-auth.ts:4`.
- **Scenario:** una copia del JWT amministrativo restava utilizzabile fino alla scadenza anche dopo il logout; cambiare la password non invalidava la firma.
- **Patch e stato:** **CORRETTO**. Identificatore casuale per sessione, digest nel DB, controllo di revoca/scadenza/attore a ogni autorizzazione, revoca prima di cancellare il cookie. Firma legata all'hash password, claim obbligatori e durata massima di 12 ore. La rotazione della password invalida anche il gate staging. La UI segnala un logout fallito invece di simulare l'uscita.
- **Migrazione:** `20261016000200_security_sessions` crea soltanto tabella e indice. Richiesto nuovo login dopo l'aggiornamento. DB indisponibile comporta accesso negato.
- **Regressione:** sessioni uniche, token alterato o di altro ambito rifiutato, rotazione password, copia del token dopo logout rifiutata anche via HTTP. Login bcrypt reale e budget brute force verificati.

### SEC-03 — HIGH: associazione e riconciliazione rimborsi troppo permissive

- **Evidenza:** `lib/refunds.ts:15`, `lib/stripe-events.ts:20`.
- **Scenario:** il fallback sui soli metadata poteva riconciliare un rimborso prima dell'associazione di un pagamento verificato o riferirlo a un ordine con un altro PaymentIntent. Il servizio non ricontrollava tutti gli attributi dei rimborsi restituiti. Richiedeva un evento Stripe valido e dati provider incoerenti/fuori ordine; non costituiva un endpoint pubblico per inventare rimborsi.
- **Patch e stato:** **CORRETTO**. Ordine PAID e PaymentIntent esatto obbligatori; valuta, ID unici, importi interi positivi e totale entro l'importo dell'ordine. Metadata da soli non associano il pagamento. Un rimborso anticipato resta ritentabile senza registrare l'evento come completato.
- **Regressione:** PI/valuta errati, ID duplicati e importi eccessivi producono rollback; rimborso prima del pagamento si riconcilia dopo l'evento corretto; metadata di un altro PI vengono rifiutati. Verificati rimborsi parziali, eventi obsoleti, concorrenza, timeout e riconciliazione dopo accettazione provider senza una seconda creazione.

### SEC-04 — MEDIUM: CSP permissiva e cache da rendere esplicita

- **Evidenza:** `lib/security-headers.ts:1`, `proxy.ts:10`, `app/layout.tsx:6`, `lib/http.ts:43`, `next.config.ts:17`.
- **Scenario:** script inline/eval ammessi riducevano la difesa contro un'eventuale injection; header di cache non uniformi rendevano meno esplicita la protezione di pagine e risposte autenticate. Nessuna XSS o fuga CDN è stata riprodotta.
- **Patch e stato:** **CORRETTO nel codice**. Nonce casuale per richiesta, propagato al rendering Next e imposto in risposta; niente `unsafe-inline`/`unsafe-eval` per gli script di produzione, handler inline vietati. Rendering dinamico, no-store per HTML/API e cache CDN, inclusi errori admin. `Referrer-Policy: no-referrer`. Gli stili inline restano ammessi per i componenti esistenti.
- **Regressione:** tutti gli script inline non vuoti nell'HTML testato hanno il nonce corretto; nonce diverso nella richiesta successiva; header CSP/cache/referrer verificati via server compilato. Esecuzione JavaScript, Turnstile e comportamento CDN reale ancora da verificare.
- **Riferimento:** [CSP e nonce in Next.js](https://nextjs.org/docs/app/guides/content-security-policy).

### SEC-05 — MEDIUM latente: multipart e decodifica immagini senza limiti completi

- **Evidenza:** `lib/http.ts:16`, `app/api/tryon/route.ts:74`, `:82`, `:151`, `:182`.
- **Scenario:** se il try-on fosse riattivato, un upload chunked senza Content-Length poteva raggiungere il parser prima del controllo della dimensione; immagini compresse con molti pixel aumentavano l'uso di memoria. Mancava il controllo Origin in questa route.
- **Patch e stato:** **CORRETTO nel codice; funzione ancora DISABILITATA**. Lettura limitata a 9 MiB prima del parsing, Origin verificata, token massimo 4096 caratteri, massimo 25 milioni di pixel in ingresso/uscita. Conservati magic-byte, formati consentiti, limiti dei file e normalizzazione senza metadati.
- **Regressione:** multipart valido accettato e corpo chunked oltre il limite rifiutato; endpoint disabilitato restituisce 503 senza elaborare immagini. Nessun test end-to-end fal.ai/Sharp/storage con foto reali.

### SEC-06 — MEDIUM: identità rate limit derivata da header falsificabili

- **Evidenza:** `lib/ratelimit.ts:31`, `lib/db-ratelimit.ts:1`.
- **Scenario:** su un server esposto direttamente, cambiare X-Real-IP/X-Forwarded-For poteva cambiare il bucket e aggirare i limiti.
- **Patch e stato:** **CORRETTO** per il deployment previsto. X-Forwarded-For usato soltanto in ambiente Vercel e dopo validazione IP; altrove bucket condiviso conservativo. Non impostare manualmente `VERCEL=1` su server diretti.
- **Regressione:** header spoofati ignorati sul server diretto, IP Vercel validato; 12 incrementi concorrenti con budget 5 concedono esattamente 5 tentativi. Login bloccato dal limite persistente.
- **Limite:** provenienza degli header e distribuzione reale fra istanze Vercel non verificate. [Documentazione header Vercel](https://vercel.com/docs/headers/request-headers).

### SEC-07 — LOW: superficie optimizer immagini eccessiva

- **Evidenza:** `next.config.ts:8`.
- **Scenario:** un wildcard remoto Supabase inutilizzato ampliava le sorgenti richiedibili all'optimizer. Anche i percorsi locali erano meno restrittivi del necessario.
- **Patch e stato:** **CORRETTO**. Nessuna sorgente remota; soltanto logo e due mockup locali con query vuota.
- **Regressione:** l'optimizer serve il logo; URL remoto e percorso API admin ricevono 400. Nessuna richiesta a host esterni durante il test.

### SEC-08 — MEDIUM: log tecnici potenzialmente contenenti dati sensibili

- **Evidenza:** `lib/prisma.ts:10`, `app/api/tryon/route.ts:206`, `:212`, `:218`.
- **Scenario:** errori Prisma/provider completi possono includere argomenti, identificativi personali o URL firmati accessibili agli operatori dei log.
- **Patch e stato:** **CORRETTO nel codice**. Disattivato logging Prisma automatico degli errori; catch try-on usa codici fissi. Restano errori applicativi minimizzati e un codice fisso per indisponibilità della lettura sessione.
- **Verifica:** revisione dei sink, build e test di error handling. Non verificati accessi, retention e redazione dei log nei provider; nessuna dichiarazione di assenza assoluta di dati nei log infrastrutturali.

### SEC-09 — MEDIUM latente: finestra di upload senza registrazione per cleanup

- **Evidenza:** `lib/storage.ts:12`.
- **Scenario:** interruzione del worker dopo upload ma prima dell'inserimento nel DB lasciava una foto senza traccia per la pulizia.
- **Patch e stato:** **CORRETTO nel codice**. L'intento di cleanup viene persistito prima dell'upload; eventuali upload falliti lasciano al massimo un'intenzione di pulizia.
- **Verifica:** ordine delle operazioni revisionato, typecheck/build passano. Upload, permessi bucket, rimozione di oggetti assenti, retention provider e scheduler NON testati. Non riattivare il try-on su questa sola evidenza.

### SEC-10 — LOW: concorrenza tra consegna e rimborso

- **Evidenza:** `app/api/admin/orders/[id]/delivery/route.ts:12`.
- **Scenario:** il controllo di eleggibilità della consegna poteva avvenire prima di un rimborso concorrente e la modifica dopo di esso.
- **Patch e stato:** **CORRETTO**. La transazione consegna acquisisce lo stesso lock delle operazioni finanziarie prima di leggere lo stato.
- **Regressione:** modifica consegna concorrente a una transazione di rimborso non aggiorna l'ordine diventato non idoneo; risposta 409. Verificata anche consegna ordinaria con audit via HTTP.

### SEC-11 — MEDIUM: scritture DB provocabili da webhook non autenticati

- **Evidenza:** `app/api/stripe/webhook/route.ts:18`.
- **Scenario:** inviare firme errate causava una riga persistente di errore per richiesta, consentendo consumo del database senza autenticazione.
- **Patch e stato:** **CORRETTO**. Prima della verifica firma non vengono più scritti record DB; solo codice console fisso. Errori di elaborazione di eventi autenticati restano diagnosticabili.
- **Regressione:** firma errata restituisce 400 e il conteggio ApplicationError non cambia. Rate limit/WAF e costo dei log infrastrutturali restano verifiche operative.

### SEC-12 — MEDIUM: hash admin in snapshot Git locale storica

- **Evidenza:** oggetto Git `0259ba428ab5`, percorso `prisma/dev.db`, snapshot `refs/codex/turn-diffs/checkpoints/d46499cb1d07147891a6b2f5cea77922/ee04b920dcc9fa82ba7576d4c67dd864/1792070231862/dc64e563-3989-4550-ba6f-cb355836828a`.
- **Scenario:** condividere indiscriminatamente le refs o il repository locale trasferirebbe un vecchio SQLite di test con hash admin, esposto ad attacchi offline. La revisione precedente aveva rilevato ordini sintetici; non si presume che una password storica non sia stata riutilizzata.
- **Stato:** **APERTO operativo**. L'oggetto non è raggiungibile dalla cronologia di branch/tag/remote esaminata e non è nel working tree tracciato. Nessun hash riportato, nessuna revoca/cancellazione o riscrittura Git eseguita.
- **Azione:** non trasferire refs interne né usare push mirror/all; usare credenziali staging nuove. Se la password storica è ancora usata altrove, sostituirla e invalidarne le sessioni. Un'eventuale bonifica della cronologia richiede decisione esplicita del proprietario.
- **Verifica:** scansione read-only di 320 blob storici, inclusi oggetti delle refs tree, e controllo separato della raggiungibilità dai branch.

### SEC-13 — HIGH operativo: configurazione staging e servizi non verificati

- **Evidenza:** `.env.staging.example:1`, `scripts/staging-check.ts:1`, `.env.local` ignorato (valori omessi).
- **Scenario:** usare la configurazione di sviluppo nella demo impedirebbe di garantire separazione dati, credenziali robuste, gate, webhook e protezioni distribuite.
- **Stato:** **APERTO; pubblicazione bloccata**. Preflight locale: 28 requisiti non soddisfatti. È un controllo di formato, non una prova di vulnerabilità di un deployment esistente. Non è stato creato alcun deployment.
- **Azione e verifica:** completare SECURITY_DEPLOY_CHECKLIST.md su ambiente autorizzato e separato. Nessuna chiave mancante inventata e nessun servizio esterno dichiarato verificato.

## Controlli senza nuove vulnerabilità riprodotte

### Aggiornamento mirato SEC-14 — MEDIUM, timeout rate limit

`lib/ratelimit.ts:32`: verificando il fail-closed richiesto per staging è emerso che la libreria Upstash restituisce un permesso con `reason=timeout` dopo 5 secondi. Una rete lenta poteva quindi saltare il limite. **CORRETTO:** questo risultato genera un errore e impedisce il checkout; credenziali assenti/errori di rete non autorizzano la richiesta. Regressione con SDK reale, timer controllato e fetch sostituito in `tests/staging-preparation.test.ts`: PASS, nessuna rete esterna. Verifica distribuita del provider ancora necessaria. [Fonte Upstash](https://upstash.com/docs/redis/sdks/ratelimit-ts/features).

### Aggiornamento mirato SEC-15 — MEDIUM, form credenziali senza metodo

`components/StagingLogin.tsx`, `components/AdminLogin.tsx`: il form gate privo di metodo poteva usare il GET nativo prima dell'idratazione/senza JavaScript, inserendo la password nella query e quindi nella cronologia/log URL. **CORRETTO:** metodo POST e action espliciti su entrambi i login, avviso noscript; fallback non JSON rifiutato. `scripts/test-http.ts` verifica il markup della build per entrambi: PASS. Non è una prova browser; nessuna esposizione effettiva di password è stata constatata.

### Evidenze precedenti ancora valide

- Ogni handler admin esaminato applica autorizzazione indipendente dalla UI; pagine admin protette anche server-side. Tutti i metodi protetti sono testati senza cookie; mutazioni con Origin esterna rifiutate. Cookie HttpOnly, Secure in staging/produzione, SameSite Strict per admin e Lax per gate.
- Prezzo e valuta derivano dai dati server; quantità, taglie, revisione listino e consenso sono validati. Schemi strict impediscono mass assignment. Soglia raggiunta non chiude la vendita; chiusura e manutenzione impediscono nuovi checkout.
- Il ritorno da Checkout non conferma pagamenti. Webhook: body originale limitato, firma SDK, divieto live, importo/valuta/PI/sessione verificati, ledger univoco e outbox deduplicata. Due pagamenti distinti simultanei sono conteggiati una volta ciascuno.
- Intenti rimborso persistenti, chiavi idempotenti, riconciliazione prima di creare, blocco prudenziale oltre 23 ore e lock comune con avvio produzione. Fallimento definitivo richiede retry amministrativo esplicito. La produzione avviata non può essere invertita; trigger DB verificato.
- Query raw applicative limitate a tre usi parametrizzati/statici; nessun metodo Unsafe trovato. Snapshot prezzo, termini e scadenze non cambiano al variare delle impostazioni. Nessuna migrazione distruttiva eseguita.
- Lookup pubblico ordine espone uno stato ridotto, senza nome/email/indirizzo; nuovi codici casuali da 128 bit. Export solo admin, CSV con neutralizzazione formule e XLSX con celle stringa.
- Nessun `dangerouslySetInnerHTML` applicativo individuato. Redirect originano da configurazione o percorsi fissi; nessuna CORS wildcard nelle API esaminate. Errori pubblici senza stack o credenziali.
- Email server-side tramite outbox, lease, idempotency key e destinatari consentiti in staging; nessuna API pubblica di invio arbitrario. Affidabilità reale del provider ancora non verificata.
- Lockfile v3: 290 voci, URL risolti solo su registry npm, integrity presente per le voci risolte. Script install: Prisma/client/engines, esbuild e fsevents, più `prisma generate` del progetto. SDK AI/storage ancora importati dal codice disabilitato; nessuna rimozione indiscriminata.

## Segreti e limiti

Scansione euristica di 122 file tracciati al momento del controllo, 320 blob Git e 20 bundle JavaScript browser: nessuna chiave live o token provider concreto trovato con i pattern usati. Le URL con password individuate nei sorgenti sono interpolazione di variabile o fixture. Nei bundle non compaiono neppure gli 8 valori locali sensibili confrontati per uguaglianza; nessuna source map browser trovata. L'hash storico è SEC-12. Questi controlli non dimostrano l'assenza di ogni possibile formato di segreto.

Browser collegati disponibili: zero. Il controllo HTTP della build non equivale a rendering/interazione browser, verifica CAPTCHA reale, TLS/CDN, ruoli DB, backup, consegna email o transazione Stripe TEST effettiva.

Risultati e tentativi falliti: [SECURITY_TEST_RESULTS.md](SECURITY_TEST_RESULTS.md). Patch: [SECURITY_FIX_REPORT.md](SECURITY_FIX_REPORT.md). Condizioni ancora necessarie: [SECURITY_DEPLOY_CHECKLIST.md](SECURITY_DEPLOY_CHECKLIST.md) e [SECURITY_REMAINING_RISKS.md](SECURITY_REMAINING_RISKS.md).
