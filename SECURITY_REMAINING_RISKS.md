---
noteId: "461cd4c0cc8411f1a8d8071bcfefd596"
tags: []

---

# RUSH PRE-SALE — Rischi residui

> Aggiornamento di chiusura: [STAGING_FINAL_PREPARATION.md](STAGING_FINAL_PREPARATION.md). SEC-14/SEC-15 corretti; procedura di esclusione delle refs interne verificata. Il conteggio di 28 requisiti sotto appartiene al vecchio controllo sul file di sviluppo; il nuovo file dedicato è incompleto e il preflight autentico non è stato eseguito. SEC-12 richiede ancora conferma del proprietario sul riuso delle password.

20 ottobre 2026 — **SECURITY NOT READY FOR STAGING**.

## Blocchi alla dichiarazione READY

**HIGH operativo — SEC-13.** La configurazione locale è di sviluppo e fallisce 28 requisiti. Mancano evidenze del DB gestito separato, credenziali staging, Stripe TEST reale, webhook attraverso hosting, CAPTCHA e rate limit distribuito. I test double non dimostrano il funzionamento dei servizi. Responsabile della chiusura: proprietario dello staging, con le verifiche della checklist.

**MEDIUM — SEC-12.** Una ref tree locale contiene un SQLite con hash admin; non risulta nella cronologia branch/tag/remote esaminata. Non è stato trasferito, cancellato o riscritto. Non condividere la ref, usare nuove credenziali staging e sostituire la vecchia password se ancora valida altrove, invalidandone le sessioni. Il mancato riuso non è dimostrabile da questo audit.

**Verifica browser assente.** Nessun browser collegato. HTTP dimostra risposte, nonce e header, non funzionamento di Turnstile, React, animazioni, flussi utente o CSP nel browser. Completare prima della demo.

## Limiti e rischi gestibili

- **Sessioni:** letture DB aggiuntive su proxy e handler/page; indisponibilità DB blocca l'admin. Dimensionare pool e provare login dopo migrazione/rotazione. Il gate condiviso non ha revoca individuale: cambiarne hash/password o segreto invalida tutte le sessioni.
- **Rate limit:** fuori Vercel il bucket condiviso impedisce spoofing ma può bloccare più utenti insieme. Non impostare VERCEL=1 su hosting diretto; altre piattaforme richiedono politica esplicita di proxy fidati.
- **Disponibilità:** il lock globale serializza operazioni finanziarie e può essere tenuto durante una chiamata Stripe. Evita gare di stato ma limita throughput; timeout, carico e limiti hosting vanno misurati. Nessun test di carico.
- **Webhook/log:** le firme errate non creano righe DB, ma consumano ancora CPU/log provider. Verificare limiti di piattaforma compatibili con retry legittimi.
- **Retention:** vercel.json pianifica solo daily. Cleanup sessioni/rate limit e conservazione di ordini, outbox, ricevute e audit richiedono pianificazione. Nessun dato economico cancellato automaticamente per risolvere questo punto.
- **Finanza:** intenti ambigui oltre 23 ore richiedono riconciliazione manuale. I rimborsi parziali esterni sono registrati; la UI rimborsa il residuo completo e i pezzi vengono esclusi dal contatore solo al rimborso totale. Confermare la politica commerciale.
- **Email:** outbox/lease/idempotenza riducono duplicati, ma la garanzia reale dipende dal provider. Invii ambigui oltre 23 ore fermati per revisione: possibile ritardo invece di reinvio cieco.
- **Ordini pubblici:** nuovi codici casuali da 128 bit e risposta minimizzata; eventuali codici legacy più corti restano riconosciuti. Non aggiungere PII; valutare migrazione codici prima di importare dati reali.
- **CSP:** stili inline ammessi, eval soltanto in sviluppo. Non esporre `next dev` come staging. Rendering dinamico/no-store ha un costo prestazionale.
- **AI:** disabilitata. Limiti e cleanup preparati, ma cancellazione effettiva, oggetti assenti, bucket, privacy/provider e scheduler non verificati. Non attribuire una validazione end-to-end alle sole patch locali.
- **Supply chain:** npm audit/advisory fotografano il 20 ottobre; zero segnalazioni non esclude vulnerabilità sconosciute. Nessuna ricostruzione completa dei pacchetti o audit formale della loro provenienza.
- **Segreti:** pattern e confronto dei valori locali nei bundle non coprono ogni formato o copia esterna. Il file di sviluppo ignorato non è adatto allo staging e non va caricato su Vercel.
- **Privacy:** contratti, ruoli fornitori, retention legale, informative e procedure degli interessati richiedono revisione organizzativa/legale; nessuna attestazione GDPR.

## Stato delle azioni

Completate le patch locali individuate e le regressioni disponibili. Nessuna vulnerabilità CRITICAL/HIGH di codice rilevata resta senza correzione; rimangono il rischio HIGH operativo e verifiche critiche mancanti.

Nessun servizio esterno configurato, credenziale revocata, dato applicativo eliminato, deploy/push o transazione reale. Attività con credenziali, infrastruttura o gestione della cronologia sono preparate nella checklist e restano da autorizzare quando si procederà.
