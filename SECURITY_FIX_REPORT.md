# Correzioni per il rilascio — 26 ottobre 2026

Base: staging `ed9e464`. I risultati precedenti sono consultabili nella cronologia Git; questa versione descrive il candidato corrente.

- **SEC-16 — HIGH upstream, corretto:** audit npm ha rilevato Zod <4.6.6 con consumo incontrollato di memoria nella validazione delle collezioni (GHSA-mrhx-c7xc-m3w5). Aggiornato a **4.6.7 esatto**, lockfile coerente, unità/integrazione/HTTP/build rieseguiti. Audit successivo: zero vulnerabilità note. I body delle richieste restano limitati prima del parsing. Fonte primaria: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 . Non è stato dimostrato un esaurimento memoria raggiungibile su questa applicazione prima della patch.
- **Separazione produzione:** modalità TEST predefinita, LIVE permesso solo con ambiente e chiavi coerenti e configurazione produzione completa; evento firmato e sessione devono corrispondere alla modalità. Nessuna chiave live o transazione reale usata. Test del processore con evento LIVE sintetico e PostgreSQL locale.
- **Preflight produzione:** controlli condivisi con staging, bcrypt 12–16, segreti distinti, provider, DB produzione confermato, cron e dati venditore. Output con soli nomi/requisiti, senza valori.
- **Migrazioni produzione:** file ambiente esplicito e confermato; niente fallback agli URL di sviluppo; solo validate/status/deploy con il file dedicato.
- **Test ripetibili:** loader Node senza IPC tsx, nuove regressioni Origin/Turnstile/body/cron e cleanup HTTP. Workflow CI con PostgreSQL isolato e permessi contents:read, nessun segreto provider.
- **Preparazione pubblicazione:** scheduler cleanup aggiunto, testi admin senza etichetta TEST fuorviante in produzione; banner di test anche se APP_ENV=production con STRIPE_MODE=test. Dati legali letti lato server e renderizzati come testo React; informative aggiornate per AI disabilitata.
- **Documenti:** matrice dei requisiti, checklist, rischi, risultati, guida deploy e guida Stripe aggiornati. I requisiti esterni non verificati non sono segnati PASS.

Restano valide le difese già presenti su sessioni, CSRF, body limitati, CSP, rate limit, webhook firmati, snapshot e idempotenza, ricontrollate dai test correnti. [Risultati](SECURITY_TEST_RESULTS.md) · [Rischi aperti](SECURITY_REMAINING_RISKS.md).
