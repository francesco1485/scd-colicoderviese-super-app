# Indirizzo fisso e app negli store (UD-071)

Decisione del 12/10/2026: l'app vive all'indirizzo **app.colicoderviese.it**. Lo stesso indirizzo diventa poi
l'app di Play Store e App Store: nessun secondo sistema, ogni aggiornamento arriva a tutti.

## 1. Indirizzo app.colicoderviese.it (gratis)
Passi della Direzione, dopo l'ok al servizio di produzione (vedi `PRODUCTION_LAUNCH.md`):
1. **Render** → servizio di produzione → *Settings → Custom Domains* → aggiungi `app.colicoderviese.it`.
   Render mostra il valore da mettere nel DNS (di solito `<nome-servizio>.onrender.com`).
2. **DNS del dominio colicoderviese.it**: il sito risponde da un hosting SiteGround (INFERRED dall'indirizzo IP,
   da confermare con chi gestisce il sito). Nel pannello DNS aggiungi un record:
   `CNAME` · nome `app` · valore = quello indicato da Render · TTL predefinito. Non toccare gli altri record
   (il sito www e la posta restano come sono).
3. Attendi la verifica su Render (da pochi minuti a qualche ora): il certificato HTTPS si attiva da solo.
4. **Render** → variabile `SCD_SITE_URL=https://app.colicoderviese.it` → nuovo deploy.
5. **Supabase** (SCD PULSE) → *Authentication → URL Configuration*: Site URL `https://app.colicoderviese.it`,
   Redirect URL `https://app.colicoderviese.it/accedi/conferma` (lasciare anche quello di staging).

Fino a quel giorno il link da condividere è la pagina `/installa` (istruzioni iPhone/Android e codice QR che
punta a sé stessa).

## 2. Play Store (dopo il lavoro operativo interno)
- Account sviluppatore Google Play **come organizzazione** (richiede il numero D-U-N-S della società; costo una
  tantum, da verificare al momento dell'iscrizione — serve l'approvazione della Direzione).
- App Android = Trusted Web Activity che apre app.colicoderviese.it (generata con Bubblewrap), pacchetto
  proposto `it.colicoderviese.app`.
- Verifica dominio: l'app risponde già a `/.well-known/assetlinks.json` quando su Render sono impostate
  `SCD_ANDROID_PACKAGE` e `SCD_ANDROID_SHA256` (impronta del certificato di firma fornita da Play Console).
- Scheda store: icone ufficiali (già pronte: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`),
  schermate, informativa privacy pubblica (`/privacy`, da approvare), modulo "Sicurezza dei dati".
- Pubblico di destinazione: adulti (genitori, staff, tifosi). I dati dei ragazzi li gestiscono i genitori.

## 3. App Store (dopo Play Store)
- Apple Developer Program **come organizzazione** (D-U-N-S; abbonamento annuale, da verificare — approvazione
  della Direzione).
- Apple non accetta un semplice sito incapsulato: l'involucro (Capacitor) aggiunge notifiche native APNs,
  condivisione e collegamenti universali, e apre lo stesso indirizzo.
- Servirà anche `/.well-known/apple-app-site-association` con il Team ID Apple (da aggiungere allora).

## Cosa è già pronto nel codice
- Icone dallo stemma ufficiale (le precedenti riportavano uno stemma non ufficiale "SDC" e sono state rimosse).
- Manifest dell'app con colori ufficiali, scorciatoie Calendario / Famiglia / Come funziona.
- Pagina pubblica `/installa` con indirizzo, condivisione, codice QR e istruzioni.
- Route `/.well-known/assetlinks.json` (spenta finché non ci sono pacchetto e impronta).
