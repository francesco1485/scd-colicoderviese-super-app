# E-mail di accesso dalla casella della società (Gmail)

Decisione della Direzione (12/10/2026): le e-mail dell'accesso (scegli la password, conferma iscrizione) partono da **sportclubcolico@gmail.com**
invece che dal servizio gratuito di Supabase, che ne manda solo poche all'ora.

Nessuna password va incollata in chat: tutti i passi li fa la Direzione nei pannelli di Google e Supabase.

## 1. Google (circa 5 minuti)
1. Entra in https://myaccount.google.com con sportclubcolico@gmail.com.
2. **Sicurezza → Verifica in due passaggi**: deve essere attiva (serve per il passo 3).
3. Apri https://myaccount.google.com/apppasswords → nome "SCD Super App" → **Crea**.
4. Google mostra una password di 16 lettere: copiala per il passo 2.5. Non va scritta altrove.

## 2. Supabase (progetto SCD PULSE)
1. https://supabase.com/dashboard → progetto **SCD PULSE** → **Authentication → Emails → SMTP Settings**.
2. Attiva **Enable custom SMTP**.
3. Sender email: `sportclubcolico@gmail.com` · Sender name: `S.C.D. ColicoDerviese`.
4. Host: `smtp.gmail.com` · Port: `465` · Username: `sportclubcolico@gmail.com`.
5. Password: la password di 16 lettere del passo 1.4 → **Save**.
6. **Authentication → Rate Limits**: invio e-mail a **60 all'ora**. Gmail ne accetta circa 500 al giorno:
   gli inviti a tutte le famiglie si mandano in più giorni, a gruppi.

## 3. Indirizzo dell'app e testi in italiano
1. **Authentication → URL Configuration**: *Site URL* = **`https://app.colicoderviese.it`** (indirizzo pubblico dell'app, attivo).
   In *Redirect URLs* aggiungi `https://app.colicoderviese.it/accedi/conferma` e, solo per le prove, `https://scd-superapp-staging.onrender.com/accedi/conferma`.
   Tutti i pulsanti delle e-mail usano il Site URL: se resta l'indirizzo di prova, le famiglie finiscono lì.
   Nella stessa sezione Authentication → Emails, la **scadenza del codice e-mail (Email OTP Expiration)** deve restare **3600 secondi**: il testo dell'e-mail promette "scade dopo un'ora".
2. **Authentication → Emails → Templates** (oggetto + corpo = contenuto del file, da `<!doctype html>` in giù):

| Modello Supabase | Quando parte | Oggetto | File |
|---|---|---|---|
| **Reset Password** | "Password dimenticata" e **prima entrata** di chi ha già un accesso pronto | `Scegli la tua password per la app S.C.D. ColicoDerviese` | `supabase/setup/email-templates/reset-password.html` |
| **Confirm signup** | chi si registra da solo con e-mail e password | `Conferma la tua e-mail per la app S.C.D. ColicoDerviese` | `supabase/setup/email-templates/confirm-signup.html` |
| **Invite user** | solo se la Direzione invita dal pannello Supabase | `Sei invitato nella app S.C.D. ColicoDerviese` | `supabase/setup/email-templates/invite.html` |
| Magic link | riserva: dal 14/10 (UD-120) l'app non entra più con il link | `Il tuo accesso alla app S.C.D. ColicoDerviese` | `supabase/setup/email-templates/magic-link.html` |

I pulsanti di "Reset Password" e "Confirm signup" portano a `/accedi/conferma` con `token_hash` (link "a prova di antivirus": i
programmi che aprono i link per controllarli non lo consumano, perché serve toccare il pulsante nella pagina).

## 4. Prova (5 minuti, con un indirizzo della Direzione)
1. Da `/accedi` → **Password dimenticata** → scrivi l'e-mail → **Mandami la e-mail**.
2. Deve arrivare entro 2 minuti **da sportclubcolico@gmail.com**, in italiano, con il pulsante **"Scegli la password"**
   (se non arriva: spam, poi cartella "Inviata" di Gmail; se la pagina dice "servizio di invio non risponde" è l'SMTP del passo 2).
3. Tocca il pulsante → pagina "Conferma" → **scegli la password** → entri nella tua area.
4. Esci e rientra con e-mail e password: funziona.

## 5. Prima entrata di staff e famiglie (a gruppi)
Chi ha già un accesso pronto entra la prima volta con **"Password dimenticata"** (riceve "Scegli la password"). L'annuncio dice:
*apri l'app → Entra → Password dimenticata → scrivi la tua e-mail → tocca "Scegli la password" nella e-mail.*
Ordine: Direzione e Segreteria → mister e dirigenti → famiglie, a gruppi di massimo 50 all'ora e 400 al giorno (limite di Gmail ~500).

## Note
- Le risposte delle famiglie alle e-mail di accesso arrivano nella casella della società.
- Se un giorno si passa a un dominio proprio (es. `@colicoderviese.it`) basta cambiare host, utente e password qui.
