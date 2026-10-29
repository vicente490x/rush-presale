# Rapporto di collaudo RUSH Presale

## Aggiornamento 28 ottobre 2026

Il [report di finalizzazione](../11_FINALIZZAZIONE_LIVE.md) e la [matrice dei nuovi casi](../12_CASI_TEST_FINALI.md) documentano l'estensione della conferma pagamento, gli esiti correnti e i gate aperti. I risultati del 27 ottobre riportati sotto restano validi come evidenza storica del candidato precedente, non come prova automatica del nuovo SHA. Stato rilascio: **BLOCCATO**, in attesa delle verifiche esterne elencate nel report aggiornato.

## 1. Identificazione e ambiente
Candidato 2.2.0, branch feature/rush-final-release, baseline 0e3ee36. Data delle prove: 27/10/2026. Windows, PostgreSQL 18.6 locale isolato, provider Stripe/Resend controllati, browser Chromium e mobile emulato. Nessuna vendita remota. Runtime Node v24.15.0; browser 156.0.8078.4. I log e gli hash delle esecuzioni sono conservati in docs/evidenze/esecuzione.json.

## 2. Verifiche realmente eseguite

| Comando | Esito | Evidenza |
|---|---|---|
| npm ci | PASS, exit 0 | evidenze/install.log |
| npm audit --audit-level=high | PASS, exit 0 | evidenze/audit.log |
| npm run lint | PASS, exit 0 | evidenze/lint.log |
| npm run typecheck | PASS, exit 0 | evidenze/typecheck.log |
| npm run test | PASS, exit 0 | evidenze/test.log |
| npm run db:validate | PASS, exit 0 | evidenze/db-validate.log |
| npm run build | PASS, exit 0 | evidenze/build.log |
| npm run test:integration | PASS, exit 0 | evidenze/test-integration.log |
| npm run test:migration | PASS, exit 0 | evidenze/test-migration.log |
| npm run test:backup | PASS, exit 0 | evidenze/test-backup.log |
| npm run test:http | PASS, exit 0 | evidenze/test-http.log |
| npm run test:browser | PASS, exit 0 | evidenze/test-browser.log |

Il comando unitario esclude esplicitamente il contenitore PostgreSQL, eseguito separatamente da test:integration. I risultati del registro sono casi nominati e controlli di tool: non vanno sommati come se fossero tutti test unitari.

## 3. Risultati per livello
test: 36 casi nominati PASS nel registro.

test-integration: 40 casi nominati PASS nel registro.

test-http: 33 casi nominati PASS nel registro.

test-browser: 10 casi nominati PASS nel registro.

Gli handler HTTP sono stati verificati su Next compilato con PostgreSQL reale e webhook firmati tramite SDK su fixture. Stripe e Resend esterni non sono stati chiamati. Il browser usa il GLB originale e asset locali; le prove admin usano un account temporaneo con sessione DB valida.

## 4. Anomalie riscontrate e correzioni

| Anomalia | Correzione | Regresso verificato |
|---|---|---|
| Identità admin solo da ambiente | AdminUser persistente, ruolo ADMIN, bootstrap idempotente e controllo account su ogni sessione | Integrazione e HTTP |
| CSP bloccava WebAssembly | Aggiunta wasm-unsafe-eval, senza abilitare eval JavaScript | Browser da home a PRE-SALE e test CSP |
| Controllo HTTP confondeva wasm-unsafe-eval con unsafe-eval | Confronto dei token CSP completi; eval JavaScript resta vietato | Suite HTTP ripetuta dopo la correzione del test |
| Texture GLB non renderizzate per blocco dei blob | connect-src consente blob locali; controllo errori console oltre alle eccezioni | Texture e screenshot browser |
| Inquadratura originale tagliava il modello | Distanza iniziale adattiva 105%, limiti zoom espliciti | Screenshot desktop/mobile e ripristino |
| Home con reduced-motion causava mismatch di idratazione | Markup particelle stabile e disattivazione tramite media query CSS | Browser reduced-motion, console senza errori |
| Assenza WebGL non produceva tempestivamente il fallback | Controllo WebGL2 prima di importare il motore | Browser avviato con WebGL disabilitato |
| Reinstallazione bloccata su esbuild in uso dal runner | Verifica release avviata con Node nativo senza tsx | npm ci e sequenza finale completati |
| Sandbox Windows impediva avvio tsx e PostgreSQL | Esecuzione dei runner autorizzati fuori sandbox, sempre su loopback isolato | Esecuzioni finali registrate |

Un tentativo browser ha incontrato un timeout del renderer software; la ripetizione con il renderer standard ha prodotto le evidenze finali. I tentativi intermedi non sono usati come PASS. Nessun dato di produzione è stato modificato.

## 5. Screenshot e verifiche visive
Le immagini del manuale provengono dal browser reale sul server locale: home, prodotto, viewer fronte/retro, mobile, fallback, login, dashboard e impostazioni. Il mobile è emulato in Chromium, non un certificato Safari/iOS. È verificata la presenza delle texture e l’assenza di errori CSP nel percorso positivo.

## 6. Prove non verificate

| Modulo | Stato | Causa |
|---|---|---|
| Stripe TEST remoto | BLOCKED — NON VERIFICATA | Credenziali provider e sessione browser anti-bot dell’ambiente remoto non disponibili nel collaudo locale. |
| Recapito email | BLOCKED — NON VERIFICATA | Non eseguito invio esterno; nessuna credenziale Resend configurata nella verifica. |
| Rimborso remoto | BLOCKED — NON VERIFICATA | Dipende dalla transazione TEST remota e dalle credenziali autorizzate. |
| Turnstile e Redis remoti | BLOCKED — NON VERIFICATA | Token interattivo e credenziali remote non configurati. |
| Cron Vercel | BLOCKED — NON VERIFICATA | Nessun deploy o cambio configurazione remoto del candidato eseguito. |
| Backup commerciale | BLOCKED — NON VERIFICATA | Eseguito soltanto backup/ripristino PostgreSQL locale; evidenze storiche non riutilizzate come nuova prova. |
| Dati venditore e condizioni | BLOCKED — NON VERIFICATA | Dati e approvazione del titolare non forniti per il candidato. |
| Safari/iOS e Android fisici | NOT RUN — NON VERIFICATA | Mobile emulato Chromium verificato; hardware e browser differenti non eseguiti. |
| Carico e capacità | NOT RUN — NON VERIFICATA | Non esiste un volume obiettivo concordato; nessuna capacità prestazionale dichiarata. |
| Admin del servizio | BLOCKED — NON VERIFICATA | Creati esclusivamente account di collaudo isolati; credenziali reali non fornite. |
| Deploy candidato | NOT RUN — NON VERIFICATA | Branch locale preparato; nessuna pubblicazione o merge automatico. |

## 7. Pulizia e sicurezza della consegna
I cinque documenti DOCX e il registro XLSX sono verificati per integrità ZIP/XML, riapertura, struttura e formule. Il rendering in Microsoft Office non è stato eseguito. Il registro comprende casi nominati e controlli degli strumenti; i riepiloghi conservano separatamente PASS, FAIL, BLOCKED e NOT RUN.

I test automatici e la diagnostica admin sono conservati. La pagina /anteprima resta un redirect di compatibilità; il login staging ritirato restituisce 410. Nessuna pagina demo del pacchetto 3D è pubblicata. Il banner TEST è mantenuto negli ambienti di collaudo e assente con production/live, senza nascondere la modalità dei pagamenti. Le tabelle storiche ignorate restano intatte.

## 8. Valutazione finale del rilascio
Il candidato ha superato le verifiche tecniche locali registrate ed è preparato per revisione tramite Pull Request. Il rilascio commerciale LIVE non è certificato: richiede bootstrap dell’admin reale, migrazione sulla destinazione verificata, collaudo provider, dati venditore, backup e scheduler del servizio. Non è stato eseguito un deploy né un merge del candidato.
