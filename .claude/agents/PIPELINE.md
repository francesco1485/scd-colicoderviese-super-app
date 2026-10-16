# Percorso degli agenti SCD (orchestra)

Decisione di Francesco del 16/10/2026: agenti in sequenza dall'inizio alla fine, con i passi obbligatori e quelli che migliorano; squadre in parallelo; un agente orchestrale. Il direttore d'orchestra è `scd-azioni`.

## 1. Sequenza (dall'idea al sito vero)

| Passo | Agente | Obbligatorio? | Perché |
| --- | --- | --- | --- |
| 1. Stato reale | scd-azioni (SCD:STATE) | **Sì** | Senza lo stato si rompe il lavoro degli altri |
| 2. Strategia | scd-stratega | Sì per lavori grandi, no per correzioni | Motore (soldi, persone, tempo), priorità, rischi |
| 3. Fonti e dati | scd-google, scd-documenti, scd-figc-lnd | **Sì** quando servono dati veri | Mai dati inventati |
| 4. Idee e crescita | scd-crescita, scd-community | No, migliora | Rende il risultato virale e piacevole |
| 5. Grafica | scd-grafica (+ skill scd-occhio-grafico) | **Sì** per tutto ciò che si vede | Foto a Francesco prima di pubblicare |
| 6. Costruzione | scd-sviluppo (+ ecc-planner, ecc-architect) | **Sì** per il codice | Codice completo e test |
| 7. Testi | skill scd-tono | Sì per testi pubblici | Italiano semplice, regole minori |
| 8. Sicurezza | scd-sicurezza | **Sì** | Segreti, dati personali, minori |
| 9. Revisione | scd-revisore | **Sì** | Verità dei testi, regole, test |
| 10. Pubblicazione | skill scd-pubblica | **Sì** | Con l'ok di Francesco quando lo chiede, controllo del sito a 390 e 1440 px |
| 11. Controllo dopo | scd-regista | No, migliora | Cosa è cambiato, cosa resta |

## 2. Squadre in parallelo

| Squadra | Agenti | Quando |
| --- | --- | --- |
| App e web | scd-sviluppo, scd-grafica, ecc-react-reviewer, ecc-a11y-architect, ecc-performance-optimizer | Pagine e funzioni nuove |
| Multimedia | scd-avatar, scd-social, scd-ledwall, scd-comunicazione | Video, personaggi, LED, contenuti |
| Crescita | scd-crescita, scd-community, scd-territorio, scd-sociale | Idee virali, eventi, coinvolgimento |
| Mondo Google | scd-google, scd-mail, scd-documenti, scd-segreteria | Posta, calendari, Drive, fogli |
| Soldi | scd-commerciale, scd-sponsor, scd-tesoreria, scd-cfo, scd-bandi, scd-rendicontazione | Sponsor, cassa, bandi, rendiconti |
| Consiglio esperto | scd-legale, scd-diritto-sport-lavoro, scd-rendicontazione, skill scd-direzione-amministrativa | Quando serve un parere: si interrogano, non decidono |
| Campo | scd-squadre, scd-atleti, scd-impianti, scd-pulmini, scd-tornei | Calendari, allenamenti, mezzi, tornei |
| Skill | scd-skill | Ogni settimana: nuove skill o migliorie dalle richieste ripetute |

## 3. Catene per ogni piattaforma del gestionale

Francesco 16/10 08:14: agenti in serie presenti in ogni piattaforma del gestionale, per renderla dinamica ed efficiente, che parlano con il gestionale complessivo. Ogni piattaforma ha la stessa catena di cinque anelli:

1. **Ingresso**: legge le novità dalla fonte madre (foglio Drive, posta, Iride, calendario, modulo Tally, app).
2. **Responsabile**: l'agente della piattaforma decide cosa cambia e prepara le azioni.
3. **Supporto**: gli agenti vicini completano (soldi, regole, grafica, comunicazione).
4. **Controllo**: dati veri, regole dei minori, nessun doppione (scd-revisore per ciò che va online).
5. **Quadro generale**: riporta a scd-regista (oggi) e a scd-azioni (piano), che aggiornano il quadro della Direzione e avvisano le altre piattaforme toccate.

| Piattaforma | Ingresso | Responsabile | Supporto | Parla con |
| --- | --- | --- | --- | --- |
| Segreteria e persone | posta, Iride, Tally, portale FIGC | scd-segreteria | scd-tesserati, scd-figc-lnd, scd-documenti, scd-diritto-sport-lavoro | Tesoreria, Squadre, Infermeria |
| Squadre, allenamenti, calendario | Master Calendario, Quadro allenamenti, C.U. | scd-squadre | scd-atleti, scd-impianti | Pulmini, Impianti, Comunicazioni, Google Calendar |
| Impianti e rotazione campi | richieste in app, Comuni | scd-impianti | scd-squadre, scd-negoziazione | Squadre, Tornei, Calendar |
| Pulmini | master flotta, richieste posto | scd-pulmini | scd-squadre | Squadre, Tesoreria, Calendar |
| Tesoreria e fornitori | gestionale quote, banca, fornitori | scd-tesoreria | scd-cfo, scd-rendicontazione | Segreteria, Magazzino, Direzione |
| Magazzino e kit | ordine kit, consegne | scd-magazzino | scd-tesoreria | Segreteria, Shop |
| Infermeria e tutela | certificati, appuntamenti (solo numeri) | scd-infermeria | scd-legale | Segreteria, Squadre |
| Sponsor, partner, LED | CRM, contratti, spot | scd-commerciale | scd-sponsor, scd-ledwall | Comunicazioni, Tesoreria, Tornei |
| Comunicazioni e social | notizie, gare, iniziative | scd-comunicazione | scd-social, scd-crescita | Tutte le piattaforme pubbliche |
| Community, fantacalcio, Top 11 | app, eventi | scd-community | scd-relazioni, scd-crescita | Comunicazioni, Club House |
| Tornei ed eventi | master tornei, iscrizioni | scd-tornei | scd-negoziazione, scd-commerciale | Impianti, Pulmini, Calendar |
| Documenti e privacy | Drive, consensi | scd-documenti | scd-legale, scd-google | Segreteria, tutte |
| Fondo solidale, Adotta, lotteria | richieste, donazioni | scd-sociale | scd-tesoreria, scd-legale | Direzione, Comunicazioni |
| Mondo Google | Gmail, Calendar, Drive, fogli | scd-google | scd-mail, scd-documenti | Tutte le piattaforme |
| Ingresso richieste (Iride, WhatsApp, telefono) | Iride, centralino | scd-centralino | scd-iride, scd-mail | Segreteria e le piattaforme del tema |

Le piattaforme ancora da costruire (nutrizionista, bandi, planning annuale, affitto campi, live e dirette, acquisti, attività serali) seguono la stessa catena appena nascono.

## 4. Regole

- Un agente lavora solo dentro una chat o un'attività programmata: nessuno gira da solo 24 ore su 24.
- Nessun agente invia, pubblica, paga o cambia ruoli, permessi, tesseramenti, presenze, documenti sensibili o tutela dei minori: prepara, decide la Direzione.
- Divisione dei compiti tra chat (AGENTS.md, SCD:SESSIONI): accesso, registrazione, posta con Make, WhatsApp e centralino restano alla chat PC.
