# SCD ColicoDerviese Super App

## Contratto di sistema

La fonte normativa unica del progetto è **[SCD_SYSTEM_MANIFEST.json](./SCD_SYSTEM_MANIFEST.json)**.

Prima di qualunque modifica:

```bash
npm run test:manifest
```

Il manifest governa architettura, schermate, fonti dati, ruoli, sicurezza, Drive/Gmail intelligence, calendario/eventi, comunicazioni, Sky/avatar, Evolution Engine e criteri di rilascio.

Gli altri documenti Markdown sono materiale storico o specifiche di supporto e non possono prevalere sul manifest.

## Runtime

- Web/PWA: GitHub Pages
- API dinamica R21: Render
- Gestionale e identity core: R20 / Apps Script / Google data
- Orchestrazione R22: Command Platform
- Android: `it.colicoderviese.app`
