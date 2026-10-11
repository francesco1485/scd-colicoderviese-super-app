# Pubblicazione ufficiale della Super App

Nessun passo di questo file si esegue senza l'ok esplicito della Direzione.

## Decisioni aperte (Direzione)
| Decisione | Opzioni | Stato |
|---|---|---|
| Server di produzione | Render Starter (sempre acceso, circa 7 $/mese) oppure piano gratuito (si spegne dopo 15 minuti, la prima apertura impiega circa un minuto) | da decidere |
| Indirizzo | `app.colicoderviese.it` (la società ha già il dominio colicoderviese.it) oppure `scd-superapp.onrender.com` | da decidere |
| E-mail di accesso | Gmail della società — vedi `EMAIL_GMAIL_SMTP.md` | deciso 12/10, da configurare |
| Informativa privacy | testo pronto su `/privacy` (stato "bozza"): conferma e tempi di conservazione | da approvare |
| Segnalazioni safeguarding | oggi PEC con oggetto "RISERVATO - SAFEGUARDING": confermare chi la legge | da confermare |
| Consensi foto e dati | da raccogliere prima di pubblicare nomi o immagini | da organizzare |
| Registrazione 14-17 anni | oggi possibile con e-mail e telefono propri; in alternativa solo tramite genitore | da decidere |
| Vecchi siti di prova su Render | circa 15 servizi ancora pubblici: sospenderli tutti tranne staging e produzione | da approvare |

## Servizio di produzione (Render)
- Repository `francesco1485/scd-colicoderviese-super-app`, branch `main` (dopo il merge approvato di `staging/superapp`).
- Build: `cd apps/superapp && npm ci --no-audit --no-fund && npm run build`
- Start: `cd apps/superapp && npm start` (niente gateway con password)
- Health check: `/healthz`
- Regione: Frankfurt
- Variabili:
  - `SCD_ENV=production`
  - `SCD_SITE_URL=https://<indirizzo scelto>` (usato per i link di accesso, robots e sitemap)
  - `SCD_SUPABASE_URL`, `VITE_SCD_SUPABASE_PUBLISHABLE_KEY` (come staging)
  - NON impostare `SCD_STAGING_PREVIEW`, `SCD_STAGING_PASSWORD`, `SCD_STAGING_GATEWAY`.

## Supabase al momento del lancio
- Authentication → URL Configuration: Site URL = indirizzo di produzione; Redirect URLs = `<indirizzo>/accedi/conferma`
  (lasciare anche quello di staging).
- SMTP Gmail e testi italiani: `EMAIL_GMAIL_SMTP.md`.

## Cosa cambia in produzione (già nel codice)
- `/core` e `/grow` (schermate dimostrative) portano alle pagine vere.
- `robots.txt` apre solo le pagine pubbliche; staging resta escluso dai motori di ricerca.
- Le aree riservate non vengono mai salvate offline; all'uscita la copia sul telefono viene cancellata.
- Intestazioni di sicurezza su ogni risposta.

## Giorno del lancio
1. Merge approvato su `main` → servizio di produzione attivo → `/healthz` risponde.
2. Accesso di prova: Direzione, un mister, una famiglia.
3. Inviti a gruppi (circa 60 all'ora) partendo dalle squadre con i certificati già inseriti.
4. Presentazione ufficiale.
