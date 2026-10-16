# Stripe — esclusivamente TEST

Route effettiva nel codice: **POST `/api/stripe/webhook`**, implementata in `app/api/stripe/webhook/route.ts`. Creazione checkout: **POST `/api/orders`**. Pagina di ritorno: `/conferma?code=NUMERO_ORDINE`. Non esistono `/api/webhook` o `/api/checkout`.

Nessun dominio Vercel è stato creato o pubblicato durante questo audit. La URL da registrare è l'origine HTTPS reale del futuro staging più `/api/stripe/webhook`, per esempio `https://DOMINIO-STAGING/api/stripe/webhook`; sostituire il dominio prima di usarla. Non è una URL di deployment già esistente.

## Configurazione account test

1. Nel Dashboard Stripe selezionare un ambiente/sandbox di **test** separato dall'operatività commerciale.
2. Impostare `STRIPE_SECRET_KEY=sk_test_…` solo nell'ambiente protetto, mai nel repository o in variabili `NEXT_PUBLIC_*`. Le chiavi live vengono rifiutate in ogni APP_ENV, anche con il precedente flag ALLOW_LIVE_PAYMENTS attivo.
3. Creare il webhook test sulla route sopra, senza modificarne il percorso. Copiare il relativo `whsec_…` in `STRIPE_WEBHOOK_SECRET`. Il secret della CLI locale e quello dell'endpoint Dashboard sono diversi.
4. Abilitare questi eventi realmente gestiti:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `charge.refunded`
   - `refund.created`
   - `refund.updated`
   - `refund.failed`
5. Con Deployment Protection usare il bypass automation descritto in DEPLOY_VERCEL.md. Il bypass Vercel non sostituisce la firma Stripe e non è una password admin.

Il checkout usa inizialmente solo carta. La gestione degli eventi asincroni è comunque implementata e testata localmente; l'abilitazione di altri metodi non fa parte della demo.

## Verifica completa dopo autorizzazione ai servizi esterni

- Entrare nel gate con la password anteprima, senza login admin. Usare solo nomi inventati e email autorizzate in EMAIL_ALLOWLIST.
- In PRE-SALE leggere e accettare le condizioni, scegliere taglia e quantità. Il pulsante deve restare disabilitato senza consenso/anti-bot. L'ordine PENDING deve esistere prima del checkout; prezzo e totale devono coincidere con il listino server.
- Completare il checkout con una [carta test ufficiale Stripe](https://docs.stripe.com/testing), per esempio 4242 4242 4242 4242 con data futura e CVC test. Non usare carte reali. Provare anche rifiuto, annullamento e autenticazione 3DS con i casi della documentazione Stripe.
- Verificare nel Dashboard la consegna dell'evento al percorso reale. L'ordine deve diventare PAID soltanto dopo un evento Stripe verificato; il semplice ritorno a `/conferma` non modifica il DB.
- Verificare importo, valuta, sessione e payment intent, data pagamento, scadenza individuale, snapshot prezzo e termini. Il contatore somma le quantità, non il numero degli ordini.
- Reinviare lo stesso evento dal Dashboard: il ledger e l'outbox devono rimanere unici; la diagnostica registra la nuova ricezione come duplicato.
- Raggiungere/superare la soglia: email amministrativa accodata, badge visibile e PRE-SALE ancora aperta. Provare un ulteriore ordine oltre la soglia.
- Cambiare prezzo/soglia/condizioni in admin: vecchi ordini invariati, UI aggiornata, consenso alla nuova versione richiesto. Un tentativo con revisione obsoleta deve essere rifiutato.
- Chiudere manualmente: nuovi ordini rifiutati e checkout aperti scaduti tramite Stripe. Se qualche chiamata fallisce, la chiusura del sito rimane salvata e l'admin riceve un errore esplicito; ripetere RICONCILIA CHECKOUT TEST. Una transazione già completata da Stripe non può essere annullata dalla sola chiusura del sito e viene comunque registrata correttamente.
- Iniziare con il dry-run dei rimborsi. Per un singolo ordine test usare RIMBORSA con conferma. Pending/requires_action restano PENDING: non sono una conferma di accredito. Verificare poi l'aggiornamento Stripe e la notifica una sola volta.
- Provare avvio/completamento produzione: il timestamp persiste, non si torna indietro e i rimborsi automatici successivi non partono. Risolvere prima eventuali intenti automatici ambigui già in corso.

## Idempotenza e riconciliazione

Ogni tentativo checkout ha una chiave UUID e uno snapshot dei dati. Ritentare lo stesso tentativo/dati riusa lo stesso ordine e la chiave Stripe `checkout:ID`; non cambia l'importo. Sessioni scadute richiedono un nuovo tentativo esplicito.

Gli eventi vengono registrati atomicamente con aggiornamenti ordine e outbox. Gli eventi falliti/scaduti non retrocedono un pagamento già acquisito; l'evento pagato valido recupera stati falliti arrivati prima. La riconciliazione può recuperare un evento dall'API Stripe autenticata e usa lo stesso processore; non conferma un ordine sulla base della pagina di successo o di un parametro browser.

Un rimborso ha un intento persistente, chiave stabile, identificativo Stripe, tentativi, esiti e storico audit. Il retry consulta prima i rimborsi effettivi del payment intent. Un timeout resta PENDING perché l'esito è sconosciuto. Un fallimento definitivo Stripe può essere ritentato manualmente con nuova chiave persistita e storico; il cron non ricrea alla cieca un rimborso fallito. Oltre 23 ore un intento ambiguo senza esito viene bloccato per revisione manuale: [Stripe può eliminare le idempotency keys dopo almeno 24 ore](https://docs.stripe.com/api/idempotent_requests).

I rimborsi parziali esterni sono riconciliati negli importi. Senza informazioni su quali magliette siano restituite, non vengono inventate quantità frazionarie: l'ordine resta nel conteggio pezzi fino al rimborso integrale. La UI espone questa convenzione; prima della gestione commerciale di resi parziali servirà un modello per singole unità/righi. La demo amministrativa richiede il rimborso completo dell'importo residuo, senza offrire un pulsante di rimborso parziale.

## Email

La conferma viene accodata nella stessa transazione del pagamento e l'invio viene tentato dopo la risposta webhook. Le notifiche rimaste in coda sono ritentate dal controllo amministrativo/cron operativo. Un lease nel DB evita worker concorrenti; Resend riceve una chiave per messaggio. Gli invii ambigui oltre 23 ore vengono segnalati per revisione invece di essere reinviati automaticamente, perché [Resend conserva le chiavi per 24 ore](https://resend.com/changelog/idempotency-keys). Non è una garanzia sul recapito finale nella casella: verificare ricezione, bounce e dominio mittente nel provider.

## Locale

In sviluppo, con variabili test configurate e senza gate staging:

```powershell
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copiare il secret della CLI solo nell'ambiente locale e riavviare Next. Non inviare fixture `stripe trigger` generiche pretendendo che confermino un ordine dell'app: devono corrispondere a un checkout reale dell'app, con metadata/sessione/importo coerenti. I test automatici locali usano payload costruiti e firmati con chiavi di fixture; non dimostrano una connessione al servizio Stripe.
