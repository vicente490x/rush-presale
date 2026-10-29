# Changelog

## 2.2.0 — 27 ottobre 2026 — candidato

- Account AdminUser con ruolo ADMIN, hash bcrypt, bootstrap idempotente e controllo account/impronta nelle sessioni revocabili.
- Migrazione additiva senza modifiche agli ordini; login sul database e compatibilità dei generatori di credenziali.
- GLB originale nel carosello: caricamento su selezione, controlli 3D, fallback e gesti touch separati.
- CSP compatibile con WebAssembly e texture blob; corretta l’idratazione della home con movimento ridotto.
- Test browser desktop/mobile emulato, bootstrap concorrente, account disattivato e verifica ripetibile del rilascio.
- Dossier italiano DOCX/XLSX con screenshot ed evidenze; verifiche remote esplicitamente aperte. Nessun deploy o merge automatico.

## 2.1.2 — 26 ottobre 2026

- Verifica TLS client PostgreSQL con certificato e hostname controllati, distinta dal tratto osservato dietro il proxy Neon.
- Snapshot e ripristino effettivi nel provider; confronto di tutte le 14 tabelle e separazione dei branch TEST/produzione.
- Documentati limiti dell’account per snapshot automatici e autosospensione, configurazione dei ruoli ancora da approvare e procedura di ripristino non finalizzato.

## 2.1.1 — 26 ottobre 2026

- Gestione visibile di errori, scadenze, browser non supportati e attese prolungate della verifica anti-bot; nuovo tentativo disponibile per cliente e amministratore.
- Controllo server Turnstile con limite del token e inoltro dei soli indirizzi IP validi.
- Audit operativo in sola lettura di configurazione, database/TLS/migrazioni, Stripe/webhook, dominio email e Redis, senza divulgare credenziali.
- Prova automatica pg_dump/pg_restore su due database locali separati: dati economici, date, relazioni, outbox e checksum migrazioni preservati.

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
