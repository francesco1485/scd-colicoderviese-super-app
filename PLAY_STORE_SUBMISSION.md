# GOOGLE PLAY — SCD COLICODERVIESE

Aggiornato: 13/10/2026. Decisione della Direzione (13/10): *"Rendila in rete con link Render gratis … per il momento
funziona e prepara tutto anche per Play Store e Apple Store."*

L'app Play Store è la stessa web app aperta in una **Trusted Web Activity (TWA)**: stesse pagine, stesso account
(SCD PULSE), stessi aggiornamenti. Nessun secondo sistema da mantenere. È il **primo percorso da eseguire**, già oggi,
sull'indirizzo Render.

| Voce | Valore |
|---|---|
| Origine dell'app (TWA) | `https://scd-superapp-staging.onrender.com` |
| Indirizzo breve (solo testi scheda e marketing) | `https://appcolicoderviese.vercel.app` (inoltra a Render) |
| Package ID | `it.colicoderviese.app` |
| Account sviluppatore | **già esistente, personale** (intestato a Francesco Coppola) |
| Strumento di pacchetto | Bubblewrap CLI (Google Chrome Labs) |
| File pronto | `docs/play-store/twa-manifest.json` (validato con `@bubblewrap/core` 1.25.0) |

Perché l'origine è Render e non l'indirizzo breve: la TWA verifica il dominio leggendo
`/.well-known/assetlinks.json` **sull'origine che apre**. Quel file lo pubblica la web app su Render (vedi
`apps/superapp/src/lib/http-policy.ts`, funzione `assetLinksJson`). L'indirizzo Vercel è un inoltro: va bene come
"sito web" nella scheda, non come origine dell'app.

**Cambio di dominio in futuro** (es. `app.colicoderviese.it`, UD-071): serve una nuova versione dell'app con il nuovo
`host`, assetlinks pubblicato anche sul nuovo dominio e una nuova revisione. Durante il passaggio lasciare attivo
assetlinks anche su Render, così chi ha la versione vecchia continua ad aprire l'app senza barra del browser.

---

## 1. Account personale: il test chiuso è obbligatorio
Per gli account sviluppatore **personali creati dopo il 13 novembre 2023** Google chiede, prima di poter chiedere
l'accesso alla Produzione, un **test chiuso con almeno 12 tester che restino iscritti per 14 giorni consecutivi**.
Chi esce prima dei 14 giorni non conta; le pagine Produzione e Pre-registrazione restano bloccate finché il requisito
non è soddisfatto, e Google può chiedere di continuare se i tester sono pochi o poco attivi
([Google Play Console Help — App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)).

Da controllare subito in Play Console → *Impostazioni → Dettagli account*: data di creazione e tipo (personale).
Se l'account è stato creato **prima** del 13/11/2023 il vincolo non si applica.

### Come trovare i 12 tester tra le famiglie del club
1. Creare un **Gruppo Google** dedicato (es. `scd-tester-app@googlegroups.com`), accesso "chiunque può chiedere di
   entrare", approvazione manuale. Gestore: segreteria (`sportclubcolico@gmail.com`).
2. Invitare **solo adulti** (genitori, mister, dirigenti, volontari) con un account Google: 20 persone, per avere
   margine sopra i 12. I ragazzi non entrano nel test.
3. Messaggio da mandare nei gruppi WhatsApp di squadra (copiabile):
   > Ciao! La ColicoDerviese sta per uscire su Play Store. Ci servono genitori e staff con telefono Android che
   > provino l'app per 2 settimane. 1) Entra nel gruppo: <link del Gruppo Google> 2) Apri il link di test:
   > <link di adesione da Play Console> e installa l'app 3) Non disinstallarla per 14 giorni e usala ogni tanto
   > (calendario, squadre, Fantacalcio). Grazie!
4. In Play Console → *Test → Test chiuso → Tester*: aggiungere il Gruppo Google come elenco tester; copiare il link
   di adesione e incollarlo nel messaggio.
5. Annotare in segreteria la data in cui il 12° tester risulta iscritto: da lì contare 14 giorni pieni.
6. Raccogliere 3–4 commenti dei tester (servono nel modulo di richiesta Produzione, dove Google chiede com'è andato il
   test e cosa è stato corretto).

### Trasferimento futuro all'account della società
Quando la società aprirà un proprio account sviluppatore *organizzazione* (serve il numero D-U-N-S), l'app si può
trasferire con la procedura di Play Console "trasferimento app a un altro account sviluppatore": l'app passa con le
sue statistiche; la richiesta si fa tramite il supporto Play Console
([Google Play Console Help — transfer apps](https://support.google.com/googleplay/android-developer/answer/9023898?hl=en)).
Il package `it.colicoderviese.app` e la chiave di firma gestita da Google restano gli stessi.

---

## 2. Passi in Play Console (account già esistente)
1. **Crea app** → nome *S.C.D. ColicoDerviese*, lingua *Italiano (Italia)*, tipo *App*, *Gratuita*; accettare le
   dichiarazioni. Il package si fissa al primo caricamento dell'AAB (`it.colicoderviese.app`).
2. **Play App Signing** (*Test e rilascio → Configurazione → Integrità app → Firma dell'app*): lasciare che Google
   generi e custodisca la **chiave di firma dell'app**. La Direzione tiene solo la **chiave di caricamento**
   (upload key), creata sul proprio computer (vedi §3).
3. Nella stessa pagina copiare l'**impronta SHA-256 del certificato della chiave di firma dell'app** (formato
   `AA:BB:…`, 32 coppie). Facoltativo: copiare anche quella della chiave di caricamento, utile per provare l'APK
   installato a mano.
4. **Render** → servizio `scd-superapp-staging` → *Environment*:
   - `SCD_ANDROID_PACKAGE=it.colicoderviese.app`
   - `SCD_ANDROID_SHA256=<impronta chiave di firma app>` oppure
     `SCD_ANDROID_SHA256=<impronta chiave firma app>,<impronta chiave caricamento>` (separate da virgola)
   - *Save, rebuild and deploy*.
5. Controllo: `https://scd-superapp-staging.onrender.com/.well-known/assetlinks.json` deve rispondere 200 con il
   package e l'impronta. Oggi risponde **404** (corretto: variabili non ancora impostate — VERIFIED 13/10/2026).
   Verifica ufficiale Google:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://scd-superapp-staging.onrender.com&relation=delegate_permission/common.handle_all_urls`
6. **Test interno** (fino a 100 persone, nessuna revisione lunga): caricare l'AAB, installarlo da Play e controllare
   che l'app si apra **senza barra dell'indirizzo** (segno che assetlinks è giusto).
7. **Test chiuso** con il Gruppo Google (§1) per 14 giorni.
8. Scheda Store, Classificazione, Pubblico, Data Safety, Annunci (§4–§7) → **Richiedi accesso alla Produzione**.

Requisito tecnico: dal 31/08/2026 app nuove e aggiornamenti devono avere **target API 36 (Android 16)**
([Android Developers — Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)).
Bubblewrap **1.25.0 o successivo** genera il progetto con `targetSdkVersion 36` (verificato nel template di
`@bubblewrap/core` 1.25.0); la 1.24.x si fermava a 35 e verrebbe rifiutata.

---

## 3. Costruire l'AAB firmato con Bubblewrap
La chiave **non** va mai generata da un agente, salvata nel repository, in Drive condiviso o incollata in chat. La
genera la Direzione sul proprio computer (o su una macchina cloud personale) e la conserva con le password in un
gestore password; serve una copia di sicurezza offline.

Requisiti: Node 18+ (consigliato 22), circa 2 GB liberi. Al primo avvio Bubblewrap propone di scaricare da solo
**JDK 17** e **Android SDK**: rispondere sì. Funziona anche in un ambiente cloud (es. GitHub Codespaces); in questo
spazio di lavoro dell'agente c'è JDK 21 e Bubblewrap scaricherebbe il suo JDK 17, ma la firma va fatta dalla
Direzione, quindi qui il pacchetto **non** viene costruito.

```bash
# 1. cartella di lavoro FUORI dal repository
mkdir -p ~/scd-twa && cd ~/scd-twa
cp <repo>/docs/play-store/twa-manifest.json ./twa-manifest.json

# 2. chiave di caricamento (una sola volta; keytool è incluso nel JDK scaricato da Bubblewrap)
keytool -genkeypair -v -keystore upload-key.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=S.C.D. ColicoDerviese, O=S.C.D. ColicoDerviese, L=Colico, C=IT"

# 3. genera il progetto Android dal twa-manifest.json già compilato e costruisci l'AAB firmato
npx --yes @bubblewrap/cli@1.25.0 update --skipVersionUpgrade
npx --yes @bubblewrap/cli@1.25.0 build
#    → app-release-bundle.aab  (da caricare in Play Console)
#    → app-release-signed.apk  (prova su un telefono: adb install app-release-signed.apk)

# 4. impronta della chiave di caricamento (facoltativa in SCD_ANDROID_SHA256)
keytool -list -v -keystore upload-key.keystore -alias upload | grep SHA256
```

In alternativa al passo 3: `npx --yes @bubblewrap/cli@1.25.0 init --manifest=https://scd-superapp-staging.onrender.com/manifest.webmanifest`
e rispondere alle domande con i valori del `twa-manifest.json` (package `it.colicoderviese.app`, chiave
`./upload-key.keystore`, alias `upload`).

Aggiornamenti successivi: aumentare `appVersionCode` (2, 3, …) e `appVersion` (1.0.1, …) nel `twa-manifest.json`,
poi `update` + `build`. Le pagine dell'app si aggiornano da sole con ogni deploy su Render: serve una nuova versione
Play solo per cambiare dominio, icona, nome o impostazioni Android.

---

## 4. Identità applicazione
- Nome: **S.C.D. ColicoDerviese**
- Package ID: **it.colicoderviese.app**
- Versione iniziale: **1.0.0** · version code **1**
- Categoria: **Sport**
- Lingua predefinita: **Italiano (Italia)**
- E-mail di contatto: **sportclubcolico@gmail.com**
- Sito web (scheda): **https://appcolicoderviese.vercel.app**
- Privacy: **https://scd-superapp-staging.onrender.com/privacy**

## 5. Testi della scheda
### Descrizione breve (max 80 caratteri)
L'app della ColicoDerviese: partite, allenamenti, convocazioni e vita del club.

### Descrizione completa
L'app ufficiale della S.C.D. ColicoDerviese, la società di calcio di Colico e Dervio sull'Alto Lago di Como.

Nata per organizzare il club e unire famiglie, atleti e tifosi in un solo posto:
- prossima gara, calendario e allenamenti di tutte le squadre, dalla Prima Squadra ai Piccoli Amici;
- convocazioni per atleti e famiglie, con avviso sul telefono;
- pagina di ogni squadra da seguire, con notizie e foto approvate;
- Fantacalcio SCD e Top 11 della settimana, gratuiti e senza premi in denaro;
- rassegna stampa "Dicono di noi";
- area famiglia, area atleta e area staff, abilitate dalla società sullo stesso account;
- sponsor e partner del territorio.

Tutela dei ragazzi prima di tutto: i minorenni compaiono solo con nome e iniziale, le foto vengono ripulite dai dati
di posizione, per l'attività di base non ci sono classifiche individuali, le aree riservate si aprono solo con
l'accesso abilitato dalla segreteria.

Sito: https://appcolicoderviese.vercel.app

## 6. Classificazione contenuti e pubblico
- Contenuti adatti a tutti, **dai 6 anni** (decisione della Direzione, 12/10/2026). Nel questionario IARC: nessuna
  violenza, nessun linguaggio volgare, nessun gioco d'azzardo (il Fantacalcio non ha soldi né premi in denaro),
  nessun acquisto; interazione tra utenti con moderazione (post e foto).
- **Pubblico di destinazione consigliato: 18+ e 13–17** (genitori, staff, tifosi, atleti adolescenti). Se si
  includono fasce sotto i 13 anni si applicano le regole Famiglie: SDK solo approvati per i bambini, niente
  identificatori persistenti, funzioni social con promemoria di sicurezza e controlli per adulti
  ([Google Play Console Help — Families policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)).
  La web app oggi non ha pubblicità né statistiche di terze parti; va comunque confermato in Play Console all'invio.
- Sotto i 14 anni l'accesso passa dall'account della famiglia (età del consenso digitale in Italia: 14 anni).

## 7. Sicurezza dei dati (Data Safety) — bozza da ricontrollare in Play Console
- **Raccolti:** nome, cognome, data di nascita, e-mail, telefono (registrazione, verificata dalla segreteria);
  foto e testi solo se l'utente pubblica un post; token per le notifiche se l'utente le attiva.
- **Uso:** funzionamento dell'account e dei servizi del club. Nessuna pubblicità, nessuna vendita di dati.
- **Condivisione:** nessuna con terze parti a fini commerciali.
- **Sicurezza:** connessioni HTTPS; foto ripulite dai metadati EXIF; accesso con link via e-mail, niente password.
- **Cancellazione account — BLOCCANTE prima dell'invio.** Google chiede (a) un percorso **nell'app** per avviare la
  cancellazione dell'account e dei dati e (b) una **pagina web** raggiungibile senza reinstallare l'app, con il nome
  dell'app come in scheda, da indicare nel modulo Data Safety
  ([Google Play Console Help — account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-GB)).
  Oggi la pagina `/privacy` cita solo il diritto di cancellazione via e-mail: manca il pulsante nell'area personale e
  la pagina dedicata (proposta: `/elimina-account`). È un lavoro di codice separato (vedi "Prossimi passi").

## 8. Materiale grafico
- Icona 512×512: `apps/superapp/public/icon-512.png` (stemma ufficiale, KEEP_LOCKED)
- Icona adattiva: `apps/superapp/public/icon-maskable-512.png`
- Feature graphic 1024×500: `docs/play-store/feature-graphic-1024x500.png`
- Screenshot telefono 1080×1920 (dal sito pubblicato, 13/10/2026): `docs/play-store/screenshots/phone-1080x1920/`
  `1-home`, `2-calendario`, `3-fantacalcio`, `4-top11`, `5-rassegna`, `6-guida`. Mostrano solo dati pubblici reali
  (nessun dato di minori oltre ai nomi delle squadre). Le schermate precedenti in `docs/play-store/*.png` restano come
  archivio.
- Rigenerazione: script Playwright descritto in `docs/app-store/README.md`.

## 9. Checklist Play Console
- [x] Web app online sull'origine Render (`/healthz` 200, `manifest.webmanifest` 200, `/privacy` 200 — 13/10/2026)
- [x] `twa-manifest.json` pronto e validato (`docs/play-store/twa-manifest.json`)
- [x] Route `/.well-known/assetlinks.json` pronta (si accende con le variabili Render)
- [x] Screenshot telefono e feature graphic
- [ ] Verificare tipo e data dell'account (personale → test chiuso 12 tester / 14 giorni)
- [ ] App creata con package `it.colicoderviese.app`
- [ ] Chiave di caricamento creata dalla Direzione (fuori dal repository) e messa al sicuro
- [ ] Play App Signing attivo; `SCD_ANDROID_PACKAGE` e `SCD_ANDROID_SHA256` impostate su Render; assetlinks 200
- [ ] AAB caricato in test interno; app aperta senza barra del browser
- [ ] Gruppo Google tester creato; 12+ tester iscritti da 14 giorni consecutivi
- [ ] Percorso di cancellazione account nell'app + pagina web dedicata (BLOCCANTE)
- [ ] Scheda Store completata (testi sopra)
- [ ] Data Safety
- [ ] Classificazione contenuti (IARC)
- [ ] Pubblico di destinazione e, se sotto i 13, regole Famiglie
- [ ] Dichiarazione pubblicità: nessuna
- [ ] Richiesta accesso Produzione (con commenti dei tester)
- [ ] Approvazione della Direzione alla pubblicazione

## Prossimi passi di codice (fuori da questo blocco)
1. Pulsante "Elimina account" nell'area personale + pagina pubblica `/elimina-account` (richiesta con e-mail
   verificata, gestita dalla segreteria; dati da conservare per obblighi FIGC/fiscali dichiarati nella privacy).
2. Aggiornare in `SCD_SYSTEM_MANIFEST.json` la voce `distribution` (oggi cita `app.colicoderviese.it`) con la
   decisione del 13/10: origine provvisoria Render, indirizzo breve Vercel, TWA primo percorso.
