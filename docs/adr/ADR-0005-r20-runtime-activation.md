# ADR-0005 — Attivazione verificabile del runtime Apps Script R20

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R31

## Problema

Repository, GitHub Pages e Render possono essere aggiornati senza che il deployment Apps Script R20 lo sia. R29 ha dimostrato che il runtime reale è ancora `2026.09.28-R20.0-PUBLIC-FIRST` e non espone `public.datafabric.contract`.

## Decisione

L'attivazione R20 è un gate separato dalla CI del repository.

La fonte di verità per l'attivazione è una prova diretta sul Web App canonico tramite `scripts/verify-r20-direct.mjs`.

Il deployment deve aggiornare la versione esistente e preservare l'URL canonico, salvo migrazione esplicitamente approvata e verificata.

## Fail-fast

`SCD Production Evidence` interrompe i retry quando riceve una risposta JSON valida che dichiara esplicitamente che il contratto richiesto non è supportato o installato. Questo non è un problema di propagazione e ripeterlo venti volte aggiunge solo rumore.

## Sicurezza

Il verifier diretto usa esclusivamente azioni pubbliche read-only e non legge dati personali. Non esegue scansioni Gmail/Drive e non modifica R20.

## Conseguenze

- distinguere deploy repository da deploy Apps Script;
- ridurre i falsi “LIVE”;
- rendere il passaggio manuale residuo ripetibile e verificabile;
- preservare il Web App URL già usato dal sistema.

## Rollback

Ripristinare il precedente deployment Apps Script. Nessun dato viene migrato da R31.
