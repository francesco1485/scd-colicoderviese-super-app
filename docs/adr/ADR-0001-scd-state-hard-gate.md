# ADR-0001 — SCD:STATE Hard Gate

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Ambito:** governance di sviluppo, continuità, release evidence
- **Decisione:** introdurre `SCD:STATE` come precondition gate obbligatorio prima di ogni operazione di scrittura.

## Problema

Il progetto SCD PULSE OS evolve su più branch, release, workflow, runtime e fonti dati. Gli snapshot narrativi e i prompt di continuità sono utili come memoria, ma possono diventare obsoleti. Usare uno stato storico come stato corrente può portare a lavorare sul branch sbagliato, dichiarare live ciò che non lo è, duplicare componenti o violare dipendenze tra release.

## Decisione

Prima di modificare file, creare branch, effettuare commit/push, merge, deploy, scrivere dati o cambiare configurazione deve essere eseguito `SCD:STATE`.

Il gate produce almeno:
- repository;
- SHA corrente di `main`;
- branch di lavoro;
- working tree;
- PR aperte e relativo stato;
- stato CI;
- stato Pages;
- stato Render;
- versione/hash Manifest;
- dipendenze tra release;
- fonti dati verificate;
- blocker noti;
- prossima azione sicura.

Ogni voce usa uno dei soli stati:
- `VERIFIED`;
- `UNVERIFIED`;
- `NOT_AVAILABLE`;
- `NOT_APPLICABLE`.

Regola: **NO STATE → NO WRITE**.

`UNVERIFIED` non equivale a falso, assente o non esistente.

## Release evidence

Ogni release deve rendere disponibili almeno:
- VERSION;
- COMMIT;
- PR;
- CI STATUS;
- SCREENSHOT MOBILE;
- SCREENSHOT DESKTOP;
- DATA SOURCES;
- KNOWN LIMITATIONS;
- ROLLBACK.

## Dipendenza R25 → R26

La dipendenza è esplicita e verificata nella storia di `main`:
- R25: `7a8f76d824c8a69f9c9e5b64639b29be7c70936b`;
- R26: `5947477a3549fbab4e1d4029a86c1e46e57f1ec3`;
- R26 è un commit successivo a R25 in `main`.

I branch storici R25/R26 possono risultare divergenti dopo squash merge e non devono essere usati come prova dello stato corrente senza verifica.

## Alternative considerate

### Affidarsi al prompt di continuità
Scartata: il prompt è memoria, non runtime truth.

### Controllare lo stato solo prima del merge
Scartata: gli errori di branch o dipendenza possono avvenire molto prima.

### Bloccare ogni attività quando una fonte è indisponibile
Scartata: lettura, diagnostica e proposta restano consentite. È bloccata solo la scrittura non supportata da stato verificato.

## Conseguenze

- Le nuove chat e gli agenti devono verificare prima di scrivere.
- Le PR devono contenere evidenza `SCD:STATE`.
- La policy PR blocca dichiarazioni prive di stato minimo verificato.
- Il Manifest rende la regola parte del contratto machine-readable.
- Il validatore impedisce regressioni silenziose del gate.
- Aumenta leggermente il lavoro iniziale, ma riduce rework, merge errati e dichiarazioni premature.

## Rollback

Per annullare questa decisione:
1. rimuovere il blocco `SCD:STATE` da `AGENTS.md`;
2. rimuovere `state_gate`, `operating_cycle`, `release_dependencies` e la release evidence dal Manifest;
3. rimuovere le relative assertion dal validatore;
4. ripristinare template e workflow PR precedenti;
5. incrementare nuovamente la versione Manifest documentando la nuova decisione.

Il rollback non modifica dati sportivi, R20, Drive, Gmail, account, ruoli o runtime di produzione.
