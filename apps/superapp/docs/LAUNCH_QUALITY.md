# Qualità per il lancio — misure e correzioni

Registro delle verifiche di qualità prima della presentazione ufficiale (piano: `docs/PRODUCTION_LAUNCH.md`).
Ogni sezione riporta come è stata misurata, i numeri prima/dopo e cosa resta aperto.

## L1 · Prestazioni (Lighthouse) · 2026-10-12

### Come è stato misurato (`VERIFIED`)
- Lighthouse 12.8.2 con il Chromium preinstallato (`/opt/pw-browsers/chromium-1194`), preset mobile (Moto G, 4G lento simulato,
  CPU ×4) e preset desktop. Categorie: prestazioni, accessibilità, buone pratiche.
- Build di produzione locale (`npm run build`, server Nitro `node .output/server/index.mjs`), senza variabili Supabase/R20.
- Davanti al server un proxy di sola misura che comprime in Brotli come fa Render in staging (verificato: `content-encoding: br`
  sulle risposte di `scd-superapp-staging.onrender.com`). Senza questo proxy Lighthouse segnalerebbe ~800 KiB di
  "compressione mancante" che in staging non esiste.
- **Prima** = commit `e72fa1c` (build in una copia separata); **dopo** = questo intervento. Valori = mediana di 3 esecuzioni.
- La SEO locale vale 66 perché fuori produzione `robots.txt` blocca tutto (voluto: staging non va indicizzato). Non è un difetto.

### Risultati (mediana di 3)

| Pagina | Formato | Prestazioni prima → dopo | FCP ms | LCP ms | CLS | TBT ms | Peso KiB |
|---|---|---|---|---|---|---|---|
| `/` | mobile | 58 → 55 | 5063 → 4600 | 5875 → 5595 | 0.004 → 0.013 | 277 → 517 | 836 → 750 |
| `/` | desktop | 86 → 91 | 1222 → 1276 | 1413 → 1302 | 0.070 → 0.020 | 4 → 0 | 1049 → 969 |
| `/guida` | mobile | 74 → 75 | 4150 → 4228 | 4450 → 4303 | 0.001 → 0.003 | 14 → 18 | 722 → 616 |
| `/guida` | desktop | 95 → 99 | 1083 → 818 | 1163 → 818 | 0.013 → 0.010 | 0 → 0 | 705 → 592 |
| `/accedi` | mobile | 76 → 83 | 4064 → 3212 | 4302 → 3287 | 0.001 → 0.004 | 6 → 4 | 719 → 613 |
| `/accedi` | desktop | 95 → 97 | 1067 → 892 | 1167 → 892 | 0.029 → 0.038 | 0 → 0 | 702 → 590 |
| `/calendario` | mobile | 66 → 69 | 4447 → 3765 | 6340 → 5698 | 0.030 → 0.092 | 35 → 43 | 735 → 623 |
| `/calendario` | desktop | 93 → 95 | 1081 → 1027 | 1457 → 1287 | 0.035 → 0.015 | 0 → 0 | 750 → 646 |
| `/squadre` | mobile | 75 → 80 | 4141 → 3623 | 4389 → 3773 | 0.001 → 0.062 | 22 → 21 | 760 → 682 |
| `/squadre` | desktop | 95 → 99 | 1025 → 813 | 1085 → 844 | 0.061 → 0.012 | 0 → 0 | 725 → 634 |

Accessibilità invariata (91–100), buone pratiche 96–100.

Tempo di risposta del server sulla home (misura `curl`, `VERIFIED`): prima ogni visita chiedeva cinque letture ad Apps Script R20
(1,2–2,8 s prima del primo byte); dopo la prima visita la risposta parte in circa 0,07 s per 60 secondi.

### Cosa è stato corretto
1. **Font dal nostro dominio** (`@fontsource/*` 5.3.0, sottoinsieme latino, stesse famiglie e pesi di prima). Tolto il foglio
   Google Fonts che bloccava la prima visualizzazione e due collegamenti verso domini esterni; nessun indirizzo IP dei
   visitatori passa più a Google. I file hanno nome con impronta e cache immutabile di un anno; esclusi dalla copia offline
   del service worker (si scaricano solo quando servono). Verifica visiva: stessi caratteri caricati pagina per pagina
   (Playwright, 390×844 e 1440×900), differenze di pixel tra 0 e 0,6% dovute solo a dati che cambiano (meteo, conto alla rovescia).
2. **Bundle principale da 578 KB a 348 KB** (non compressi; ~100 KB in Brotli). Due importazioni portavano nel codice caricato
   da ogni pagina la planimetria SVG di Dervio (100 KB di immagine incorporata), l'istantanea del calendario impianti e le
   regole SGS: ora gli identificativi delle sezioni impianti stanno in `src/features/impianti/section-ids.ts` e i dati
   dell'organigramma SGS in `src/lib/sgs-quality.data.ts`, caricati solo dove servono.
3. **Stemma ufficiale in WebP senza perdita** (`/media/brand/logo-scd.webp`): stessi pixel del PNG ufficiale (controllo
   RGBA identico), 69 → 35 KB. Registrato in `config/scd-assets.v1.json` come `OFFICIAL_CLUB_LOGO_OPTIMIZED` con
   `derived_from: assets/logo-scd.png`; il PNG ufficiale resta invariato.
4. **Cache del browser per immagini e icone** (`src/lib/static-cache.ts`): `/media/**` e icone PWA 1 giorno +
   aggiornamento in background 7 giorni. Pagine, funzioni server, `sw.js` e manifest esclusi (test).
5. **Letture pubbliche R20 con cache breve** (`src/lib/public-read-cache.ts`): solo azioni `public.*` senza sessione e
   senza dati inviati; risposta buona 60 s, errore 15 s, richieste contemporanee condivise. Nessun dato personale coinvolto.

### Prova scartata
- Precaricare i font del titolo e del testo: su mobile peggiorava FCP/LCP (i font competevano con il CSS) e non toglieva lo
  spostamento su `/squadre`. Tolto.

### Aperto (prossimi passi, non bloccanti)
- **CLS mobile** su `/calendario` (0.092) e `/squadre` (0.062): resta sotto la soglia "buono" (0.1) ma è salito, perché ora il
  testo appare prima con il carattere di riserva e poi passa al carattere ufficiale. Rimedio: caratteri di riserva con
  metriche adattate (`size-adjust`, `ascent-override`).
- **Home mobile**: TBT 280–650 ms per l'idratazione di ~1300 elementi; LCP = immagine di testata del lago. Rimedio: rendere
  statiche le parti della home che non cambiano e dividere i blocchi sotto la piega.
- **Loghi categoria** in `/media/scd/SCD_*.png` (~330 KB ciascuno, 9 file) usati nelle pagine squadra: stessa conversione
  WebP senza perdita possibile, da fare con registrazione degli asset.
- **Loghi sponsor** nel nastro: file 2–3 volte più grandi della resa a 22–30 px; servono versioni ridotte dai file ufficiali.
- Segnalato a parte: il nastro sponsor mostra anche HDI, contratto scaduto il 31/12/2025 (`PRODUCT.md`). Decisione della Direzione.
- Spunti per L2 (accessibilità) visti da Lighthouse: `aria-valid-attr-value`, `label-content-name-mismatch`,
  `color-contrast` sulla home, `image-aspect-ratio`.

### Ripetere la misura
1. `cd apps/superapp && npm run build && PORT=4173 node .output/server/index.mjs`
2. Proxy di compressione davanti al server (Brotli qualità 5) e Lighthouse 12 con
   `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `--chrome-flags="--headless=new --no-sandbox"`,
   preset mobile e `--preset=desktop`, 3 esecuzioni per pagina, mediana. Non usare `playwright install`.
