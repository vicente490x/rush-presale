# REL-01 — Piano di rilascio e registro rischi

**Release 2.1.2 · 26 ottobre 2026**

## Sequenza e gate

| Gate | Condizione di uscita | Stato |
|---|---|---|
| G1 — Baseline | SPEC letta, matrice tracciata, perimetro definito | Completato |
| G2 — Candidato tecnico | Pulizia, build, test, migrazioni e audit senza errori bloccanti | Completato sul codice candidato ff34c4b |
| G3 — Integrazione repository | Staging verificato e main allineato con merge tracciato | Stato di integrazione registrato nella PR #2 e nella cronologia Git |
| G4 — Collaudo pubblico TEST | Deployment READY, smoke anonimo, percorso desktop e servizi TEST reali | Smoke disponibile; flusso provider completo aperto |
| G5 — Vendita LIVE | Configurazione finale, dati venditore, backup, cron, provider e approvazione commerciale | Aperto |

La pubblicazione del codice su main non attiva automaticamente vendite LIVE. Il progetto deve mantenere la configurazione TEST fino alla chiusura di G5.

## Procedura Git e Vercel

- Pubblicare il candidato sul branch staging e attendere il workflow sul commit esatto.
- Risolvere le divergenze con main scegliendo la baseline funzionale corrente e preservando la cronologia; evitare force push.
- Dopo verifiche riuscite, integrare main e controllare che codice, documenti e asset corrispondano al candidato approvato.
- Confermare team Wrath e progetto `prj_97dQzkl8OOPj6ZEz8irYoQQFOZxe`. Esistono riferimenti storici a un altro ambito `vicente-8f24`: i relativi errori non descrivono il dominio Wrath corrente.
- Distribuire il commit esatto con scope ambiente corretto; le migrazioni precedono il deploy solo quando necessarie e sulla destinazione verificata.
- Verificare READY e alias https://rush-presale.vercel.app/ . Non considerare l’assenza di errori di build come prova di pagamento o ricezione email.

## Checklist per il servizio commerciale

- [ ] Dati venditore e contatti autentici inseriti; informative, condizioni e recesso verificati.
- [ ] Database produzione separato, TLS/ruoli minimi e backup/ripristino provato.
- [ ] Stripe TEST completo: ordine, ritorno, webhook, email e rimborso; nessun duplicato su retry.
- [ ] Stripe LIVE, webhook LIVE e dominio finale appartenenti all’account commerciale corretto.
- [ ] Turnstile sul dominio esatto e Redis produzione verificati anche in errore.
- [ ] Resend e mittente verificato; recapito effettivo delle comunicazioni.
- [ ] Cron effettivi, Bearer, timeout, batch e monitoraggio verificati.
- [ ] Preflight produzione senza errori, nuove password e segreti distinti.
- [ ] Collaudo desktop/mobile, console e protezioni sul dominio definitivo.
- [ ] Responsabile servizio, assistenza e gestione incidenti assegnati.
- [ ] Build Production finale verificata prima dell’assegnazione del dominio; rollback pronto.
- [ ] Approvazione del titolare e conferma lancio registrate.

## Avanzamento operativo 2.1.1

| Attività | Evidenza | Stato |
|---|---|---|
| Webhook Stripe TEST | Account Sandbox di eccomerce confermato dal titolare; endpoint canonico abilitato con gli otto eventi gestiti | Verificato nel provider |
| Pagamento TEST completo | Nessuna sessione Checkout presente nell’account alla verifica iniziale | Aperto |
| Recupero anti-bot | Feedback dopo attesa, errori/scadenze, browser non supportati e nuovo tentativo; validazione server mantenuta | Implementato; feedback e blocco senza token osservati nel browser desktop |
| Backup/ripristino procedura | pg_dump custom e pg_restore transazionale su database locali separati; dati/relazioni/checksum conservati | PASS locale; backup commerciale aperto |
| Configurazione e connettività | Audit sul deployment: staging PASS, Stripe/webhook e Redis PASS; Neon raggiungibile e migrazioni attuali, trasporto da verificare; Resend OPEN | Esiti registrati in QA-01 |
| Dati e approvazione venditore | Non ancora forniti per questa release | Aperto, impedisce LIVE |

I riscontri definitivi di build/deploy e servizi vanno registrati nel rapporto di collaudo. La conferma dell’account TEST non autorizza a considerare configurato un account LIVE.

## Registro rischi

| ID | Rischio / effetto | Priorità | Azione e responsabile |
|---|---|---|---|
| R01 | Configurazione LIVE non verificata: ordini non incassati correttamente | Alta | Titolare e gestione tecnica: chiudere prove provider prima di G5 |
| R02 | Dati venditore incompleti: informative e assistenza non operative | Alta | Titolare: fornire e approvare dati e testi |
| R03 | Backup non provato: recupero non garantito | Alta | Gestione tecnica: ripristino su DB separato, misurare RPO/RTO |
| R04 | Cron/backlog oltre capacità: ritardo notifiche o rimborsi | Alta | Gestione tecnica: monitoraggio e revisione frequenza/batch su volumi reali |
| R05 | Rimborso o email ambiguo dopo timeout | Alta | Amministratore e gestione tecnica: riconciliare, non ripetere con nuova chiave |
| R06 | Chiusura mentre esiste Checkout in corso | Media | QA e gestione tecnica: verificare annullamento, retry e finestra di gara sul provider |
| R07 | Layout o CAPTCHA non verificati su dispositivo mobile | Media | QA: eseguire collaudo su dispositivi effettivi |
| R08 | Lock globale e pool insufficienti per il traffico | Media | Gestione tecnica: misurare carico prima di campagne con maggiori volumi |
| R09 | Check CI non obbligatorio sul branch | Media | Proprietario repository: configurare protezioni e Deployment Checks compatibili con il piano |

## Consegna e accettazione

Il referente progetto approva deliverable e rapporto di collaudo; il titolare approva G5. Nessun campo aperto viene chiuso con una semplice modifica testuale. Data, commit, dominio, evidenza e responsabile devono accompagnare la decisione.

## Azioni per chiudere G5

| Prerequisito | Azione concreta | Criterio di chiusura |
|---|---|---|
| Titolare e informative | Fornire ragione sociale/nome ufficiale, sede, dati fiscali, contatti assistenza/privacy e procedura di recesso effettiva; revisionare i testi | Campi reali pubblicati e accettazione del titolare registrata |
| Neon | Collegare il progetto esistente, verificare endpoint/pooler/TLS, separazione TEST/LIVE, ruoli e politiche backup; ripristinare su destinazione nuova | Evidenza provider e lettura applicativa della copia; tempi misurati, nessuna sovrascrittura del DB attivo |
| Resend | Verificare dominio e mittente nel provider; eseguire invio TEST a destinatario autorizzato e verificare ricezione | ID messaggio, accettazione e recapito documentati senza credenziali nei report |
| Percorso cliente | Completare controllo anti-bot su browser/dispositivo supportato, effettuare un ordine Stripe TEST e relativo rimborso | Sessione, ordine, webhook, email e rimborso riconciliati; retry senza duplicati |
| Stripe LIVE | Collegare l’account commerciale corretto e configurare chiave e webhook LIVE separati usando i segreti Vercel | Preflight produzione riuscito e controlli provider completati |
| Esercizio | Assegnare assistenza/incidenti, verificare cron effettivi e backlog sul volume atteso, predisporre rollback | Evidenza di esecuzione e responsabili individuati |
| Lancio | Completare preflight e checklist prima di impostare le conferme di lancio | G5 chiuso con data, commit e approvazione del titolare |

Il collegamento Stripe disponibile è il sandbox TEST, non un accesso LIVE. Il database è identificato come Neon, ma l’accesso di gestione al provider non è stato ancora collegato. La richiesta di completare il piano non sostituisce dati autentici, accessi o prove effettive.

## Avanzamento Neon 2.1.2

- Accesso di gestione Neon collegato; progetto e database identificati rispetto al sito.
- Snapshot manuale creato e ripristino effettivo eseguito nel provider; dati di tutte le 14 tabelle e tre migrazioni confrontati senza differenze.
- Due branch distinti presenti: originale production predefinito e staging usato dal sito TEST.
- Calendario automatico ancora OPEN: la funzione è rifiutata dall’account/progetto. Non è stato richiesto o attivato un cambio piano.
- Privilegi runtime minimi e segreti distinti ancora OPEN: ruoli dedicati non aggiunti, approvazione titolare necessaria.
- Il controllo SQL TLS è affiancato da un handshake con verifica CA/hostname sull’endpoint del client.
- Dati venditore, Stripe LIVE, email con recapito provato e flusso economico completo restano aperti.

Questi riscontri aggiornano le voci precedenti rimaste aperte per assenza di accesso Neon. Il ripristino manuale è ora provato; la continuità dei backup, i privilegi e l’accettazione commerciale richiedono ancora chiusura esplicita.

**Esito finale TLS:** verificato online TLS 1.3 con certificato/hostname validati sia su DATABASE_URL sia su DIRECT_URL. Il punto di verifica del trasporto aperto nelle release precedenti è chiuso; il dato interno del proxy rimane separato. La configurazione staging e le pipeline del codice sono PASS.
