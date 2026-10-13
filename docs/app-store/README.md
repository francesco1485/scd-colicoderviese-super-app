# Materiale App Store (e screenshot Play)

Guida completa: `APP_STORE_SUBMISSION.md` (radice del repository). Play Store: `PLAY_STORE_SUBMISSION.md`.

| File | Uso | Requisito |
|---|---|---|
| `app-icon-1024.png` | Icona App Store | 1024×1024, RGB senza trasparenza; stemma ufficiale `assets/logo-scd.png` su blu `#062a52` |
| `screenshots/iphone-6.9/*.png` | iPhone 6,9" | 1320×2868 |
| `screenshots/iphone-6.5/*.png` | iPhone 6,5" | 1242×2688 |
| `../play-store/screenshots/phone-1080x1920/*.png` | Telefono Google Play | 1080×1920 |
| `codemagic.example.yaml` | Build iOS in cloud senza Mac | da copiare come `codemagic.yaml` quando l'account Apple è attivo |
| `capture-screenshots.mjs` | Rigenera tutti gli screenshot dal sito pubblicato | — |

Schermate (13/10/2026, `https://scd-superapp-staging.onrender.com`): `1-home`, `2-calendario`, `3-fantacalcio`,
`4-top11`, `5-rassegna`, `6-guida`. Solo pagine pubbliche e dati reali; consenso cookie e benvenuto preimpostati
(`scd-consent` senza statistiche/marketing, `scd-onb=1`) perché i banner non coprano il contenuto.

## Rigenerare gli screenshot
```bash
# dalla radice del repository, con Playwright installato
PLAYWRIGHT=/percorso/playwright/index.mjs node docs/app-store/capture-screenshots.mjs
# oppure un altro indirizzo:
node docs/app-store/capture-screenshots.mjs https://app.colicoderviese.it
```
Rigenerarli prima dell'invio se la grafica è cambiata, e ricontrollarli a occhio: niente dati di minori oltre ai
nomi delle squadre, niente schermate vuote o di errore.

## Icona
Lo stemma non va mai ridisegnato (asset KEEP_LOCKED, `config/scd-assets.v1.json`). La fonte ufficiale più grande nel
repository è 480×628: nell'icona 1024 lo stemma è alto 800 px (ingrandimento ~1,3× Lanczos). Se arriva il file
vettoriale originale della società, rigenerare l'icona da quello mantenendo sfondo `#062a52` e margini.
