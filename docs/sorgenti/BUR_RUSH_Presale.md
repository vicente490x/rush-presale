# BUR — Business User Requirements

## 1. Scopo e contesto
RUSH vuole raccogliere ordini della propria maglietta prima di impegnare la produzione. La piattaforma riduce il lavoro manuale su quantità, pagamenti, scadenze e comunicazioni, mantenendo esplicita la decisione di avviare la produzione e quella di chiudere la raccolta. La fonte primaria è SPEC.md, sezioni 1–18; la richiesta di completamento aggiunge account ADMIN persistente, visualizzatore GLB e documenti di consegna.

La baseline analizzata è il commit 0e3ee36. Il candidato 2.2.0 conserva il prodotto unico, il pagamento ospitato e gli stati esistenti. Il confronto con il repository Progetto-ATM riguarda esclusivamente l’organizzazione BUR/FUD/TAD, la distinzione fra atteso e osservato e il registro Excel. Nessun requisito funzionale ATM appartiene a RUSH.

## 2. Obiettivi e attori
| Attore | Esigenza e responsabilità |
|---|---|
| Cliente | Comprendere la prevendita, scegliere taglia/quantità, pagare e ricevere conferma |
| Amministratore RUSH | Governare raccolta e produzione, controllare ordini, rimborsi e consegne |
| PR / organizzazione evento | Eseguire la consegna; nessun account applicativo dedicato previsto |
| Gestore tecnico | Configurare ambienti, credenziali, migrazioni, monitoraggio e ripristino |
| Titolare del servizio | Fornire dati autentici, approvare condizioni e autorizzare il lancio LIVE |
| Servizi integrati | Stripe conferma pagamenti/rimborsi; Resend invia email; Turnstile e Redis proteggono gli accessi |

Gli indicatori operativi disponibili sono pezzi validi, soglia, pagato lordo, rimborsato, netto, scadenze e stato consegna. Non sono definiti obiettivi quantitativi di conversione o SLA nel capitolato; non vengono attribuiti risultati economici non misurati.

## 3. Requisiti funzionali e accettazione
P1 indica requisito indispensabile al rilascio; P2 indica un miglioramento richiesto alla presentazione o manutenzione. Ogni criterio è verificabile con i casi nel registro Excel e i riferimenti FUD.

| ID | SPEC | Priorità | Requisito e criterio di accettazione |
|---|---|---|---|
| BUR-001 | 2, 14, 17 | P1 | Logo immediato; accesso principale denominato PRE-SALE; percorso home → prodotto |
| BUR-002 | 3, 6 | P1 | Prezzo iniziale 25 EUR e totale calcolato dal server; taglie XS–XXL e quantità validate |
| BUR-003 | 3 | P1 | Foto originali navigabili e ingrandibili; selezione conservata nel modulo |
| BUR-004 | Estensione 3D | P2 | GLB fornito come voce del carosello; rotazione, zoom, fronte/retro, pausa/ripresa e ripristino |
| BUR-005 | Estensione 3D, 14 | P2 | Caricamento su selezione, avanzamento, fallback, touch separato dal carosello e movimenti ridotti |
| BUR-006 | 3, 4 | P1 | Conteggio quantità pagate e valide aggiornato automaticamente; soglia iniziale 15 configurabile |
| BUR-007 | 4, 12 | P1 | Soglia raggiunta genera avviso admin e non chiude la raccolta; ordini oltre soglia ammessi |
| BUR-008 | 5 | P1 | Apertura/chiusura manuale; nuove prenotazioni bloccate dopo chiusura, ordini precedenti conservati |
| BUR-009 | 6 | P1 | Checkout Stripe e conferma autorevole da evento autenticato; nessun dato carta persistito |
| BUR-010 | 6 | P1 | Registrazione codice, cliente, taglia, quantità, importi, date e stati; email di conferma |
| BUR-011 | 7, 16 | P1 | Condizioni visibili e accettazione obbligatoria; versione accettata immutabile per ordine |
| BUR-012 | 8 | P1 | Scadenza individuale due mesi di calendario dal pagamento; adeguamento fine mese |
| BUR-013 | 8, 12 | P1 | Alla scadenza senza produzione: richiesta rimborso, stato riconciliato, avviso cliente e admin |
| BUR-014 | 9 | P1 | Avvio e completamento produzione amministrativi; avvio ferma nuovi rimborsi automatici |
| BUR-015 | 10 | P1 | Account ADMIN attivo, login/logout e sessione revocabile; pagine e API inaccessibili agli anonimi |
| BUR-016 | Estensione admin | P1 | Bootstrap da input protetto o variabili; hash bcrypt, assenza duplicati e nessuna password nei log |
| BUR-017 | 10 | P1 | Dashboard completa: totali, soglia, taglie, incassi, stati, scadenze e rimborsi |
| BUR-018 | 11 | P1 | Ordini ricercabili, filtrabili, paginati; export CSV/XLSX con riepilogo taglie |
| BUR-019 | 12 | P1 | Preavviso iniziale sette giorni prima della scadenza senza produzione; deduplicazione |
| BUR-020 | 13 | P1 | Gestione consegna serata RUSH / PR / consegnata con audit |
| BUR-021 | 3, 10 | P1 | Configurazione del prodotto unico: listino, taglie, limiti e condizioni versionate |
| BUR-022 | 15 | P1 | HTTPS, cookie protetti, Origin, anti-bot e limitazione tentativi; errore servizi nega operazioni |
| BUR-023 | 15 | P1 | Backup e ripristino verificabili senza sovrascrivere il database attivo |
| BUR-024 | 16 | P1 | Pagine privacy, cookie, termini e rimborsi; dati venditore autentici prima di LIVE |
| BUR-025 | 14 | P2 | Layout responsive, controlli accessibili, navigazione tastiera e alternativa al 3D |
| BUR-026 | Estensione QA | P1 | Installazione, lint, tipi, build e regressioni ripetibili; risultati reali distinguibili dalle prove bloccate |
| BUR-027 | Estensione docs | P1 | Manuale, BUR, FUD, TAD, registro test, rapporto e README coerenti con l’implementazione |

## 4. Requisiti non funzionali
La sicurezza deve restare server-side: nascondere un comando non autorizza una chiamata API. Le sessioni sono rifiutate in caso di errore DB; il checkout non deve proseguire se Redis o la verifica anti-bot falliscono. Il prezzo non proviene dal browser. Gli errori pubblici devono evitare segreti e dettagli del provider.

Il 3D non deve penalizzare l’ingresso iniziale: libreria e modello sono caricati soltanto alla selezione. Le fotografie restano disponibili per dispositivi senza WebGL. L’interfaccia rispetta la preferenza reduced-motion. Non viene dichiarata una conformità WCAG completa senza audit dedicato.

La manutenzione richiede migrazioni versionate, lockfile, test, errori applicativi minimizzati e audit delle operazioni amministrative. Gli esiti economici ambigui devono essere riconciliabili senza duplicare addebiti o rimborsi. Il deployment mantiene staging e produzione separati e non applica migrazioni durante la build.

## 5. Vincoli e perimetro
Il progetto usa la struttura Next.js esistente. Non include account clienti, catalogo multi-prodotto, spedizioni, marketplace, ricostruzione del GLB o virtual try-on. Le tabelle storiche ignorate nel client Prisma rimangono per compatibilità; non vengono eliminate dal database.

I dati commerciali e le configurazioni di produzione non sono modificati nel collaudo. Le credenziali non possono essere predefinite pubbliche. L’account di collaudo è distinto dall’amministratore del servizio. Il nuovo branch è feature/rush-final-release; non è previsto un merge automatico su main.

## 6. Accettazione e limitazioni
La validazione tecnica locale richiede i test eseguibili e la build riuscita; il rapporto documenta gli esiti puntuali. L’accettazione commerciale richiede inoltre pagamento TEST reale con webhook, recapito email, rimborso remoto, cron, configurazione LIVE, dati venditore e backup del servizio. I test con provider sostituiti non soddisfano da soli questi criteri.

Il TAD descrive i meccanismi e il registro Excel collega requisito, procedura, atteso, osservato ed evidenza. Un requisito implementato può restare NON VERIFICATO nell’ambiente remoto. Il rilascio tecnico del branch e l’apertura delle vendite sono due decisioni distinte.
