# Bug trovati e corretti

| # | Difetto | Causa | Correzione | Copertura |
|---|---|---|---|---|
| 1 | Un webhook Stripe duplicato arrivato contemporaneamente poteva ricevere `500` anche se l’altro webhook completava correttamente l’ordine. | Due transazioni potevano superare insieme la lettura “evento non presente”; il vincolo univoco sull’ID evento respingeva la seconda transazione senza trattarla come duplicato idempotente. | Il webhook riconosce il conflitto Prisma `P2002` specifico di `StripeWebhookEvent` e risponde come evento già ricevuto. | Test d’integrazione con due richieste firmate simultanee: entrambe `200`, un evento, una conferma ordine. |
| 2 | La soglia iniziale era configurabile via ambiente, ma l’admin non poteva cambiarla dal pannello. | Mancavano API e controllo UI dedicati. | Aggiunti endpoint protetto e controllo dashboard; la soglia si può cambiare prima del primo pagamento e viene rifiutata dopo. | Test API: aggiornamento valido, valore non valido e modifica dopo pagamento. |
| 3 | CSV/Excel non riportavano lo stato di produzione richiesto nella gestione/esportazione ordini. | L’export includeva pagamento, rimborso e consegna, ma non lo stato di produzione della PRE-SALE. | Aggiunta la colonna “Produzione” sia alle righe CSV sia al foglio ordini Excel. | Test d’integrazione controlla entrambe le esportazioni e il riepilogo taglie. |
| 4 | La suite poteva fallire alle esecuzioni successive per vincolo univoco sull’utente admin di test. | Il reset del database di test non eliminava `AdminUser`. | Il reset condiviso dei test elimina anche l’utente amministratore nello schema isolato di test. | Esecuzione ripetibile di `npm test`. |
| 5 | Il test runner locale non poteva usare credenziali valide di un database loopback quando `.env.test` conteneva altre credenziali. | Il bootstrap sovrascriveva sempre gli URL database dell’ambiente del processo. | Aggiunti override `TEST_DATABASE_URL` e `TEST_DIRECT_URL`, mantenendo il controllo obbligatorio su host loopback e schema `rush_presale_test`. | La suite completa è stata eseguita usando gli override e il solo schema locale di test. |

## Rischi esercitati senza difetti riprodotti

- Due cron simultanei: il test verifica una sola notifica e un solo rimborso.
- Pagamento fuori ordine (`failed` prima di `completed`): il test verifica il recupero dello stato pagato.
- Fine mese, anno bisestile e istanti UTC attraverso i cambi DST Europe/Rome: test unitari.
- Quantità nulla/negativa/non intera/eccessiva, taglia invalida, email malformata, honeypot e consenso: validazione e test unitari.
- Firma webhook invalida e duplicazione sequenziale: respinte/idempotenti come previsto.

## Difetti e prerequisiti residui

- Le pagine legali contengono placeholder del titolare e dei contatti: servono dati reali e revisione legale.
- Backup database e restore non sono configurati/versionati nell’app: vanno impostati e testati nel provider selezionato.
- Nessun checkout Stripe remoto è stato avviato; per il test su Vercel servono chiavi Stripe `sk_test_`/webhook test e chiavi Cloudflare Turnstile per il dominio preview.
- L’invio email reale dipende da `RESEND_API_KEY`, `MAIL_FROM` e verifica del dominio mittente; in alternativa la modalità console produce log.
- Il browser ha verificato che il CTA resta disabilitato quando Turnstile non è configurato, comportamento fail-closed corretto.
