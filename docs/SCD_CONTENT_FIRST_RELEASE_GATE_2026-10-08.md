# SCD Content-First | Evidenze, staging e rilascio controllato
**Data:** 08/10/2026  
**Authority:** PR #146 e `SCD_SYSTEM_MANIFEST.json` (`3.27.3` nel branch integrazione).  
**Branch:** `feat/content-first-three-app-integration-20261008` | **PR:** #150 (DRAFT).  
**Base GitHub main:** `b30669d85051d880ecac99e92199a3bb73e20c33`.

## Sintesi verificabile
- PR #147 (ONE): proiezione pubblica del calendario R20 con identificativi canonici, provenienza, esclusione di record privati e fallback senza contenuti artificiali.
- PR #148 (GROW): inbox richieste su `APP PUBLIC REQUESTS`, candidata CRM `STAKEHOLDERS_MASTER`, bozza salvabile solo dopo revisione e doppia conferma; `COMMERCIALE_OPPORTUNITA` resta la tabella unica.
- PR #149 (CORE): sessione R20 validata, accesso alla zona privata soltanto dopo `APP AUDIT` scritto e riconosciuto; `EMAIL` e `DETAILS` negli header effettivi.
- PR #150: integrazione di ONE + GROW + CORE sullo stesso codice backend, suite unica; `Sky` pubblico condiviso via `/api/sky/ask`, regole basate su dati pubblici, **non un provider AI**. Niente Visual Lab bocciato.

## Stato di rilascio
| Ambito | Funzionale su codice con test | LIVE verificato su runtime e dati reali | Ostacolo |
| --- | --- | --- | --- |
| ONE calendario pubblico | STAGED | NO | collegamento R20 attuale, qualità/aggiornamento record |
| GROW richiesta -> CRM -> bozza | STAGED | NO | staging autorizzato e verifica scrittura su fogli di prova |
| CORE login -> accesso -> audit | STAGED | NO | utente di test R20 e audit persistenza reale |
| SKY pubblico guidato | STAGED_RULES_ONLY | NO | deploy integrato, controllo API in ambiente target |
| SKY AI dati privati permission-aware | BLOCKED | NO | provider verificato, permessi applicativi per ambito, logging/consensi |
| Nuovo design system | BLOCKED | NO | approvazione Direzione DOPO flussi |

`STAGED` significa codice sul branch con test: NON significa disponibile in produzione.

## Script di verifica locali
```bash
npm install
npm run test:manifest
npm run test:cross-app
npm run test:sky-shared
npm run test:r20-routing
npm run test:grow-leads
npm run test:core-audit
npm run test:crm-communication
npm run test:newsroom-contract
npm run test:contract
npm run test:resilience
npm run check
npm run build:pages
```
GitHub Actions `.github/workflows/e2e.yml` esegue anche test browser Playwright, Node syntax check, controlli su manifest e policy PR.

## Gate staging non ancora autorizzato
1. Creare **DUE NUOVI WORKBOOK DI PROVA con sole intestazioni e record sintetici**. Non duplicare dati personali/sanitari/reali: `CORE_TEST` con `APP PUBLIC REQUESTS` e `APP AUDIT`; `OPERATIVO_TEST` con `STAKEHOLDERS_MASTER`, `COMMERCIALE_OPPORTUNITA`, `UTENTI` e gli altri tab usati dal bridge.
2. In **una copia isolata di Apps Script** impostare `SCD.CORE_ID=CORE_TEST` e la proprietà `SCD_OPERATIVO_PILOTA_ID=OPERATIVO_TEST`. I due ID devono essere distinti e diversi dagli ID reali; non riutilizzare il deploy Apps Script produttivo.
3. Mantenere `SCD_R60_DRAFT_WRITE_ENABLED=false` finché non sia autorizzato un test di registrazione su dati sintetici. Il codice R60 rifiuta in ogni caso gli ID produttivi conosciuti.
4. Installare SOLO nell'Apps Script di prova i bridge integrati R21_6/R56/R60, con URL della web app di test distinto. Impostare `SCD_APPS_SCRIPT_URL` soltanto sul backend di staging.
5. Provare: calendario fonte R20 -> filtro privato -> evento per squadra -> provenienza; lead sponsor -> CRM -> doppia conferma -> singola opportunità `DA SVILUPPARE` -> audit -> seconda invocazione idempotente; accesso R20 -> ruolo/scope -> audit -> area CORE visibile soltanto all'utente abilitato.
6. SKY: inviare una richiesta pubblica sulla prossima gara, verificare `recordId`/source; richiedere un certificato medico e dimostrare che la risposta NON contiene dati privati; messaggi Safeguarding soltanto instradati fuori dall'assistente ordinario.
7. Controlli finali: responsive mobile e desktop su **interfacce già in uso**, accessibilità, cookie, browser, attacchi CSRF/XSS, provenienza eventi e audit. Nessuna nuova grafica accettata implicitamente.
8. Allegare prove URL staging, timestamp e screenshot solo funzionali: NON considerate nuove proposte visuali.
9. Se tutte le verifiche passano, presentare richiesta di approvazione Direzione per ogni eventuale merge e deploy. Nessuna azione in produzione automatica.

## Rischi individuati e mitigazioni
- Doppio master Core/Operativo: `r216CanonicalWorkbookId_` instrada i tab verso la fonte giusta.
- Master Core `APP AUDIT`: `r56RecordAccess_` registra l'operatore in `EMAIL`, senza token nel `DETAILS`, e rifiuta scritture fallite.
- R60: scrittura bloccata per default e vietata verso **entrambi** i workbook produttivi anche se una feature flag viene abilitata per errore.
- Sponsor: nessuna associazione automatica su email ambigua; richiesta privacy e doppia conferma; nessuna creazione di contratto o invio comunicazione.
- ONE: niente `CAL-i` o gare inventate; filtraggio esplicito di contenuti riservati.
- Sky: un solo motore informativo server, `mode=RULES_ONLY`, `aiConnected=false`. Contesto GROW/CORE fornito dal client NON autorizza lettura privata. Safeguarding instradato separatamente.
- PR #142 Visual Lab bocciata: codice/layout/immagini della demo NON importati.

## Rollback
- Prima del merge: chiudere PR #150; nessun effetto sulle web app o i registri attivi.
- In staging: disattivare `SCD_R60_DRAFT_WRITE_ENABLED`, disattivare l'app di prova e conservare i soli log sintetici di diagnosi.
- Dopo futura eventuale approvazione al rilascio: richiedere procedura dedicata di release/rollback con riferimenti esatti a deploy, versioni e database; nessun cleanup distruttivo automatico.

## Decisione finale
**Release gate: HOLD UNTIL HUMAN APPROVAL**. Il repository può essere sviluppato e testato autonomamente; una web app *LIVE_VERIFIED* richiede prova sul runtime reale autorizzato, dati consentiti, log e conferma della Direzione prima della pubblicazione.
