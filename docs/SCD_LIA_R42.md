# SCD Lia R42 — Assistente operativo interno

## Obiettivo
Lia è l'assistente operativo interno della SCD ColicoDerviese. Non è un chatbot esterno e non possiede privilegi autonomi.

Il modello è:

```text
Utente autenticato
      |
      v
Lia / Command Center
      |
      v
R22 Command Platform
      |
      +--> ruolo + scope
      +--> schema comando
      +--> autorizzazione
      +--> esecuzione
      +--> evento / audit
      +--> risultato
      |
      +--> R20 / Drive / Gmail / Sheets
      +--> Supabase quando la capability è attivata
      +--> fonti web/open-data registrate
```

## Regola dei poteri
La Direzione e gli Admin possono impartire comandi operativi entro le capability autorizzate. Gli altri ruoli ricevono supporto ed eseguono solo azioni compatibili con il proprio perimetro.

Il browser non assegna mai privilegi.

Azioni irreversibili, invio esterno definitivo, modifica permessi, firma/chiusura contratti, cancellazioni e dati sensibili richiedono un gate umano esplicito.

Safeguarding resta completamente separato.

## Prima vertical slice

### Mapping comunale
Comando:

```text
Mappa tutte le aziende e attività presenti nel Comune di Colico.
```

Lia esegue `map-municipality-businesses`.

Fonte iniziale: OpenStreetMap / Overpass.

La copertura è sempre dichiarata `PARTIAL_NOT_EXHAUSTIVE`. Una presenza nella fonte non dimostra interesse commerciale.

Non vengono ricercate persone fisiche private. Sono ammessi solo contatti professionali pubblici presenti nella fonte o forniti/legittimamente disponibili nel sistema.

### Mapping + Drive
Comando Direzione:

```text
Mappa le attività del Comune di Colico, crea la cartella commerciale e salva il lavoro.
```

Lia esegue `build-municipality-commercial-map`.

R20 crea/riusa:

```text
SCD COMMERCIAL DEVELOPMENT
└── MAPPING TERRITORIALE
    └── Colico
```

e salva:
- Google Sheet `AZIENDE E ATTIVITA`;
- tab `PROVENIENZA`;
- snapshot JSON originale;
- audit dell'operazione.

La scrittura è disponibile solo dopo distribuzione del patch R42 sul Web App R20 canonico.

### Creazione cartella
`create-drive-folder` crea sottocartelle solo sotto la radice commerciale controllata. Non sposta o cancella file.

## Documenti e contratti
Lia deve evolvere verso:
1. ricezione allegati;
2. collegamento alla pratica;
3. estrazione dei contenuti;
4. confronto tra originale e bozza;
5. generazione revisione;
6. salvataggio come nuova versione, preservando l'originale;
7. approvazione umana prima dell'uso esterno.

## Locandine e creatività
Nel primo livello Lia produce brief strutturato, materiali richiesti, formati, testi e controllo asset.

Per locandine template-driven si può usare HTML/SVG/Canvas senza servizi a pagamento. La generazione visuale AI resta un adapter separato e non può diventare dipendenza a pagamento del core.

## Supporto remoto ChatGPT
Non esiste ancora un canale diretto autorizzato tra Lia e questa specifica conversazione ChatGPT.

R42 introduce `SCD_LIA_HANDOFF_V1`, un pacchetto privo di credenziali che contiene:
- comando;
- ruolo;
- contesto tecnico minimo;
- riferimenti agli allegati;
- fonti;
- stato del lavoro;
- richiesta di supporto.

L'utente può portarlo a ChatGPT e reimportare l'output. Un collegamento diretto potrà essere aggiunto solo quando esisterà un canale gratuito, autorizzato e sicuro.

## Costi
R42 usa lo stack gratuito già esistente:
- GitHub;
- Render free;
- R20 / Google Workspace;
- Supabase free quando necessario;
- fonti open-data.

Nessuna API AI a pagamento è necessaria per il funzionamento base di Lia.
