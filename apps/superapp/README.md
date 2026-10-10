# S.C.D. ColicoDerviese · Super App (anteprima locale)

Un'unica web app, un solo ingresso, in cui confluiscono le tre app SCD:

| App | Dove | Contenuto |
|---|---|---|
| **SCD ONE** (pubblico) | `/`, `/calendario`, `/allenamenti`, `/eventi`, `/community`, `/entra`, `/contatti`, `/safeguarding`, `/societa`, `/shop`, `/aree`, `/aree/$area` | Hub Lovable `06cb3ee4…` @ `0259f50` |
| **SCD CORE** (gestione) | `/core`, `/core/impianti-calendari`, `/core/atleta`, `/core/famiglia`, `/core/staff` | Command Center Lovable `5c6eac53…` @ `ed6cd65` (modulo `features/impianti`, schermate Vision 2026) — **DEMO · ANTEPRIMA** |
| **SCD GROW** (sponsor) | `/grow`, `/sponsor`, `/fornitori` | Catalogo sponsor dell'Hub + slot GROW della Vision 2026 — nessun marchio non confermato |

Stack: TanStack Start + React 19 + Vite 8 + Tailwind 4 (config `@lovable.dev/vite-tanstack-config`), Nitro con preset **node-server**.

## Comandi

```bash
npm ci                 # installazione pulita dal package-lock.json
npm run typecheck      # tsc --noEmit
npm test               # vitest run (test portati da bun:test)
npm run build          # vite build -> .output/ (preset Nitro node-server)
npm start              # node .output/server/index.mjs  (PORT=3000 di default)
```

Avvio con porta esplicita: `PORT=3000 node .output/server/index.mjs` → <http://localhost:3000>.
Altro runtime: `NITRO_PRESET=<preset> npm run build` (es. `cloudflare-module`, come su Lovable).

Solo nella sandbox con proxy HTTPS (non serve in produzione) il server deve passare dal proxy per
leggere R20 e il mirror Drive:
`NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt PORT=3000 node .output/server/index.mjs`.

QA browser (Chromium esistente, nessun `playwright install`):
`QA_BASE_URL=http://localhost:3000 QA_OUT=./qa-output node scripts/qa-browser.mjs`.

## Dati e integrazioni (invariati rispetto all'Hub)

- **R20** (Apps Script `/exec`, `src/lib/appsscript.server.ts`): feed, partite, società, login email+PIN delle aree riservate. Chiamate solo da server function. `APPS_SCRIPT_URL` sovrascrive l'endpoint.
- **Calendario pubblico**: ponte server verso il mirror Drive allowlistato (`scd-calendar-public-v3`, validazione anti-PII, cache 5 min). Copia di sicurezza inclusa: `src/data/calendario-snapshot-20261010.json` (mirror RC6 del 09/10/2026 22:36, 156 eventi).
- **Home**: "La settimana SCD", "Prossima partita" e "Oggi al centro sportivo" usano lo stesso calendario validato di `/calendario` (+ eventuali voci R20, senza doppioni): `src/lib/home-week.ts`.
- **CORE/GROW**: solo dati dimostrativi o snapshot pubblici già presenti nel codice Lovable; i link ai master Google non sono inclusi nel bundle pubblico ("Link riservato · disponibile con accesso R20").
- Nessun database, nessuna nuova autenticazione, nessun Supabase.

## Asset

Stemma ufficiale: `public/media/brand/logo-scd.png` (= `assets/logo-scd.png` del repo canonico). Loghi categoria, planimetria e avatar CROVI scaricati dal sito pubblico dell'Hub (stesse dimensioni degli `*.asset.json`), in `public/media/`. Nessuna immagine della mascotte Sky.
