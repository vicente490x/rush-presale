# Casi di test — conferma pagamento e rilascio

Aggiornamento 28 ottobre 2026. Esiti eseguiti e limiti sono nel [report di finalizzazione](11_FINALIZZAZIONE_LIVE.md). La presenza di un caso in questa matrice non significa PASS.

| ID | Prerequisito / azione | Risultato atteso | Copertura |
|---|---|---|---|
| PAY-01 | Ordine PAID, sessione complete/paid, intent succeeded e charge coerenti | Importo, valuta, data, carta e ultime quattro cifre autentici; nessun oggetto Stripe grezzo | Unitario |
| PAY-02 | Charge card.wallet apple_pay/google_pay | Etichetta corretta; assenza wallet non inventa Apple/Google Pay | Unitario + UI simulata; dispositivo reale aperto |
| PAY-03 | Metadata, Session/PI, importo, valuta o livemode differenti | Nessun PAID, verifica rifiutata | Unitario |
| PAY-04 | Ritorno dal checkout prima del webhook o unpaid | PENDING, niente totale pagato/metodo inventati; polling successivo | Unitario + UI simulata; E2E esterno aperto |
| PAY-05 | Sessione expired o ordine FAILED non pagato | Pagamento non completato; collegamento pre-sale | Unitario + UI simulata |
| PAY-06 | PI/charge non espansi o incoerenti | Errore di verifica senza dati sensibili | Unitario |
| PAY-07 | Cookie valido, alterato, scaduto, altra orderNumber o secret ruotato | Solo il cookie valido autorizza; refresh consentito | Unitario |
| PAY-08 | GET ordine con solo codice, senza cookie | 403 uniforme prima della ricerca; nessuna informazione cliente/pagamento | HTTP su DB isolato |
| PAY-09 | Cookie valido, ordine senza sessionId | 503; nessuna chiamata provider o finta conferma | HTTP su DB isolato |
| PAY-10 | Risposta 403/503, pulsante ricontrolla | Nessun vecchio riepilogo; riprova funziona | UI con API simulata |
| PAY-11 | Viewport 1440 e 390 px, refresh e home | Dati leggibili, codice lungo senza overflow, home raggiungibile | Chromium con API simulata |
| PAY-12 | Stessa sessione/evento webhook consegnati due volte | Un ordine pagato, ledger idempotente, outbox deduplicata | Integrazione/HTTP con firme/fixture; replay esterno aperto |
| PAY-13 | Checkout reale Stripe TEST da modulo, stesso browser | Redirect alla conferma, cookie emesso, PAID solo dopo DB+Stripe, email ricevuta | Manuale esterno BLOCCANTE |
| PAY-14 | Annullamento Stripe TEST | Ritorno `/presale?annullato=1`, avviso corretto, nessun PAID | Codice esistente; E2E esterno aperto |
| ADM-01 | Utente ADMIN persistente, hash bcrypt, password errata | Accesso negato, messaggio generico e limitatore | Unitario/integrazione/HTTP |
| ADM-02 | Sessione valida, scaduta/revocata, account inattivo o password cambiata | Solo identità e sessione valide autorizzano pagine e API | Integrazione/HTTP |
| ADM-03 | Login utente reale dopo PAY-13 | Dashboard/ordini, export, logout; accesso successivo negato | Manuale esterno BLOCCANTE |
| UI-01 | Home, prodotto, taglia/quantità, foto, 3D, fallback | Nessuna regressione desktop/mobile, preferenze conservate | Browser su Next+DB isolato |
| OPS-01 | DB loopback temporaneo, migrazioni, backup e restore | Migrazioni applicate, dati/strutture coerenti dopo restore | Pipeline |
| OPS-02 | Runtime LIVE + provider separati, segreti e dati venditore | Audit e preflight production superati; nessun TEST nel LIVE | Manuale/strumentato esterno BLOCCANTE |
| OPS-03 | Dominio mittente, ordine TEST, outbox e inbox | Consegna effettiva, retry senza duplicati | Manuale esterno BLOCCANTE |

Le prove esterne devono registrare ambiente, SHA, timestamp, ordine e riferimenti evento minimizzati, esito e responsabile. Non allegare password, cookie, chiavi API, URL database o dati carta completi. Un mock di Stripe/Resend valida il contratto applicativo, non il provider.
