# E-mail di accesso dalla casella della società (Gmail)

Decisione della Direzione (12/10/2026): le e-mail con il link di accesso partono da **sportclubcolico@gmail.com**
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

## 3. Testi in italiano
In **Authentication → Emails → Templates**:
- **Magic link**: oggetto `Il tuo accesso alla app S.C.D. ColicoDerviese`, corpo = file
  `supabase/setup/email-templates/magic-link.html`.
- **Invite user**: oggetto `Sei invitato nella app S.C.D. ColicoDerviese`, corpo = file
  `supabase/setup/email-templates/invite.html`.

## 4. Prova
Da `/accedi` chiedi il link con l'e-mail della Direzione: deve arrivare da sportclubcolico@gmail.com, in italiano,
con il pulsante "Entra nell'app". Se non arriva entro 2 minuti controlla lo spam e la cartella "Inviata" di Gmail.

## Note
- Le risposte delle famiglie alle e-mail di accesso arrivano nella casella della società.
- Se un giorno si passa a un dominio proprio (es. `@colicoderviese.it`) basta cambiare host, utente e password qui.
