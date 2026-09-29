# ADR-0003 — Production Evidence e Runtime Contract Probe

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R29

## Problema

CI verde e merge su `main` non dimostrano che GitHub Pages, Render e il runtime Apps Script R20 stiano eseguendo la stessa release. Senza una prova end-to-end è possibile dichiarare LIVE una release che esiste soltanto nel repository.

## Decisione

R29 introduce una prova di produzione automatica eseguita da GitHub Actions dopo ogni push su `main`.

La prova verifica:
1. GitHub Pages contiene il build atteso;
2. Render `/health` espone la versione attesa;
3. Render `/api/capabilities` espone feature flag e contratto attesi;
4. una richiesta attraversa realmente Render → R20 Apps Script usando `public.datafabric.contract`.

## Public runtime contract probe

`public.datafabric.contract` è intenzionalmente pubblico ma non espone dati operativi.

Può restituire soltanto:
- release e versione contratto;
- capability e feature flag;
- ID logici delle fonti;
- nomi dei campi di observability;
- nomi dei campi di provenance;
- policy non sensibili;
- conferma dell'isolamento safeguarding.

Non restituisce:
- email;
- file Drive;
- nomi persone;
- conteggi operativi;
- token;
- ruoli;
- contenuti R20;
- contenuti safeguarding.

## Regola LIVE

Una release non può essere dichiarata LIVE quando `SCD Production Evidence` è rossa.

Il fallimento del probe R20 significa che il repository può essere aggiornato mentre il progetto Apps Script è ancora precedente.

## Retry

Il workflow attende i deploy asincroni di Pages e Render con retry limitati. Il retry non converte un errore in successo: serve soltanto a evitare falsi negativi durante la propagazione del deploy.

## Rollback

- revert R29 per rimuovere il probe;
- il probe non modifica dati;
- nessuna scansione Gmail/Drive viene avviata dal verifier;
- nessun segreto è necessario per la prova pubblica del contratto.
