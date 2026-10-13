SITO PRE-SALE MAGLIETTE RUSH — SPECIFICHE TECNICHE

1. Obiettivo del progetto

Realizzare un sito web semplice, veloce, intuitivo e mobile-first dedicato esclusivamente alla PRE-SALE delle magliette Rush.

Il sistema deve consentire agli utenti di prenotare e pagare una maglietta al prezzo di 25€, scegliendo la propria taglia.

La produzione delle magliette viene avviata esclusivamente al raggiungimento di una soglia minima di 15 pezzi prenotati.

È importante distinguere tra:

- raggiungimento della soglia minima, che permette di avviare la produzione;
- chiusura della PRE-SALE, che è una decisione separata e determina quando non vengono più accettati nuovi ordini.

Il raggiungimento dei 15 pezzi NON deve chiudere automaticamente la PRE-SALE.

---

2. Home page

All'apertura del sito deve comparire immediatamente il logo Rush.

La home deve essere molto essenziale e avere un unico accesso principale alla vendita:

PRE-SALE

Non deve essere presente un pulsante "Acquista", "Compra" o "Acquista T-Shirt".

Il pulsante e il riferimento principale all'interno del sito devono essere sempre denominati:

PRE-SALE

Cliccando su "PRE-SALE" l'utente accede alla pagina dedicata alla maglietta.

---

3. Pagina PRE-SALE

La pagina deve contenere:

- foto/mockup della maglietta;
- prezzo: 25€;
- selezione della taglia;
- eventuale selezione della quantità;
- pulsante PRE-SALE;
- spiegazione chiara del funzionamento;
- contatore dei pezzi prenotati.

Esempio:

RUSH T-SHIRT

25€

TAGLIA
XS / S / M / L / XL / XXL

PRE-SALE

12 / 15 PEZZI PRENOTATI

3 pezzi mancanti per raggiungere la soglia minima di produzione.

Il contatore deve aggiornarsi automaticamente dopo ogni pagamento confermato.

---

4. Logica della soglia minima

La soglia minima è fissata a:

15 MAGLIETTE

Il sistema deve conteggiare automaticamente tutti gli ordini pagati e validi.

Quando vengono raggiunti i 15 pezzi:

- il sistema deve inviare una notifica all'amministratore;
- il pannello admin deve indicare chiaramente che la soglia è stata raggiunta;
- deve essere possibile impostare lo stato su "PRODUZIONE AVVIATA".

IMPORTANTE

Il raggiungimento dei 15 pezzi non deve chiudere la PRE-SALE.

Esempio:

15 / 15 → produzione possibile, ma PRE-SALE ancora aperta.

16 / 15 → nuovo ordine accettato.

17 / 15 → nuovo ordine accettato.

18 / 15 → nuovo ordine accettato.

E così via, fino alla chiusura manuale della PRE-SALE.

Questo permette di continuare a raccogliere ordini anche dopo l'avvio della produzione, se necessario.

---

5. Apertura e chiusura della PRE-SALE

La PRE-SALE deve avere uno stato gestibile dall'amministratore.

PRE-SALE APERTA

Gli utenti possono:

- selezionare la taglia;
- effettuare l'ordine;
- pagare i 25€;
- ricevere la conferma dell'ordine.

PRE-SALE CHIUSA

Quando l'amministratore decide di chiudere la PRE-SALE, il sito deve:

- impedire nuovi ordini;
- impedire nuovi pagamenti;
- sostituire il pulsante PRE-SALE con un messaggio tipo:

PRE-SALE CHIUSA

Gli ordini già effettuati devono rimanere registrati e continuare a essere gestiti normalmente.

La chiusura della PRE-SALE deve essere manuale dal pannello amministratore e non deve avvenire automaticamente al raggiungimento dei 15 pezzi.

---

6. Ordini e pagamento

Il prezzo è:

25€ per maglietta

L'utente deve selezionare la taglia e completare il pagamento online.

Ogni ordine deve essere registrato nel database con almeno:

- numero ordine;
- nome e cognome;
- email;
- taglia;
- quantità;
- importo pagato;
- data e ora del pagamento;
- stato del pagamento;
- data di scadenza dei due mesi;
- stato dell'ordine.

Dopo il pagamento completato, l'utente deve ricevere una conferma dell'ordine via email.

---

7. Condizioni della PRE-SALE

Prima del pagamento deve essere chiaramente indicato che si tratta di una PRE-SALE.

Testo indicativo:

«ATTENZIONE — PRE-SALE

Questa maglietta viene prodotta esclusivamente al raggiungimento di un minimo di 15 pezzi pre-ordinati.

La maglietta non è quindi immediatamente disponibile.

Una volta raggiunta la soglia minima, la produzione potrà essere avviata.

La consegna avverrà durante una serata Rush oppure tramite uno dei nostri PR di fiducia.

Qualora la produzione non venga avviata entro 2 mesi dalla data del pagamento, l'importo dell'ordine verrà automaticamente rimborsato.»

L'utente deve accettare esplicitamente le condizioni prima di procedere al pagamento.

Esempio:

☐ Ho letto e accetto le condizioni della PRE-SALE.

---

8. Scadenza dei due mesi e rimborso

Questo è un punto fondamentale del sistema.

Ogni ordine deve avere una propria data di pagamento e una propria data di scadenza a 2 mesi.

Esempio:

Pagamento:
10 ottobre 2026

Scadenza:
10 dicembre 2026

Se entro la scadenza la produzione non è stata avviata, il sistema dovrà automaticamente:

1. identificare l'ordine come scaduto;
2. avviare il rimborso dell'importo pagato;
3. aggiornare lo stato dell'ordine;
4. inviare una comunicazione all'acquirente;
5. notificare l'amministratore.

Importante

Gli ordini devono essere sempre accettati mentre la PRE-SALE è aperta, anche se la soglia dei 15 pezzi non è stata ancora raggiunta.

Se la soglia non viene raggiunta entro il termine previsto, gli ordini devono essere automaticamente rimborsati alla scadenza dei rispettivi due mesi.

---

9. Stato della produzione

Il sistema dovrebbe prevedere almeno questi stati:

PRE-SALE APERTA

Gli utenti possono effettuare nuovi ordini.

SOGLIA RAGGIUNTA

Sono stati raggiunti almeno 15 pezzi.

PRODUZIONE AVVIATA

L'amministratore conferma che la produzione è stata effettivamente avviata.

PRODUZIONE COMPLETATA

Le magliette sono state prodotte.

PRE-SALE CHIUSA

Non vengono più accettati nuovi ordini.

La modifica dello stato "PRODUZIONE AVVIATA" deve essere effettuata dall'amministratore.

Questo stato è importante perché determina il superamento della condizione che porta al rimborso automatico allo scadere dei due mesi.

---

10. Pannello amministratore

Deve essere presente un pannello admin protetto da login.

Dashboard

Visualizzare:

- pezzi totali prenotati;
- soglia minima;
- percentuale di raggiungimento;
- numero totale ordini;
- quantità per taglia;
- totale incassato;
- stato della PRE-SALE;
- stato della produzione;
- eventuali ordini prossimi alla scadenza;
- eventuali ordini da rimborsare.

Esempio:

RUSH PRE-SALE

23 / 15 PEZZI

✓ Soglia raggiunta

PRE-SALE: APERTA

PRODUZIONE: AVVIATA

---

11. Gestione ordini

Il pannello admin deve permettere di visualizzare tutti gli ordini.

Per ogni ordine:

- numero ordine;
- nome;
- cognome;
- email;
- taglia;
- quantità;
- importo;
- data pagamento;
- data scadenza;
- stato pagamento;
- stato produzione;
- stato rimborso;
- modalità di consegna.

Deve essere possibile esportare gli ordini in CSV/Excel, soprattutto per poter fornire al produttore l'elenco delle quantità e delle taglie.

Esempio riepilogo:

S — 5 pezzi
M — 10 pezzi
L — 12 pezzi
XL — 6 pezzi

---

12. Notifiche

Il sistema deve inviare automaticamente una notifica all'amministratore quando:

Raggiungimento soglia

«RUSH PRE-SALE — SOGLIA RAGGIUNTA

Sono state prenotate 15 magliette.
La produzione può essere avviata.»

Avvicinamento alla scadenza

Notifica, ad esempio, 7 giorni prima della scadenza di un ordine se la produzione non risulta ancora avviata.

Scadenza

Se la produzione non è stata avviata entro i due mesi:

«ORDINE SCADUTO — RIMBORSO AUTOMATICO»

Il sistema deve procedere automaticamente con il rimborso previsto.

---

13. Consegna

La consegna non sarà inizialmente gestita tramite spedizione standard.

Le magliette saranno consegnate:

- durante una serata Rush;
- oppure tramite i PR di fiducia.

Nel pannello admin sarebbe utile poter modificare lo stato della consegna:

- Da consegnare;
- Consegna tramite serata Rush;
- Consegna tramite PR;
- Consegnata.

---

14. Design e UX

Il sito deve essere:

- minimal;
- moderno;
- veloce;
- intuitivo;
- responsive;
- ottimizzato principalmente per smartphone;
- coerente con l'identità visiva Rush.

Il percorso deve essere estremamente semplice:

LOGO RUSH → PRE-SALE → SCELTA TAGLIA → CHECKOUT → PAGAMENTO → CONFERMA

Non vogliamo un e-commerce tradizionale con molte categorie e sezioni.

L'idea è creare una landing page di PRE-SALE con sistema di pagamento e gestione automatizzata degli ordini.

---

15. Sicurezza

Il sito deve prevedere:

- HTTPS;
- sistema di pagamento sicuro;
- area amministratore protetta;
- protezione dei dati personali;
- backup del database;
- protezione anti-spam/bot;
- gestione degli errori di pagamento;
- nessuna memorizzazione diretta dei dati delle carte sul sito.

---

16. Privacy e condizioni

Devono essere predisposte le sezioni necessarie relative a:

- Privacy Policy;
- Cookie Policy, se necessaria;
- Termini e condizioni;
- condizioni specifiche della PRE-SALE;
- condizioni di rimborso.

Le condizioni relative alla PRE-SALE devono essere chiaramente visibili prima del pagamento.

---

17. Flusso completo

FASE 1 — PRE-SALE APERTA

L'utente entra nel sito.

Vede il logo Rush.

Clicca su:

PRE-SALE

Visualizza la maglietta a 25€.

Seleziona la taglia.

Visualizza il contatore:

8 / 15

Accetta le condizioni.

Effettua il pagamento.

L'ordine viene registrato.

Il contatore diventa:

9 / 15

---

FASE 2 — RAGGIUNGIMENTO DELLA SOGLIA

Viene effettuato il quindicesimo ordine.

Il sistema mostra:

15 / 15 — SOGLIA RAGGIUNTA

L'amministratore riceve una notifica.

La PRE-SALE rimane aperta.

Possono quindi arrivare altri ordini:

16 / 15

17 / 15

18 / 15

ecc.

---

FASE 3 — PRODUZIONE

L'amministratore avvia la produzione e modifica lo stato in:

PRODUZIONE AVVIATA

Da questo momento gli ordini non sono più soggetti al rimborso automatico legato al mancato avvio della produzione entro due mesi.

La PRE-SALE può comunque rimanere aperta fino a quando l'amministratore decide di chiuderla.

---

FASE 4 — CHIUSURA

Quando l'amministratore decide di chiudere la PRE-SALE:

PRE-SALE CHIUSA

Il sito non accetta più nuovi ordini o pagamenti.

Gli ordini già effettuati rimangono nel sistema e vengono gestiti fino alla consegna.

---

18. Priorità assolute

Le funzionalità indispensabili sono:

1. Home con logo Rush.
2. Unico pulsante principale: PRE-SALE.
3. Pagina prodotto.
4. Selezione taglia.
5. Prezzo di 25€.
6. Pagamento online.
7. Registrazione automatica degli ordini.
8. Contatore dei pezzi prenotati.
9. Soglia minima configurabile di 15 pezzi.
10. Notifica al raggiungimento della soglia.
11. La soglia NON chiude la PRE-SALE.
12. La PRE-SALE viene chiusa manualmente dall'amministratore.
13. Finché la PRE-SALE è aperta, gli ordini vengono accettati.
14. Ogni ordine ha una propria scadenza di 2 mesi dalla data del pagamento.
15. Se la produzione non viene avviata entro la scadenza, il sistema procede con il rimborso automatico.
16. Pannello amministratore.
17. Gestione ordini e taglie.
18. Esportazione ordini.
19. Conferma ordine via email.
20. Gestione degli stati della produzione e della consegna.

Obiettivo finale

Realizzare un sistema estremamente semplice per l'utente:

RUSH → PRE-SALE → TAGLIA → PAGAMENTO → CONFERMA

Il sistema deve occuparsi automaticamente del conteggio degli ordini, del raggiungimento della soglia minima, delle scadenze e degli eventuali rimborsi, lasciando all'amministratore la gestione della produzione e la decisione di chiudere la PRE-SALE.