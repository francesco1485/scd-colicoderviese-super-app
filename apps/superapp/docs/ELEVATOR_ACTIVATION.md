# Ascensore: attivazione dell'accesso (UD-054)

Codice pronto su staging (commit `3e728c4`): `/accedi` (magic link via e-mail), `/accedi/conferma`,
ruoli letti dal database (`scd_my_context`), gate delle aree, `/segreteria/persone`.
Finché il server non ha le chiavi del progetto Supabase SCD, `/accedi` mostra "Accesso in attivazione".

Tutti i passi sotto sono manuali e spettano alla Direzione: nessun segreto va incollato in chat.

## 1. Database (Supabase, progetto `ndevtxxijbcnskgysdit`)
1. SQL editor → eseguire in ordine le migrazioni mancanti di `supabase/migrations/` (r33 … r59, con `r51` prima di `r51_1`).
   La query 1 di `supabase/setup/elevator_activation.sql` dice se r59 è presente.
2. Authentication → Users → **Add user** con l'e-mail del Direttore (senza password: entrerà con il link).
3. SQL editor → `supabase/setup/elevator_activation.sql` sostituendo `:director_email` (passi 0, 2, 3).

## 2. Autenticazione (Supabase → Authentication)
- Providers → **Email**: abilitato; "Confirm email" può restare attivo; "Allow new users to sign up" **disattivato**
  (l'app chiama `signInWithOtp` con `shouldCreateUser: false`: entra solo chi la società ha creato).
- URL Configuration → Site URL `https://scd-superapp-staging.onrender.com`;
  Redirect URLs: `https://scd-superapp-staging.onrender.com/accedi/conferma`.
- Email Templates → Magic Link: il link deve contenere `{{ .ConfirmationURL }}` (default).

## 3. Server (Render, servizio `scd-superapp-staging`)
Environment → aggiungere:
- `SCD_SUPABASE_URL` = `https://ndevtxxijbcnskgysdit.supabase.co`
- `VITE_SCD_SUPABASE_PUBLISHABLE_KEY` = chiave *publishable / anon* del progetto (Project Settings → API Keys).
Il salvataggio ridistribuisce il servizio. La chiave *service role* NON serve all'ascensore: non impostarla.

## 4. Prova
1. Aprire `https://scd-superapp-staging.onrender.com/accedi` (password dello staging come sempre).
2. Inserire l'e-mail del Direttore → "Mandami il link" → aprire il link dalla stessa casella sul telefono o computer.
3. Atterraggio automatico su `/direzione`; menu "Accesso aree" mostra e-mail e badge **Direzione**.
4. `/segreteria/persone`: elenco (vuoto finché non si importa), **Inserisci**, scheda, **Segna uscito/a**.

## Stato al 11/10/2026 ore 16:10
- `VERIFIED`: connettore Supabase autorizzato sull'organizzazione della società (accesso del Direttore come membro del team).
- `VERIFIED`: progetto SCD PULSE (`ndevtxxijbcnskgysdit`) con r33, r34, r35, r51, r51_1, r53 + **r59** e **r59_1** applicate; 0 persone, 0 utenti.
- `VERIFIED`: anon senza accesso alle tabelle persone e alla funzione "segna uscito"; RLS attiva con 5 regole.
- `VERIFIED`: `SCD_SUPABASE_URL` e `VITE_SCD_SUPABASE_PUBLISHABLE_KEY` impostate su Render (chiave publishable, pubblica per natura).
- `PENDING`: r56 (inviti, consensi d'uso, fonti calendario, gamification) e r57_1 (indici) non applicate: non servono all'ascensore.
- `TODO (Direzione)`: impostazioni Auth (punto 2) e creazione utente Direttore (punto 1.2); poi ruolo DIRECTION assegnato via SQL.

## Stato precedente
- `VERIFIED`: codice, test (399), build, smoke locale, deploy staging.
- `UNVERIFIED`: migrazioni r33–r57 applicate sul progetto reale; r59 non ancora applicata.
- `BLOCKER`: il connettore Supabase di questa chat è collegato a un account senza progetti → i passi 1–3 restano manuali
  (oppure collegare il connettore con l'account che possiede il progetto).
