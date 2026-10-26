# Stripe — TEST e LIVE

26 ottobre 2026. Il sito usa Checkout ospitato con redirect creato dal server, senza Stripe.js: non è richiesta una chiave pubblica `pk_*` nel frontend.

## TEST / staging

`APP_ENV=staging`, `STRIPE_MODE=test` (predefinito), `ALLOW_LIVE_PAYMENTS=false`, chiave server `sk_test_` e secret del webhook TEST. Solo indirizzi in `EMAIL_ALLOWLIST`; cron daily dry-run. Vercel Preview rifiuta un override APP_ENV=production.

## LIVE / produzione

LIVE è possibile solo con APP_ENV=production, STRIPE_MODE=live, ALLOW_LIVE_PAYMENTS=true e tutti i requisiti di `production:check` soddisfatti. Questo comprende DB produzione confermato, segreti, provider, dati venditore, revisione testi e conferma collaudo/lancio. Il modello mantiene le conferme false. Il codice non attiva account Stripe, non crea credenziali e non certifica l’abilitazione commerciale dell’account.

Il client viene ricreato se cambia la chiave; ogni evento verificato deve avere livemode coerente con la configurazione. Anche la Checkout Session associata all’ordine deve avere modalità coerente. Valuta, importo, Session ID e PaymentIntent sono confrontati con lo snapshot DB. Test e live richiedono database e webhook separati.

## Endpoint e flusso

1. Il frontend chiama POST `/api/orders` dopo Origin, rate limit, campi e Turnstile.
2. Il server prenota l’ordine e crea Checkout con idempotency key; il browser apre l’URL restituito.
3. Stripe invia a POST `https://DOMINIO/api/stripe/webhook`. Configurare il dominio effettivo, body originale e header stripe-signature. Il webhook non richiede login admin; l’eventuale protezione hosting deve lasciarlo raggiungibile senza disabilitarne la firma.
4. Gestire `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`, `refund.created`, `refund.updated`, `refund.failed` secondo gli eventi esposti dalla versione Stripe dell’account.
5. `/conferma?code=...` legge lo stato minimizzato: il redirect browser non stabilisce PAID.
6. Duplicati vengono registrati senza raddoppiare ordini/email; eventi fuori ordine non annullano un pagamento già confermato.

## Rimborsi e collaudo

Rimborsi manuali richiedono admin, Origin e conferma esplicita. Intento persistente e chiave idempotente precedono la chiamata provider. Un timeout resta PENDING finché riconciliato; oltre la finestra prudenziale di 23 ore serve revisione manuale. Non forzare FAILED o generare una nuova chiave per un esito incerto.

Prima del LIVE completare su Stripe TEST: pagamento riuscito/annullato, webhook duplicato, firma errata, rimborso e diagnostica. Il test LIVE presente nell’integrazione usa un evento sintetico e un client double con PostgreSQL locale: **nessun pagamento, rimborso o collegamento Stripe reale eseguito**.
