# Memoria del club — S.C.D. ColicoDerviese

Francesco (DG), 17/10/2026 11:57: «qui c'è bisogno di un agente pensante che si migliora e sviluppa ogni volta, anche una memoria per ricordare tutto e tutti ogni anno». Direttiva UD-180.

La memoria del club è il quaderno che ogni agente legge prima di lavorare e che il ciclo «Ufficio» (skill `scd-ufficio`, agente `scd-regista`) aggiorna ogni sera. Non è un secondo registro: le fonti madri restano le stesse (portale LND per i tesserati, UD-176; SCD PULSE; fogli master e Drive; SCD_INTAKE_LOG). La memoria ricorda **chi, cosa, quando e perché**, con la fonte, e rimanda alla fonte madre per il dato vivo.

Motori: TEMPO (nessuno rifà da capo le stesse ricerche ogni anno) e PERSONE (le persone vengono riconosciute e ricordate). Misura: quante voci «da confermare» vengono confermate entro 30 giorni; quante lezioni diventano comandi approvati.

## Cosa non entra mai
Nomi e cognomi di persone (staff, collaboratori, referenti esterni: solo il ruolo, il nome sta nella Rubrica staff, SCD PULSE `scd_structure_roles`, privata), numeri di telefono, indirizzi e-mail, codici fiscali, IBAN, date di nascita di persone, dati di salute, ISEE, nomi di minori, foto. Le annate delle squadre (es. «2012-2013») sono categorie, non dati personali. I contatti stanno solo nella rubrica riservata della Segreteria. Il repository è pubblico: si scrive come se lo leggesse chiunque.

## Struttura (una cartella per stagione, `AAAA-AA`)

| File | Contenuto | Chi lo aggiorna |
|---|---|---|
| `persone-e-ruoli.md` | Organigramma della stagione: solo ruoli, fonte e data (i nomi stanno nella Rubrica staff, SCD PULSE `scd_structure_roles`, privata); grafie e incarichi «da confermare» | Segreteria tramite il ciclo Ufficio; conferma la Direzione |
| `squadre-e-annate.md` | Squadre attive o ritirate, annate unificate, campionati e coppe con codici LND, staff tecnico | scd-squadre, scd-figc-lnd |
| `decisioni-direzione.md` | Decisioni della Direzione con data e ora, chi le ha prese, dove si applicano | il ciclo Ufficio, da chat e documenti di progetto |
| `fornitori-partner-enti.md` | Enti, federazione, Comuni, associazioni, fornitori e partner: ruolo del rapporto, ruolo del referente (mai il nome), stato | scd-negoziazione, scd-sponsor, scd-tesoreria |
| `cose-imparate.md` | Errori e correzioni, richieste che si ripetono, soluzioni che funzionano, regole proposte; riga «Ultimo ciclo Ufficio» | ogni ciclo Ufficio (scritto alle 18:22) |
| `ricorrenze.md` | Date che tornano ogni anno: scadenze federali, tornei, programmi ai Comuni, chiusura stagione | scd-segreteria, scd-tornei |

Ogni riga porta un'etichetta: **VERIFIED** (fonte e data), **INFERRED** (dedotto, da confermare), **PROPOSED** (proposta), oppure «da confermare». Un dato che non c'è è «non noto», mai zero.

## Come si scrive
- Una riga per fatto, con data (gg/mm/aaaa) e fonte (chat di Francesco con ora, documento, portale, mail con data).
- Si corregge, non si cancella: la riga vecchia resta barrata o con «superato il gg/mm, vedi …».
- Le decisioni si citano con le parole di chi decide quando ci sono.
- Le persone si ricordano solo per ruolo, mai per nome: «chi fa cosa» serve a Iride e agli agenti per smistare.

## Cambio di stagione (ogni 1° luglio)
Il ciclo Ufficio del 1° luglio (o il primo dopo) prepara il passaggio su un ramo, la Direzione approva con la PR:
1. **Archivia**: la cartella della stagione chiusa (es. `2026-27/`) resta com'è; in testa a ogni file si aggiunge «Stagione chiusa il 30/06/AAAA». Niente si cancella.
2. **Crea** la cartella nuova (es. `2027-28/`) con gli stessi sei file.
3. **Porta avanti** persone e ruoli: ogni riga di `persone-e-ruoli.md` viene copiata con stato **«da confermare»** e la fonte «riportato dalla stagione AAAA-AA»; diventa VERIFIED solo quando la Direzione o la Segreteria conferma l'organigramma nuovo.
4. **Squadre e annate**: ogni annata sale di categoria secondo le regole SGS/LND della nuova stagione (da verificare sulle fonti ufficiali dell'anno); le squadre e i campionati restano «da confermare» fino alle iscrizioni sul portale LND.
5. **Ricorrenze**: si ricopiano con le date del nuovo anno segnate «da verificare» (le scadenze federali cambiano ogni stagione).
6. **Cose imparate**: le regole nate durante l'anno e approvate restano in `config/user-directives.v1.json`; le lezioni non ancora diventate regola si riportano nella nuova stagione.
7. **Fornitori, partner, enti**: si ricopiano con lo stato del rapporto «da riconfermare».
8. Iride: la conservazione «fine stagione» (30/06) delle richieste chiuse resta nello scenario Make; la memoria non copia richieste, solo lezioni.

## Stagioni
- [2026-27](2026-27/) — aperta (memoria avviata il 17/10/2026).
