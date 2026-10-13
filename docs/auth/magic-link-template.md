# Template e-mail "Magic Link" — S.C.D. ColicoDerviese

Progetto Supabase: `ndevtxxijbcnskgysdit` (SCD).
Motivo (auth logs 13/10/2026): link riaperti o pre-aperti dagli antivirus della posta (403 "Email link is invalid or has expired") e troppe richieste ripetute (429). Il messaggio contiene ora **sia il link sia un codice di 6 cifre**: chi ha il link "bruciato" scrive il codice nella pagina `/accedi` (step "Hai ricevuto un codice di 6 cifre? Scrivilo qui"), anche da un altro dispositivo.

## Dove incollarlo

1. Supabase Dashboard → progetto SCD → **Authentication → Emails → Templates → Magic Link**.
2. Incollare **Subject** e **Message body (HTML)** qui sotto, poi **Save changes**.
3. Controllare in **Authentication → Sign In / Providers → Email** che **Email OTP Length** sia `6` (la pagina `/accedi` accetta esattamente 6 cifre) e che **Email OTP Expiration** sia ragionevole (es. 3600 s).
4. Controllare in **Authentication → URL Configuration** che **Site URL** sia l'indirizzo pubblico della Super App e che `…/accedi/conferma` sia tra i **Redirect URLs**.

Nessuna modifica al codice è necessaria per attivare il template: la pagina `/accedi` gestisce già il codice.

## Subject

```
Il tuo accesso alla Super App SCD: codice {{ .Token }}
```

## Message body (HTML)

```html
<!doctype html>
<html lang="it">
  <body style="margin:0;padding:0;background:#f2f6fb;font-family:Arial,Helvetica,sans-serif;color:#0b1f3a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0a2a5c;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px;">
                S.C.D. ColicoDerviese
                <div style="height:4px;width:56px;background:#f5c400;margin-top:8px;border-radius:2px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 8px;font-size:22px;color:#0b1f3a;">Entra nella Super App del club</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4f66;">
                  Hai chiesto di accedere. Puoi usare <b>il pulsante</b> oppure <b>il codice</b>: basta uno dei due.
                </p>

                <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#3d4f66;">1. Tocca il pulsante (da questo dispositivo)</p>
                <p style="margin:0 0 22px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1565c0;color:#ffffff;text-decoration:none;font-size:17px;font-weight:bold;padding:14px 28px;border-radius:12px;">Entra</a>
                </p>

                <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#3d4f66;">2. Oppure scrivi questo codice nella pagina Accedi</p>
                <p style="margin:0 0 8px;font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',Courier,monospace;color:#0a2a5c;background:#eaf2fc;border-radius:12px;padding:12px 16px;text-align:center;">{{ .Token }}</p>
                <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#3d4f66;">
                  Il codice funziona anche se il pulsante dice "link scaduto" (succede quando il programma di posta lo apre da solo per controllarlo) o se vuoi entrare da un altro telefono o computer.
                </p>

                <p style="margin:0;font-size:13px;line-height:1.5;color:#3d4f66;">
                  Link e codice valgono una sola volta e scadono dopo poco tempo. Se non hai chiesto tu l'accesso, ignora questo messaggio: nessuno può entrare senza il codice.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e3eaf3;font-size:13px;color:#3d4f66;">
                S.C.D. ColicoDerviese<br />
                Colico e Dervio — Segreteria
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Variante consigliata a prova di antivirus (opzionale)

`{{ .ConfirmationURL }}` punta all'endpoint `/verify` di Supabase: se un antivirus della posta apre il link prima della persona, il token viene consumato lì (la pagina `/accedi/conferma` non può impedirlo). Il codice di 6 cifre resta comunque valido come riserva.

Per eliminare del tutto il problema, nel pulsante si può sostituire `{{ .ConfirmationURL }}` con:

```
{{ .SiteURL }}/accedi/conferma?token_hash={{ .TokenHash }}&type=email
```

In questo caso il link apre la pagina `/accedi/conferma`, che **non verifica nulla al caricamento**: il token viene usato solo quando la persona tocca **Entra** (server function `confirmTokenHash`, `verifyOtp({ token_hash, type: "email" })`). Dopo l'accesso la persona viene portata all'area del proprio ruolo.

## Verifica dopo il salvataggio

- Chiedere un accesso da `/accedi` con un indirizzo di prova abilitato **una sola volta** (il pulsante resta bloccato 60 secondi).
- Nel messaggio devono comparire pulsante **Entra** e codice di 6 cifre.
- Scrivere il codice nello step 2 di `/accedi`: si entra senza aprire il link.
- Se l'invio fallisce con "Il servizio di invio mail non risponde", il problema è l'SMTP personalizzato (Authentication → Emails → SMTP Settings), non il template.
