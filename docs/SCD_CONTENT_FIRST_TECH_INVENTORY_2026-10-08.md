# SCD CONTENT-FIRST | INVENTARIO TECNICO VERIFICATO
Data: 2026-10-08. Owner: Direzione SCD. Scope: recupero delle tre applicazioni senza Visual Lab bocciato.
Comando: PR #146, `docs/SCD_CONTENT_FIRST_RESTART_2026-10-08.md`.
Repository: `francesco1485/scd-colicoderviese-super-app`.
Baseline main: `b30669d85051d880ecac99e92199a3bb73e20c33`.
Manifest su main: `3.27.0`. Versione `3.27.1` soltanto su PR #148 fino a merge esplicitamente autorizzato.

## Semantica stati
- LIVE_VERIFIED: endpoint e risposta reale nel target di rilascio, permessi e provenienza provati.
- STAGED: codice/test disponibili su branch o ambiente isolato; non equivale a pubblicato.
- CONTRACT_ONLY: contratto o UI predisposta senza prova del motore.
- MISSING: nessun codice reale individuato per il risultato richiesto.
- BLOCKED: mancano permessi, source schema, conferme, staging o prove necessarie.

## Snapshot infrastruttura (read only)
- GitHub main: SHA sopra, nessun merge delle PR #146/#147/#148/#149.
- Render workspace società `tea-db3qm3s9v7es73e3mk0g`: enumerazione servizi collegati vuota. Vecchia anteprima grafica `srv-db3qohgm7kps73fngd4g`: GET servizio 404. NON inferire prova di cancellazione eseguita in questa sessione.
- Render workspace personale `tea-datan8bncjis73dpg9eg`: 24 servizi rilevati; includes `scd-universe` (`srv-dauvjo60tbcc73cu0c40`), `scd-sponsor-platform` (`srv-daulto3tqb8s73bstbng`), `scd-colicoderviese-official-r21` (`srv-datc5gfavr4c73cv4ne0`), `scd-colicoderviese-super-app` (`srv-datbbcg93c1s739ua9dg`), `scd-colicoderviese-command-r22` (`srv-datoua093c1s73bfjfag`). Stato HTTP prodotto/utente non ancora validato in questo inventario. Nessuna cancellazione o deploy.
- Render Postgres account collegati: nessuna istanza elencata. Questo NON implica assenza database Supabase esterni.
- Runtime R20 corrente: Apps Script `public.calendar`, `public.feed`, `auth.login`, `auth.validate`, `dashboard.summary`, `private.user.workspace`, `private.crm.summary/detail`, `auth.access.log` sono riferiti dal codice; produzione API e connessione Google dati non ancora verificati tramite sessione autorizzata.
- Supabase: schema/migrazioni presenti nel repository, core operativo in dark/staged secondo manifest; R20 resta identity primaria, NO migrazione di produzione autorizzata.

## Inventario per web app

| Prodotto | Funzionalità concreta | Sorgente canonica | Evidenza | Stato |
|---|---|---|---|---|
| SCD ONE | Home settimanale / squadre / calendario | R20 public.calendar + public.feed | `server.js`, `scd-ng.js`, `lib/scd-calendar-fusion.js`, tests e PR #147 | STAGED |
| SCD ONE | Proiezione eventi pubblici senza ID fittizi, filtraggio record riservati | R20 public.calendar | PR #147 SHA `7bc450937cf2937a40067ef82f8c5286a800fae5`, 3 CI success | STAGED |
| SCD ONE | Sport newsroom e calendario corrente | R20 fonti strutturate | `/api/newsroom`; tests CI; dati reali e freschezza non certificati | STAGED |
| SCD GROW | Form contatto sponsor | R20 `APP PUBLIC REQUESTS` | `/api/sponsor/lead` e `public.partnerLead` | STAGED |
| SCD GROW | CRM esistente e dettaglio stakeholder | R20 `STAKEHOLDERS_MASTER` | `/api/sponsor/crm`; app Sponsor riservata | STAGED |
| SCD GROW | Inbox richieste → candidati CRM → bozza non salvata | R20 `APP PUBLIC REQUESTS`, `STAKEHOLDERS_MASTER` | PR #148 SHA `1a227a6b088ad4f352901c29f97be83cecbc5fa5`, CI success | STAGED |
| SCD GROW | Salvataggio proposta canonica, revisione e invio autorizzato | R20 `COMMERCIALE_OPPORTUNITA` schema da validare | Nessuna conferma d'azione/persistenza | BLOCKED |
| SCD CORE | Autenticazione unica, dati e scope | R20 `auth.validate`, `dashboard.summary`, `private.user.workspace` | `scd-ng.js`, backend R20, E2E CI | STAGED |
| SCD CORE | Entrata area privata con audit registrato (fail closed) | R20 `APP AUDIT` | PR #149 SHA `fd6bb15dfd76fe99ae2b8d3a1ddb288cd854e26e`, 3 CI success | STAGED |
| SCD CORE | Ruoli/relazioni minori/consensi produzione | R20/Supabase | Risorse contrattuali, nessun cambiamento autorizzato | BLOCKED |
| SKY | Un assistente e navigazione guidata | codice pubblico `scd-ng.js`; ruolo/scope dal R20 | UI e regole locali; NO modello AI provider certificato | CONTRACT_ONLY |
| SKY | Risposte AI su dati verificati e autorizzati in ONE/GROW/CORE | condividere R20 e permessi | Mancano prova provider, contesto server-side e test cross-app | BLOCKED |

## GitHub PR verificabili
- #146 `docs/scd-content-first-reset-20261008`, draft, handoff e ritiro Visual Lab, documentazione.
- #147 `feat/content-first-public-calendar-safety-20261008`, draft. Commit `7bc4509`; Manifest Contract, PR Policy e App E2E **SUCCESS**.
- #148 `feat/content-first-grow-lead-inbox-20261008`, draft. Commit `1a227a6b`; manifest in branch `3.27.1`; Manifest Contract, PR Policy e App E2E **SUCCESS**. Nuova azione bridge non installata in runtime target.
- #149 `fix/content-first-core-r56-audit-20261008`, draft. Commit `fd6bb15d`; Manifest Contract, PR Policy e App E2E **SUCCESS**. Nuova condizione audit R56 non installata in runtime target.
- #142 Visual Lab grafica **RESPINTA**. #144, #145: recuperare solo logica/test separandoli dalle grafiche, nessun merge autorizzato.

## Antiduplicazione e dipendenze
- Nessuna seconda autenticazione, CRM o calendario. Tutte le nuove azioni devono riferirsi ai record e agli identificativi canonici.
- Le PR #147 e #148 modificano entrambe `server.js` da `main`; prima di un futuro merge vanno confrontate, integrate e ricolleigate in un branch di riconciliazione sottoposto a CI e approvazione. NON fare merge automatico.
- La PR #149 modifica il bridge R56 e il client; la nuova policy audit deve essere validata su copia/staging del foglio `APP AUDIT`.
- Nessuna voce `STAGED` è promossa a `LIVE_VERIFIED` per il solo successo delle CI con mock/test fixture.

## Prossimi gate funzionali
1. Predisporre ambiente staging R20 autorizzato; verificare endpoint, ruolo, effettiva scrittura audit e risposta reale su sessione test.
2. Riconciliare schema `APP PUBLIC REQUESTS`, `STAKEHOLDERS_MASTER`, `COMMERCIALE_OPPORTUNITA` e idempotenza lead; abilitare solo dopo revisione umana il salvataggio persistente delle proposte.
3. Verificare fonti calendario R20/FIGC/LND con `EVENT_ID` univoco, visibilità e orario `Europe/Rome`; provare nell'ambiente runtime consentito.
4. Implementare un singolo adattatore SKY condiviso e permission-aware; non dichiarare IA esterna collegata senza prova.
5. Eseguire test completi e security/release review; chiedere approvazione Direzione per ogni merge, deploy, migrazione e pubblicazione UX.

## Regole permanenti
Fonte normativa: `SCD_SYSTEM_MANIFEST.json`; comandi utente `config/user-directives.v1.json`; specifica `docs/SCD_CONTENT_FIRST_RESTART_2026-10-08.md`.
Grafica Visual Lab 08/10/2026 respinta e SUPERSEDED. Asset reali mantenuti. Nessuna tavola grafica rappresenta software funzionante. Nessuna alterazione automatica a minori, safeguarding, permessi, pagamenti o database critici.
