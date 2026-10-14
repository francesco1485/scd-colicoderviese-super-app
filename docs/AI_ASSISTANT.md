# Assistente IA della Super App: Vera (e Sky per i più piccoli)

Release r99, direttiva **UD-104**, approvata dalla Direzione il 13/10/2026 alle 12:03 ("Vai A B C").
Contratto: `SCD_SYSTEM_MANIFEST.json`, fonte `ANTHROPIC_API` e sezioni `sky_and_avatar.ai_assistants` e `sky_and_avatar.assistant_cast`.

Aggiornamento 14/10/2026 ore 18:05 (**UD-118**, decisione di Francesco): **una sola chat in tutta l'app, Vera**, la reception del club, al posto di Genny. Vera risponde con i dati veri del club citando la fonte, porta dal volto giusto (Chef della Club House, Volto sponsor, Mentore dei tornei; Sky solo nel mondo dei bambini under 14) e apre una richiesta alla segreteria quando serve una persona. Risponde anche su biglietti e card (la biglietteria è assorbita) e sostituisce Crovi nella chat pubblica (Crovi non è un asset APPROVED nel registro). Era, Dottor Acanfora, preparatore atletico, mental coach e musica e relax sono solo "consiglio del giorno". Il vecchio id `genny` (e `crovi`) è accettato come alias di `vera`.

Storico 14/10/2026 (**UD-111**, decisione della Direzione): i ruoli di Era e Genny erano invertiti. L'assistente interna della chat è **Genny, la segretaria**; **Era è la nutrizionista** (solo contenuti, "I consigli di Era" nell'area famiglie) e il **Dottor Acanfora è il medico** (infermeria, mai diagnosi). Era e Genny non hanno ritratto finché la Direzione non approva immagini nuove adatte ai ruoli.

## Cosa fanno

| Assistente | Dove | Su quali dati risponde |
|---|---|---|
| **Vera** (reception) | pagine pubbliche ("Chiedi a Vera"); dai volti delle aree con l'area come contesto | solo dati pubblici: gare dei prossimi 7 giorni (solo partite ufficiali), eventi, biglietteria, impianti e indirizzi, contatti ufficiali, iscrizioni, offerta sponsor e sponsor confermati, link ufficiali ai risultati, guida all'app |
| **Vera** (reception) | aree riservate, staff e soci adulti; pulsante "Chiedi a Vera" nel Cervellone, in segreteria e negli impianti | Cervellone letto con `scd_kb_search` **con la sessione di chi chiede**: l'ufficio vede INTERNO, solo la Direzione vede RISERVATO. Il database decide, l'app non aggira mai il controllo (niente service key) |
| **Sky** | aree riservate, soci più giovani (finché non c'è il loro avatar) | solo dati pubblici, con un tono semplice |

Regole sempre attive:
- risponde **solo** con quello che trova nel contesto; altrimenti dice "non lo so" e manda alla segreteria;
- mai nomi di minori, dati sanitari, IBAN, codici fiscali o password (vengono anche tolti dal contesto e dalla risposta da un filtro automatico);
- **safeguarding**: la domanda non arriva mai all'IA, risponde il canale riservato di sempre;
- **disagio** (ansia, tristezza, pensieri di farsi del male): la domanda non arriva mai all'IA; risponde un testo fisso che rimanda a famiglia, mister, medico, professionisti e al referente Tutela minori, e al 112 se c'è pericolo. Nessun personaggio fa terapia (`apps/superapp/src/lib/cast-safety.ts`);
- **richieste e problemi** ("manca il sapone", "faro rotto"): li gestisce il motore delle richieste (UD-045), non l'IA;
- risposte di massimo ~120 parole con collegamenti cliccabili; sotto ogni risposta IA compare "Risposta generata con IA · verifica le informazioni importanti";
- una domanda alla volta: la conversazione non viene conservata.

## Come si accende (Direzione)

Finché non si fanno questi passi l'app si comporta come oggi (risposte a regole fisse di Vera/Sky).

1. Su <https://console.anthropic.com> entrare con l'account della società, aprire **Billing** e caricare un credito iniziale (bastano pochi euro, vedi costi sotto). In **Limits** impostare un tetto di spesa mensile (consigliato 10 $).
2. In **API Keys** creare una chiave chiamata `scd-superapp-assistenti` e copiarla (inizia con `sk-ant-`). Non inviarla per e-mail o chat.
3. Su Render, servizio della Super App → **Environment**:
   - `SCD_ANTHROPIC_API_KEY` = la chiave (se è già impostata per il moderatore automatico, si riusa la stessa);
   - `SCD_ASSISTANT_AI` = `on`.
4. Salvare: Render riavvia il servizio. Prova: aprire una pagina pubblica, "Chiedi a Vera" → "Quando gioca la Prima Squadra?". Se la risposta ha la riga "Risposta generata con IA", è attivo.

## Come si spegne

- Subito: su Render impostare `SCD_ASSISTANT_AI` = `off` (o cancellarla). Si torna alle risposte a regole, senza altri effetti.
- Definitivo: revocare la chiave dalla console Anthropic. Se la chiave serve anche al moderatore automatico, il moderatore torna alla regola di fiducia (i post passano alla revisione di una persona).

Se la chiave manca, il credito finisce, l'API risponde con un errore o impiega più di 8 secondi, l'app risponde comunque con le regole fisse: nessuna pagina si rompe.

## Costi stimati

Modello: **Claude Haiku 5.5** (`claude-haiku-5-5`). Prezzo indicato da fonti terze a ottobre 2026: 0,10 $ per milione di token in ingresso e 0,50 $ per milione in uscita, sotto i 100.000 token per richiesta. Le nostre richieste sono molto più piccole. Verificare il listino aggiornato su <https://www.anthropic.com/pricing> prima di attivare.

| Voce | Token per domanda | Costo per domanda |
|---|---|---|
| Vera, pagine pubbliche (contesto pubblico ≤ 3.000 + regole) | ~3.600 in + ~200 out | ~0,0005 $ |
| Vera, aree riservate (Cervellone ≤ 4.000 + regole) | ~4.600 in + ~200 out | ~0,0006 $ |

Volume previsto: 3.000 domande al mese al pubblico + 1.500 dallo staff ≈ **2–3 $ al mese**. Anche con 10 volte il traffico si resta sotto i 30 $. Protezioni contro l'abuso: 20 domande ogni 10 minuti per indirizzo IP sulle pagine pubbliche, 60 all'ora per persona all'interno, domande lunghe al massimo 400 caratteri.

## Privacy

- Anthropic agisce come **fornitore che tratta i dati** per conto della società: riceve solo la domanda e il contesto descritto sopra, mai elenchi di persone, rose, dati di minori, dati sanitari, IBAN, codici fiscali o segnalazioni safeguarding.
- Lo staff riceve dal Cervellone solo titolo, sintesi, stato, scadenza, stagione e link delle voci che il suo ruolo può già vedere; importi, mittenti, enti e tag restano fuori.
- I log del server registrano solo esito, assistente, tempo e numero di token: **mai** la domanda, il contesto o la risposta. Gli indirizzi IP e le e-mail usati per i limiti sono conservati in memoria come impronta (hash) e spariscono al riavvio.
- Da aggiungere all'informativa privacy prima dell'attivazione pubblica: una riga sull'uso di un assistente IA (fornitore Anthropic) per rispondere alle domande in chat, senza conservazione delle conversazioni nell'app. Verificare con la Direzione le condizioni d'uso commerciali dell'API e la sede di trattamento dei dati.

## Dove sta il codice

- `apps/superapp/src/lib/assistant.ts`: personaggi, contesti con limite di lunghezza, regole del prompt, filtro della risposta, limitatore.
- `apps/superapp/src/lib/assistant.server.ts`: ordine delle risposte (safeguarding/richieste → regole; IA spenta → regole; limiti; IA; errore → regole).
- `apps/superapp/src/lib/assistant.functions.ts`: `askAssistant` (pubblico) e `askStaffAssistant` (con accesso), collegati ai dati veri.
- `apps/superapp/src/lib/anthropic.server.ts`: chiamata unica a Claude, usata anche dal moderatore automatico.
- `apps/superapp/src/components/SkyChat.tsx`: la chat unica (Vera, oppure Sky per i soci più giovani).
- Test: `assistant.test.ts`, `assistant.server.test.ts` (non chiamano mai l'API vera).

## Il cast dei personaggi (UD-111, semplificato da UD-118)

Elenco completo in `apps/superapp/src/lib/assistant-cast.ts` (`CAST_ROSTER`): ruolo, area, cosa fa, regole e persone reali a cui rimanda. Tutti sono personaggi **originali ispirati al ruolo**, mai nome, volto o voce di una persona reale o famosa; la tutela dei minori è sempre attiva.

| Personaggio | Ruolo | Nella chat? | Ritratto | Voce |
|---|---|---|---|---|
| Vera (ex Genny) | Reception, l'unica chat | sì, ovunque | in attesa di immagine approvata (iniziale "V") | no |
| Chef della Club House · Volto sponsor · Mentore dei tornei | volti con azioni concrete, **nome da decidere** | no: "Chiedi a Vera" apre la chat di Vera con l'area | no | no |
| Sky | mascotte, solo mondo bambini under 14 | sì, solo per i soci più giovani | asset ufficiale | no |
| Era · Dottor Acanfora · Preparatore atletico · Mental coach · Musica e relax | solo consiglio del giorno | no | Acanfora sì (round 4), gli altri no | no |
| Biglietteria · Crovi | assorbiti da Vera | no | — | no |

La voce arriverà solo dopo che la Direzione approva una voce sintetica originale, non legata a una persona reale.
