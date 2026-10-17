/**
 * Guide interattive e FAQ (permanent commands UD-172 and UD-173, owner agent scd-guide, skill scd-guida-interattiva).
 *
 * ONE typed content module: the first-access tour (components/guide/GuideTour.tsx), the /guida route and, later, the
 * contextual «?» tips and the assistants read from here. No other copy of these texts may exist.
 *
 * Rules enforced by guide-content.test.ts:
 * - every action.to is a route of src/routeTree.gen.ts (a card never points to a page that does not exist);
 * - a card describes only what is live today; everything else is status "in-arrivo" and has no action;
 * - every FIGC / LND / SGS / Tutela Minori answer carries a source the author opened (document, url, checkedAt) and
 *   is "verificato", or it is "da-confermare" and says «chiedi alla Segreteria»;
 * - no phone numbers, e-mail addresses, IBAN, codice fiscale or names of people;
 * - title max 6 words, card body max 35 words, FAQ answer max 60 words.
 *
 * Engines: PERSONE (families and athletes find their way on the first visit and come back) and TEMPO (fewer
 * "come si fa" questions to the Segreteria). Measured by the share of tours completed vs skipped on the device and by
 * the how-to questions reaching the Segreteria AI before and after (PROPOSED: no new table, no tracking).
 */

export type GuideRole = "famiglie" | "calciatori" | "mister" | "dirigenti" | "tifosi";

export interface GuideAction {
  label: string;
  to: string;
}

export interface GuideCard {
  /** "famiglie-presa-visione"; also the anchor of the card in /guida. */
  id: string;
  role: GuideRole;
  /** Max 6 words. */
  title: string;
  /** Max 35 words, plain Italian, second person. */
  body: string;
  /** Route must exist (tested). Cards "in-arrivo" have no action. */
  action?: GuideAction;
  status: "live" | "in-arrivo";
}

export type FaqTopic = "app" | "squadre" | "pulmini" | "documenti" | "figc" | "lnd" | "sgs" | "tutela-minori";

export interface FaqSource {
  /** Document and date, e.g. "FIGC, NOIF art. 39 (testo aggiornato al C.U. 198/A del 27/04/2026)". */
  label: string;
  url: string;
  /** ISO date (yyyy-mm-dd) on which the author opened the document. */
  checkedAt: string;
}

export interface FaqEntry {
  id: string;
  topic: FaqTopic;
  roles: GuideRole[];
  q: string;
  /** Max 60 words. */
  a: string;
  action?: GuideAction;
  /** Required for figc / lnd / sgs / tutela-minori entries that are "verificato". */
  source?: FaqSource;
  status: "verificato" | "da-confermare";
}

export const GUIDE_ROLES: readonly GuideRole[] = ["famiglie", "calciatori", "mister", "dirigenti", "tifosi"];

export const ROLE_LABEL: Record<GuideRole, string> = {
  famiglie: "Famiglie",
  calciatori: "Calciatori",
  mister: "Mister",
  dirigenti: "Dirigenti e responsabili",
  tifosi: "Tifosi e soci",
};

export const ROLE_INTRO: Record<GuideRole, string> = {
  famiglie: "Per genitori e tutori: allenamenti, convocazioni, pulmino e documenti.",
  calciatori: "Per chi gioca. Sotto i 14 anni leggi la guida insieme alla tua famiglia.",
  mister: "Per chi allena una squadra: rosa, convocazioni e campi.",
  dirigenti: "Per dirigenti, responsabili e Direzione: richieste, campi e scadenze.",
  tifosi: "Per chi segue il club: partite, notizie e come entrare in società.",
};

export const FEDERAL_TOPICS: readonly FaqTopic[] = ["figc", "lnd", "sgs", "tutela-minori"];

/** Line shown under the federal FAQ: never legal advice. */
export const FEDERAL_DISCLAIMER =
  "Sono risposte brevi, non consulenze. Per un caso particolare chiedi alla Segreteria: controlla le norme della stagione.";

export const CLUB_NAME = "S.C.D. ColicoDerviese";

export const GUIDE_CARDS: readonly GuideCard[] = [
  // Famiglie
  {
    id: "famiglie-allenamenti",
    role: "famiglie",
    title: "Allenamenti e gare",
    body: "Dopo l'accesso trovi il quadro degli allenamenti della settimana. Le gare di tutte le squadre sono nel Calendario, aperto a tutti.",
    action: { label: "Apri gli allenamenti", to: "/allenamenti" },
    status: "live",
  },
  {
    id: "famiglie-presa-visione",
    role: "famiglie",
    title: "Presa visione della convocazione",
    body: "La convocazione è un impegno. Tocca «Presa visione» per dire al mister che l'hai letta. Se c'è un impedimento vero, segnalalo: decide il mister.",
    action: { label: "Vai all'area Famiglia", to: "/famiglia" },
    status: "live",
  },
  {
    id: "famiglie-pulmino",
    role: "famiglie",
    title: "Un posto sul pulmino",
    body: "Per le trasferte chiedi il posto dall'area Famiglia. L'ufficio conferma o ti spiega perché non è possibile. Il posto lo assegna chi organizza il viaggio.",
    action: { label: "Chiedi il pulmino", to: "/famiglia" },
    status: "live",
  },
  {
    id: "famiglie-documenti",
    role: "famiglie",
    title: "Documenti e certificato",
    body: "In Documenti trovi moduli e regole del club. Nell'area Famiglia vedi se il certificato medico è valido. Se scade, portane uno nuovo in Segreteria.",
    action: { label: "Apri i documenti", to: "/documenti" },
    status: "live",
  },
  {
    id: "famiglie-contatti",
    role: "famiglie",
    title: "Chi contatto",
    body: "Per orari e squadra parla con il mister. Per iscrizioni, documenti e quote scrivi alla Segreteria. I contatti del club sono in una sola pagina.",
    action: { label: "Contatti del club", to: "/contatti" },
    status: "live",
  },

  // Calciatori
  {
    id: "calciatori-squadra",
    role: "calciatori",
    title: "La mia squadra",
    body: "In La mia SCD vedi i prossimi impegni delle squadre che segui. Le gare di tutto il club sono nel Calendario.",
    action: { label: "Apri La mia SCD", to: "/la-mia-scd" },
    status: "live",
  },
  {
    id: "calciatori-convocazione",
    role: "calciatori",
    title: "Presa visione o impedimento",
    body: "Se sei convocato, ci sei. Tocca «Presa visione». Se hai un impedimento vero, segnalalo e decide il mister. Sotto i 14 anni lo fa la tua famiglia.",
    action: { label: "Vedi le convocazioni", to: "/famiglia" },
    status: "live",
  },
  {
    id: "calciatori-card",
    role: "calciatori",
    title: "La mia card",
    body: "Crea il tuo campione e guarda le tue card. Restano nella tua area e non vengono pubblicate.",
    action: { label: "Crea il tuo campione", to: "/la-mia-scd/campione" },
    status: "live",
  },
  {
    id: "calciatori-sfide",
    role: "calciatori",
    title: "Top 11 e Fantacalcio",
    body: "Ogni settimana voti la Top 11 e giochi al Fantacalcio del club. Solo punti e onore, niente soldi.",
    action: { label: "Vota la Top 11", to: "/top11" },
    status: "live",
  },
  {
    id: "calciatori-regole",
    role: "calciatori",
    title: "Regole di comportamento",
    body: "Rispetto per compagni, avversari, arbitri e campi. Il codice di condotta e le regole per le trasferte sono nella pagina Società.",
    action: { label: "Leggi le regole", to: "/societa" },
    status: "live",
  },

  // Mister
  {
    id: "mister-scrivania",
    role: "mister",
    title: "La scrivania di squadra",
    body: "Ogni giorno trovi la tua squadra: allenamento, prossima gara e rosa con tesseramento e certificato. Vedi solo le squadre che ti ha assegnato la società.",
    action: { label: "Apri la scrivania", to: "/gestionale/mister" },
    status: "live",
  },
  {
    id: "mister-convocazioni",
    role: "mister",
    title: "Convocazioni",
    body: "Convoca dalla rosa uno o due giorni prima. Chi non ha certificato valido o tesseramento non si può convocare. Le famiglie rispondono con la presa visione.",
    action: { label: "Convoca la squadra", to: "/gestionale/mister" },
    status: "live",
  },
  {
    id: "mister-campo",
    role: "mister",
    title: "Richiesta del campo",
    body: "Ti serve un campo per un'amichevole o un recupero? Prepara la richiesta: la vede chi approva, e tu ricevi la risposta.",
    action: { label: "Chiedi un campo", to: "/gestionale/impianti/nuova" },
    status: "live",
  },
  {
    id: "mister-presenze",
    role: "mister",
    title: "Presenze agli allenamenti",
    body: "Segnare le presenze dall'app arriverà presto. Per ora continua come ti ha indicato la società.",
    status: "in-arrivo",
  },
  {
    id: "mister-messaggi",
    role: "mister",
    title: "Messaggi ai genitori",
    body: "I messaggi alla squadra dall'app arriveranno presto. Con un minore scrivi sempre con il genitore in copia, mai da solo con il ragazzo.",
    status: "in-arrivo",
  },

  // Dirigenti e responsabili
  {
    id: "dirigenti-richieste",
    role: "dirigenti",
    title: "Richieste da approvare",
    body: "Tornei, sponsor, affitti dei campi e visite arrivano in un solo elenco. Filtra per tipo e fase, poi decidi tu.",
    action: { label: "Apri le richieste", to: "/gestionale/richieste" },
    status: "live",
  },
  {
    id: "dirigenti-campi",
    role: "dirigenti",
    title: "Campi e rotazione",
    body: "Colico 1, Colico 2 e Dervio in un'unica vista. Prima di confermare puoi simulare la rotazione e approvare le richieste dei mister.",
    action: { label: "Apri impianti e campi", to: "/gestionale/impianti" },
    status: "live",
  },
  {
    id: "dirigenti-scadenze",
    role: "dirigenti",
    title: "Certificati in scadenza",
    body: "In Segreteria vedi, squadra per squadra, i certificati medici e la loro scadenza. Segna quando hai in mano quello nuovo.",
    action: { label: "Apri i certificati", to: "/segreteria/certificati" },
    status: "live",
  },
  {
    id: "dirigenti-organigramma",
    role: "dirigenti",
    title: "Organigramma e livello SGS",
    body: "Ruolo per ruolo, cosa chiede il Settore Giovanile e Scolastico per il livello scelto, con le scadenze della stagione.",
    action: { label: "Apri l'organigramma", to: "/gestionale/organigramma" },
    status: "live",
  },
  {
    id: "dirigenti-cruscotto",
    role: "dirigenti",
    title: "Il cruscotto della Direzione",
    body: "Scorciatoie verso le pagine di lavoro e le richieste di accesso in attesa. Ruoli e permessi li assegnano solo Direzione e Presidente.",
    action: { label: "Apri la Direzione", to: "/direzione" },
    status: "live",
  },

  // Tifosi e soci
  {
    id: "tifosi-gare",
    role: "tifosi",
    title: "Le prossime gare",
    body: "Giorno, ora e campo di ogni gara, dalla Prima Squadra ai più piccoli. Non serve nessun account.",
    action: { label: "Apri il calendario", to: "/calendario" },
    status: "live",
  },
  {
    id: "tifosi-news",
    role: "tifosi",
    title: "Notizie del club",
    body: "Avvisi e novità della stagione in una pagina. Le foto non mostrano il volto dei minori.",
    action: { label: "Leggi le notizie", to: "/comunicazioni" },
    status: "live",
  },
  {
    id: "tifosi-campi",
    role: "tifosi",
    title: "Campi e biglietteria",
    body: "I campi di Colico e Dervio, da dove si entra e le regole della biglietteria. I biglietti si pagano al cancello.",
    action: { label: "Apri gli impianti", to: "/impianti" },
    status: "live",
  },
  {
    id: "tifosi-socio",
    role: "tifosi",
    title: "Diventa socio o volontario",
    body: "Compila il modulo e la Segreteria ti richiama. L'app non incassa nulla: la quota si paga nei modi indicati dal club.",
    action: { label: "Iscriviti", to: "/entra" },
    status: "live",
  },
  {
    id: "tifosi-installa",
    role: "tifosi",
    title: "Metti l'app sul telefono",
    body: "In un tocco la aggiungi alla schermata Home. Puoi passare il codice QR agli amici.",
    action: { label: "Installa l'app", to: "/installa" },
    status: "live",
  },
];

const CHECKED = "2026-10-17";

const SRC_NOIF_39: FaqSource = {
  label: "FIGC, NOIF art. 39 (testo aggiornato al C.U. 198/A del 27/04/2026)",
  url: "https://files.figc.it/view/acePublic/alias/contentid/1s5i1b2zydnpuhdxmyp/0/tit1_noif_art_da36a42_----------------aggiornato-al%20CU%20198A%20del%2027.04.2026.pdf",
  checkedAt: CHECKED,
};
const SRC_NOIF_61: FaqSource = {
  label: "FIGC, NOIF art. 61 (testo aggiornato al C.U. 209/A del 06/05/2026)",
  url: "https://files.figc.it/view/acePublic/alias/contentid/1qzg5l96u12qfpnd689/0/tit3_noif_art_da47a70_------------aggiornato-al_CU209A_del_06-05-2026.pdf",
  checkedAt: CHECKED,
};
const SRC_SGS_CU18: FaqSource = {
  label: "FIGC SGS, C.U. n. 18 dell'11/08/2026, Sistema di Qualità dei Club Giovanili 2026/27",
  url: "https://piemontevda.lnd.it/wp-content/uploads/2026/08/CU-18-SGS.pdf",
  checkedAt: CHECKED,
};
const SRC_SAFEGUARDING: FaqSource = {
  label: "FIGC, Regolamento per la prevenzione e il contrasto di abusi, violenze e discriminazioni, art. 10 (testo al 10/12/2024)",
  url: "https://www.figc.it/media/256277/regolamento-safeguarding-figc-aggiornato-al-10-dicembre-2024.pdf",
  checkedAt: CHECKED,
};
const SRC_CRL_CU9: FaqSource = {
  label: "LND Comitato Regionale Lombardia, C.U. n. 9 del 06/08/2026",
  url: "https://www.crlombardia.it/storage/uploads/files/33280/6a74a246bec99_Comunicato%20Ufficiale%20Nr.%209%20del%2006.08.2026.pdf",
  checkedAt: CHECKED,
};

const ASK = "chiedi alla Segreteria";

export const FAQ_ENTRIES: readonly FaqEntry[] = [
  // App e account
  {
    id: "app-serve-account",
    topic: "app",
    roles: ["tifosi", "famiglie"],
    q: "Serve un account per seguire le partite?",
    a: "No. Calendario, notizie, eventi e impianti sono aperti a tutti. L'account serve a famiglie, atleti e staff per le aree riservate.",
    action: { label: "Apri il calendario", to: "/calendario" },
    status: "verificato",
  },
  {
    id: "app-come-entro",
    topic: "app",
    roles: ["famiglie", "calciatori", "mister", "dirigenti"],
    q: "Come entro nell'app?",
    a: "Usa l'e-mail o il telefono che hai dato alla società e la tua password. Se non ti riconosce, registrati: la Segreteria controlla chi sei e ti attiva.",
    action: { label: "Entra o registrati", to: "/entra" },
    status: "verificato",
  },
  {
    id: "app-password",
    topic: "app",
    roles: ["famiglie", "calciatori", "mister", "dirigenti", "tifosi"],
    q: "Ho dimenticato la password.",
    a: "Chiedi una nuova password: ti arriva una e-mail con il pulsante per sceglierla. Aprila dallo stesso telefono.",
    action: { label: "Recupera la password", to: "/accedi/password" },
    status: "verificato",
  },
  {
    id: "app-installa",
    topic: "app",
    roles: ["famiglie", "calciatori", "mister", "dirigenti", "tifosi"],
    q: "Come metto l'app sul telefono?",
    a: "Su iPhone: Condividi, poi «Aggiungi alla schermata Home». Su Android: menu del browser, poi «Installa app». Si apre come un'app vera.",
    action: { label: "Installa l'app", to: "/installa" },
    status: "verificato",
  },
  {
    id: "app-dati-minori",
    topic: "app",
    roles: ["famiglie", "calciatori", "tifosi"],
    q: "Chi vede i dati di mio figlio?",
    a: "Solo la famiglia e lo staff autorizzato. In pubblico un minore compare con nome e iniziale del cognome, senza volto. Come trattiamo i dati è scritto nell'informativa.",
    action: { label: "Leggi l'informativa", to: "/privacy" },
    status: "verificato",
  },
  {
    id: "app-segnalazione",
    topic: "app",
    roles: ["famiglie", "calciatori", "mister", "dirigenti"],
    q: "Come segnalo un problema in modo riservato?",
    a: "Nella pagina Tutela dei minori trovi come fare una segnalazione riservata. Non scrivere dettagli nelle chat di squadra.",
    action: { label: "Tutela dei minori", to: "/safeguarding" },
    status: "verificato",
  },
  {
    id: "app-socio",
    topic: "app",
    roles: ["tifosi", "famiglie"],
    q: "Come divento socio o volontario?",
    a: "Compila il modulo di iscrizione: la Segreteria ti richiama per documenti e tesseramento. L'app non incassa nulla.",
    action: { label: "Iscriviti", to: "/entra" },
    status: "verificato",
  },
  {
    id: "app-biglietti",
    topic: "app",
    roles: ["tifosi"],
    q: "Quanto costa il biglietto?",
    a: "Le regole della biglietteria e le gratuità sono nella pagina Impianti. Per un caso particolare chiedi alla Segreteria.",
    action: { label: "Apri gli impianti", to: "/impianti" },
    status: "verificato",
  },

  // Squadre
  {
    id: "squadre-allenamenti",
    topic: "squadre",
    roles: ["famiglie", "calciatori"],
    q: "Dove vedo gli allenamenti della squadra?",
    a: "Nel quadro degli allenamenti, dopo l'accesso: giorno, ora e campo di ogni squadra della settimana.",
    action: { label: "Apri gli allenamenti", to: "/allenamenti" },
    status: "verificato",
  },
  {
    id: "squadre-convocazione",
    topic: "squadre",
    roles: ["famiglie", "calciatori", "mister"],
    q: "Posso rifiutare una convocazione?",
    a: "No. Nelle squadre agonistiche la convocazione è un impegno. Tocca «Presa visione»; se hai un impedimento vero, segnalalo prima della gara. Il mister riceve la segnalazione e decide.",
    action: { label: "Vai all'area Famiglia", to: "/famiglia" },
    status: "verificato",
  },
  {
    id: "squadre-salute",
    topic: "squadre",
    roles: ["famiglie", "calciatori"],
    q: "Mio figlio non sta bene: cosa scrivo?",
    a: "Segnala solo l'impedimento, senza dettagli sulla salute. Ne parli a voce con il mister o con la Segreteria.",
    action: { label: "Vai all'area Famiglia", to: "/famiglia" },
    status: "verificato",
  },

  // Pulmini
  {
    id: "pulmini-posto",
    topic: "pulmini",
    roles: ["famiglie"],
    q: "Come chiedo un posto sul pulmino?",
    a: "Dall'area Famiglia scegli la trasferta e chiedi il posto. L'ufficio conferma o ti risponde «non possibile» con il motivo. Il posto lo assegna chi organizza il viaggio.",
    action: { label: "Chiedi il pulmino", to: "/famiglia" },
    status: "verificato",
  },

  // Documenti
  {
    id: "documenti-regole",
    topic: "documenti",
    roles: ["famiglie", "calciatori", "tifosi"],
    q: "Dove trovo regolamento e codice di condotta?",
    a: "Nella pagina Società: regolamento, carta dei valori, codice di condotta, regole per trasferte e minori, privacy e liberatoria immagini.",
    action: { label: "Apri Società", to: "/societa" },
    status: "verificato",
  },
  {
    id: "documenti-certificato-scaduto",
    topic: "documenti",
    roles: ["famiglie", "calciatori"],
    q: "Il certificato medico è scaduto: cosa faccio?",
    a: "Senza certificato valido non si può essere convocati. Prenota la visita e porta il nuovo certificato in Segreteria. Lo stato lo vedi nell'area Famiglia.",
    action: { label: "Vai all'area Famiglia", to: "/famiglia" },
    status: "verificato",
  },

  // FIGC / LND / SGS
  {
    id: "figc-tesseramento-firme",
    topic: "figc",
    roles: ["famiglie", "calciatori", "dirigenti"],
    q: "Chi firma il tesseramento di un minore?",
    a: "Il legale rappresentante della società e il genitore che ha la responsabilità genitoriale. Se il ragazzo ha più di 13 anni, firma anche lui. La richiesta si deposita online.",
    source: SRC_NOIF_39,
    status: "verificato",
  },
  {
    id: "figc-tesseramento-quando",
    topic: "figc",
    roles: ["famiglie", "calciatori", "dirigenti"],
    q: "Da quando un nuovo tesserato può giocare?",
    a: "Nel calcio dilettantistico, dal giorno dopo il deposito online della richiesta. I calciatori si tesserano entro il 31 marzo; i giovani anche dopo.",
    source: SRC_NOIF_39,
    status: "verificato",
  },
  {
    id: "lnd-trasferimento",
    topic: "lnd",
    roles: ["famiglie", "calciatori", "dirigenti"],
    q: "Cambio società tra club dilettanti: da quando gioco?",
    a: "Il tesseramento con la nuova società decorre dal deposito online dell'accordo di trasferimento. Si gioca dal giorno dopo. Per la tua situazione chiedi alla Segreteria.",
    source: SRC_NOIF_39,
    status: "verificato",
  },
  {
    id: "lnd-prestiti",
    topic: "lnd",
    roles: ["famiglie", "calciatori", "dirigenti"],
    q: "Come funziona un prestito?",
    a: `Durata, firme e scadenze del prestito dipendono dalla categoria e dalla stagione. Non abbiamo ancora verificato la norma: ${ASK}.`,
    status: "da-confermare",
  },
  {
    id: "figc-vincolo-svincolo",
    topic: "figc",
    roles: ["famiglie", "calciatori", "dirigenti"],
    q: "Sono vincolato? Come chiedo lo svincolo?",
    a: `Vincolo e svincolo dipendono dall'età, dal tipo di tesseramento e dalla stagione. Non abbiamo ancora verificato la norma in vigore: ${ASK}.`,
    status: "da-confermare",
  },
  {
    id: "sgs-categorie-annate",
    topic: "sgs",
    roles: ["famiglie", "calciatori", "mister", "dirigenti"],
    q: "In che categoria gioca chi è nato nel mio anno?",
    a: "Stagione 2026/27: Piccoli Amici 2020-2021, Primi Calci 2018-2019, Pulcini 2016-2017, Esordienti 2014-2015, Giovanissimi 2012-2013, Allievi 2010-2011.",
    action: { label: "Le squadre del club", to: "/squadre" },
    source: SRC_SGS_CU18,
    status: "verificato",
  },
  {
    id: "sgs-certificato-tipo",
    topic: "sgs",
    roles: ["famiglie", "calciatori"],
    q: "Serve il certificato agonistico o non agonistico?",
    a: `Dipende dall'età e dalla categoria. Non abbiamo ancora verificato la regola di questa stagione: ${ASK}.`,
    status: "da-confermare",
  },
  {
    id: "lnd-assicurazione",
    topic: "lnd",
    roles: ["famiglie", "calciatori", "dirigenti"],
    q: "Il tesserato è assicurato? Cosa faccio dopo un infortunio?",
    a: `La copertura e la denuncia di un infortunio seguono le regole della polizza federale. Non le abbiamo ancora verificate: ${ASK}.`,
    status: "da-confermare",
  },
  {
    id: "figc-liste-gara",
    topic: "figc",
    roles: ["mister", "dirigenti"],
    q: "Cosa si consegna all'arbitro prima della gara?",
    a: "Il dirigente accompagnatore consegna tessere o tabulato, documenti d'identità e l'elenco di gara in due copie. Nell'elenco ci sono giocatori, capitano, vice e persone ammesse al recinto. Una copia va all'altra squadra.",
    action: { label: "Apri la scrivania", to: "/gestionale/mister" },
    source: SRC_NOIF_61,
    status: "verificato",
  },
  {
    id: "lnd-giustizia-sportiva",
    topic: "lnd",
    roles: ["mister", "dirigenti"],
    q: "Dove si leggono squalifiche e decisioni dei giudici?",
    a: "Per i campionati regionali, nei Comunicati Ufficiali del Comitato Regionale Lombardia LND, insieme alle decisioni del Giudice Sportivo Territoriale. Per un ricorso chiedi alla Segreteria.",
    source: SRC_CRL_CU9,
    status: "verificato",
  },
  {
    id: "tutela-modello-codice",
    topic: "tutela-minori",
    roles: ["famiglie", "mister", "dirigenti"],
    q: "Cosa deve avere il club per la tutela dei minori?",
    a: "Un Modello organizzativo e un Codice di condotta conformi alle Linee Guida FIGC. Serve anche un Responsabile contro abusi, violenze e discriminazioni. Modello e Codice si pubblicano sul sito e in bacheca.",
    action: { label: "Tutela dei minori", to: "/safeguarding" },
    source: SRC_SAFEGUARDING,
    status: "verificato",
  },
  {
    id: "sgs-delegato-tutela",
    topic: "sgs",
    roles: ["dirigenti", "mister"],
    q: "Serve un Delegato Tutela e Benessere dei Minori?",
    a: "Dal 3° livello del Sistema di Qualità SGS l'adesione al Programma Tutela e Benessere dei Minori è obbligatoria. Comprende la formazione dello staff e di un Delegato.",
    action: { label: "Apri l'organigramma", to: "/gestionale/organigramma" },
    source: SRC_SGS_CU18,
    status: "verificato",
  },
  {
    id: "tutela-scadenze-stagione",
    topic: "tutela-minori",
    roles: ["dirigenti"],
    q: "Quali sono le scadenze di questa stagione per Delegato e Modello?",
    a: `Non abbiamo ancora un documento ufficiale con le date di questa stagione: ${ASK}.`,
    status: "da-confermare",
  },
];

/** Cards of one role, in tour order. */
export function cardsFor(role: GuideRole): GuideCard[] {
  return GUIDE_CARDS.filter((c) => c.role === role);
}

export function isGuideRole(value: unknown): value is GuideRole {
  return typeof value === "string" && (GUIDE_ROLES as readonly string[]).includes(value);
}

export function isFederal(entry: FaqEntry): boolean {
  return FEDERAL_TOPICS.includes(entry.topic);
}

/** "2026-10-17" → "17/10/2026" for «Verificato il». */
export function itDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Lowercase, no accents: «città» matches «citta». */
function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Search FAQ by question and answer; every word of the query must match. Empty query → all entries. */
export function searchFaq(query: string, entries: readonly FaqEntry[] = FAQ_ENTRIES): FaqEntry[] {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [...entries];
  return entries.filter((e) => {
    const hay = fold(`${e.q} ${e.a} ${e.topic}`);
    return words.every((w) => hay.includes(w));
  });
}

/** Search the guide cards (for «Cerca nella guida»). */
export function searchCards(query: string, cards: readonly GuideCard[] = GUIDE_CARDS): GuideCard[] {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [...cards];
  return cards.filter((c) => {
    const hay = fold(`${c.title} ${c.body}`);
    return words.every((w) => hay.includes(w));
  });
}

/**
 * Portal → role of the first-access tour. Only the home of each portal opens the tour, so a deep page is never
 * covered. /la-mia-scd is the personal area of every member: the athlete tour opens there (INFERRED, to confirm with
 * the Direzione); /community is the supporters' door.
 */
const TOUR_PORTALS: ReadonlyArray<readonly [string, GuideRole]> = [
  ["/famiglia", "famiglie"],
  ["/la-mia-scd", "calciatori"],
  ["/gestionale/mister", "mister"],
  ["/direzione", "dirigenti"],
  ["/gestionale", "dirigenti"],
  ["/community", "tifosi"],
];

export function tourRoleForPath(pathname: string): GuideRole | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  for (const [path, role] of TOUR_PORTALS) if (p === path) return role;
  return null;
}

export function tourPortalPaths(): string[] {
  return TOUR_PORTALS.map(([p]) => p);
}

/** Every route the module points to (tested against the route tree). */
export function guideActionRoutes(): string[] {
  const all = [...GUIDE_CARDS.map((c) => c.action?.to), ...FAQ_ENTRIES.map((e) => e.action?.to)].filter(
    (x): x is string => typeof x === "string",
  );
  return [...new Set(all)];
}

/** Last card of the tour (not a GuideCard: it has no role and no route of its own). */
export const TOUR_END = {
  title: "Fatto",
  body: "Rivedi quando vuoi da Guida: trovi queste schede e le risposte alle domande più frequenti.",
} as const;
