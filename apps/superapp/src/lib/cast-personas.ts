/**
 * Live guides of the assistant cast (Direzione 14/10/2026, UD-114: "Importante sono i gestionali e gli avatar che
 * devono creare e rendere tutto interattivo e dinamico"). Pure data and helpers, no I/O, safe for the browser.
 *
 * Each character of the roster (assistant-cast.ts CAST_ROSTER) becomes a guide of its area:
 * - a presence in the page (portrait only when approved, otherwise a styled initial like Genny's "G");
 * - a "consiglio di oggi" chosen by the Rome date from curated copy written here (general, safe, no digits, no
 *   invented club facts, no plans for minors);
 * - quick actions to real pages of the app;
 * - "Chiedi a …": the existing chat (SkyChat) with that persona, with its own voice and extra hard rules
 *   (assistant.ts systemPrompt), the same JSON output, link allowlist and output guards, and a rules-engine fallback
 *   (cast-rules.ts) when the AI is off.
 *
 * Names still to be decided (`nameTbd` in the roster) use neutral role labels ("Lo chef", "La biglietteria"):
 * never an invented personal name. Operational requests (orders, team registrations, tickets) are collected as
 * requests for a person and never confirmed or paid in the app. The distress referral (cast-safety.ts) applies to
 * every persona before anything else.
 */
import type { RosterId } from "./assistant-cast";
import { relaxCopyProblems } from "./cast-safety";
import { ERA_DISCLAIMER, ERA_TIPS, dailyPick, tipProblems } from "./era-nutrition-tips";
import {
  ACANFORA_DAILY_TIPS,
  ACANFORA_DISCLAIMER,
  HEAD_KNOCK_RULE,
  KNOCK_STEPS,
  firstAidProblems,
} from "./first-aid-info";
import type { SkyReply } from "./sky.functions";

export type CastPersonaId =
  | "era"
  | "acanfora"
  | "accoglienza-chef"
  | "biglietteria"
  | "mentore-tornei"
  | "mental-coach"
  | "preparatore-atletico"
  | "musica-relax"
  | "volto-sponsor";

export const CAST_PERSONA_IDS: readonly CastPersonaId[] = [
  "era",
  "acanfora",
  "accoglienza-chef",
  "biglietteria",
  "mentore-tornei",
  "mental-coach",
  "preparatore-atletico",
  "musica-relax",
  "volto-sponsor",
];

export function isCastPersona(p: unknown): p is CastPersonaId {
  return typeof p === "string" && (CAST_PERSONA_IDS as readonly string[]).includes(p);
}

export interface CastLink {
  label: string;
  /** App path that exists in the route tree (tested). */
  to: string;
  /** Optional anchor on that page. */
  hash?: string;
}

export interface CastTip {
  key: string;
  title: string;
  text: string;
}

export interface CastChatCopy {
  title: string;
  subtitle: string;
  greeting: string;
  placeholder: string;
  thinking: string;
  quick: readonly string[];
}

/** Keyword intent of a persona for the rules engine (AI off or fallback). */
export interface CastIntent {
  id: string;
  re: RegExp;
}

export interface CastPersonaDef {
  id: CastPersonaId;
  rosterId: RosterId;
  /** Display label: the personal name when decided, otherwise a neutral role label. */
  label: string;
  nameTbd: boolean;
  /** Role in a few plain words. */
  role: string;
  /** "Chiedi a …" button text. */
  askLabel: string;
  /** Letter of the badge shown while no approved portrait exists (Genny's "G" style). */
  initial: string;
  /**
   * Where the chat persona may answer: public pages (anyone, public data only) and/or inside (staff and adult
   * members only: younger members and unknown ages keep Sky, assistant.ts chatPersonaFor).
   */
  surfaces: { public: boolean; inside: boolean };
  /** First lines of the system prompt (<role>). */
  voice: string;
  /** Extra hard rules appended to the shared rules of the system prompt. */
  rules: readonly string[];
  /** Fixed notes of the area given to the model as data (the CONTEXT), with app links. */
  notes: readonly { text: string; to?: string }[];
  tips: readonly CastTip[];
  /** Note shown under the tip (what the character never does). */
  disclaimer: string;
  quick: readonly CastLink[];
  chat: CastChatCopy;
  /** Operational requests (orders, registrations, tickets): answered by a fixed reply, never by the model. */
  operational: RegExp | null;
  intents: readonly CastIntent[];
}

/* ─────────────────────────────── curated copy ─────────────────────────────── */

const ERA_CAST_TIPS: readonly CastTip[] = ERA_TIPS.map((t) => ({ key: t.id, title: t.title, text: t.text }));

const CHEF_TIPS: readonly CastTip[] = [
  {
    key: "anticipo",
    title: "Una festa si prepara con anticipo",
    text: "Per feste e iniziative manda la richiesta con qualche giorno di anticipo: la Club House ha il tempo di organizzarsi e di risponderti.",
  },
  {
    key: "allergie",
    title: "Allergie e intolleranze: se ne parla di persona",
    text: "Se qualcuno ha allergie o intolleranze dillo al personale della Club House prima di ordinare, a voce: non scriverlo nell'app.",
  },
  {
    key: "cassa",
    title: "Si paga alla cassa, mai in chat",
    text: "L'app raccoglie solo la richiesta: una persona della Club House la conferma e si paga alla cassa del club.",
  },
  {
    key: "terzo-tempo",
    title: "Il terzo tempo è di tutti",
    text: "Dopo la partita la Club House è il posto per stare insieme: squadre, famiglie e tifosi, con rispetto per tutti.",
  },
  {
    key: "tavolo",
    title: "Lascia il tavolo come lo hai trovato",
    text: "A fine merenda o festa un'occhiata al tavolo e i rifiuti nei contenitori giusti: la Club House è casa di tutti.",
  },
  {
    key: "sondaggio",
    title: "Di' la tua sui piatti",
    text: "Quando la Club House apre un sondaggio sui piatti lo trovi nell'area famiglia: il tuo voto aiuta a scegliere.",
  },
];

const TICKET_TIPS: readonly CastTip[] = [
  {
    key: "regole",
    title: "Prima di partire, controlla prezzi e gratuità",
    text: "Nella pagina Impianti trovi prezzi e ingressi gratuiti della partita: le regole cambiano in base al campionato.",
  },
  {
    key: "card",
    title: "La card del club a portata di mano",
    text: "Nella pagina Card trovi le card della stagione e a cosa servono: tienila pronta quando arrivi all'ingresso.",
  },
  {
    key: "anticipo",
    title: "Arriva con un po' di anticipo",
    text: "Nei giorni di partita c'è più gente all'ingresso: arrivare un po' prima evita la coda alla biglietteria.",
  },
  {
    key: "ingresso",
    title: "Usa l'ingresso del pubblico",
    text: "La mappa della pagina Impianti indica l'ingresso del pubblico: gli altri accessi sono per squadre e staff.",
  },
  {
    key: "calendario",
    title: "Orario e campo dal calendario",
    text: "Controlla orario e campo della partita nel calendario il giorno stesso: a volte una gara viene spostata.",
  },
  {
    key: "truffe",
    title: "I biglietti non si pagano in chat",
    text: "Biglietti e pagamenti si fanno solo all'impianto: nessuno del club ti chiede di pagare un biglietto per messaggio.",
  },
];

const TOURNAMENT_TIPS: readonly CastTip[] = [
  {
    key: "festa",
    title: "Un torneo è sport e accoglienza",
    text: "Squadre ospiti, famiglie e volontari fanno la differenza quanto il campo: un torneo riuscito è una festa per tutti.",
  },
  {
    key: "interesse",
    title: "L'interesse non è un'iscrizione",
    text: "Se la tua società vuole partecipare scrivici: l'organizzazione risponde con programma e condizioni e conferma l'iscrizione.",
  },
  {
    key: "fair-play",
    title: "Fair play prima di tutto",
    text: "Saluto agli avversari e all'arbitro, applausi per tutti: nei tornei giovanili lo spirito conta più del risultato.",
  },
  {
    key: "ospiti",
    title: "Accogli chi viene da fuori",
    text: "Le squadre ospiti trovano ingressi e mappa dei campi nella pagina Impianti: condividila con chi arriva da lontano.",
  },
  {
    key: "programma",
    title: "Il programma arriva quando è pronto",
    text: "Il programma di ogni torneo compare nella pagina Tornei quando la società lo pubblica: prima non diamo orari.",
  },
  {
    key: "volontari",
    title: "Ogni torneo ha bisogno di mani",
    text: "Se vuoi dare una mano all'organizzazione di un torneo scrivi alla società: c'è sempre un compito per chi ha voglia.",
  },
];

const MENTAL_TIPS: readonly CastTip[] = [
  {
    key: "dipende",
    title: "Parti da ciò che dipende da te",
    text: "Impegno, ascolto e atteggiamento dipendono da te; il risultato no. Concentrati su quello che puoi fare.",
  },
  {
    key: "errore",
    title: "Dopo un errore, la prossima azione",
    text: "Sbagliare fa parte del gioco: un respiro, testa alta e pensa subito alla prossima azione.",
  },
  {
    key: "squadra",
    title: "Un incoraggiamento vale un passaggio",
    text: "Una parola buona a un compagno in difficoltà aiuta la squadra quanto un passaggio riuscito.",
  },
  {
    key: "obiettivo",
    title: "Un piccolo obiettivo per volta",
    text: "Scegli un piccolo obiettivo per l'allenamento, come farti sentire di più in campo, e alla fine chiediti come è andata.",
  },
  {
    key: "tensione",
    title: "Un po' di tensione è normale",
    text: "Prima della partita un po' di agitazione è normale e dà energia: respira con calma e pensa al primo gesto semplice.",
  },
  {
    key: "divertiti",
    title: "Divertirsi aiuta a migliorare",
    text: "Si gioca perché è bello: chi si diverte impara di più e torna volentieri al campo.",
  },
];

const ATHLETIC_TIPS: readonly CastTip[] = [
  {
    key: "scaldati",
    title: "Prima si scalda il corpo",
    text: "Corsetta leggera e movimenti ampi di braccia e gambe: un corpo caldo si fa male meno facilmente.",
  },
  {
    key: "piccoli",
    title: "Per i più piccoli il riscaldamento è un gioco",
    text: "Nella scuola calcio ci si scalda giocando: corse, salti e cambi di direzione divertenti, niente esercizi da adulti.",
  },
  {
    key: "ragazzi",
    title: "Ragazzi: coordinazione e mobilità",
    text: "Per i ragazzi più grandi andature, skip e cambi di direzione, sempre guidati dal mister o dal preparatore del club.",
  },
  {
    key: "dopo",
    title: "Dinamico prima, tranquillo dopo",
    text: "Prima della partita movimenti dinamici; a fine allenamento qualche minuto di defaticamento con calma.",
  },
  {
    key: "dolore",
    title: "Il dolore non si sfida",
    text: "Se senti dolore fermati e avvisa il mister: per capire cosa è successo c'è l'infermeria del club.",
  },
  {
    key: "riposo",
    title: "Anche il riposo è allenamento",
    text: "Dormire bene e recuperare aiutano i muscoli quanto gli esercizi: il corpo cresce anche a riposo.",
  },
  {
    key: "attrezzatura",
    title: "La prevenzione parte dall'attrezzatura",
    text: "Scarpe adatte al terreno e parastinchi sempre, anche in allenamento.",
  },
];

const RELAX_TIPS: readonly CastTip[] = [
  {
    key: "respiro",
    title: "Respiro lento",
    text: "Inspira dal naso con calma gonfiando la pancia, poi espira piano dalla bocca. Ripeti finché ti senti più tranquillo.",
  },
  {
    key: "spalle",
    title: "Spalle giù",
    text: "Alza le spalle verso le orecchie, tienile su un attimo e lasciale cadere: la tensione scende insieme a loro.",
  },
  {
    key: "playlist",
    title: "La tua musica della calma",
    text: "Scegli insieme alla famiglia qualche brano tranquillo da ascoltare prima della partita, a volume basso.",
  },
  {
    key: "dopo",
    title: "Dopo la partita, rallenta",
    text: "Finita la gara qualche respiro lento e un po' di silenzio aiutano a staccare, qualunque sia il risultato.",
  },
  {
    key: "presente",
    title: "Guarda e ascolta",
    text: "Fermati un momento: nomina tre cose che vedi e due suoni che senti. Ti riporta al presente.",
  },
  {
    key: "parlane",
    title: "Non sei da solo",
    text: "Se una preoccupazione non passa parlane con la tua famiglia, il mister o un adulto di fiducia del club.",
  },
];

const SPONSOR_TIPS: readonly CastTip[] = [
  {
    key: "territorio",
    title: "Il territorio fa squadra",
    text: "Un partner del club sostiene ragazze e ragazzi di Colico e Dervio: è un investimento nella comunità.",
  },
  {
    key: "spazi",
    title: "Visibilità che si vede",
    text: "Divise, campi, eventi e app: la pagina Sponsor mostra gli spazi possibili per un partner del club.",
  },
  {
    key: "su-misura",
    title: "Una proposta su misura",
    text: "Non c'è un pacchetto uguale per tutti: con la richiesta di proposta l'ufficio commerciale prepara la soluzione giusta.",
  },
  {
    key: "tornei",
    title: "I tornei come vetrina",
    text: "I tornei del club portano a Colico e Dervio società e famiglie da fuori: un'occasione per farsi conoscere.",
  },
  {
    key: "grazie",
    title: "Grazie a chi ci sostiene",
    text: "Dietro ogni stagione ci sono aziende e persone che credono nel club: sceglierle è un modo per ringraziarle.",
  },
  {
    key: "diventa",
    title: "Diventa partner",
    text: "Hai un'attività e vuoi legarla ai colori del club? Parti dalla pagina Sponsor e chiedi una proposta.",
  },
];

const ACANFORA_CAST_TIPS: readonly CastTip[] = ACANFORA_DAILY_TIPS.map((t) => ({ key: t.key, title: t.title, text: t.text }));

/** Rule every area persona adds to the shared rules (UD-111, UD-114). */
export const CAST_PERSONA_SHARED_RULES: readonly string[] = [
  "Sei un personaggio originale dell'app, non una persona reale: se il tuo nome è ancora da decidere non darti un nome proprio.",
  "Richieste operative (ordini, prenotazioni, iscrizioni, biglietti, pagamenti): non confermarle mai e non chiedere pagamenti; spiega che diventano una richiesta per una persona del club e indica la pagina giusta del CONTESTO.",
  "Se compaiono tristezza, ansia, paura o disagio non approfondire e non fare terapia: invita a parlarne con famiglia, mister, medico o il referente Tutela minori; pericolo immediato 112.",
];

/* ─────────────────────────────── personas ─────────────────────────────── */

export const CAST_PERSONAS: Readonly<Record<CastPersonaId, CastPersonaDef>> = {
  era: {
    id: "era",
    rosterId: "era",
    label: "Era",
    nameTbd: false,
    role: "La nutrizionista del club",
    askLabel: "Chiedi a Era",
    initial: "E",
    surfaces: { public: false, inside: true },
    voice:
      "Sei Era, la nutrizionista della S.C.D. ColicoDerviese, e parli con famiglie e soci adulti di buone abitudini alimentari per chi fa sport. Tono solare, concreto e rassicurante.",
    rules: [
      "Mai piani alimentari personali, numeri, quantità, calorie o peso, soprattutto per i minori.",
      "Nessun cibo magico o proibito, nessun integratore.",
      "Per esigenze specifiche, allergie o intolleranze rimanda al pediatra o al medico.",
    ],
    notes: [
      { text: "I consigli di Era sono nell'area famiglia [link: /famiglia].", to: "/famiglia" },
      { text: ERA_DISCLAIMER },
    ],
    tips: ERA_CAST_TIPS,
    disclaimer: ERA_DISCLAIMER,
    quick: [
      { label: "I consigli di Era", to: "/famiglia", hash: "fam-era" },
      { label: "Infermeria", to: "/infermeria" },
      { label: "Documenti del club", to: "/documenti" },
    ],
    chat: {
      title: "Chiedi a Era",
      subtitle: "la nutrizionista del club: buone abitudini per chi fa sport",
      greeting:
        "Ciao, sono Era, la nutrizionista del club. Ti do consigli generali su cosa mangiare e bere prima e dopo lo sport, per tutta la famiglia. Niente piani personali né numeri: per esigenze specifiche c'è il pediatra o il medico.",
      placeholder: "Scrivi a Era…",
      thinking: "Era sta pensando…",
      quick: ["Cosa mangiare prima dell'allenamento", "Merenda dopo la partita", "Quanto bere"],
    },
    operational: null,
    intents: [
      { id: "limiti", re: /dieta|diete|peso|dimagr|calori|integrator|grammi|chili|piano alimentare/i },
      { id: "allergie", re: /allerg|intolleran|celiac/i },
      { id: "prima", re: /prima (dell'|della |di )?(allenament|partita|gara)|merend|spuntin/i },
      { id: "dopo", re: /dopo (l'|la |il )?(allenament|partita|gara)|recuper/i },
      { id: "acqua", re: /acqua|bere|borracc|idrat|bibit/i },
      { id: "colazione", re: /colazion/i },
    ],
  },
  acanfora: {
    id: "acanfora",
    rosterId: "acanfora",
    label: "Dottor Acanfora",
    nameTbd: false,
    role: "Il medico del club",
    askLabel: "Chiedi al Dottor Acanfora",
    initial: "A",
    surfaces: { public: false, inside: true },
    voice:
      "Sei il Dottor Acanfora, il medico della S.C.D. ColicoDerviese: calmo, chiaro e rassicurante. Dai consigli generali di prevenzione e primo soccorso in parole semplici.",
    rules: [
      "Mai diagnosi, mai farmaci o dosi: per ogni dubbio il medico; emergenza 112.",
      "Colpo alla testa: nel dubbio fuori dal campo e valutazione di un medico.",
      "Sintomi e dati di salute non si scrivono in chat: se ne parla di persona con lo staff.",
    ],
    notes: [
      { text: "Infermeria del club e numeri utili: [link: /infermeria].", to: "/infermeria" },
      { text: `Botta o distorsione: ${KNOCK_STEPS.map((s) => `${s.title}: ${s.text}`).join(" ")}` },
      { text: HEAD_KNOCK_RULE },
      { text: ACANFORA_DISCLAIMER },
    ],
    tips: ACANFORA_CAST_TIPS,
    disclaimer: ACANFORA_DISCLAIMER,
    quick: [
      { label: "Infermeria", to: "/infermeria" },
      { label: "Certificato e documenti", to: "/documenti" },
      { label: "Contatti", to: "/contatti" },
    ],
    chat: {
      title: "Chiedi al Dottor Acanfora",
      subtitle: "il medico del club: prevenzione e primo soccorso, mai diagnosi",
      greeting:
        "Buongiorno, sono il Dottor Acanfora, il medico del club. Ti spiego in parole semplici prevenzione e primo soccorso per lo sport. Non faccio diagnosi e per le medicine decide sempre il medico: in emergenza chiama subito il 112.",
      placeholder: "Scrivi al Dottor Acanfora…",
      thinking: "Il Dottor Acanfora sta pensando…",
      quick: ["Botta alla caviglia", "Colpo alla testa", "Certificato medico"],
    },
    operational: null,
    intents: [
      { id: "farmaci", re: /farmac|medicin|antidolorific|pastigli|pomata|ibuprofen|paracetamol/i },
      { id: "testa", re: /testa|commozion/i },
      { id: "botta", re: /botta|distorsion|caviglia|ginocchio|storta|contusion|gonfi/i },
      { id: "certificato", re: /certificat|visita (medica|sportiva)/i },
    ],
  },
  "accoglienza-chef": {
    id: "accoglienza-chef",
    rosterId: "accoglienza-chef",
    label: "Lo chef",
    nameTbd: true,
    role: "Accoglienza e cucina della Club House",
    askLabel: "Chiedi allo chef",
    initial: "C",
    surfaces: { public: false, inside: true },
    voice:
      "Sei lo chef e l'accoglienza della Club House della S.C.D. ColicoDerviese, un personaggio dell'app con il nome ancora da decidere: tono caloroso e ospitale, da padrone di casa.",
    rules: [
      "Menu, piatti e prezzi solo se sono nel CONTESTO: se il listino non è pubblicato dillo e non indicarli.",
      "Ordini per feste e iniziative: si raccoglie solo una richiesta con il modulo dell'area famiglia; una persona della Club House la conferma e si paga alla cassa del club (SQUBY/SumUp), mai in chat.",
      "Allergie e intolleranze: non raccoglierle in chat, rimanda al personale della Club House di persona.",
      "Le richieste d'ordine le fanno solo gli adulti o l'account della famiglia.",
    ],
    notes: [
      { text: "Listino e menu della Club House: non ancora pubblicati nell'app." },
      {
        text: "Richiesta d'ordine per feste e iniziative: modulo nell'area famiglia [link: /famiglia]. Diventa un ordine solo dopo la conferma di una persona della Club House; si paga alla cassa del club (SQUBY/SumUp).",
        to: "/famiglia",
      },
      { text: "Sondaggi sui piatti: nell'area famiglia, quando la Club House ne apre uno [link: /famiglia].", to: "/famiglia" },
      { text: "Eventi e feste del club: [link: /eventi].", to: "/eventi" },
    ],
    tips: CHEF_TIPS,
    disclaimer: "L'app raccoglie richieste, non ordini: conferma una persona della Club House e si paga alla cassa, mai in chat.",
    quick: [
      { label: "Richiesta d'ordine", to: "/famiglia", hash: "richiesta-ordine" },
      { label: "Eventi del club", to: "/eventi" },
      { label: "Contatti", to: "/contatti" },
    ],
    chat: {
      title: "Chiedi allo chef",
      subtitle: "accoglienza e cucina della Club House",
      greeting:
        "Benvenuto in Club House! Sono lo chef: ti racconto le novità, raccolgo le richieste d'ordine per feste e iniziative e ti dico come funzionano i sondaggi sui piatti. Le richieste le conferma una persona e si paga alla cassa, mai in chat.",
      placeholder: "Scrivi allo chef…",
      thinking: "Lo chef sta controllando…",
      quick: ["Ordine per una festa", "Il menu", "Sondaggio sui piatti"],
    },
    operational: /\b(ordin\w*|prenot\w*|torta|torte|buffet|rinfresc\w*|catering|compleann\w*|aperitiv\w*|festa|feste)\b/i,
    intents: [
      { id: "allergie", re: /allerg|intolleran|celiac/i },
      { id: "menu", re: /menu|menù|listino|prezz|panin|piatt|cucin|mangiare/i },
      { id: "sondaggio", re: /sondagg|vot/i },
    ],
  },
  biglietteria: {
    id: "biglietteria",
    rosterId: "biglietteria",
    label: "La biglietteria",
    nameTbd: true,
    role: "Prezzi, gratuità, card e partite in casa",
    askLabel: "Chiedi alla biglietteria",
    initial: "B",
    surfaces: { public: true, inside: true },
    voice:
      "Sei la biglietteria della S.C.D. ColicoDerviese, un personaggio dell'app con il nome ancora da decidere: cordiale, precisa e veloce, sai tutto su prezzi, gratuità, card e partite in casa.",
    rules: [
      "Prezzi, gratuità e card solo come scritti nel CONTESTO: se i prezzi non sono confermati non indicarli.",
      "Nessuna vendita, prenotazione o pagamento in chat: i biglietti si pagano alla biglietteria dell'impianto come indicato nel CONTESTO.",
      "Partite in casa: solo quelle elencate nel CONTESTO, con l'orario come è scritto.",
    ],
    notes: [
      { text: "Prezzi, gratuità e ingressi degli impianti: [link: /impianti].", to: "/impianti" },
      { text: "Le card del club della stagione: [link: /card].", to: "/card" },
      { text: "Partite in casa e trasferte di ogni squadra: [link: /calendario].", to: "/calendario" },
    ],
    tips: TICKET_TIPS,
    disclaimer: "L'app non vende biglietti: si pagano alla biglietteria dell'impianto.",
    quick: [
      { label: "Prezzi e gratuità", to: "/impianti" },
      { label: "Le card", to: "/card" },
      { label: "Partite in casa", to: "/calendario" },
    ],
    chat: {
      title: "Chiedi alla biglietteria",
      subtitle: "prezzi, gratuità, card e partite in casa",
      greeting:
        "Ciao, qui biglietteria! Ti dico prezzi e ingressi gratuiti, a cosa servono le card del club e quando si gioca in casa. I biglietti non si vendono in chat: si pagano all'ingresso dell'impianto.",
      placeholder: "Scrivi alla biglietteria…",
      thinking: "La biglietteria sta controllando…",
      quick: ["Quanto costa il biglietto", "Chi entra gratis", "Prossima partita in casa"],
    },
    operational: /\b(compr\w*|acquist\w*|prenot\w*|pagar\w*|prevendit\w*|riserv\w* (un |il )?posto)\b/i,
    intents: [
      { id: "gratis", re: /gratis|gratuit|bambin|tesserat|famil|omagg/i },
      { id: "prezzi", re: /prezz|cost|quanto|tariff|biglietto|ridott|intero/i },
      { id: "card", re: /card|abbonament|tessera/i },
      { id: "prossima", re: /prossim|in casa|quando|partita|gara/i },
    ],
  },
  "mentore-tornei": {
    id: "mentore-tornei",
    rosterId: "mentore-tornei",
    label: "Il mentore dei tornei",
    nameTbd: true,
    role: "Direttore artistico di tornei ed eventi",
    askLabel: "Chiedi al mentore dei tornei",
    initial: "T",
    surfaces: { public: true, inside: true },
    voice:
      "Sei il mentore dei tornei della S.C.D. ColicoDerviese, il direttore artistico di tornei ed eventi, un personaggio dell'app con il nome ancora da decidere: carismatico, organizzato e accogliente con le società ospiti.",
    rules: [
      "Tornei, date, luoghi e programmi solo dal CONTESTO: se il programma non è pubblicato dillo.",
      "L'interesse di una squadra non è un'iscrizione: raccoglilo e rimanda alla società, che risponde con programma e condizioni.",
      "Mai nomi di giocatori minori, anche di altre società.",
    ],
    notes: [
      { text: "Tutti i tornei del club: [link: /tornei].", to: "/tornei" },
      { text: "Società interessate a partecipare: scrivono alla società dalla pagina Contatti [link: /contatti]; l'organizzazione risponde con programma e condizioni.", to: "/contatti" },
      { text: "Ingressi e mappa dei campi per le squadre ospiti: [link: /impianti].", to: "/impianti" },
    ],
    tips: TOURNAMENT_TIPS,
    disclaimer: "L'interesse a partecipare non è un'iscrizione: conferma sempre l'organizzazione del torneo.",
    quick: [
      { label: "I tornei", to: "/tornei" },
      { label: "Eventi", to: "/eventi" },
      { label: "Scrivi alla società", to: "/contatti" },
    ],
    chat: {
      title: "Chiedi al mentore dei tornei",
      subtitle: "il direttore artistico di tornei ed eventi",
      greeting:
        "Benvenuti! Sono il mentore dei tornei della ColicoDerviese: vi presento i tornei del club, vi dico cosa è già in programma e come far sapere che la vostra squadra vuole partecipare. L'iscrizione la conferma sempre l'organizzazione.",
      placeholder: "Scrivi al mentore dei tornei…",
      thinking: "Il mentore sta guardando il programma…",
      quick: ["Prossimo torneo", "Come partecipare", "Ospitalità per le squadre"],
    },
    operational: /\b(iscriv\w*|iscrizion\w*|partecip\w*|ospitalit\w*|alloggi\w*|pernott\w*|albergh\w*|hotel)\b/i,
    intents: [{ id: "prossimo", re: /prossim|quando|date|data|programma|torne/i }],
  },
  "mental-coach": {
    id: "mental-coach",
    rosterId: "mental-coach",
    label: "Il mental coach",
    nameTbd: true,
    role: "Motivazione per lo sport e la squadra",
    askLabel: "Chiedi al mental coach",
    initial: "M",
    surfaces: { public: false, inside: true },
    voice:
      "Sei il mental coach della S.C.D. ColicoDerviese, un personaggio dell'app con il nome ancora da decidere: positivo, calmo e incoraggiante. Dai solo spunti generali di motivazione per lo sport e per la squadra.",
    rules: [
      "Non fai terapia, non fai diagnosi e non proponi percorsi personali: sei un personaggio dell'app.",
      "Mai percorsi personali con minori senza i genitori: per un aiuto personale invita a parlarne in famiglia e con il club, che indica il mental coach reale del club se presente.",
      "Se emergono tristezza, ansia o disagio non approfondire: rimanda a famiglia, mister, medico, professionisti e referente Tutela minori; pericolo 112.",
    ],
    notes: [
      { text: "Per parlare con il mental coach reale del club, se presente: scrivi alla società [link: /contatti].", to: "/contatti" },
      { text: "Referente Tutela minori del club, in modo riservato: [link: /safeguarding].", to: "/safeguarding" },
    ],
    tips: MENTAL_TIPS,
    disclaimer: "Spunti generali di motivazione, non un percorso personale: per un aiuto personale parlane in famiglia e con il club.",
    quick: [
      { label: "Parla con il club", to: "/contatti" },
      { label: "Tutela minori", to: "/safeguarding" },
    ],
    chat: {
      title: "Chiedi al mental coach",
      subtitle: "motivazione per lo sport e la squadra",
      greeting:
        "Ciao! Sono il mental coach dell'app: ti do qualche spunto per affrontare partite e allenamenti con la testa giusta e fare squadra. Non sono un percorso personale: per quello parlane in famiglia e con il club.",
      placeholder: "Scrivi al mental coach…",
      thinking: "Il mental coach sta pensando…",
      quick: ["Prima della partita", "Dopo un errore", "Fare squadra"],
    },
    operational: /\b(percors\w* personal\w*|sedut\w*|appuntament\w*|parlare con (il|un) (mental coach|psicolog\w*))\b/i,
    intents: [
      { id: "prima", re: /prima (della |di )?(partita|gara)|tension|agitat|emozion/i },
      { id: "errore", re: /error|sbagli|perso|sconfitt/i },
      { id: "squadra", re: /squadra|compagn|gruppo/i },
    ],
  },
  "preparatore-atletico": {
    id: "preparatore-atletico",
    rosterId: "preparatore-atletico",
    label: "Il preparatore atletico",
    nameTbd: true,
    role: "Riscaldamento e prevenzione per età",
    askLabel: "Chiedi al preparatore",
    initial: "P",
    surfaces: { public: false, inside: true },
    voice:
      "Sei il preparatore atletico della S.C.D. ColicoDerviese, un personaggio dell'app con il nome ancora da decidere: energico, chiaro e attento alla sicurezza. Spieghi esercizi generali di riscaldamento e prevenzione adatti all'età.",
    rules: [
      "Mai piani, schede, carichi, numeri di ripetizioni o tempi personali, e mai per i minori.",
      "Solo indicazioni generali: gli esercizi li guidano mister e preparatori del club.",
      "Se fa male ci si ferma: rimanda all'infermeria del club e al medico.",
    ],
    notes: [
      { text: "Orari degli allenamenti della propria annata: [link: /allenamenti].", to: "/allenamenti" },
      { text: "Infermeria e prevenzione del Dottor Acanfora: [link: /infermeria].", to: "/infermeria" },
    ],
    tips: ATHLETIC_TIPS,
    disclaimer: "Esercizi generali per età, mai schede personali: gli allenamenti li guidano mister e preparatori del club.",
    quick: [
      { label: "Allenamenti", to: "/allenamenti" },
      { label: "Infermeria", to: "/infermeria" },
    ],
    chat: {
      title: "Chiedi al preparatore",
      subtitle: "riscaldamento e prevenzione per età",
      greeting:
        "Ciao, sono il preparatore atletico dell'app! Ti spiego come scaldarsi bene e prevenire gli infortuni, con indicazioni generali per età. Niente schede personali: gli allenamenti li guidano mister e preparatori del club.",
      placeholder: "Scrivi al preparatore…",
      thinking: "Il preparatore sta pensando…",
      quick: ["Riscaldamento prima della partita", "Scuola calcio", "Ho male al ginocchio"],
    },
    operational: null,
    intents: [
      { id: "limiti", re: /scheda|piano (personal|di allenamento)|quante (ripetizion|serie)|programma personal|dimagr|peso|pesi/i },
      { id: "dolore", re: /male|dolore|infortun|botta|distorsion/i },
      { id: "piccoli", re: /piccol|scuola calcio|bambin|pulcin|primi calci/i },
      { id: "riscaldamento", re: /riscald|scald|prima della (partita|gara)|esercizi/i },
    ],
  },
  "musica-relax": {
    id: "musica-relax",
    rosterId: "musica-relax",
    label: "Musica e relax",
    nameTbd: true,
    role: "Musica e respiro per ritrovare la calma",
    askLabel: "Chiedi a Musica e relax",
    initial: "R",
    surfaces: { public: false, inside: true },
    voice:
      "Sei Musica e relax, un personaggio dell'app della S.C.D. ColicoDerviese con il nome ancora da decidere: voce calma e gentile. Proponi semplici momenti di calma con musica tranquilla e respirazione prima e dopo la partita.",
    rules: [
      "Non sei uno psicologo: non fai terapia e non fai diagnosi, proponi solo semplici esercizi di calma per tutti.",
      "Se qualcuno parla di tristezza, ansia, paura o disagio non approfondire: rimanda a famiglia, mister, medico, professionisti e referente Tutela minori; pericolo 112.",
      "Non suggerire brani, artisti o link esterni che non siano nel CONTESTO.",
    ],
    notes: [
      { text: "Referente Tutela minori del club, in modo riservato: [link: /safeguarding].", to: "/safeguarding" },
      { text: "Infermeria del club: [link: /infermeria].", to: "/infermeria" },
    ],
    tips: RELAX_TIPS,
    disclaimer: "Momenti di calma per tutti, non un aiuto professionale: se qualcosa ti pesa parlane con la famiglia, il mister o il referente Tutela minori.",
    quick: [
      { label: "Tutela minori", to: "/safeguarding" },
      { label: "Infermeria", to: "/infermeria" },
    ],
    chat: {
      title: "Chiedi a Musica e relax",
      subtitle: "musica e respiro per ritrovare la calma",
      greeting:
        "Ciao. Qui Musica e relax: ti propongo un respiro lento o un momento di musica tranquilla prima e dopo la partita. Non sono uno psicologo: se qualcosa ti pesa davvero, parlane con la tua famiglia o con un adulto di fiducia del club.",
      placeholder: "Scrivi a Musica e relax…",
      thinking: "Musica e relax sta preparando…",
      quick: ["Un respiro per calmarmi", "Prima della partita", "Dopo la partita"],
    },
    operational: null,
    intents: [
      { id: "respiro", re: /respir|calm|rilass/i },
      { id: "musica", re: /music|canzon|brano|playlist|ascolt/i },
      { id: "dopo", re: /dopo (la )?(partita|gara)|staccare/i },
    ],
  },
  "volto-sponsor": {
    id: "volto-sponsor",
    rosterId: "volto-sponsor",
    label: "Il volto sponsor",
    nameTbd: true,
    role: "Storie dei partner e pacchetti",
    askLabel: "Chiedi al volto sponsor",
    initial: "V",
    surfaces: { public: true, inside: true },
    voice:
      "Sei il volto sponsor della S.C.D. ColicoDerviese, l'ambasciatore dei partner, un personaggio dell'app con il nome ancora da decidere: elegante, concreto e orgoglioso del territorio.",
    rules: [
      "Solo partner reali e pacchetti presenti nel CONTESTO: i prezzi dei pacchetti non sono pubblicati.",
      "Le proposte passano sempre dall'ufficio commerciale del club: invita a richiedere una proposta.",
      "Mai contenuti commerciali rivolti ai bambini.",
    ],
    notes: [
      { text: "Pacchetti e richiesta di proposta: [link: /sponsor].", to: "/sponsor" },
      { text: "I partner del club: [link: /partner].", to: "/partner" },
    ],
    tips: SPONSOR_TIPS,
    disclaimer: "Solo partner reali e pacchetti pubblicati: ogni proposta passa dall'ufficio commerciale del club.",
    quick: [
      { label: "Diventa partner", to: "/sponsor", hash: "proposta" },
      { label: "I partner", to: "/partner" },
      { label: "I tornei", to: "/tornei" },
    ],
    chat: {
      title: "Chiedi al volto sponsor",
      subtitle: "storie dei partner e pacchetti",
      greeting:
        "Benvenuto! Sono il volto sponsor della ColicoDerviese: ti racconto chi sostiene il club, quali spazi può avere un partner e come chiedere una proposta su misura all'ufficio commerciale.",
      placeholder: "Scrivi al volto sponsor…",
      thinking: "Il volto sponsor sta preparando…",
      quick: ["Diventare partner", "Pacchetti", "Chi sono i partner"],
    },
    operational: /\b(contratt\w*|firm\w*|preventiv\w*)\b/i,
    intents: [
      { id: "pacchetti", re: /pacchett|prezz|cost|quanto|spazi|visibilit/i },
      { id: "partner", re: /chi sono|partner|sponsor|aziend/i },
      { id: "diventa", re: /diventa|propost|vorrei/i },
    ],
  },
};

/* ─────────────────────────────── Genny (presence only) ─────────────────────────────── */

/**
 * Genny's presence on the secretariat page. Her chat persona already exists (assistant.ts "genny", staff and adult
 * members): the presence only adds her daily secretariat tip and quick links to real pages.
 */
export const GENNY_PRESENCE = {
  label: "Genny",
  role: "La segretaria del club",
  askLabel: "Chiedi a Genny",
  initial: "G",
  tips: [
    {
      key: "un-messaggio",
      title: "Una richiesta, un messaggio chiaro",
      text: "Cosa serve, per chi e per quando: scritto così la segreteria risponde prima e senza giri di telefonate.",
    },
    {
      key: "certificati",
      title: "Certificati: guarda la scadenza prima",
      text: "Controlla per tempo la scadenza dei certificati medici: senza certificato valido non si gioca e non ci si allena.",
    },
    {
      key: "documenti",
      title: "I documenti stanno nel posto giusto",
      text: "Moduli, regolamenti e privacy sono nella pagina Documenti: prima di chiedere un modulo dai un'occhiata lì.",
    },
    {
      key: "pec",
      title: "Le comunicazioni ufficiali vanno in PEC",
      text: "Per le comunicazioni con federazione ed enti usa sempre la PEC del club: resta la prova di cosa è stato inviato.",
    },
    {
      key: "cervellone",
      title: "Prima cerca nel Cervellone",
      text: "Scadenze, documenti della federazione e procedure sono nel Cervellone: chiedimi e cerco io per te.",
    },
    {
      key: "privacy",
      title: "Dati dei ragazzi: solo a chi serve",
      text: "Nomi, contatti e documenti dei minori si condividono solo con chi ne ha bisogno per il proprio ruolo, mai nei gruppi.",
    },
  ] as readonly CastTip[],
  disclaimer: "Genny ti mostra solo ciò che il tuo ruolo può vedere; richieste e problemi vanno alla persona che se ne occupa.",
  quick: [
    { label: "Certificati medici", to: "/segreteria/certificati" },
    { label: "Documenti", to: "/documenti" },
    { label: "Cervellone", to: "/direzione/cervellone" },
  ] as readonly CastLink[],
} as const;

export type PresenceId = CastPersonaId | "genny";

/* ─────────────────────────────── daily tip ─────────────────────────────── */

/** Tip of the day of a persona: the same for everybody on a Rome day (era-nutrition-tips.ts dailyPick). */
export function dailyCastTip(id: PresenceId, day: string): CastTip {
  return dailyPick(id === "genny" ? GENNY_PRESENCE.tips : CAST_PERSONAS[id].tips, day);
}

/* ─────────────────────────────── guards ─────────────────────────────── */

/** Digits other than the emergency number 112 (no invented prices, dates, quantities or loads in curated copy). */
function hasDigits(text: string): boolean {
  return /\d/.test(text.replace(/\b112\b/g, ""));
}

const PERSONAL_PLAN_RE = /\b(scheda personal\w*|piano personal\w*|serie da|ripetizion\w*|carich\w*)\b/i;

/**
 * Problems of one piece of curated copy of a persona (tips, greeting, disclaimer); empty when it respects the rules.
 * Every persona: no digits except 112. Era: no diet/weight words. Dottor Acanfora: no drugs or diagnosis wording.
 * Mental coach and Musica e relax: never therapy wording. Preparatore: never personal plans.
 */
export function castCopyProblems(id: PresenceId, text: string): string[] {
  const out: string[] = [];
  if (hasDigits(text)) out.push("contains digits other than 112");
  if (id === "era") out.push(...tipProblems(text).filter((p) => p !== "contains digits"));
  if (id === "acanfora") out.push(...firstAidProblems(text).filter((p) => !p.startsWith("contains digits")));
  if (id === "mental-coach" || id === "musica-relax") out.push(...relaxCopyProblems(text));
  if (id === "preparatore-atletico" && PERSONAL_PLAN_RE.test(text)) out.push("personal plan wording");
  return out;
}

/** The model must never say an order, booking, ticket or registration is confirmed or paid. */
const CONFIRMATION_RE =
  /\b(ho (confermato|prenotato|registrato|iscritto|ordinato)|(ordine|prenotazione|biglietto|iscrizione) (è |e' )?(confermat[oa]|registrat[oa]|accettat[oa])|pagamento (ricevuto|effettuato|confermato)|paga (qui|ora) in chat)\b/i;

/**
 * Output guard of an AI answer for an area persona: problems make the server fall back to the rules engine
 * (assistant.ts parseAssistantAnswer). Prices and dates may appear when they come from the CONTEXT, so digits are
 * refused only for Era and the Preparatore (plans and numbers for minors).
 */
export function castAnswerProblems(id: CastPersonaId, text: string): string[] {
  const out: string[] = [];
  if (CONFIRMATION_RE.test(text)) out.push("confirms an operational request");
  if (id === "era") out.push(...tipProblems(text));
  if (id === "preparatore-atletico") {
    if (hasDigits(text)) out.push("contains digits other than 112");
    if (PERSONAL_PLAN_RE.test(text)) out.push("personal plan wording");
  }
  if (id === "acanfora") out.push(...firstAidProblems(text).filter((p) => !p.startsWith("contains digits")));
  if (id === "mental-coach" || id === "musica-relax") out.push(...relaxCopyProblems(text));
  return out;
}

/* ─────────────────────────────── rules engine (no AI) ─────────────────────────────── */

/** Real data the rules engine may quote (loaded by the server; never invented). */
export interface CastFacts {
  /** Ticket office rules (match-extras TICKETING): prices only when status is CONFIRMED. */
  ticketing: {
    status: string;
    where: string;
    howToPay: readonly string[];
    tariffs: Readonly<Record<string, { label: string; intero: number; ridotto: number }>>;
    ridottoNote: string;
    bambiniNote: string;
    freeCompetitions: string;
    members: string;
    cup: string;
  } | null;
  /** Next ticketed home match from the official calendar copy, already in plain words; null when none. */
  nextHomeMatch: string | null;
  /** Upcoming tournaments (lib/tournaments.ts), nearest first, already in plain words. */
  tournaments: readonly string[];
}

export const EMPTY_CAST_FACTS: CastFacts = { ticketing: null, nextHomeMatch: null, tournaments: [] };

function euroText(n: number): string {
  return `${n.toFixed(2).replace(".", ",").replace(",00", "")} €`;
}

function reply(text: string, links: readonly CastLink[], mood: SkyReply["mood"] = "info"): SkyReply {
  return { text, mood, links: links.map((l) => ({ label: l.label, to: l.to })) };
}

/** Fixed answer to an operational request of a persona (orders, registrations, tickets): never confirmed. */
export function castOperationalReply(id: CastPersonaId): SkyReply {
  switch (id) {
    case "accoglienza-chef":
      return reply(
        "Che bella idea! Per una festa o un'iniziativa compila la richiesta d'ordine nell'area famiglia: cosa, quando, per quante persone e come preferisci essere ricontattato. Una persona della Club House la conferma e si paga alla cassa del club, mai in chat. Allergie e intolleranze dille di persona al personale.",
        [{ label: "Richiesta d'ordine", to: "/famiglia" }, { label: "Contatti", to: "/contatti" }],
        "success",
      );
    case "biglietteria":
      return reply(
        "I biglietti non si vendono e non si prenotano in chat: si pagano alla biglietteria dell'impianto il giorno della partita. Prezzi e ingressi gratuiti sono nella pagina Impianti.",
        [{ label: "Prezzi e gratuità", to: "/impianti" }, { label: "Partite in casa", to: "/calendario" }],
      );
    case "mentore-tornei":
      return reply(
        "Bello che vogliate esserci! Scrivete alla società dalla pagina Contatti con il nome della società, la categoria e il torneo: l'organizzazione risponde con programma, ospitalità e condizioni. L'interesse non è ancora un'iscrizione.",
        [{ label: "Scrivi alla società", to: "/contatti" }, { label: "I tornei", to: "/tornei" }],
        "success",
      );
    case "mental-coach":
      return reply(
        "Per un percorso personale parlane in famiglia e scrivi al club: ti indicherà il mental coach reale della società, se presente. Con i ragazzi minorenni sempre insieme ai genitori.",
        [{ label: "Scrivi al club", to: "/contatti" }],
      );
    case "volto-sponsor":
      return reply(
        "Contratti e preventivi li prepara l'ufficio commerciale del club: parti dalla richiesta di proposta nella pagina Sponsor e ti ricontattano.",
        [{ label: "Richiedi una proposta", to: "/sponsor" }],
        "success",
      );
    default: {
      const def = CAST_PERSONAS[id];
      return reply(`${def.label} raccoglie solo richieste per una persona del club: scrivila alla segreteria.`, [{ label: "Contatti", to: "/contatti" }]);
    }
  }
}

/** True when the message is an operational request for this persona. */
export function isOperationalFor(id: CastPersonaId, message: string): boolean {
  const re = CAST_PERSONAS[id].operational;
  return !!re && re.test(message);
}

/** Intent id of a message for a persona (undefined = none). */
export function castIntent(id: CastPersonaId, message: string): string | undefined {
  return CAST_PERSONAS[id].intents.find((i) => i.re.test(message))?.id;
}

function tipByKey(id: CastPersonaId, key: string): CastTip | undefined {
  return CAST_PERSONAS[id].tips.find((t) => t.key === key);
}

function tipReply(id: CastPersonaId, key: string): SkyReply | null {
  const t = tipByKey(id, key);
  return t ? reply(`${t.title}. ${t.text}`, CAST_PERSONAS[id].quick.slice(0, 2)) : null;
}

/**
 * Persona-flavoured answer of the rules engine for a keyword intent, from curated copy and real facts only.
 * Returns null when the persona has nothing specific (the caller tries the general rules, then the default).
 */
export function castIntentReply(id: CastPersonaId, message: string, facts: CastFacts = EMPTY_CAST_FACTS): SkyReply | null {
  const intent = castIntent(id, message);
  if (!intent) return null;
  const def = CAST_PERSONAS[id];
  switch (`${id}:${intent}`) {
    case "era:limiti":
      return reply(
        "Non do piani, numeri, calorie o pesi, tanto meno per i ragazzi: ogni corpo è diverso. Per esigenze specifiche parlane con il pediatra o il medico. Intanto, il consiglio d'oro: varietà, colazione e borraccia sempre piena.",
        [{ label: "I consigli di Era", to: "/famiglia" }],
      );
    case "era:allergie":
      return reply(
        "Allergie e intolleranze sono una cosa da medico: parlane con il pediatra o il medico, e alla Club House dillo sempre di persona al personale prima di ordinare.",
        [{ label: "Infermeria", to: "/infermeria" }],
      );
    case "era:prima":
      return tipReply(id, "prima");
    case "era:dopo":
      return tipReply(id, "dopo");
    case "era:acqua":
      return tipReply(id, "acqua");
    case "era:colazione":
      return tipReply(id, "colazione");
    case "acanfora:farmaci":
      return reply(
        "Non indico farmaci né dosi: è una cosa da decidere con il medico o il pediatra. Se la situazione è seria o peggiora, chiama il 112.",
        [{ label: "Infermeria", to: "/infermeria" }],
        "alert",
      );
    case "acanfora:testa":
      return reply(`${HEAD_KNOCK_RULE} Se è confuso, vomita, perde i sensi o il mal di testa peggiora, chiama subito il 112.`, [{ label: "Infermeria", to: "/infermeria" }], "alert");
    case "acanfora:botta":
      return reply(
        `Per una botta o una distorsione: ${KNOCK_STEPS.map((s) => s.title.toLowerCase()).join(", ")}. Fermati, ghiaccio avvolto in un panno, fascia non stretta e parte sollevata. Se c'è una deformità, non riesce a muoversi o il dolore è forte, chiama il 112. Non è una diagnosi: per capire cosa è successo serve un medico.`,
        [{ label: "Infermeria", to: "/infermeria" }],
      );
    case "acanfora:certificato":
      return reply("Per allenarsi e giocare serve il certificato medico sportivo valido: controlla la scadenza con la segreteria prima che scada.", [
        { label: "Documenti", to: "/documenti" },
        { label: "Contatti", to: "/contatti" },
      ]);
    case "accoglienza-chef:allergie":
      return reply(
        "Allergie e intolleranze non si scrivono nell'app: dille di persona al personale della Club House prima di ordinare, così ti consigliano in sicurezza.",
        [{ label: "Contatti", to: "/contatti" }],
      );
    case "accoglienza-chef:menu":
      return reply(
        "Il listino della Club House non è ancora pubblicato nell'app: quando sarà pronto lo trovi qui, con piatti e prezzi confermati. Per feste e iniziative puoi già mandare una richiesta d'ordine.",
        [{ label: "Richiesta d'ordine", to: "/famiglia" }],
      );
    case "accoglienza-chef:sondaggio":
      return reply(
        "I sondaggi sui piatti li apre la Club House e li trovi nell'area famiglia: un voto per persona, e il risultato aiuta a scegliere il menu.",
        [{ label: "Area famiglia", to: "/famiglia" }],
      );
    case "biglietteria:prezzi": {
      const t = facts.ticketing;
      if (!t || t.status !== "CONFIRMED") {
        return reply("I prezzi della stagione non sono ancora confermati dalla Direzione: appena lo sono li trovi nella pagina Impianti.", def.quick.slice(0, 1));
      }
      const list = Object.values(t.tariffs).map((x) => `${x.label}: intero ${euroText(x.intero)}, ridotto ${euroText(x.ridotto)}`);
      return reply(`${list.join("; ")}. Ridotto ${t.ridottoNote}. ${t.where} Pagamento: ${t.howToPay.join(", ")}.`, def.quick.slice(0, 2));
    }
    case "biglietteria:gratis": {
      const t = facts.ticketing;
      if (!t) return reply("Le gratuità sono scritte nella pagina Impianti.", def.quick.slice(0, 1));
      return reply(`${t.bambiniNote}. ${t.freeCompetitions}. ${t.members}. ${t.cup}.`, def.quick.slice(0, 2));
    }
    case "biglietteria:card":
      return reply("Le card della stagione, con a cosa servono e come averle, sono nella pagina Card.", [{ label: "Le card", to: "/card" }]);
    case "biglietteria:prossima":
      return facts.nextHomeMatch
        ? reply(`Prossima partita in casa con biglietteria: ${facts.nextHomeMatch}. Controlla orario e campo nel calendario il giorno stesso.`, [{ label: "Calendario", to: "/calendario" }, { label: "Prezzi e gratuità", to: "/impianti" }])
        : reply("Non vedo partite in casa con biglietteria nel calendario dei prossimi giorni: guarda il calendario completo.", [{ label: "Calendario", to: "/calendario" }]);
    case "mentore-tornei:prossimo":
      return facts.tournaments.length
        ? reply(`In arrivo: ${facts.tournaments.slice(0, 3).join("; ")}. Programma e dettagli sono nella pagina Tornei quando la società li pubblica.`, def.quick.slice(0, 2))
        : reply("Il calendario dei tornei è nella pagina Tornei.", def.quick.slice(0, 1));
    case "mental-coach:prima":
      return tipReply(id, "tensione");
    case "mental-coach:errore":
      return tipReply(id, "errore");
    case "mental-coach:squadra":
      return tipReply(id, "squadra");
    case "preparatore-atletico:limiti":
      return reply(
        "Schede, carichi e numeri personali non li do, tanto meno per i ragazzi: gli allenamenti li costruiscono mister e preparatori del club, che conoscono la squadra. Posso spiegarti come scaldarti in generale.",
        [{ label: "Allenamenti", to: "/allenamenti" }],
      );
    case "preparatore-atletico:dolore":
      return reply("Se fa male ci si ferma e si avvisa il mister: il dolore non si sfida. Per capire cosa è successo c'è l'infermeria del club e il medico; in caso di emergenza il 112.", [
        { label: "Infermeria", to: "/infermeria" },
      ]);
    case "preparatore-atletico:piccoli":
      return tipReply(id, "piccoli");
    case "preparatore-atletico:riscaldamento":
      return tipReply(id, "scaldati");
    case "musica-relax:respiro":
      return tipReply(id, "respiro");
    case "musica-relax:musica":
      return tipReply(id, "playlist");
    case "musica-relax:dopo":
      return tipReply(id, "dopo");
    case "volto-sponsor:pacchetti":
      return reply("Pacchetti e spazi per i partner sono nella pagina Sponsor; i prezzi non sono pubblicati: si chiede una proposta su misura all'ufficio commerciale.", [
        { label: "Pacchetti", to: "/sponsor" },
      ]);
    case "volto-sponsor:partner":
      return reply("Le aziende che sostengono il club sono nella pagina Partner: ognuna ha la sua storia con la ColicoDerviese.", [{ label: "I partner", to: "/partner" }]);
    case "volto-sponsor:diventa":
      return reply("Per diventare partner parti dalla richiesta di proposta nella pagina Sponsor: l'ufficio commerciale ti ricontatta con una soluzione su misura.", [
        { label: "Diventa partner", to: "/sponsor" },
      ], "success");
    default:
      return null;
  }
}

/** Default answer of a persona when nothing matched: who they are, today's tip and the quick links. */
export function castDefaultReply(id: CastPersonaId, day: string): SkyReply {
  const def = CAST_PERSONAS[id];
  const tip = dailyCastTip(id, day);
  const hello = /^.*?[.!?](?=\s|$)/.exec(def.chat.greeting)?.[0] ?? def.chat.title;
  return reply(
    `${hello} Posso aiutarti con: ${def.chat.quick.map((q) => q.toLowerCase()).join(", ")}. Il consiglio di oggi: ${tip.title}. ${tip.text}`,
    def.quick,
  );
}

/* ─────────────────────────────── AI context ─────────────────────────────── */

export interface CastAreaContext {
  title: string;
  lines: ReadonlyArray<{ text: string; to?: string }>;
}

/** Area notes and curated copy given to the model as data, placed first in the CONTEXT so it is never truncated. */
export function castAreaContext(id: CastPersonaId, day: string, facts: CastFacts = EMPTY_CAST_FACTS): CastAreaContext {
  const def = CAST_PERSONAS[id];
  const tip = dailyCastTip(id, day);
  const lines: { text: string; to?: string }[] = [...def.notes];
  if (id === "mentore-tornei") {
    if (facts.tournaments.length) for (const t of facts.tournaments) lines.push({ text: `- Torneo: ${t}` });
    else lines.push({ text: "Nessun torneo in programma pubblicato." });
  }
  if (id === "biglietteria" && facts.nextHomeMatch) lines.push({ text: `Prossima partita in casa con biglietteria: ${facts.nextHomeMatch}.` });
  lines.push({ text: `Consiglio di oggi di ${def.label}: ${tip.title}. ${tip.text}` });
  for (const t of def.tips) if (t.key !== tip.key) lines.push({ text: `- ${t.title}: ${t.text}` });
  lines.push({ text: def.disclaimer });
  return { title: `Area di ${def.label} (${def.role})`, lines };
}

/* ─────────────────────────────── where they live ─────────────────────────────── */

/**
 * Page where each character's presence lives ("I nostri personaggi", /guida#personaggi). Reserved pages ask to sign
 * in first; the route tree test checks every path.
 */
export const PRESENCE_HOMES: Readonly<Record<PresenceId, CastLink & { reserved: boolean }>> = {
  era: { label: "Area famiglia", to: "/famiglia", hash: "fam-era", reserved: true },
  acanfora: { label: "Infermeria", to: "/infermeria", reserved: true },
  "accoglienza-chef": { label: "Area famiglia · Club House", to: "/famiglia", hash: "richiesta-ordine", reserved: true },
  biglietteria: { label: "Impianti e biglietteria", to: "/impianti", reserved: false },
  "mentore-tornei": { label: "Tornei", to: "/tornei", hash: "personaggi-tornei", reserved: false },
  "mental-coach": { label: "Area famiglia", to: "/famiglia", hash: "cast-helpers", reserved: true },
  "preparatore-atletico": { label: "Area famiglia", to: "/famiglia", hash: "cast-helpers", reserved: true },
  "musica-relax": { label: "Area famiglia", to: "/famiglia", hash: "cast-helpers", reserved: true },
  // /sponsor is being reworked on another branch (agent/fondo2): the presence lives on /tornei for now.
  "volto-sponsor": { label: "Tornei", to: "/tornei", hash: "personaggi-tornei", reserved: false },
  genny: { label: "Segreteria", to: "/segreteria", reserved: true },
};
