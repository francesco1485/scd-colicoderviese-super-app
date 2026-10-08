# SCD Visual & Motion System

## Obiettivo
Una sola identita visiva per Sponsor Platform, Partner OS, CRM, Card, Convenzioni, LEDWall, Sponsor Wall e contenuti video.

## Principio guida
**Standard internazionale. Identita profondamente locale.**

Ogni interfaccia deve essere riconoscibile come S.C.D. ColicoDerviese anche senza mostrare il logo: blu SCD, azzurro Lago di Como, giallo club, navy profondo, bianco, fotografia territoriale reale e gerarchia grafica forte.

## Regola Vision-to-Code
Le immagini e i concept non vengono incollati nella Web App come poster. Vengono scomposti in componenti:
1. scena visuale;
2. componente UI;
3. dato canonico;
4. azione;
5. storico CRM / proof.

## Ambienti
- Public Sponsor Platform: emozionale e commerciale.
- Partner OS: operativo e relazionale.
- CRM: denso ma leggibile.
- LEDWall: dinamico, leggibile, camera-safe.
- Sponsor Wall: modulare e logo-safe.

## LED / MP4
Le preview attuali sono 1920x1080, 25 fps, 20 secondi. Questi dati descrivono i file preview, non il pannello LED fisico.
Prima di produrre i master definitivi dell'impianto vanno censiti: dimensioni fisiche, pixel pitch, risoluzione nativa, refresh rate, luminosita, controller, rapporto schermo, camera principale e vista tribuna.

Ogni sponsor deve avere:
- logo ufficiale fornito/approvato;
- brief;
- messaggio principale;
- variante tribuna;
- variante camera-safe;
- eventuale versione social;
- proof dopo erogazione.

## Regole motion
- logo leggibile sempre;
- un messaggio principale per scena;
- alto contrasto;
- movimenti progressivi, non frenetici;
- transizioni coerenti tra sponsor;
- niente specifiche tecniche inventate;
- riduzione motion rispettata nel web.

## Governance
config/scd-visual-system.json e sponsor/scd-design-system.css sono le fonti canoniche.
Le pagine possono avere CSS specifici, ma non devono ridefinire una nuova identita cromatica.

## Gestionale Visual Foundation — ownership canonico

Wave 1 introduce la foundation approvata del GESTIONALE senza adottarla ancora nelle pagine runtime pubbliche o riservate.

- `config/scd-visual-system.json` = brand tokens e semantica visuale canonica.
- `config/scd-ui-grammar.v1.json` = grammatica macro/micro approvata.
- `config/scd-face-policy.v1.json` = regole facce, consenso e proiezioni pubblico/interno/commerciale.
- `config/scd-accessory-library.v1.json` = libreria originale di oggetti operativi.
- `styles/scd-visual-foundation.css` = implementazione condivisa Wave 1.
- `sponsor/scd-design-system.css` = layer live storico Sponsor finché una futura migrazione viene approvata.
- `docs/visual-lab/gestionale-foundation.html` = Visual Lab non-runtime per QA e approvazione.

Regola: APP SOCIAL, GESTIONALE e SPONSOR non devono caricare automaticamente la nuova foundation finché la relativa adozione runtime non è stata approvata e verificata.
