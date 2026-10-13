# APPLE APP STORE — SCD COLICODERVIESE

Aggiornato: 13/10/2026. Stessa decisione della Direzione del Play Store (13/10): app in rete sul link Render gratuito,
tutto pronto per gli store. Ordine di lavoro: **prima Play Store (TWA)**, poi App Store.

| Voce | Valore |
|---|---|
| Origine dell'app | `https://scd-superapp-staging.onrender.com` (la stessa della TWA) |
| Indirizzo breve (solo testi e marketing) | `https://appcolicoderviese.vercel.app` |
| Bundle ID | `it.colicoderviese.app` |
| Involucro | Capacitor 8.5.2 (`apps/superapp/capacitor.config.ts`) |
| Account | **da aprire**: Apple Developer Program, preferibilmente come organizzazione |

## 1. Strategia: perché non basta "incapsulare il sito"
La linea guida **4.2 (Minimum Functionality)** chiede che l'app vada "oltre un sito web reimpacchettato" e la 4.2.2
esclude app che sono principalmente "web clippings" o raccolte di link
([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)). Un semplice WebView del sito
verrebbe con buona probabilità rifiutato.

Scelta: **involucro Capacitor della stessa web app** con funzioni native vere, sullo stesso account e senza secondo
sistema (UD-008: adattatori nativi isolati dalla logica di business):

| Funzione nativa | Valore per famiglie e club | Plugin / tecnologia | Stato |
|---|---|---|---|
| Notifiche push native (APNs) | convocazioni e variazioni gara (UD-066) anche ad app chiusa | `@capacitor/push-notifications` + invio APNs dal server | PROPOSED |
| Carte nel Wallet | Card Tifoso / Tesserato / Famiglia (UD-050, UD-102) come pass `.pkpass` con QR all'ingresso | pass firmato lato server con certificato *Pass Type ID* + plugin di apertura pass | PROPOSED |
| Fotocamera | foto volto per l'avatar (UD-102), lettura QR alla biglietteria | `@capacitor/camera`, scanner QR | PROPOSED |
| Guscio offline | pagina offline dello stemma quando manca la rete o Render dorme | `server.errorPath` → `.output/native-shell/index.html` (già configurato) | READY |
| Condivisione nativa e link universali | condividere gara/squadra; il link di accesso via e-mail apre l'app | `@capacitor/share`, `@capacitor/app` + `apple-app-site-association` | PROPOSED |

Rischio di revisione: **medio**. Capacitor con `server.url` remoto è documentato dal progetto come pensato soprattutto
per lo sviluppo; Apple valuta l'esperienza finale. Per questo almeno **push native + Wallet + fotocamera** devono
essere pronti e visibili nella prima versione inviata, e le note per il revisore (§9) devono indicarle.

Android resta TWA (vedi `PLAY_STORE_SUBMISSION.md`); la piattaforma Android di Capacitor è installata solo come
riserva, non è il percorso scelto.

## 2. Cosa deve comprare / fare la Direzione
1. **Apple Developer Program**: 99 USD all'anno (prezzo in valuta locale), abbonamento rinnovabile.
   - Come **organizzazione** (consigliato: in App Store compare "S.C.D. ColicoDerviese" come venditore). Servono:
     numero **D-U-N-S** della società (gratuito da Dun & Bradstreet, qualche giorno), ragione sociale esatta, sito web,
     e-mail di lavoro, una persona con potere di firma per la società
     ([guida all'iscrizione organizzazione](https://help.buildfire.com/how-to-enroll-in-the-apple-developer-program-)).
   - **Esenzione della quota**: Apple la concede a enti non profit riconosciuti da un'autorità (per l'UE, un registro
     pubblico), che non vendono beni digitali nelle app. Si chiede durante l'iscrizione
     ([Apple — Fee waiver](https://developer.apple.com/support/fee-waiver)). Se la società è iscritta al RASD come
     ente sportivo dilettantistico senza scopo di lucro potrebbe rientrare (INFERRED: da verificare con Apple).
   - In alternativa account **personale** di Francesco: più veloce, ma il venditore mostrato sarà la persona.
2. **Un Mac oppure una build in cloud.** Senza Mac: **Codemagic** — piano gratuito con 500 minuti/mese su Mac mini M2,
   poi 0,095 USD/min, build massima 120 minuti
   ([Codemagic pricing, riepilogo Toolradar](https://toolradar.com/tools/codemagic/pricing)). Una build Capacitor
   dura in genere 10–20 minuti: per il club il piano gratuito basta. Esempio di configurazione:
   `docs/app-store/codemagic.example.yaml`. Alternative: Ionic Appflow (a pagamento), un Mac in prestito.
3. **Account demo per la revisione** (§9): un utente di prova "Revisore Apple" creato dalla segreteria, senza dati di
   minori. Le credenziali si scrivono **solo** in App Store Connect, mai nel repository o in chat.
4. Approvazione finale alla pubblicazione.

## 3. Identità applicazione
- Nome: **S.C.D. ColicoDerviese** (max 30 caratteri: 21)
- Sottotitolo (max 30): **Calcio a Colico e Dervio** (24)
- Bundle ID: **it.colicoderviese.app** · SKU: `scd-colicoderviese-app`
- Versione: **1.0.0** (build 1)
- Categoria primaria: **Sport** (non "Kids": la categoria Bambini vieta link esterni e richiede parental gate, linee
  guida 1.3 e 5.1.4)
- Lingua principale: **Italiano**
- Prezzo: **Gratis**, nessun acquisto in-app
- Supporto: `https://appcolicoderviese.vercel.app/guida` · e-mail `sportclubcolico@gmail.com`
- Marketing: `https://appcolicoderviese.vercel.app`
- Privacy: `https://scd-superapp-staging.onrender.com/privacy`
- Copyright: `© 2026 Francesco Coppola — concessa in uso alla S.C.D. ColicoDerviese`

## 4. Testi della scheda
### Testo promozionale (max 170, modificabile senza nuova revisione)
Prossima gara, calendario e allenamenti di tutte le squadre, convocazioni sul telefono, Fantacalcio SCD e Top 11.
Gratis, senza pubblicità.

### Parole chiave (max 100 caratteri, separate da virgola: 95)
`calcio,Colico,Dervio,Lago di Como,squadra,convocazioni,calendario,partite,fantacalcio,giovanili`

### Descrizione
L'app ufficiale della S.C.D. ColicoDerviese, la società di calcio di Colico e Dervio sull'Alto Lago di Como.

Un solo posto per famiglie, atleti, staff e tifosi:
- prossima gara, calendario e allenamenti di tutte le squadre, dalla Prima Squadra ai Piccoli Amici;
- convocazioni con notifica sul telefono, per atleti e famiglie;
- la tua tessera del club nel Wallet, pronta all'ingresso;
- pagina di ogni squadra da seguire, con notizie e foto approvate;
- Fantacalcio SCD e Top 11 della settimana, gratuiti e senza premi in denaro;
- rassegna stampa "Dicono di noi";
- area famiglia, area atleta e area staff, abilitate dalla società sullo stesso account;
- sponsor e partner del territorio.

Tutela dei ragazzi prima di tutto: i minorenni compaiono solo con nome e iniziale, le foto vengono ripulite dai dati
di posizione, per l'attività di base non ci sono classifiche individuali, le aree riservate si aprono solo con
l'accesso abilitato dalla segreteria. Nessuna pubblicità, nessuna statistica di terze parti.

> La riga "tessera nel Wallet" va lasciata solo se la funzione è nella versione inviata.

## 5. Classificazione per età
Apple ha portato le fasce a **4+, 9+, 13+, 16+, 18+** con un questionario aggiornato (controlli in-app, capacità,
temi medici e violenti); le app che non lo compilano non possono essere aggiornate dal 31/01/2026
([9to5Mac, 24/07/2025](https://9to5mac.com/2025/07/24/apple-notifies-developers-of-new-app-store-age-rating-system/)).

Proposta: **9+**. Motivo: i contenuti sono adatti a tutti (nessuna violenza, volgarità, gioco d'azzardo, acquisti),
ma l'app ha **contenuti generati dagli utenti** (post e foto) moderati e link a testate giornalistiche esterne;
indicare 4+ con contenuti degli utenti espone a richieste di chiarimento in revisione. Alternativa 4+ se la
Direzione preferisce e se i post restano visibili solo dopo approvazione. Coerente con la scelta Play "dai 6 anni".
Nel questionario dichiarare: moderazione dei contenuti, segnalazione, blocco; nessuna chat privata tra sconosciuti.

## 6. Privacy Nutrition Label — bozza
Dati **collegati all'identità**, finalità **Funzionalità dell'app**, **nessun tracciamento**:
- Informazioni di contatto: nome, indirizzo e-mail, numero di telefono
- Contenuti dell'utente: foto, altri contenuti (post) — solo se pubblicati
- Identificativi: ID utente (account SCD PULSE)
- Altri dati: data di nascita (verifica età e tesseramento)

Non raccolti: posizione, dati di salute, finanziari, cronologia di navigazione, dati d'uso per pubblicità,
diagnostica di terze parti. Con le push native: valutare se dichiarare l'identificativo del dispositivo (token APNs
legato all'utente) — da verificare all'invio.

## 7. Requisiti di regolamento da chiudere prima dell'invio
1. **Cancellazione account nell'app — BLOCCANTE.** 5.1.1(v): se l'app permette di creare un account deve permetterne
   la cancellazione dall'app. Oggi non c'è (la privacy cita solo la richiesta via e-mail). Serve il pulsante
   nell'area personale (stesso lavoro richiesto da Google Play: pagina `/elimina-account`).
2. **Sign in with Apple (4.8)**: oggi l'accesso è **solo con link via e-mail** (Supabase OTP), nessun login
   Google/Facebook: 4.8 **non** si applica. Se in futuro si aggiunge "Accedi con Google", va aggiunto anche un
   servizio equivalente che limiti i dati a nome ed e-mail e permetta di nascondere l'e-mail (Sign in with Apple).
3. **Accesso del revisore — BLOCCANTE.** Il revisore Apple non può ricevere il link di accesso nella casella
   dell'account demo. Serve un accesso con **codice a 6 cifre** (Supabase invia anche il codice: basta un campo
   "Inserisci codice" in `/accedi`) oppure un account demo con accesso dedicato limitato. Da fare nel codice.
4. **Link universali**: perché il link di accesso nell'e-mail apra l'app (e non Safari) la web app deve pubblicare
   `/.well-known/apple-app-site-association` con `<TeamID>.it.colicoderviese.app`, come già fa per assetlinks.
   Proposta: variabile Render `SCD_APPLE_TEAM_ID`, route nel server accanto ad assetlinks.
5. **Minori (1.3 / 5.1.4)**: niente categoria Bambini, niente analytics o pubblicità di terze parti (già così);
   sotto i 14 anni accesso tramite account della famiglia.
6. **Testi d'uso dei permessi** (Info.plist) quando si aggiungono i plugin:
   - `NSCameraUsageDescription`: "Serve per fare la foto del tuo avatar e leggere il QR della tessera all'ingresso."
   - `NSPhotoLibraryUsageDescription`: "Serve per scegliere una foto per il tuo avatar o per un post."

## 8. Costruzione dell'app iOS
Prerequisiti: account Apple attivo, app creata in App Store Connect con bundle `it.colicoderviese.app`, chiave API
App Store Connect (per Codemagic) — **tutti i segreti vanno solo nei pannelli Apple/Codemagic**.

Le dipendenze Capacitor sono già nel progetto (`@capacitor/cli`, `core`, `ios`, `android` 8.5.2, versioni esatte;
build web verificata con `npm ci` + `npm run build`). Le cartelle native `ios/` e `android/` **non** sono nel
repository: si generano sulla macchina di build.

```bash
cd apps/superapp
npm ci --no-audit --no-fund
npm run cap:add:ios          # crea il guscio offline e la cartella ios/ (solo la prima volta)
npm run cap:sync             # copia guscio offline e configurazione nel progetto nativo
npm run cap:icons:ios        # icone iOS dall'icona 1024 ufficiale (@capacitor/assets 3.0.5)
npm run cap:open:ios         # solo su Mac: apre Xcode → Signing (Team) → Product → Archive → Distribute
```

Per far partire l'app da un altro indirizzo (es. il dominio del club in futuro):
`SCD_APP_ORIGIN=https://app.colicoderviese.it npm run cap:sync` — e nuova versione in revisione.

Dopo la prima generazione conviene salvare `ios/` nel repository in un PR dedicato (permessi, entitlement push,
Wallet): così le personalizzazioni native non si perdono a ogni build.

Senza Mac: `docs/app-store/codemagic.example.yaml` (copiare come `codemagic.yaml` nella radice del repository quando
l'account Apple è attivo; costruisce e manda su TestFlight).

## 9. Note per il revisore (App Review Information)
```
S.C.D. ColicoDerviese is the official app of an amateur football club in Colico and Dervio (Lake Como, Italy).
Public content (fixtures, teams, fantasy game, press review) needs no account.
Native features: push notifications for call-ups, club membership cards in Apple Wallet, camera for profile avatar
and QR at the stadium entrance, offline screen when the network is unavailable.
Sign-in: e-mail one-time code (no passwords, no third-party login).
Demo account: <REVIEW_EMAIL — to be entered only in App Store Connect>
Code: <REVIEW_CODE_OR_INSTRUCTIONS — to be entered only in App Store Connect>
The demo account contains no data of minors. Account deletion: Profile → Elimina account.
Contact: sportclubcolico@gmail.com
```

## 10. Materiale grafico
- Icona App Store 1024×1024 **senza trasparenza**: `docs/app-store/app-icon-1024.png` — stemma ufficiale
  (`assets/logo-scd.png`, KEEP_LOCKED, non ridisegnato) centrato su blu `#062a52`. Nota: la fonte ufficiale più
  grande disponibile è 480×628, quindi lo stemma è ingrandito ~1,3×; se la società ha il file vettoriale originale,
  rigenerare l'icona da quello prima dell'invio.
- Screenshot iPhone 6,9" 1320×2868: `docs/app-store/screenshots/iphone-6.9/` (6 schermate)
- Screenshot iPhone 6,5" 1242×2688: `docs/app-store/screenshots/iphone-6.5/` (6 schermate)
- iPad: **non supportato** nella prima versione (solo iPhone) → schermate 13" non richieste. Se si attiva iPad
  servono schermate 2064×2752 o 2048×2732.
- Dimensioni accettate ([App Store Connect — Screenshot specifications, riepilogo aso.dev](https://aso.dev/app-store-connect/screenshots/)):
  6,9" 1320×2868 / 1290×2796 / 1260×2736; 6,5" 1284×2778 / 1242×2688; 1–10 schermate per dimensione, PNG o JPEG.
- Rigenerazione: `docs/app-store/README.md`.

## 11. Checklist App Store Connect
- [x] Strategia definita (Capacitor + funzioni native, stessa web app e stesso account)
- [x] `capacitor.config.ts` e dipendenze Capacitor (build web verificata)
- [x] Icona 1024 senza alpha, screenshot 6,9" e 6,5"
- [x] Testi scheda, parole chiave, bozza privacy label, note revisore (segnaposto)
- [ ] Iscrizione Apple Developer Program (organizzazione con D-U-N-S, o richiesta esenzione quota)
- [ ] App creata in App Store Connect con bundle `it.colicoderviese.app`
- [ ] Mac o Codemagic configurato (chiave API App Store Connect solo nel pannello Codemagic)
- [ ] Cancellazione account nell'app (BLOCCANTE)
- [ ] Accesso con codice per il revisore + account demo senza minori (BLOCCANTE)
- [ ] Push native APNs, pass Wallet, fotocamera nella versione inviata (4.2)
- [ ] `apple-app-site-association` servito dalla web app (`SCD_APPLE_TEAM_ID`)
- [ ] Questionario età (proposta 9+)
- [ ] Privacy Nutrition Label
- [ ] Build su TestFlight provata da staff e famiglie
- [ ] Invio in revisione con approvazione della Direzione
