# SCD Command Platform R22

Nuovo livello di orchestrazione della Super App SCD ColicoDerviese.

## Principio

R20 resta la source of truth per identità, ruoli, squadre e funzioni gestionali esistenti.
La Command Platform non crea un secondo gestionale: introduce un livello standard per eseguire, accodare, osservare e automatizzare funzioni presenti e future.

```text
Browser / PWA / Android
        |
        v
Command API
        |
        +--> CommandRegistry --> trusted plugins
        |
        +--> Redis / BullMQ --> worker(s)
        |
        +--> Redis Streams --> operational events
        |
        +--> R20BridgeClient --> existing R20 / Apps Script
```

## Comandi inclusi

- `process-user-data@1.0.0`: esempio completo di comando asincrono, stato e rollback.
- `sync-r20-public-feed@1.0.0`: esempio di Adapter/Bridge verso R20.
- `analyze-workflow-load@1.0.0`: analisi deterministica del carico operativo, predisposta per future sostituzioni o estensioni AI.

## Sviluppo

```bash
cd platform
npm install
npm run check
npm run dev
```

Con `COMMAND_EXECUTION_MODE=inline` e senza `REDIS_URL`, l'API funziona in modalità pilot senza coda persistente.

Con Redis/Valkey:

```env
REDIS_URL=redis://...
COMMAND_EXECUTION_MODE=queue
```

i comandi asincroni vengono inviati a BullMQ.

Worker separato:

```bash
npm run worker
```

## Plugin contract

Ogni plugin estende `BaseCommand` e deve definire:

- `name`
- `version`
- `schema`
- `execute()`
- `rollback()` quando esistono side effect compensabili
- ruoli ammessi
- modalità sync/async

`CommandRegistry` esegue discovery dinamico della directory plugin.
In sviluppo supporta hot reload tramite Chokidar.
In produzione il hot reload va usato soltanto su codice trusted distribuito dalla pipeline: non è previsto il caricamento di codice arbitrario degli utenti.

## API

- `GET /health`
- `GET /v1/commands`
- `POST /v1/commands/:command`
- `GET /v1/jobs/:id`
- `GET /v1/admin/operations`
- OpenAPI: `/docs`

## Autenticazione

In produzione la Command Platform richiede `x-scd-session` e valida la sessione attraverso R20.

`AUTH_MODE=development` abilita esclusivamente in sviluppo gli header:
- `x-user-id`
- `x-user-roles`

Non devono essere usati come autenticazione pubblica in produzione.

## Zero-cost / pilot mode

La piattaforma è progettata per due livelli:

1. **Pilot gratuito:** command API in modalità inline, R20 invariato.
2. **Queue mode:** Render Key Value/Valkey + BullMQ. Il worker può essere separato quando il piano infrastrutturale lo consente.

Non viene dichiarata durabilità della coda quando `REDIS_URL` non è configurato.

## Evoluzione AI

Un modulo LLM non riceve privilegi speciali. Deve essere un plugin Command come gli altri e quindi passa attraverso:
schema -> autorizzazione -> audit -> event bus -> result.

Esempi futuri:
- `generate-direction-brief`
- `detect-workflow-anomaly`
- `recommend-next-action`
- `predict-operational-load`

## Sicurezza

- Nessun ruolo è accettato dal browser in produzione senza validazione R20.
- Idempotency key per i job.
- Correlation ID su comandi/eventi.
- Rollback soltanto su ultimo tentativo fallito del worker.
- SIGTERM: il worker usa `worker.close()` e termina dopo il drain.
- Safeguarding resta esterno alla messaggistica e ai flussi ordinari.

## Embedded queue mode

Per mantenere il pilot a costo zero, la stessa istanza web può anche consumare la coda BullMQ.

```env
REDIS_URL=redis://...
COMMAND_EXECUTION_MODE=queue
RUN_EMBEDDED_WORKER=true
```

In questo assetto API e worker condividono il servizio web. È adatto al pilot e a carichi moderati. Quando il volume richiederà isolamento operativo, lo stesso worker può essere eseguito come servizio separato senza cambiare il contratto dei comandi.
