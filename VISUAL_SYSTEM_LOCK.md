# SCD ColicoDerviese — Visual System Lock R21.11

Questo file è la costituzione visiva della Super App. Ogni evoluzione futura deve rispettare questi principi salvo approvazione esplicita della Direzione.

## 1. Identità visiva obbligatoria
- Palette primaria: blu SCD, azzurro, giallo, bianco.
- Il logo SCD deve essere sempre visibile nelle schermate principali.
- Territorio come elemento identitario: Colico, Alto Lario, lago e montagne.
- Sky è la mascotte ufficiale e va usata come elemento relazionale, non come decorazione casuale.
- Niente estetica SaaS generica, dashboard grigie anonime o template WordPress.

## 2. Struttura app
Le schermate di riferimento definitive sono:
1. Home pubblica.
2. Calendario live.
3. Area Atleta.
4. Area Famiglia.
5. Area Staff / Direzione.
6. Comunicazioni.
7. Profilo / Area Riservata.

La navigazione mobile pubblica mantiene:
Home · Calendario · Squadre · Eventi · Profilo.

Le aree staff possono usare:
Dashboard · Squadre · Atleti · Comunicazioni · Altro.

## 3. Componenti
- Header blu ad alto contrasto con logo e identità SCD.
- Card bianche modulari, arrotondate, compatte.
- Accenti gialli per selezione, priorità e CTA.
- Blu per navigazione e contenuti primari.
- Verde per stati positivi/confermati.
- Rosso solo per alert, urgenze e badge.
- Iconografia semplice, sportiva e coerente.
- Bottom navigation persistente su mobile.
- Titoli forti e compatti.
- Informazioni temporali e di stato sempre leggibili.

## 4. Tempo e dati
- Fuso canonico: Europe/Rome.
- Calendario, agenda, notifiche e promemoria devono dipendere dal Temporal Core.
- Nessun dato sportivo inventato.
- In assenza di dati reali: “Dato in aggiornamento”.
- La UI deve distinguere dati live, cache e fallback quando rilevante.

## 5. Regola di stabilità
Prima di ogni modifica visiva:
1. confrontare il risultato con le schermate approvate;
2. non introdurre un nuovo linguaggio grafico;
3. riutilizzare token e componenti esistenti;
4. testare 360x800, 390x844, 393x852, 430x932;
5. non fondere su main se E2E è rosso.

## 6. Obiettivo
L’app deve sembrare una vera applicazione calcistica territoriale: energica, riconoscibile, utile, moderna e coerente in ogni area.
