# Schermate per la presentazione ufficiale (L4)

Catturate dalla build di produzione locale con `scripts/presentation-shots.mjs` (Playwright + Chromium preinstallato):
`-m` telefono 390×844, `-d` desktop 1440×900, prima schermata del flusso (o della sezione indicata).
Ultimo aggiornamento: **13/10/2026** (tutte tranne `persone-*`, del 12/10/2026).

Le pagine riservate usano i dati di prova inventati di `scripts/lib/private-fixtures.mjs`: nomi di fantasia, solo squadre
di adulti (Juniores U19, Prima Squadra), nessuna persona reale, nessun minore, nessuna lettura o scrittura sul database.
Le pagine pubbliche mostrano il calendario ufficiale 2026/27 della copia nel repository.

| File | Pagina | Pubblico |
|---|---|---|
| home-* | Home "Si gioca questa settimana" con il prossimo calcio d'inizio | tutti |
| installa-* | /installa: indirizzo, QR, istruzioni iPhone/Android | tutti |
| guida-* | /guida: come funziona per tifosi, famiglie, mister, segreteria | tutti |
| accedi-* | Accesso con e-mail e password ("Ricordami") o link via e-mail, come appare a database collegato | tutti |
| calendario-*, squadre-* | Calendario settimanale e squadre (riservate ai soci) | tutti |
| famiglia-* | La mia famiglia: convocazioni con "Presa visione" e "Segnala un impedimento" | famiglie |
| mister-convocazione-* | Mister: prossima gara, stato delle risposte, rosa con i convocati | mister |
| mister-distinta-* | Mister: distinta di gara (titolari/riserve, capitano C e vice VC, numeri di maglia) | mister |
| certificati-* | Segreteria: registro certificati medici | segreteria |
| persone-*, persone-assegna-m | Persone, conferma tesseramento e assegnazione squadra (12/10) | segreteria |

Note per chi presenta:
- `installa-*` mostra l'indirizzo della macchina usata per la cattura (`localhost`): sul dominio definitivo
  (app.colicoderviese.it, UD-071, DNS da configurare) va ricatturata.
- Il pulsante "Ci sarò" del 12/10 è diventato "Presa visione" / "Segnala un impedimento" (decide il mister).

Rigenerare: `cd apps/superapp && npm run build && PORT=4173 node .output/server/index.mjs &` poi
`SHOTS_BASE_URL=http://localhost:4173 node scripts/presentation-shots.mjs` (`SHOTS_ONLY=famiglia,mister-distinta` limita
i flussi, `SHOTS_OUT=/tmp/x` scrive altrove). Esce con errore se un flusso non si apre o la pagina scorre in orizzontale.
