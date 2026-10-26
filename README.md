# RUSH PRE-SALE

Sito dedicato alla prevendita delle magliette RUSH: prezzo iniziale **25 EUR**, soglia iniziale **15 pezzi**, taglie **XS–XXL**, pagamento Stripe e backoffice. La soglia abilita l’avvio della produzione e non chiude la raccolta. Se la produzione non parte, ogni ordine conserva la propria scadenza di **due mesi di calendario**.

## Documentazione

La documentazione completa è nel [dossier di progetto](docs/README.md). La fonte funzionale è [SPEC.md](SPEC.md).

- [Requisiti e tracciabilità](docs/02_REQUISITI_TRACCIABILITA.md)
- [Architettura](docs/03_ARCHITETTURA.md) e [dati/API](docs/04_DATI_API.md)
- [Guida al codice](docs/05_GUIDA_CODICE.md)
- [Manuale operativo](docs/06_MANUALE_OPERATIVO.md)
- [Sicurezza](docs/07_SICUREZZA.md) e [collaudo](docs/08_COLLAUDO.md)
- [Gestione tecnica](docs/09_GESTIONE_TECNICA.md) e [rilascio](docs/10_PIANO_RILASCIO.md)
- [Changelog](CHANGELOG.md)

## Sviluppo

Node 24, PostgreSQL e configurazione locale ignorata da Git, preparata da `.env.example`. Configurare i provider richiesti prima di usare il checkout.

```sh
npm ci
npm run db:generate
npm run dev
```

## Verifica

```sh
npm run verify
npm run test:integration
npm run test:migration
npm run test:http
```

I test DB richiedono `RUSH_TEST_DATABASE_URL` su un database PostgreSQL temporaneo locale denominato `rush_audit*`; non usare il database del servizio. Per build/HTTP e preflight seguire il [piano di collaudo](docs/08_COLLAUDO.md) e il [runbook](docs/09_GESTIONE_TECNICA.md).

## Rilascio

I modelli staging e produzione contengono solo nomi e valori di sicurezza predefiniti. Non committare credenziali o file ambiente reali. Il dominio pubblico è https://rush-presale.vercel.app/ ; il banner TEST identifica un servizio ancora in collaudo. Main contiene la baseline di consegna dopo i controlli, mentre le vendite LIVE richiedono il completamento del piano di rilascio.
