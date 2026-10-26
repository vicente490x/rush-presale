# REL-01 — Piano di rilascio e registro rischi

**Release 2.1.0 · 26 ottobre 2026**

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
