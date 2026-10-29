# Integrazione modello RUSH Premium — 29 ottobre 2026

Il nuovo modello è integrato nella quarta slide del carosello prodotto sul branch `feature/rush-final-release`. Il punto di partenza locale e remoto verificato era `98f6972f67d3058485d6a7bfef8ac89f89513a08`, con checkout pulito e PR #5 aperta in bozza. Non erano presenti le modifiche Premium richieste.

## Asset e comportamento

Origine: `RUSH_Tee_3D_Studio_Premium(2).zip`, voce `RUSH_Oversized_Tee_Web.glb`, copiata senza trasformazioni in `public/assets/models/rush-oversized-shirt.glb`. Il vecchio asset da 6.170.320 byte è sostituito, non affiancato.

- Dimensione: **7.465.188 byte** (circa 7,12 MiB).
- SHA-256: `f32fdbc136cc4d1c049e9ec22950e98df3a35043365fcfd350a9fd4dbb8c8aa6`.
- GLB v2 con geometrie, materiali PBR e texture incorporate; nessun riferimento a texture esterne.
- URL versionato con il prefisso dell'hash per evitare il vecchio modello in cache.

`RushShirt360.tsx` e il relativo CSS module sostituiscono l'implementazione precedente; `RushShirt3D.tsx` conserva un alias compatibile. `types/model-viewer.d.ts` descrive il custom element JSX usando il tipo della libreria già installata. Nessuna dipendenza aggiunta o aggiornata.

Le tre viste fotografiche e il loro zoom rimangono disponibili. Libreria e GLB sono caricati solo scegliendo 3D, attraverso import client e `ssr: false`. La foto originale appare anche durante il caricamento; errori WebGL/rete o timeout di 45 secondi mostrano foto, riprova e ritorno alla galleria. La riprova usa un URL distinto perché la libreria può conservare anche caricamenti falliti nella propria cache.

Camera e zoom sono adattati alle dimensioni del nuovo modello, con fronte, retro, reset, rotazione manuale e automatica controllabile. Illuminazione neutra e ombre mostrano i materiali incorporati. La rotazione rispetta `prefers-reduced-motion` e si ferma con la pagina nascosta. I gesti touch non cambiano slide; `pan-y` mantiene lo scorrimento verticale della pagina.

## Verifica locale

Ambiente: Windows, Node 24.21.0, dipendenze installate dal lockfile, build Next.js ottimizzata. I test con persistenza hanno usato esclusivamente un PostgreSQL 18 temporaneo su loopback, database `rush_audit_local`, schemi isolati creati dai runner esistenti. Nessuna credenziale di produzione o provider reale utilizzata.

| Controllo | Esito |
| --- | --- |
| `npm run lint` | PASS, zero warning |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 41 superati, 1 contenitore integrazione saltato per design |
| `npm run build` | PASS, build produzione con configurazione staging esplicita nel processo |
| `npm run test:integration` | PASS: 41 test, nessuno saltato |
| `npm run test:migration` | PASS, preservazione dati nel database temporaneo |
| `npm run test:backup` | PASS, dump/ripristino locale |
| `npm run test:http` | PASS: 34 controlli |
| `npm run test:browser` | PASS: 16 controlli Chromium, desktop e mobile emulato |
| Prisma validate | PASS |
| `npm audit --audit-level=high` | PASS, 0 vulnerabilità |
| GLB locale e HTTP | PASS, formato v2, HTTP 200, MIME `model/gltf-binary`, SHA-256 atteso |
| Diff e ambiti esclusi | Nessuna modifica a Stripe, admin, database, proxy, dipendenze o configurazioni di produzione |

Il browser verifica caricamento differito, foto e dialogo, anteprima su rete sospesa, fronte/retro, pausa/ripresa, drag, zoom in/out e ripristino, conservazione di taglia/quantità/totale, touch senza cambio slide, responsive a 320/390/768/1440 px, errore rete e riprova, WebGL disabilitato, movimento ridotto e assenza di errori JavaScript/texture/CSP nel percorso desktop. Sono stati ispezionati visivamente gli screenshot di fronte, retro mobile e caricamento.

La prima esecuzione browser ha rilevato il problema della cache dopo un errore di rete; è stato corretto e l'intera suite è stata rieseguita con successo. Il primo avvio dei test unitari nel sandbox Windows falliva nel runtime `tsx` prima di eseguire i test (`uv_os_get_passwd`); l'esecuzione autorizzata fuori dal sandbox è passata. Un errore TypeScript nel nuovo codice di test è stato corretto mantenendo il target ES2022 del progetto.

Log e screenshot locali sono in `.test-results/`, esclusa da Git. Il workflow esistente continua a eseguire le suite aggiornate senza modifiche alla configurazione CI. Lo stato remoto sul commit pubblicato va verificato nei check della PR #5.

## Limiti e successivo collaudo

Non sono stati eseguiti test su dispositivi fisici Safari/iOS o Android, né un deploy manuale su Vercel. I test Stripe/Resend impiegano fixture e sostituti espliciti: non certificano pagamenti o recapito email esterni. Non è stato attivato Stripe LIVE e non è stato effettuato merge su `main`.

Il modello è la ricostruzione fornita nel pacchetto, con limiti di fedeltà delle grafiche e delle proporzioni dichiarati dall'autore; le fotografie restano il riferimento del prodotto. Il prossimo passo è il collaudo della stessa revisione su Vercel e su dispositivi fisici, mantenendo i gate di rilascio già documentati nella PR.
