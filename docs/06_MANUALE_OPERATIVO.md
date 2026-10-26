# OPS-USER-01 — Manuale utente e amministratore

**Release 2.1.0 · 26 ottobre 2026**

## Cliente

1. Aprire il dominio del servizio e selezionare PRE-SALE.
2. Consultare fotografie, prezzo, disponibilità taglie e contatore.
3. Scegliere taglia e quantità; inserire nome, cognome ed email.
4. Leggere condizioni della pre-sale e termini. Accettare solo se si intende procedere.
5. Completare la verifica anti-bot e selezionare PRE-SALE.
6. Completare il pagamento nella pagina Stripe. Al ritorno, attendere la conferma del provider.
7. Conservare codice ordine ed email. Un ordine in elaborazione non è ancora una conferma di pagamento.

Se la pagina mostra il banner PAGAMENTI DI TEST, il servizio è in collaudo e non è aperto per vendite commerciali LIVE. Se la raccolta è chiusa, il pulsante viene sostituito dal messaggio di chiusura.

## Accesso amministratore

Aprire `/admin/login`. Usare la password prevista dalla configurazione autorizzata e completare il controllo anti-bot. La password non deve essere comunicata a clienti o PR. La sessione dura al massimo 12 ore; il logout ne revoca l’utilizzo anche se il cookie è stato copiato.

Se il login non riesce, verificare credenziali, CAPTCHA, limite tentativi e diagnostica tecnica senza disattivare le protezioni. Con DB non disponibile il backoffice nega l’accesso.

## Gestione della raccolta e della produzione

| Operazione | Quando usarla | Effetto |
|---|---|---|
| Modificare impostazioni | Aggiornamento autorizzato del listino/condizioni | Nuova revisione; gli ordini precedenti mantengono lo snapshot |
| Chiudere PRE-SALE | Decisione di interrompere la raccolta | Blocca nuovi checkout e richiede annullamento/riconciliazione di quelli aperti |
| Riaprire PRE-SALE | Nuova decisione commerciale | Consente nuove prenotazioni senza azzerare la produzione |
| Avviare produzione | Soglia raggiunta e avvio effettivo | Timestamp irreversibile; stop nuovi rimborsi automatici per mancato avvio |
| Completare produzione | Produzione già avviata e terminata | Avanzamento dello stato; non chiude automaticamente la raccolta |

Il raggiungimento della soglia non è un comando di chiusura e non sostituisce la conferma dell’avvio reale della produzione.

## Ordini, rimborsi e consegne

Usare ricerca, filtri e paginazione per trovare l’ordine. Prima di effettuare un rimborso verificare codice, pagamento, importo già rimborsato e stato provider. La conferma del rimborso è un’operazione economica effettiva nella modalità Stripe configurata.

PENDING significa che l’esito deve essere riconciliato. Non impostare manualmente REFUNDED e non creare un secondo tentativo con una nuova chiave per un timeout ambiguo. Un esito FAILED definitivo richiede verifica prima del retry manuale autorizzato.

Gli stati consegna sono Da consegnare, Serata RUSH, PR e Consegnata. La modifica è ammessa su ordini pagati senza rimborso. Il sistema registra l’attore e la variazione nell’audit.

## Export e notifiche

L’export CSV/XLSX rispetta i filtri applicati. Il foglio Produttore riporta i pezzi pagati non interamente rimborsati per taglia. Applicare filtri se si supera il limite di 10.000 righe. Gli export contengono dati personali: conservarli e condividerli soltanto con i destinatari autorizzati.

La soglia genera notifica amministrativa; il pagamento genera conferma cliente; scadenza e rimborso generano le rispettive comunicazioni. L’outbox attesta l’accodamento; la ricezione finale va verificata nel provider e nella casella. In staging gli invii sono limitati all’allowlist.

## Diagnostica

Le impostazioni permettono anteprima scadenze senza effetti, esecuzione del controllo effettivo, verifica DB, email di verifica e riconciliazione checkout. Leggere la conferma prima delle azioni effettive: possono inviare email o richiedere rimborsi.

Per un’anomalia registrare codice ordine, orario UTC, operazione e messaggio. Non inviare password, token, dati carta o URL DB nelle segnalazioni.
