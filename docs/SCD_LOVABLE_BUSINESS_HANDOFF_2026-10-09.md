# SCD COLICODERVIESE – LOVABLE BUSINESS | HANDOFF 09/10/2026

## Stato verificato
- Lovable workspace **Colico's Lovable**, workspace ID `aed93e1d7c8515792640`, account `sportclubcolico@gmail.com`, piano **business**, ruolo **owner** (verificato via connessione Lovable 09/10/2026).
- NON acquistare nuovi abbonamenti o attivare Max 2,5x senza necessità.
- PROGETTI ESISTENTI, NON DUPLICARE:
  1. [SCD Command Center – staging CORE, /vision-2026](https://lovable.dev/projects/5c6eac53-092e-4a6d-a7fe-54d82d6369ad), commit prima del nuovo ciclo `f5032e93e558f71d829403d80cc9f905b7386172`.
  2. [ColicoDerviese Hub – SCD ONE già pubblicata](https://lovable.dev/projects/06cb3ee4-cd83-4848-804b-61fc94708fbe), NON ripubblicare senza approvazione.
- GitHub canonico: `francesco1485/scd-colicoderviese-super-app`; PR draft [#151](https://github.com/francesco1485/scd-colicoderviese-super-app/pull/151); branch `fix/vision-2026-lovable-recovery-20261009`.
- Lovable Workspace Knowledge e Project Knowledge già contengono il vincolo **Business attivo** e le regole sulla sorgente GitHub. Questi contesti sono persistenti in Lovable, non sono messaggi inviati ad altre chat ChatGPT.

## Lavoro affidato a Lovable Business
- Messaggio al progetto preesistente Command Center inviato **09/10/2026**, message ID `umsg_01m4gjdkzyer1akz6vkwps5wx6`, thread `main`, **completato, commit Lovable `e5bdea9403028d8cd0f82fc4e8a67b534f41ee0b` (build riportata OK; controllo qualità aggiuntivo necessario)**.
- Priorità: riparare build di `/vision-2026` (componenti shadcn, import, test), conservare le sei schermate approvate, UI nativa con componenti React, UX mobile e desktop, asset ufficiali, confrontare screenshot browser reali.
- Non rigenerare design generici, non interpretare demo come dati R20 reali.
- Non pubblicare, non modificare sistemi privacy/auth/produzione; conservare ogni modifica in commit e registrare l'esito dei test.

## Trasferimento informazioni fra chat
Le conversazioni ChatGPT NON ricevono automaticamente una notifica dal presente progetto. Ogni nuova chat o agente SCD deve leggere questo handoff e le knowledge Lovable, oltre a `AGENTS.md`, `SCD_SYSTEM_MANIFEST.json`, `config/user-directives.v1.json` e `config/scd-visual-references.v1.json`. Nessuna automazione multi-chat è stata dichiarata o configurata.

## Prossimo checkpoint richiesto
Al termine dell'intervento Lovable registrare: commit, build, errori browser, screenshot reali e stato URL preview; NON dichiarare conclusa la ricostruzione senza queste prove.

## Ciclo ricorrente SCD attivo (09/10/2026)
- Automazione ChatGPT esistente riattivata, NON duplicata: ID `6ac474d2bcac8191820fd0dcb05ae480`, titolo **SCD Build Continuo 2026**.
- `RRULE:FREQ=HOURLY`, modalità `exact_schedule`, `is_enabled=true`, fuso `Europe/Rome`. È la **massima frequenza supportata**, non un processo con CPU ininterrotta fra le esecuzioni. Nessuna garanzia di disponibilità dei connettori a ogni ciclo.
- Ogni ciclo verifica stato aggiornato su PR #150/#151, Lovable Business, CI, contenuti grafici e privacy; deve compiere un intervento reversibile sul codice, testarlo e registrare un checkpoint, oppure registrare un blocker reale verificabile. Priorità: fedeltà alle sei tavole originali; app ONE → CORE → GROW.
- Lovable Business: secondo intervento sul progetto Command Center `umsg_01m4gjq52nfbdr6x57cgy7kfyz` **completato**, commit dichiarato `92ee107cb59fab592e92ae026897eafba64599cd`: rimossi entrambi gli `@ts-nocheck`, aggiunto `@types/bun` per i test; risultati comunicati dall'agente Lovable: `bunx tsgo --noEmit` 0 errori, `bun test` 9/9, `npm run build` OK. Il progetto di staging risulta `ready`. Verificare sempre indipendentemente il diff prima di portare il codice a GitHub canonico.
- Ultimo CI rilevato prima del nuovo test GitHub: [SCD ONE Native Runtime QA #37947831580](https://github.com/francesco1485/scd-colicoderviese-super-app/actions/runs/37947831580) FAILURE per selettore Playwright ambiguo fra nuovo Calendario e DOM legacy; corretti i selettori nel commit GitHub `3383b96f3b8c36fdcf95c5d56095e85a83b677df`, ancora da verificare in CI.
- Non pubblicare, unire in main, pagare, aprire nuovi backend, alterare dati privati/safeguarding o autorizzazioni senza gate umano esplicito. Le altre chat possono **leggere questa fonte**, non ricevono notifiche automatiche.
