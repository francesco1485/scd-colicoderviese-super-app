# Piano coordinamento Hub (SCD ONE) — 3 slice, nessuna modifica ora

## Stato verificato (lettura 09/10/2026)
- Route presenti: `/`, `/eventi`, `/entra`, `/sponsor`, `/fornitori`, `/community`, `/contatti`, `/safeguarding`, `/societa`, `/shop`, `/aree`, `/aree/$area`.
- `src/routes/index.tsx` linka due volte a `/calendario`, ma **la route non esiste**: link rotto in home.
- Nessuna route `/vision-2026` in questo progetto (resta di competenza PR #151).
- Dati pubblici: `getPublicFeed` e `getPublicSchedule` in `src/lib/club.functions.ts`, via adapter R20 `src/lib/appsscript.server.ts` (`public.calendar` è ancora azione pianificata, non attiva).
- `AGENTS.md` contiene solo il blocco Lovable standard: nessuna regola architetturale SCD registrata localmente.

## Slice 1 — Calendario pubblico SCD ONE (lettura sola, per annata)
- Nuovo file `src/routes/calendario.tsx` che usa `getPublicSchedule` già esistente; filtro annata/categoria, casa/trasferta, prossime e passate.
- Se `public.calendar` non risponde: stato "in aggiornamento", nessuna gara inventata.
- Nessun nuovo calendario/fonte: solo lettura tramite adapter R20; le proposte di variazione campo non compaiono come ufficiali FIGC.
- Accettazione: i link `/calendario` della home funzionano (200); la pagina ha un `head()` dedicato; nessun nome di minore, telefono o email nella risposta.

## Slice 2 — Rifinitura home ed eventi
- `src/routes/index.tsx`: eliminare i segnaposto fittizi visibili ("Sponsor" generici, prova locale del sondaggio) oppure mostrarli come vuoti chiari; filtrare `alerts` per pubblico `public`.
- `src/routes/eventi.tsx`: stesse etichette data/stato della home; `head()` con og:type e twitter:card.
- Accettazione: a 390 px la prima schermata mostra la settimana e la prossima gara; nessun dato demo presentato come live.

## Slice 3 — Revisione visuale mobile/desktop
- Playwright a 390, 768 e 1440 px su `/`, `/calendario`, `/eventi`, `/aree`; controllare che Sky non copra CTA o navigazione; correggere solo il layout.
- Evidenze (screenshot + esito) da allegare alla PR come prove, non pubblicare.

## Da NON fare (per evitare collisioni)
- Non toccare le sei schermate `/vision-2026` e il recupero UI (PR #151).
- Non implementare flussi CORE/GROW, richieste variazione, approvazioni o pipeline sponsor (PR #150).
- Non modificare adapter R20, auth PIN, `src/lib/private.functions.ts`, `aree.$area.tsx` privati, safeguarding.
- Nessun database, calendario o backend nuovo; non importare dati occupazione dalla preview `/impianti-calendari` del Command Center.
- Nessun deploy in produzione, nessuna email/notifica.

## Dettagli tecnici
- Nel momento della build: aggiornare `AGENTS.md` con una regola "dati pubblici solo via adapter R20 server-side" e un test minimo per il filtro privacy di `getPublicSchedule` (nessun campo personale).
- Prima di Slice 1 verificare lo stato CI di PR #150/#151 per evitare conflitti su `index.tsx`.
