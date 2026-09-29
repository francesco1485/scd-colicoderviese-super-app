## SCD Manifest Impact

- [ ] Ho letto `SCD_SYSTEM_MANIFEST.json`.
- [ ] Ho eseguito `npm run test:manifest`.
- [ ] La modifica rispetta account unico, ruoli/scope server-side e R20.
- [ ] La modifica rispetta la Source of Truth visiva SCD.
- [ ] La modifica non inventa dati sportivi.
- [ ] Safeguarding resta isolato dai flussi ordinari.

### Capability coinvolte
Indicare gli ID `CAP-*`:
<!-- esempio: CAP-CALENDAR, CAP-FAMILY -->

### Fonte/i dati coinvolte
Indicare gli ID del `source_registry`:
<!-- esempio: R20, SCD_DRIVE, CR_LOMBARDIA -->

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

### Rollback
Descrivere come annullare la modifica senza perdere dati:
