# ADR-0004 — Retry upstream esclusivamente read-only

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R30
- **Ambito:** Render R21 bridge → Apps Script R20

## Problema

La diagnostica R29 ha dimostrato che R20 può rispondere correttamente a `public.feed` mentre il bridge Render riceve occasionalmente una risposta transitoria non JSON durante cold start o propagazione Google. Il bridge trasformava immediatamente questo caso in HTTP 502.

Ripetere automaticamente tutte le richieste sarebbe però pericoloso: una registrazione, una richiesta, una scansione o una modifica Direzione potrebbero essere eseguite due volte.

## Decisione

Il bridge R30 effettua al massimo **due tentativi** soltanto per un insieme esplicito di azioni read-only.

Il retry è consentito quando:
- la fetch upstream fallisce;
- la risposta upstream non è JSON valido.

Il retry non viene eseguito quando la risposta è JSON valida, anche se contiene un errore applicativo.

## Azioni non ritentabili

Qualsiasi flusso di scrittura resta a singolo tentativo, inclusi:
- registrazioni;
- lead e richieste pubbliche;
- messaggi e richieste private;
- OTP/auth request;
- modifiche accessi o PIN;
- approvazioni;
- scansioni Gmail/Drive;
- salvataggi presenze o convocazioni.

## Test obbligatorio

`tests/upstream-resilience.mjs` simula:
1. risposta HTML transitoria su `public.feed`, seguita da JSON valido: il bridge deve recuperare al secondo tentativo;
2. risposta HTML su `public.registration`: il bridge deve fermarsi al primo tentativo e rispondere fail-closed.

## Conseguenze

- maggiore resilienza sui cold start senza duplicare scritture;
- il comportamento di retry è machine-tested;
- gli errori applicativi R20 restano visibili e non vengono mascherati;
- R30 non risolve il mancato deploy del codice R29 dentro Apps Script R20, che resta un gate separato.

## Rollback

Revert R30. Nessun dato viene migrato o modificato dal meccanismo di retry.
