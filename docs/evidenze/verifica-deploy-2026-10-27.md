# Verbale di verifica del deploy — 27 ottobre 2026

## Versione verificata

- Branch: `feature/rush-final-release`.
- Commit applicativo: `c7f41e2968978aa9e2423000a6e32ce8e1e24a70`.
- Confronto effettuato prima del deploy: 3 commit avanti e nessuno indietro rispetto a `main` (`0e3ee3698c2abd36e2d15ea85d3718019cedd3b4`).
- Pipeline GitHub Actions: https://github.com/vicente490x/rush-presale/actions/runs/40504376182 — conclusione success. Installazione, audit, verifica, integrazione, migrazione, backup, HTTP e browser conclusi con successo.
- Deploy Vercel: `dpl_3A3wJfQThuHHr6edHnjBrjhQSAYf`, stato READY, alias https://rush-presale.vercel.app.

## Operazioni eseguite

Applicata la migrazione ORM `20261027000100_admin_users` al database staging dopo verifica dell'endpoint di entrambe le connessioni. Inizializzato l'utente `rush-admin`, ruolo ADMIN, attivo, usando l'hash della password già configurato. Nessuna password reimpostata o riportata nel verbale.

Concesso SELECT sulla tabella AdminUser al ruolo applicativo `rush_staging_app`. La lettura eseguita con tale ruolo conferma un amministratore attivo. Nessun ordine cancellato.

## Controlli HTTP sul dominio pubblico

| Risorsa | Risultato |
| --- | --- |
| `/` | HTTP 200, accesso pubblico |
| `/presale` | HTTP 200, accesso pubblico |
| `/admin` | Reindirizzamento a `/admin/login`, pagina HTTP 200 |
| `/api/admin/orders` senza sessione | HTTP 401 |
| `/assets/models/rush-oversized-shirt.glb` | HTTP 200, MIME model/gltf-binary, 6.170.320 byte dichiarati, intestazione glTF valida |

## Limiti e condizioni per l'esercizio commerciale

Il target Vercel è production, ma l'ambiente applicativo e i pagamenti restano staging/TEST. Il banner di test è quindi corretto e non è stato nascosto. L'unico account Stripe accessibile è sandbox.

Restano necessari l'account Stripe LIVE con configurazione coerente di chiavi e webhook, i dati autentici del venditore e le conferme previste dalla configurazione di produzione. Prima degli incassi reali devono essere verificati anche il flusso remoto di pagamento/webhook, le email, i rimborsi e la configurazione operativa di produzione.

Il login amministrativo interattivo con password e Turnstile non è stato eseguito in questa verifica. Il test HTTP del file 3D non certifica da solo la resa grafica su dispositivi fisici. Nessuna nuova prova su iPhone fisico è dichiarata.

Questo verbale integra i documenti di collaudo presenti nel repository: non sostituisce le evidenze delle prove precedenti e non certifica l'abilitazione degli incassi LIVE. Nessun merge su main effettuato.
