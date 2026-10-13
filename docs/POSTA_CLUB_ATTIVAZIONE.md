# Posta del club — attivazione con la password per le app

Direttiva: UD-101 (Direzione, 13/10/2026 08:26 e 12:16). Pagine: `/gestionale/posta` (Posta del club) e
`/direzione/posta/collega` (Collega la casella, solo Direzione).

Questa è la strada **semplice**: una sola variabile su Render, nessun progetto Google Cloud. La strada OAuth
(Gmail API) resta disponibile per i tecnici e, se configurata, ha la precedenza.

## Cosa serve

- L'account **sportclubcolico@gmail.com** con la **verifica in due passaggi** attiva (serve un telefono).
- Accesso alla dashboard Render del servizio della Super App.
- Sul server devono già esserci `SCD_SUPABASE_SECRET_KEY` (chiave di servizio del database del club) e le variabili
  Supabase della Super App: le imposta chi gestisce il server, una volta sola.

## I cinque passi (Direzione, circa 5 minuti)

1. Apri <https://myaccount.google.com/security> ed entra con **sportclubcolico@gmail.com**.
2. Apri **Verifica in due passaggi** (<https://myaccount.google.com/signinoptions/two-step-verification>): deve
   risultare **Attiva**. Se non lo è, attivala seguendo Google.
3. Apri **Password per le app** (<https://myaccount.google.com/apppasswords>). Nome: **Super App SCD** → **Crea**.
   Google mostra 16 lettere in quattro gruppi: copiale. Non scriverle in chat, in mail o nell'app.
4. Su <https://dashboard.render.com> → servizio della Super App → **Environment** → **Add Environment Variable**:
   - Key: `SCD_GMAIL_APP_PASSWORD`
   - Value: le 16 lettere (gli spazi non contano)
   - **Save Changes** (il servizio si riavvia in un paio di minuti).
5. Torna su **Collega la casella** nella Super App → **Verifica collegamento** (non parte nessuna mail). Se invio e
   ricezione sono verdi, la Direzione accende **Invio attivo**.

Facoltative:

- `SCD_GMAIL_USER` — solo se la casella non è `sportclubcolico@gmail.com` (deve coincidere con la casella impostata
  nel database, altrimenti la verifica dice «credenziali di un'altra casella»).
- `SCD_COMM_SYNC_SECRET` (almeno 32 caratteri) + un **Cron Job** Render ogni 10 minuti che chiama
  `POST /internal/comm-sync` con `Authorization: Bearer <SCD_COMM_SYNC_SECRET>`. Senza cron la posta si aggiorna lo
  stesso quando qualcuno dello staff apre la Posta del club (al massimo ogni 2 minuti) e quando mette in coda un
  messaggio.

## Piano Render: attenzione all'invio

Il piano **gratuito** di Render può bloccare le connessioni in uscita verso le porte di posta (SMTP 25/465/587).
Se la verifica mostra «**Porta SMTP bloccata dal server**», il servizio va portato al piano **Starter** (a pagamento):
Render → servizio → **Settings** → **Instance Type**. La ricezione (IMAP, porta 993) funziona comunque; finché l'invio
non è possibile la casella risulta «non collegata» e l'interruttore resta spento.

## Come funziona

| Cosa | Come |
| --- | --- |
| Invio | `smtp.gmail.com:465` (TLS). Una mail separata per ogni destinatario (nessuno vede gli altri), From e Reply-To `S.C.D. ColicoDerviese <sportclubcolico@gmail.com>`, firma con nome e ufficio di chi scrive, testo semplice + HTML. Oggetto con l'etichetta `[SCD-xxxxxx]` e intestazione `X-SCD-Thread` per riconoscere le risposte. Regola minori e limite giornaliero (default 400) applicati dal database. |
| Ricezione | `imap.gmail.com:993`, cartella Posta in arrivo aperta **in sola lettura**: Gmail non cambia (letto/non letto, etichette). Punto di lettura salvato in `scd_comm_settings.history_id` come `imap:<uidvalidity>:<ultimo uid>`. Al primo collegamento si parte da «adesso»: le mail vecchie non vengono importate. |
| Risposte | Riconosciute da `In-Reply-To`, `References` o dall'etichetta `[SCD-xxxxxx]` dell'oggetto, e messe nella stessa conversazione. Mittenti sconosciuti diventano «nuovi contatti» da decidere. |
| Sponsor | Pagina CRM → «Scrivi a tutti i partner» o «Scrivi allo sponsor»: si apre lo stesso compositore della Posta del club, già compilato; le conversazioni hanno l'etichetta **Sponsor**. Se uno sponsor non ha ancora un indirizzo, lo si collega dal compositore. |
| Errori | Messaggi chiari nella pagina Collega: password per app errata, verifica in due passaggi non attiva, password normale al posto di quella per le app, porta SMTP bloccata, limite giornaliero di Gmail. Nessuna password, indirizzo o testo finisce nei log. |

## Come spegnere

- **Sospendere l'invio**: Collega la casella → spegni **Invio attivo**. Si scrivono solo bozze; la ricezione continua.
- **Scollegare del tutto**: su <https://myaccount.google.com/apppasswords> elimina «Super App SCD» (oppure cancella
  `SCD_GMAIL_APP_PASSWORD` su Render). Al giro successivo la casella risulta non collegata e l'invio si spegne da solo.

## Per chi sviluppa

- Selezione del trasporto: `apps/superapp/src/lib/comm/transport.ts` (`selectTransportMode`): OAuth se
  `SCD_GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN` sono tutte presenti, altrimenti password per le app, altrimenti
  disattivato.
- Trasporto password per le app: `apps/superapp/src/lib/comm/apppassword.server.ts` (nodemailer 10.0.11, imapflow
  2.1.2, mailparser 3.9.31, versioni fissate). Trasporto OAuth: `gmail.server.ts`. Job: `sync.server.ts`.
- Nessuna migrazione nuova: il punto di lettura IMAP usa la colonna esistente `history_id` (r95).
- Test: `apps/superapp/src/lib/comm/*.test.ts`, trasporti sempre simulati: i test non aprono connessioni reali.
