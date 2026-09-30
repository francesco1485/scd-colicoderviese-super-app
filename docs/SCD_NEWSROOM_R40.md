# R40 — Calendario settimanale totale + SCD Newsroom AI

## Calendario
La settimana sportiva mostra **tutte le annate e tutte le attività** disponibili nella fonte calendario SCD, dal lunedì alla domenica.

Campi utilizzabili:
- data e ora;
- squadra;
- categoria / annata;
- avversario;
- competizione;
- luogo;
- risultato, se presente;
- provenienza.

La schermata non taglia il calendario alle sole prime attività. I filtri servono per restringere la vista, non per nascondere dati nella vista "Tutte".

## News
Il vecchio sito SCD è escluso come fonte editoriale automatica finché non viene verificata la sua freschezza.

La Newsroom può usare:
- risultati inseriti;
- classifiche strutturate;
- calendario;
- tornei;
- iniziative territoriali;
- dati interni verificati;
- Drive e Gmail quando acquisiti dal processo editoriale AI settimanale.

Non usa:
- articoli vecchi del sito come riempitivo;
- commenti web non verificati;
- punteggi o classifiche inventati.

## Due livelli
1. **Runtime grounded**: Render genera una sintesi automatica dai dati strutturati disponibili.
2. **Editoriale AI settimanale**: ChatGPT prepara `content/weekly-news.json` usando le fonti SCD reali, con evidenze. Viene mostrato solo se `status=PUBLISHED` e la settimana coincide.

## Fail closed
Se non ci sono fatti verificati, la Newsroom pubblica esplicitamente che non ci sono dati sufficienti invece di inventare un articolo.
