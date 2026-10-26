# Changelog

## 2.1.0 — 26 ottobre 2026

- Documentazione organizzata in dossier, matrice requisiti, architettura, dati/API, guida codice, manuale, sicurezza, collaudo, gestione tecnica e piano di rilascio.
- Rimossi script di popolamento dimostrativo, moduli fotografici fuori perimetro, relative dipendenze, sezioni backoffice ed export tecnici non necessari.
- Strutture DB storiche mantenute per compatibilità; lotti esclusi separati da contatori e liste commerciali.
- Logo home visibile prima dell’idratazione e messaggio soglia coerente con raccolta chiusa.
- Esteso il collaudo di scadenza, rimborso anticipato, chiusura checkout e dati esclusi.
- Preparata integrazione del candidato verificato nei branch di consegna.

## 2.0.0 — Baseline precedente

- Accesso pubblico senza password condivisa e amministrazione con sessioni revocabili.
- Ordini con snapshot, contatori, soglia indipendente dalla chiusura e stati produzione/consegna.
- Checkout Stripe, webhook verificati, outbox email, rimborsi idempotenti e riconciliazione.
- Controlli TEST/LIVE, preflight, protezioni HTTP e pipeline di verifica.
