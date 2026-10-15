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


## B3 · Prima schermata e peso: home e /sponsor · 2026-10-15

### Come è stato misurato (`VERIFIED`)
- Stesso metodo di L1: Lighthouse 12.8.2, Chromium preinstallato, preset mobile (Moto G, 4G lento simulato, CPU ×4),
  build di produzione locale dietro un proxy Brotli (qualità 5) come Render; mediana di 3 esecuzioni, solo prestazioni.
- **Prima** = `a02d105` (live su Render, build in una copia separata); **dopo** = questo intervento.
- Prima visita (nessuna scelta cookie salvata), come la vede chi apre il link la prima volta.
- Spostamenti di layout ricontrollati con Playwright (PerformanceObserver `layout-shift`, rete e CPU rallentate).

### Risultati (mediana di 3, mobile, prima visita)

| Pagina | Prestazioni prima → dopo | FCP ms | LCP ms | CLS | TBT ms | Peso KiB |
|---|---|---|---|---|---|---|
| `/` | 58 → 61 | 4998 → 5065 | 6333 → 10801 (avviso cookie, vedi sotto) | **0.120 → 0.000** | 465 → 70 | **1789 → 1483** |
| `/sponsor` | 58 → 63 | 4599 → 5182 | **9778 → 5975** | 0.000 → 0.000 | 261 → 149 | **1486 → 1175** |
| `/calendario` | — → 65 | — → 4352 | — → 7937 | 0.092 (L1) → **0.000** | — → 111 | — → 1169 |
| `/squadre` | — → 77 | — → 3857 | — → 3932 | 0.062 (L1) → **0.002** | — → 220 | — → 815 |

Le prestazioni simulate di Lighthouse variano molto tra una serie e l'altra (una serie intermedia della stessa
modifica ha dato home 66 e /sponsor 66): contano soprattutto CLS e peso, che sono stabili. Con la scelta cookie già salvata e cache vuota: home 67 → 66 (LCP 5282 → 5047),
/sponsor 64 → 64 (LCP 8344 → 6221).

**LCP della home alla prima visita.** Prima l'elemento più grande era il titolo «Questa settimana», che con il carattere
di riserva andava su due righe (più grande del dovuto) e poi saltava su una: era anche la causa principale del CLS 0.12.
Ora il titolo resta su una riga fin dall'inizio, quindi alla prima visita l'elemento più grande diventa l'avviso cookie
(compare dopo che la pagina è diventata interattiva, ~10 s nella simulazione lenta). Il contenuto della home appare come
prima o prima; per spostare anche questo numero l'avviso andrebbe disegnato dal server leggendo il cookie tecnico della
scelta (non toccato qui: area consenso, da decidere).

### Cosa è stato corretto
1. **Caratteri di riserva con le stesse misure** (`src/font-fallbacks.css`, generato da
   `scripts/derive-font-fallbacks.py`): per ogni famiglia e peso ufficiale (Fira Sans, Fira Sans Condensed, Anton,
   Big Shoulders Display, Barlow) una faccia «<Famiglia> Fallback» su Arial/Liberation Sans/Helvetica/Roboto locali con
   `size-adjust` e `ascent/descent/line-gap-override` calcolati dai file ufficiali. Per i titoli `font-uv` in
   maiuscolo (classe `uppercase`, es. «Questa settimana») Big Shoulders usa una faccia misurata sulle sole maiuscole
   (le facce «Caps» di Anton sono pronte ma non ancora collegate: `--font-brand`/`--font-title` sono incorporate da
   Tailwind). Mentre il carattere ufficiale
   arriva le righe non cambiano più: CLS home 0.120 → 0.000, risolto anche l'aperto di L1 su `/calendario` e `/squadre`.
   I file ufficiali sono solo letti; nessun carattere scaricato in più. Il CLS 0 è misurato in laboratorio con Liberation
   Sans (stesse misure di Arial/Helvetica); su Android il ripiego è Roboto, un po' diverso: stabilità buona, non per
   forza zero.
2. **Marchi FIGC SGS, LND e Insieme al Monza in resa 96 px** (`/media/affiliazioni/cut/<id>-h96.webp`, WebP senza
   perdita con alfa, registrati con `derived_from`): si vedono al massimo a 34 px (testata di ogni pagina, fascia della
   home, piè di pagina). 183 + 40 + 20 KB → 33 + 18 + 9 KB **su ogni pagina**.
3. **Fermo immagine del ledwall in 640 e 960 px** (`ledwall-board-empty-640/960.webp`, foto senza marchi, registrate):
   un telefono a densità fino a ~1,8 (profilo Lighthouse) scarica 37–85 KB invece di 216 KB; a densità 2 resta il
   1280w, a densità 3 il 1920w come prima (`sizes` 130vw da ripensare). Su `/sponsor` è l'elemento più grande della prima schermata: ora si
   carica subito e con priorità alta (`LedwallRotator priority`), LCP ~9,8 s → ~5,9 s.

### Non toccato (motivo)
- Locandine degli spot (`*-preview-poster.webp`, 134 KB): asset bloccati (fotogramma dello spot ufficiale).
- Stemmi avversari in `/media/crests/` (50–73 KB per uno stemma mostrato a 20 px): servirebbe una resa ridotta per ogni
  stemma del registro `config/scd-opponent-crests.v1.json`; prossimo passo, stesso metodo dei marchi qui sopra.
- Avviso cookie: vedi sopra.

### Ripetere la misura
Come L1; per lo spostamento dei caratteri: `python3 scripts/derive-font-fallbacks.py > src/font-fallbacks.css`
dopo ogni cambio di famiglie o pesi in `src/styles.css` (il test `font-fallbacks.test.ts` fallisce se manca una faccia).

## L2 · Accessibilità (axe-core + bersagli da 44 px) · 2026-10-12

### Come è stato misurato (`VERIFIED`)
- `scripts/a11y-audit.mjs` (nuovo, ripetibile): axe-core 4.10.3 con le regole WCAG 2.0/2.1/2.2 livello A e AA, più la regola
  del club "bersagli toccabili di almeno 44×44 px" (PRODUCT.md) su ogni elemento interattivo visibile; i link dentro una frase
  sono esclusi come prevede la WCAG; un campo dentro (o collegato a) un'etichetta conta l'area dell'etichetta.
- Build di produzione locale, Chromium preinstallato, 390×844 (telefono) e 1440×900 (desktop). Pagine: `/guida`, `/accedi`,
  `/registrati`, `/privacy`, `/famiglia`, `/gestionale/mister` (convocazione e distinta), `/segreteria/certificati`.
- Pagine riservate: aperte con navigazione interna mentre lo script risponde a ogni funzione server con **dati di prova
  inventati** (nomi adulti di fantasia, solo Juniores e Prima Squadra, nessun minore, nessuna persona reale). Nessuna lettura
  o scrittura su database; le chiamate di scrittura vengono bloccate.

### Risultati

| Pagina | Formato | Violazioni axe prima → dopo | Bersagli < 44 px prima → dopo |
|---|---|---|---|
| `/guida` | 390 / 1440 | 1 / 1 → 0 / 0 | 28 / 33 → 0 / 0 |
| `/accedi` | 390 / 1440 | 1 / 1 → 0 / 0 | 18 / 23 → 0 / 0 |
| `/registrati` | 390 / 1440 | 1 / 1 → 0 / 0 | 17 / 22 → 0 / 0 |
| `/privacy` | 390 / 1440 | 1 / 1 → 0 / 0 | 17 / 22 → 0 / 0 |
| `/famiglia` | 390 / 1440 | 1 / 2 → 0 / 0 | 17 / 33 → 0 / 0 |
| `/gestionale/mister` | 390 / 1440 | 0 / 0 → 0 / 0 | 86 / 99 → 0 / 0 |
| `/segreteria/certificati` | 390 / 1440 | 0 / 0 → 0 / 0 | 9 / 22 → 0 / 0 |

Nessuno scorrimento orizzontale su nessuna pagina. Nessuna violazione su etichette, punti di riferimento (landmark), nomi
accessibili o ordine dei titoli.

### Cosa è stato corretto
1. **`aria-controls` non valido** (tutte le pagine pubbliche): il pulsante del menu puntava a `#sa-menu`, che esiste solo a
   menu aperto. Tolto l'attributo.
2. **Contrasto** del pulsante "Ci sarò" scelto (`/famiglia`): verde `#128a2e` con testo bianco 4,46:1 → `#0f7a28` 5,48:1.
3. **Piè di pagina**: link e "Preferenze cookie" alti 20 px → 44 px; testi su sfondo sfumato da opacità 60–80% a 90%
   (l'indirizzo e le righe piccole erano ~4:1 nel punto più chiaro dello sfondo, ora ≥ 5,7:1).
4. **Barra in alto e menu**: voci del menu principale desktop 40 → 44 px; voci del menu completo e "Safeguarding" 44 px.
5. **Area interna** (tutte le aree di lavoro): voci della barra laterale 40 → 44 px, ricerca 40 → 44 px, pulsante
   "Copia link" 34 → 44 px, "Apri il file" delle fonti 36 → 44 px.
6. **Distinta** (`/gestionale/mister`): Titolare/Riserva, C e VC 32 → 44 px; casella "in distinta" con area di tocco 44×44;
   numero di maglia, "Ricarica", "Aggiungi in panchina", "Copia testo", "Stampa" 44 px.
7. **Certificati**: filtri 36 → 44 px, ricerca e scelta squadra 44 px. **Accedi**: "Torna alle aree" 44 px. **Notifiche**:
   "Disattiva" 44 px.
- Test: `src/lib/touch-targets.test.ts` (nessun controllo sotto 44 px nei file corretti, menu senza riferimento rotto,
  verde "Ci sarò" con contrasto AA).

### Aperto (non bloccante)
- axe non sa calcolare il contrasto dei testi su sfondi sfumati (piè di pagina, fascia numeri delle aree interne): verificati
  a mano sul colore più chiaro della sfumatura; ricontrollare se cambiano i colori.
- Pagine non incluse in questo giro (home, calendario, squadre, impianti): stessi componenti di testata e piè di pagina già
  corretti; vanno aggiunte allo script in un prossimo passaggio.

- 13/10/2026: rifatto l'audit durante L4, 3 bersagli del piè di pagina erano tornati sotto 44 px (e-mail della società,
  "Eventi", "Privacy"); corretti in `SiteChrome.tsx`, di nuovo 0 violazioni e 0 bersagli piccoli. I dati di prova ora stanno
  in `scripts/lib/private-fixtures.mjs`.

### Ripetere la verifica
`cd apps/superapp && npm run build && PORT=4173 node .output/server/index.mjs &` poi
`A11Y_BASE_URL=http://localhost:4173 A11Y_OUT=/tmp/a11y node scripts/a11y-audit.mjs` (`A11Y_SHOTS=1` salva le schermate,
`A11Y_ONLY=famiglia,mister` limita le pagine). Esce con errore se trova violazioni.

## L3 · Regola sui formati degli asset · 2026-10-13

Regola scritta in `config/scd-assets.v1.json` → `format_policy` (registro 1.1.0), dal comando utente CMD-20260930-0832
("SVG nativo", "raster solo come placeholder") e dal punto L3 del piano di lancio.

| Tipo | Formati | Condizione |
|---|---|---|
| Marchi (stemma, LND/FIGC-SGS/Monza, sponsor, badge annate) | SVG preferito; PNG/WebP | raster ammesso solo con `RESEARCH_REAL_ASSET` (vettoriale ufficiale da cercare); PNG solo con trasparenza; nuove derivate WebP **senza perdita** |
| Scontornati (Sky, Crovi) | PNG o WebP | canale alpha obbligatorio |
| Foto, locandine, tavole kit, planimetrie | WebP o JPG | niente PNG |
| Documenti ufficiali | PDF | — |
| Icone app | PNG | richiesto da manifest e iOS |
| Originali conservati | come arrivati | mai serviti dal codice; serve la resa registrata |

Vietato: rigenerare o ridisegnare un asset ufficiale, vettorializzare/ricalcare un raster spacciandolo per SVG ufficiale,
ricomprimere con perdita un marchio bloccato.

Registro: ogni file servito da `apps/superapp/public` (immagini e PDF, 95 file) è ora registrato (`locked_assets` o il nuovo
`runtime_assets`, per file o per cartella). Nessun SVG ufficiale nel repository: stemma, marchi federali/Monza, sponsor e
badge annate sono in `vector_research` come `RESEARCH_REAL_ASSET` (fonti: cartella brand del Drive, kit federali,
file forniti dagli sponsor).

Test `src/lib/asset-format.test.ts` (16): lettore di intestazioni PNG/WebP/JPEG/PDF/SVG (alpha, lossless) senza decodifica;
ogni file servito registrato e conforme; asset bloccati conformi salvo il debito elencato; hash git dei file registrati
invariati; ogni `/media/...` citato dal codice esiste ed è registrato; gli originali non sono serviti.

Correzione trovata dal test: i 9 badge annata (PNG 512 px opachi, ~330 KB l'uno) erano serviti a 20–34 px su
/calendario, /allenamenti, /comunicazioni e /core/impianti-calendari. Ora si serve una resa 96 px WebP senza perdita
(17–19 KB l'una): **~2,9 MB → ~163 KB** per pagina con tutte le annate. Gli originali PNG restano invariati (hash registrato).

Debito noto (`known_format_debt`, verificato dal test): `assets/logo-{scd,lnd,sgs,monza}.webp` e `assets/sky.webp` sono copie
RGB con perdita dell'app legacy alla radice; la Super App non le usa. Da ritirare con l'app legacy, mai ricomprimere.
