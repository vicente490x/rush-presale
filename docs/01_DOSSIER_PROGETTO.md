# PRJ-01 — Dossier di progetto

**Release 2.1.0 · Baseline: SPEC.md · Aggiornamento: 26 ottobre 2026**

## Finalità e risultato atteso

RUSH PRE-SALE raccoglie prenotazioni pagate delle magliette RUSH attraverso un percorso essenziale: logo, PRE-SALE, taglia e quantità, pagamento, conferma. Il prezzo iniziale è 25 EUR per pezzo e la soglia iniziale di produzione è 15 pezzi pagati e non interamente rimborsati.

Il servizio deve automatizzare registrazione ordini, contatori, notifiche, scadenze individuali e rimborsi dovuti al mancato avvio della produzione. L’amministratore decide quando avviare la produzione e quando chiudere la raccolta: sono decisioni distinte.

## Perimetro

| Incluso | Escluso |
|---|---|
| Landing e pagina PRE-SALE responsive | Catalogo multibrand, categorie e marketplace |
| Selezione XS/S/M/L/XL/XXL e quantità | Gestione spedizioni con corrieri |
| Checkout ospitato Stripe e webhook | Conservazione dei numeri di carta |
| Backoffice, impostazioni, ordini ed export | Account cliente e programmi fedeltà |
| Produzione, scadenze, rimborsi e notifiche | Elaborazione o caricamento di fotografie |
| Sicurezza, collaudo, deploy e procedure operative | Attivazione automatica di servizi a pagamento o credenziali commerciali |

## Deliverable

| ID | Deliverable | Criterio di completamento |
|---|---|---|
| D01 | Codice applicativo | Build riuscita, dipendenze coerenti, moduli aderenti al perimetro |
| D02 | Schema e migrazioni | Nuova installazione e aggiornamento verificati su PostgreSQL temporaneo |
| D03 | Backoffice | Accesso protetto, gestione ordini/stati, CSV/XLSX e tracciamento operazioni |
| D04 | Suite di test | Lint, TypeScript, unità, integrazione, migrazioni e HTTP senza errori |
| D05 | Documentazione | Requisiti tracciati, architettura, guida codice, manuale e procedure di esercizio |
| D06 | Candidato online | Commit esatto, build READY, accesso pubblico e amministrazione protetta |
| D07 | Servizio commerciale | Provider LIVE, testi del venditore, backup, monitoraggio e prove end-to-end approvati |

## Responsabilità

I ruoli sono definiti per funzione; la loro assegnazione nominativa spetta al titolare del servizio.

| Attività | Responsabile esecuzione | Responsabile approvazione | Consultati |
|---|---|---|---|
| Requisiti e perimetro | Referente progetto | Titolare servizio | Amministratore |
| Codice, database e deploy | Responsabile tecnico | Referente progetto | QA |
| Collaudo e rapporto | QA | Referente progetto | Responsabile tecnico |
| Dati venditore e condizioni | Titolare servizio | Titolare servizio | Referente legale/privacy |
| Stripe, Resend, Turnstile e Redis | Gestione tecnica | Titolare servizio | Assistenza |
| Produzione e chiusura PRE-SALE | Amministratore | Titolare servizio | Produzione/PR |
| Gestione incidenti e ripristino | Gestione tecnica | Responsabile servizio | Assistenza |

## Baseline e controllo delle modifiche

I valori iniziali sono 25 EUR, 15 pezzi, due mesi di calendario e sette giorni di preavviso. Le impostazioni autorizzate possono modificarli per i nuovi ordini. Prezzo, termini, durata e consegna accettati da un ordine sono salvati nello snapshot e non vengono riscritti da modifiche successive.

Una modifica a prezzo, soglia, durata o consegna richiede aggiornamento coerente dei termini, test applicabili e registrazione nel changelog. Una richiesta che introduce funzioni fuori perimetro richiede una nuova valutazione di impatto prima dell’implementazione.

## Stato e condizioni di chiusura

Il progetto dispone di codice, suite di test e sito pubblico in TEST. Il completamento tecnico non equivale all’apertura commerciale. D07 rimane aperto fino al completamento dei gate nel [piano di rilascio](10_PIANO_RILASCIO.md).

La consegna finale comprende codice, documenti, risultati di collaudo e registro dei punti aperti. I rischi non risolti devono avere un responsabile e una decisione esplicita di chiusura o accettazione.
