# RUSH 2.2.0 — Account ADMIN persistente, carosello 3D e dossier di consegna

Il login precedente dipendeva esclusivamente dall’hash d’ambiente e la galleria mostrava soltanto fotografie. Questa modifica aggiunge AdminUser con ruolo ADMIN, inizializzazione idempotente e verifica dell’account nelle sessioni, e integra il GLB originale come quarta slide con caricamento su richiesta, controlli e fallback.

La migrazione è additiva: non modifica ordini o impostazioni. Il bootstrap conserva gli account esistenti e non stampa credenziali. Logout, disattivazione e cambio hash invalidano le sessioni. Il carosello conserva foto, taglia, quantità e totale; la CSP supporta decoder WebAssembly e texture blob senza abilitare eval JavaScript. È corretto anche il mismatch di idratazione della home con reduced-motion.

## Validazione

La verifica ripetibile è `npm run verify:release`. I risultati effettivi, gli exit code e gli hash dei log sono in [evidenze/esecuzione.json](evidenze/esecuzione.json); dettaglio in [Rapporto di collaudo](Rapporto_Collaudo_RUSH_Presale.docx) e [registro Excel](Casi_di_Test_RUSH_Presale.xlsx). Integrazione/HTTP usano PostgreSQL reale isolato con provider controllati; il browser usa GLB e pagine reali. Mobile è emulato in Chromium.

Esiti locali: 36 casi unitari, 40 casi di integrazione, 33 controlli HTTP e 10 controlli browser superati. Superati anche installazione, audit (zero vulnerabilità), lint, tipi, schema, build, migrazione e backup/ripristino. Il registro mantiene 8 casi BLOCKED e 3 NOT RUN per servizi remoti, deploy, dispositivi fisici e carico; non sono considerati PASS.

## Sequenza di rilascio

1. Verificare backup e destinazione staging, applicare la migrazione additiva.
2. Inizializzare l’amministratore autorizzato con `create-admin` e il file ambiente dedicato.
3. Distribuire il candidato approvato e verificare nuovo login, API e asset GLB. Le vecchie sessioni devono autenticarsi nuovamente.
4. Completare checkout TEST remoto, email, rimborso, CAPTCHA, cron e dati venditore prima di LIVE.

Il codice è sul branch `feature/rush-final-release`, destinazione prevista `main`. Nessun merge o deploy automatico. I documenti DOCX/XLSX e i sorgenti sono in docs; le evidenze storiche precedenti restano datate e separate.
