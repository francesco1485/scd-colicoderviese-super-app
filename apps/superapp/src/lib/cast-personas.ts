/**
 * Areas of the assistant cast, simplified by the Direzione on 14/10/2026 (UD-121, Francesco ~18:05: "Personaggi
 * semplificati: una sola assistente chat in tutta l'app, di nome VERA"). Pure data and helpers, no I/O, safe for the
 * browser.
 *
 * - Vera (assistant.ts persona "vera") is the ONLY chat of the app: the club reception. She answers from real club
 *   data quoting the source, hands over to the face of an area and opens a request to the secretariat when a person
 *   is needed. She also absorbs the ticket office and the public helper (Crovi is not an APPROVED asset).
 * - FACE: the faces with concrete actions — the Chef della Club House, the Volto sponsor and the Mentore dei tornei
 *   (plus Sky, the mascot, only in the under-14 world: {@link CAST_FACES}). A face has an area card with 2-3 real
 *   actions and a "Chiedi a Vera" button: Vera's chat opens with that area as context ({@link ChatAreaId}).
 * - TIP_ONLY: Era, Dottor Acanfora, the Preparatore atletico, the Mental coach and Musica e relax are only "consiglio
 *   del giorno" (short rotating copy, home-tips.ts): no chat, no "Chiedi a …".
 * - ABSORBED: the ticket office ("biglietteria") is answered by Vera herself (prices, free entries, cards).
 *
 * Names still to be decided (`nameTbd` in the roster) use neutral role labels ("Lo Chef", "Il Mentore dei tornei"):
 * never an invented personal name. Operational requests (orders, team registrations, tickets) are collected as
 * requests for a person and never confirmed or paid in the app. The distress referral (cast-safety.ts) applies to
 * every chat before anything else.
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

/** Every area of the cast (faces, tip-only characters and the absorbed ticket office). */
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

/** How a character lives in the app since UD-121. */
export type CastKind = "FACE" | "TIP_ONLY" | "ABSORBED";

/** Faces of the cast with an area card and concrete actions (Sky is the fourth face, see {@link CAST_FACES}). */
export type FaceAreaId = "accoglienza-chef" | "volto-sponsor" | "mentore-tornei";

/** Areas Vera's chat can be opened with ("Chiedi a Vera" on a face card, or the ticket office she absorbed). */
export type ChatAreaId = FaceAreaId | "biglietteria";

export const CHAT_AREA_IDS: readonly ChatAreaId[] = ["accoglienza-chef", "volto-sponsor", "mentore-tornei", "biglietteria"];

/** Characters that are only a "consiglio del giorno": no chat entry anywhere (UD-121). */
export type TipOnlyId = "era" | "acanfora" | "preparatore-atletico" | "mental-coach" | "musica-relax";

export const TIP_ONLY_IDS: readonly TipOnlyId[] = ["era", "acanfora", "preparatore-atletico", "mental-coach", "musica-relax"];

export function isChatArea(p: unknown): p is ChatAreaId {
  return typeof p === "string" && (CHAT_AREA_IDS as readonly string[]).includes(p);
}

export function isTipOnly(p: unknown): p is TipOnlyId {
  return typeof p === "string" && (TIP_ONLY_IDS as readonly string[]).includes(p);
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

/** Keyword intent of an area for the rules engine (AI off or fallback). */
export interface CastIntent {
  id: string;
  re: RegExp;
}

export interface CastPersonaDef {
  id: CastPersonaId;
  rosterId: RosterId;
  kind: CastKind;
  /** Display label: the personal name when decided, otherwise a neutral role label. */
  label: string;
  nameTbd: boolean;
  /** Role in a few plain words. */
  role: string;
  /** One plain line: what the character does for you (directory, cards). */
  does: string;
  /** Letter of the badge shown while no approved portrait exists. */
  initial: string;
  /**
   * Where Vera's chat may be opened with this area: public pages (anyone, public data only) and/or inside (staff and
   * adult members only: younger members and unknown ages keep Sky, assistant.ts resolveChat). Both false for the
   * TIP_ONLY characters: they have no chat.
   */
  surfaces: { public: boolean; inside: boolean };
  /**
   * What Vera says when her chat opens with this area ("Per la Club House ti aiuta lo Chef: …"); null for the
   * tip-only characters.
   */
  handoff: string | null;
  /** Quick questions shown in Vera's chat opened with this area (empty for tip-only characters). */
  chatQuick: readonly string[];
  /** Extra hard rules appended to Vera's rules when her chat is opened with this area. */
  rules: readonly string[];
  /** Fixed notes of the area given to the model as data (the CONTEXT), with app links. */
  notes: readonly { text: string; to?: string }[];
  tips: readonly CastTip[];
  /** Note shown under the tip (what the character never does). */
  disclaimer: string;
  /** Actions (faces) or useful links (tip cards) to real pages. */
  quick: readonly CastLink[];
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
    kind: "TIP_ONLY",
    rosterId: "era",
    label: "Era",
    nameTbd: false,
    role: "La nutrizionista del club",
    does: "Un consiglio al giorno per mangiare e bere bene quando si fa sport.",
    initial: "E",
    surfaces: { public: false, inside: false },
    handoff: null,
    chatQuick: [],
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
    kind: "TIP_ONLY",
    rosterId: "acanfora",
    label: "Dottor Acanfora",
    nameTbd: false,
    role: "Il medico del club",
    does: "Un consiglio al giorno di prevenzione e primo soccorso, mai diagnosi.",
    initial: "A",
    surfaces: { public: false, inside: false },
    handoff: null,
    chatQuick: [],
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
    kind: "FACE",
    rosterId: "accoglienza-chef",
    label: "Garrison",
    nameTbd: false,
    role: "Lo Chef della Club House",
    does: "Raccoglie gli ordini per feste e iniziative e apre il sondaggio sui piatti della Club House.",
    initial: "C",
    surfaces: { public: false, inside: true },
    handoff: "Per la Club House ti aiuta Garrison, lo Chef: ordini per feste e iniziative e sondaggio sui piatti. Una persona conferma e si paga alla cassa, mai in chat.",
    chatQuick: ["Il menu", "Allergie e intolleranze", "Torta per un compleanno"],
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
      { label: "Ordine per una festa", to: "/famiglia", hash: "richiesta-ordine" },
      { label: "Sondaggio sui piatti", to: "/famiglia", hash: "sondaggi-piatti" },
      { label: "Eventi del club", to: "/eventi" },
    ],
    operational: /\b(ordin\w*|prenot\w*|torta|torte|buffet|rinfresc\w*|catering|compleann\w*|aperitiv\w*|festa|feste)\b/i,
    intents: [
      { id: "allergie", re: /allerg|intolleran|celiac/i },
      { id: "menu", re: /menu|menù|listino|prezz|panin|piatt|cucin|mangiare/i },
      { id: "sondaggio", re: /sondagg|vot/i },
    ],
  },
  biglietteria: {
    id: "biglietteria",
    kind: "ABSORBED",
    rosterId: "biglietteria",
    label: "La biglietteria",
    nameTbd: true,
    role: "Prezzi, gratuità, card e partite in casa",
    does: "Prezzi, ingressi gratuiti, card e partite in casa: ti risponde Iride.",
    initial: "B",
    surfaces: { public: true, inside: true },
    handoff: "Per biglietti, gratuità e card ti rispondo io. I biglietti non si vendono in chat: si pagano all'ingresso dell'impianto.",
    chatQuick: ["Quanto costa il biglietto", "Chi entra gratis", "Prossima partita in casa"],
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
    kind: "FACE",
    rosterId: "mentore-tornei",
    label: "Enea",
    nameTbd: false,
    role: "Direttore artistico di tornei ed eventi",
    does: "Ti fa iscrivere la squadra ai tornei del club e ti indica l'ospitalità per chi viene da fuori.",
    initial: "T",
    surfaces: { public: true, inside: true },
    handoff: "Per i tornei ti aiuta Enea, il Mentore dei tornei: iscrizione della squadra e ospitalità. L'iscrizione la conferma sempre l'organizzazione.",
    chatQuick: ["Prossimo torneo", "Programma del torneo", "Vogliamo partecipare"],
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
      { label: "Iscrivi la squadra", to: "/eventi/christmas-lario-cup", hash: "iscrizioni" },
      { label: "Ospitalità e come arrivare", to: "/eventi/christmas-lario-cup", hash: "arrivare" },
      { label: "Tutti i tornei", to: "/tornei" },
    ],
    operational: /\b(iscriv\w*|iscrizion\w*|partecip\w*|ospitalit\w*|alloggi\w*|pernott\w*|albergh\w*|hotel)\b/i,
    intents: [{ id: "prossimo", re: /prossim|quando|date|data|programma|torne/i }],
  },
  "mental-coach": {
    id: "mental-coach",
    kind: "TIP_ONLY",
    rosterId: "mental-coach",
    label: "Il Mental coach",
    nameTbd: true,
    role: "Motivazione per lo sport e la squadra",
    does: "Un consiglio al giorno per affrontare partite e allenamenti con la testa giusta.",
    initial: "M",
    surfaces: { public: false, inside: false },
    handoff: null,
    chatQuick: [],
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
    operational: null,
    intents: [
      { id: "prima", re: /prima (della |di )?(partita|gara)|tension|agitat|emozion/i },
      { id: "errore", re: /error|sbagli|perso|sconfitt/i },
      { id: "squadra", re: /squadra|compagn|gruppo/i },
    ],
  },
  "preparatore-atletico": {
    id: "preparatore-atletico",
    kind: "TIP_ONLY",
    rosterId: "preparatore-atletico",
    label: "Il Preparatore atletico",
    nameTbd: true,
    role: "Riscaldamento e prevenzione per età",
    does: "Un consiglio al giorno su riscaldamento e prevenzione, mai schede personali.",
    initial: "P",
    surfaces: { public: false, inside: false },
    handoff: null,
    chatQuick: [],
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
    kind: "TIP_ONLY",
    rosterId: "musica-relax",
    label: "Musica e relax",
    nameTbd: true,
    role: "Musica e respiro per ritrovare la calma",
    does: "Un consiglio al giorno di calma e respiro, prima e dopo la partita.",
    initial: "R",
    surfaces: { public: false, inside: false },
    handoff: null,
    chatQuick: [],
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
    operational: null,
    intents: [
      { id: "respiro", re: /respir|calm|rilass/i },
      { id: "musica", re: /music|canzon|brano|playlist|ascolt/i },
      { id: "dopo", re: /dopo (la )?(partita|gara)|staccare/i },
    ],
  },
  "volto-sponsor": {
    id: "volto-sponsor",
    kind: "FACE",
    rosterId: "volto-sponsor",
    label: "Il Volto sponsor",
    nameTbd: true,
    role: "Partner e pacchetti",
    does: "Ti racconta le idee di sponsorizzazione e ti fa chiedere quella che ti interessa: la proposta su misura la definisce il Presidente con te.",
    initial: "S",
    surfaces: { public: true, inside: true },
    handoff: "Per diventare partner ti aiuta il Volto sponsor: guarda le idee di sponsorizzazione e scegli quella che fa per te. La proposta su misura la definisce il Presidente con te.",
    chatQuick: ["Che idee di sponsorizzazione ci sono", "Chi sono i partner", "Vorrei parlarne con il club"],
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
      { label: "Parliamone", to: "/sponsor", hash: "proposta" },
      { label: "Le idee da sponsorizzare", to: "/sponsor", hash: "idee" },
      { label: "I partner", to: "/partner" },
    ],
    operational: /\b(contratt\w*|firm\w*|preventiv\w*)\b/i,
    intents: [
      { id: "pacchetti", re: /pacchett|prezz|cost|quanto|spazi|visibilit/i },
      { id: "partner", re: /chi sono|partner|sponsor|aziend/i },
      { id: "diventa", re: /diventa|propost|vorrei/i },
    ],
  },
};

/* ─────────────────────────────── Vera (the one chat) ─────────────────────────────── */

/**
 * Vera, the club reception (UD-121: "una sola assistente chat in tutta l'app, di nome VERA", replacing the name
 * Genny). Her chat persona is assistant.ts "vera"; this is her presence (secretariat page, directory, ticket office):
 * a practical tip of the day and links to real pages. No portrait until the Direzione approves an image.
 */
export const VERA_PRESENCE = {
  label: "Iride",
  role: "L'assistente AI della segreteria",
  does: "Risponde con i dati veri del club e ti dice da dove vengono, ti porta dal volto giusto e, se serve una persona, apre una richiesta alla segreteria. Anche biglietti e card.",
  askLabel: "Chiedi a Iride",
  initial: "I",
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
  disclaimer: "Iride ti mostra solo ciò che il tuo ruolo può vedere; richieste e problemi vanno alla persona che se ne occupa.",
  quick: [
    { label: "Certificati medici", to: "/segreteria/certificati" },
    { label: "Documenti", to: "/documenti" },
    { label: "Cervellone", to: "/direzione/cervellone" },
  ] as readonly CastLink[],
} as const;

/** A presence on a page: an area of the cast, or Vera herself. */
export type PresenceId = CastPersonaId | "vera";

/* ─────────────────────────────── faces (UD-121) ─────────────────────────────── */

export type FaceId = FaceAreaId | "sky";

export interface CastFace {
  id: FaceId;
  label: string;
  /** One plain line: what the face does for you. */
  does: string;
  /** 2-3 concrete actions on real pages (tested against the route tree). */
  actions: readonly CastLink[];
  /** Where the face lives. */
  home: CastLink & { reserved: boolean };
  /** Area Vera's chat opens with from this face ("Chiedi a Vera"); null for Sky, who is the kids' own helper. */
  area: FaceAreaId | null;
}

/**
 * The four faces with concrete actions (UD-121): the Chef della Club House, the Volto sponsor, the Mentore dei tornei
 * and Sky, the official mascot, only in the world of the under-14s (never a hero, never commercial).
 */
export const CAST_FACES: Readonly<Record<FaceId, CastFace>> = {
  "accoglienza-chef": {
    id: "accoglienza-chef",
    label: CAST_PERSONAS["accoglienza-chef"].label,
    does: CAST_PERSONAS["accoglienza-chef"].does,
    actions: CAST_PERSONAS["accoglienza-chef"].quick,
    home: { label: "Area famiglia · Club House", to: "/famiglia", hash: "richiesta-ordine", reserved: true },
    area: "accoglienza-chef",
  },
  "volto-sponsor": {
    id: "volto-sponsor",
    label: CAST_PERSONAS["volto-sponsor"].label,
    does: CAST_PERSONAS["volto-sponsor"].does,
    actions: CAST_PERSONAS["volto-sponsor"].quick,
    home: { label: "Sponsor e partner", to: "/sponsor", reserved: false },
    area: "volto-sponsor",
  },
  "mentore-tornei": {
    id: "mentore-tornei",
    label: CAST_PERSONAS["mentore-tornei"].label,
    does: CAST_PERSONAS["mentore-tornei"].does,
    actions: CAST_PERSONAS["mentore-tornei"].quick,
    home: { label: "Tornei", to: "/tornei", hash: "personaggi-tornei", reserved: false },
    area: "mentore-tornei",
  },
  sky: {
    id: "sky",
    label: "Crovi",
    does: "L'aiuto per bambini e famiglie, nel mondo dei più piccoli: scuola calcio, giochi e squadre under 14.",
    actions: [
      { label: "Prova la scuola calcio", to: "/entra" },
      { label: "Le squadre dei piccoli", to: "/squadre" },
      { label: "Fantacalcio", to: "/fantacalcio" },
    ],
    home: { label: "Squadre dei più piccoli", to: "/squadre", reserved: false },
    area: null,
  },
};

export const FACE_IDS: readonly FaceId[] = ["accoglienza-chef", "volto-sponsor", "mentore-tornei", "sky"];

/* ─────────────────────────────── daily tip ─────────────────────────────── */

/** Tip of the day of a presence: the same for everybody on a Rome day (era-nutrition-tips.ts dailyPick). */
export function dailyCastTip(id: PresenceId, day: string): CastTip {
  return dailyPick(id === "vera" ? VERA_PRESENCE.tips : CAST_PERSONAS[id].tips, day);
}

/* ─────────────────────────────── guards ─────────────────────────────── */

/** Digits other than the emergency number 112 (no invented prices, dates, quantities or loads in curated copy). */
function hasDigits(text: string): boolean {
  return /\d/.test(text.replace(/\b112\b/g, ""));
}

const PERSONAL_PLAN_RE = /\b(scheda personal\w*|piano personal\w*|serie da|ripetizion\w*|carich\w*)\b/i;

/**
 * Problems of one piece of curated copy of a presence (tips, handoff, disclaimer); empty when it respects the rules.
 * Every presence: no digits except 112. Era: no diet/weight words. Dottor Acanfora: no drugs or diagnosis wording.
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
 * Output guard of an AI answer of Vera: problems make the server fall back to the rules engine (assistant.ts
 * parseAssistantAnswer). Always: no confirmed orders, tickets, registrations or payments. With `strict` (public pages,
 * area chats, anyone who is not reading the Cervellone as staff) the topics of the tip-only characters keep their
 * limits in Vera's mouth too: no diet or weight wording, no drugs or diagnosis, no therapy, no personal training plans.
 * Prices and dates may appear when they come from the CONTEXT, so digits are not refused here.
 */
export function veraAnswerProblems(text: string, strict = true): string[] {
  const out: string[] = [];
  if (CONFIRMATION_RE.test(text)) out.push("confirms an operational request");
  if (!strict) return out;
  out.push(...tipProblems(text).filter((p) => p !== "contains digits"));
  out.push(...firstAidProblems(text).filter((p) => !p.startsWith("contains digits")));
  out.push(...relaxCopyProblems(text));
  if (PERSONAL_PLAN_RE.test(text)) out.push("personal plan wording");
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

/** App link of a cast link for a chat reply: the anchor travels as "#hash" (SkyChat ReplyLink splits it). */
export function castLinkTo(l: CastLink): string {
  return l.hash ? `${l.to}#${l.hash}` : l.to;
}

function reply(text: string, links: readonly CastLink[], mood: SkyReply["mood"] = "info"): SkyReply {
  return { text, mood, links: links.map((l) => ({ label: l.label, to: castLinkTo(l) })) };
}

/** Fixed answer of Vera to an operational request of an area (orders, registrations, tickets): never confirmed. */
export function castOperationalReply(id: ChatAreaId): SkyReply {
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
        [{ label: "Scrivi alla società", to: "/contatti" }, { label: "Iscrivi la squadra", to: "/eventi/christmas-lario-cup", hash: "iscrizioni" }],
        "success",
      );
    case "volto-sponsor":
      return reply(
        "Contratti e preventivi li prepara l'ufficio commerciale del club: parti dalla richiesta di proposta nella pagina Sponsor e ti ricontattano.",
        [{ label: "Richiedi una proposta", to: "/sponsor", hash: "proposta" }],
        "success",
      );
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

/**
 * Vera's answer with an area when nothing more specific matched: the hand-over to the face of the area ("Per la Club
 * House ti aiuta lo Chef: …"), today's tip of the area and its action buttons.
 */
export function veraAreaReply(area: ChatAreaId, day: string): SkyReply {
  const def = CAST_PERSONAS[area];
  const tip = dailyCastTip(area, day);
  return reply(`${def.handoff ?? ""} Usa i pulsanti qui sotto oppure scrivimi cosa ti serve. Il consiglio di oggi: ${tip.title}. ${tip.text}`.trim(), def.quick);
}

/** Ticket words: Vera answers on the ticket office she absorbed (UD-121) only when the message is about it. */
const TICKET_TOPIC_RE = /bigliett|ingress|gratis|gratuit|\bcard\b|abbonament|tessera|ridott|tariff|prevendit/i;

/** Safety topics of the tip-only characters that Vera answers with their fixed copy (never with the model). */
const VERA_SAFETY_TOPICS: ReadonlyArray<readonly [CastPersonaId, string]> = [
  ["era", "limiti"],
  ["acanfora", "farmaci"],
  ["preparatore-atletico", "limiti"],
];

/**
 * Vera's own topics without an area: the ticket office she absorbed (prices, free entries, cards, only with ticket
 * words) and the fixed refusals of the tip-only characters (diets, medicines, personal training plans). Null when the
 * message is about something else.
 */
export function veraTopicReply(message: string, facts: CastFacts = EMPTY_CAST_FACTS): SkyReply | null {
  for (const [id, intent] of VERA_SAFETY_TOPICS) if (castIntent(id, message) === intent) return castIntentReply(id, message, facts);
  if (TICKET_TOPIC_RE.test(message)) return castIntentReply("biglietteria", message, facts);
  return null;
}

/** True when Vera should collect a ticket request (buy, book, pay a ticket) without an area. */
export function isTicketRequest(message: string): boolean {
  return /bigliett|prevendit/i.test(message) && isOperationalFor("biglietteria", message);
}

/* ─────────────────────────────── AI context ─────────────────────────────── */

export interface CastAreaContext {
  title: string;
  lines: ReadonlyArray<{ text: string; to?: string }>;
}

/** Area notes and curated copy given to the model as data, placed first in the CONTEXT so it is never truncated. */
export function castAreaContext(id: ChatAreaId, day: string, facts: CastFacts = EMPTY_CAST_FACTS): CastAreaContext {
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
  if (def.handoff) lines.push({ text: `Iride apre questa area così: ${def.handoff}` });
  return { title: `Area: ${def.label} (${def.role})`, lines };
}

/* ─────────────────────────────── where they live ─────────────────────────────── */

/**
 * Page where each presence lives ("I nostri personaggi", /guida#personaggi). Reserved pages ask to sign in first; the
 * route tree test checks every path.
 */
export const PRESENCE_HOMES: Readonly<Record<PresenceId, CastLink & { reserved: boolean }>> = {
  vera: { label: "In ogni pagina", to: "/guida", hash: "personaggi", reserved: false },
  era: { label: "Area famiglia", to: "/famiglia", hash: "fam-era", reserved: true },
  acanfora: { label: "Infermeria", to: "/infermeria", reserved: true },
  "accoglienza-chef": CAST_FACES["accoglienza-chef"].home,
  biglietteria: { label: "Impianti e biglietteria", to: "/impianti", reserved: false },
  "mentore-tornei": CAST_FACES["mentore-tornei"].home,
  "mental-coach": { label: "Area famiglia", to: "/famiglia", hash: "cast-helpers", reserved: true },
  "preparatore-atletico": { label: "Area famiglia", to: "/famiglia", hash: "cast-helpers", reserved: true },
  "musica-relax": { label: "Area famiglia", to: "/famiglia", hash: "cast-helpers", reserved: true },
  "volto-sponsor": CAST_FACES["volto-sponsor"].home,
};
