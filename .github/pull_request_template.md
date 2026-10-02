## SCD:STATE — HARD GATE

- [ ] Ho eseguito `SCD:STATE` prima della prima scrittura e non sto usando stato storico come stato corrente.

STATE_STATUS: UNVERIFIED
REPOSITORY:
MAIN_SHA:
WORKING_BRANCH:
PR_STATUS:
CI_STATUS:
PAGES_STATUS:
RENDER_STATUS:
MANIFEST_VERSION:
DEPENDENCIES:
DATA_SOURCES_VERIFIED:
KNOWN_BLOCKERS:
SAFE_NEXT_ACTION:

## SCD:EXPERT + SCD:ARCHITECT

- [ ] Ho classificato il lavoro con `SCD:EXPERT`.
- [ ] Ho applicato `SCD:ARCHITECT` per software/UI/Vision-to-Code oppure ho indicato `ARCHITECT_NOT_APPLICABLE`.

TASK_CLASS:
DOMAINS:
ARCHITECT_STATUS: APPLIED / ARCHITECT_NOT_APPLICABLE
FIXED:
IMPROVABLE:
MISSING:
SOURCE_PLAN:
TOOLCHAIN:
RISK:
TEST:
ROLLBACK_PLAN:
NEXT_ACTION:

## SCD Manifest Impact

- [ ] Ho letto `SCD_SYSTEM_MANIFEST.json`.
- [ ] Ho eseguito `npm run test:manifest`.
- [ ] La modifica rispetta account unico, ruoli/scope server-side e R20.
- [ ] La modifica rispetta la Source of Truth visiva SCD.
- [ ] La modifica non inventa dati sportivi.
- [ ] Safeguarding resta isolato dai flussi ordinari.

### Capability coinvolte
Indicare gli ID `CAP-*`:
<!-- esempio: CAP-CALENDAR, CAP-FAMILY; usare CAP-NONE solo se davvero non applicabile -->

### Fonte/i dati coinvolte
Indicare gli ID del `source_registry`:
<!-- esempio: R20, SCD_DRIVE, CR_LOMBARDIA; usare SOURCE-NONE solo se davvero non applicabile -->

### Manifest
- [ ] Nessuna modifica contrattuale: il manifest non richiede aggiornamento.
- [ ] Modifica contrattuale: `SCD_SYSTEM_MANIFEST.json` è aggiornato in questo PR.

### Visual QA
- [ ] Non applicabile.
- [ ] Verificato su 360x800, 390x844, 393x852, 430x932.
- [ ] Verificato su 1280x800, 1440x900, 1920x1080.
- [ ] Confrontato con il visual master approvato.

### Sicurezza / dati
- [ ] Nessun segreto o credenziale nel repository.
- [ ] Nessuna escalation di ruolo lato client.
- [ ] Dati sensibili minimizzati e autorizzati server-side.

### Release evidence
VERSION:
COMMIT:
PR:
CI STATUS:
SCREENSHOT MOBILE:
SCREENSHOT DESKTOP:
DATA SOURCES:
KNOWN LIMITATIONS:
ROLLBACK: vedere sezione seguente

### Rollback
Descrivere come annullare la modifica senza perdere dati:
