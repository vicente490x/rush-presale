# Rischi e requisiti operativi ancora aperti

26 ottobre 2026. I test locali correnti sono in [SECURITY_TEST_RESULTS.md](SECURITY_TEST_RESULTS.md); criteri di rilascio in [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md).

## Bloccanti per la dichiarazione online/commerciale

1. **Vercel:** accesso al team `Wrath` ancora 403. Il progetto visibile appartiene a un ambito diverso dal deployment `vicente-8f24` bloccato sul precedente push. Occorre autorizzare il team corretto e verificare commit, branch, log, ambiente e READY. Nessun rebuild remoto è dichiarato completato.
2. **Configurazione autentica:** DB/TLS/ruoli/backup e prova ripristino, Stripe e webhook, Resend/mittente, Turnstile/hostname e Upstash devono essere verificati nei rispettivi provider. Una fixture valida o un flag CONFIRMED non prova questi requisiti.
3. **Dati del venditore:** ragione sociale/nome, sede, identificativo fiscale, contatti privacy/assistenza e procedura di recesso devono essere forniti e verificati dal titolare. Sono campi server configurabili, non dati inventati. Le pagine aggiornate non costituiscono una revisione legale.
4. **Collaudo browser/online:** esecuzione desktop/mobile, console/CSP, CAPTCHA, Checkout TEST e ritorno, email, rimborsi e cron sul dominio effettivo restano aperti. Il tentativo di preparare Chromium non è riuscito; non è stata eseguita verifica visuale.
5. **Segreti e cron:** usare password admin nuova e segreti distinti per ambiente. Il precedente audit citava un hash SQLite storico locale: questa esecuzione non ha a disposizione quella storia locale e non ne ricertifica la gestione. Se la password è stata riutilizzata, sostituirla. Verificare scheduler e monitoraggio prima di promettere rimborsi automatici in produzione.

## Limiti residui del progetto

- Il lock globale evita gare su stock/pagamenti/produzione ma limita il throughput; test di carico e dimensionamento del pool non eseguiti.
- Rimborsi e email con esito ambiguo oltre 23 ore richiedono riconciliazione manuale. L’idempotenza limita duplicazioni, non sostituisce il controllo del provider.
- Daily elabora batch limitati: verificare che i volumi reali rientrino nella frequenza/timeout del piano; monitorare `moreDue`, backlog e errori. Nessun cambiamento di piano a pagamento effettuato.
- Cleanup elimina soltanto sessioni/rate limit e asset temporanei scaduti; retention di ordini, audit, ricevute webhook, outbox e backup deve essere definita. Nessun ordine economico eliminato per accorciare i log.
- Mancano verifica CDN e protezione hosting effettive. Gli header dell’app non certificano la configurazione del provider.
- Il workflow GitHub è passato sul candidato codice `4d61f8a`; per impedire release con controlli falliti servono branch protection/Deployment Checks nel progetto. Non sono stati modificati permessi amministrativi GitHub.
- `npm audit` rileva soltanto gli advisory noti al controllo. La patch Zod non è una garanzia generale sulla supply chain.
- L’AI rimane disabilitata. Riattivarla richiede revisione separata di privacy, storage, provider, cancellazione e quote.

**Verdetto: candidato verificato localmente, requisiti esterni ancora aperti. Nessuna vendita LIVE attivata.**
