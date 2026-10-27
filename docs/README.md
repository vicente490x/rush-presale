# RUSH PRE-SALE — Documentazione di progetto

## Consegna 2.2.0 — 27 ottobre 2026

Il dossier corrente comprende [Manuale](Manuale_Uso_RUSH_Presale.docx), [BUR](BUR_RUSH_Presale.docx), [FUD](FUD_RUSH_Presale.docx), [TAD](TAD_Architettura_Tecnica_RUSH_Presale.docx), [registro Excel](Casi_di_Test_RUSH_Presale.xlsx) e [Rapporto di collaudo](Rapporto_Collaudo_RUSH_Presale.docx).

I [sorgenti italiani](sorgenti) e le [evidenze del candidato](evidenze/esecuzione.json) sono conservati accanto ai documenti. [Descrizione PR](PULL_REQUEST.md) e [README](../README.md) riportano bootstrap, verifiche e sequenza di rilascio.

Per 2.2.0 l’identità admin risiede in AdminUser; generare un hash d’ambiente non crea l’account. Il GLB è integrato nella galleria. Le sezioni seguenti mantengono il dossier storico 2.1.x: date, risultati remoti e attribuzioni non sono riscritti e non certificano questo candidato.

## Dossier storico 2.1.x

| Campo | Valore |
|---|---|
| Release | 2.1.0 |
| Baseline requisiti | `SPEC.md` |
| Lingua | Italiano |
| Aggiornamento | 26 ottobre 2026 |
| Stato applicativo | Candidato di rilascio verificato; sito pubblico in modalità TEST |
| Approvazione commerciale | Aperta: configurazione LIVE e collaudo dei servizi reali |

## Percorso di lettura

| Documento | Contenuto | Destinatari |
|---|---|---|
| [01 — Dossier di progetto](01_DOSSIER_PROGETTO.md) | Obiettivi, perimetro, responsabilità, deliverable e criteri di accettazione | Direzione, referente progetto |
| [02 — Requisiti e tracciabilità](02_REQUISITI_TRACCIABILITA.md) | Copertura puntuale di SPEC.md, evidenze e verifiche aperte | Referente progetto, sviluppo, QA |
| [03 — Architettura e flussi](03_ARCHITETTURA.md) | Componenti, stati e flussi finanziari | Sviluppo, gestione tecnica |
| [04 — Dati e API](04_DATI_API.md) | Modello dati, endpoint, contratti e autorizzazioni | Sviluppo, integrazioni |
| [05 — Documentazione del codice](05_GUIDA_CODICE.md) | Struttura, funzioni principali, invarianti e manutenzione | Sviluppo |
| [06 — Manuale operativo](06_MANUALE_OPERATIVO.md) | Uso del sito, amministrazione, ordini, rimborsi ed export | Amministratore, assistenza |
| [07 — Sicurezza](07_SICUREZZA.md) | Controlli, segreti, minacce e requisiti operativi | Referente sicurezza, gestione tecnica |
| [08 — Piano e rapporto di collaudo](08_COLLAUDO.md) | Strategia, comandi, casi, risultati e limiti | QA, referente progetto |
| [09 — Gestione tecnica](09_GESTIONE_TECNICA.md) | Installazione, migrazioni, backup, incidenti e rollback | Gestione tecnica |
| [10 — Piano di rilascio](10_PIANO_RILASCIO.md) | Gate, checklist, rischi, dipendenze e passaggio LIVE | Referente progetto, responsabile servizio |

La specifica originale [SPEC.md](../SPEC.md) rimane la fonte funzionale. I documenti distinguono ciò che è verificato nel codice, ciò che è stato osservato online e ciò che richiede una prova sul provider. Una configurazione formalmente valida non certifica un servizio operativo.
