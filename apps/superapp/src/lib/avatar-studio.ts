/**
 * "Crea il tuo campione" v1 (UD-102, Direzione 13/10/2026 "ok procedi": first version inside the members area, not
 * published). Pure rules shared by the page, the server functions and the tests:
 *   - A. Basi pronte: realistic AI-generated ORIGINAL bases (no photo, no real person, no crest, no kit, no sponsor);
 *     minors (or unknown age) only get back-view bases; nickname and shirt number validated here and in the database;
 *   - B. Descrizione scritta: input moderation (real people and celebrities, brands and clubs, sexual, violent, hate,
 *     personal data, children), daily/monthly caps, generation only when explicitly switched on with EU credentials;
 *   - C. Foto del volto: always locked in v1 (consent + DPIA first); minors are routed to the Famiglia area.
 * Cards (Tifoso / Tesserato / Famiglia) are derived from existing membership roles; credits are read-only, never money.
 */

/** Members-only page of the studio (private, no-store, never in robots/sitemap). */
export const CAMPIONE_PATH = "/la-mia-scd/campione";

/* ------------------------------------------------------------------ age */

/** Age band computed on the server from club data (scd_people / access request). Unknown is treated as minor. */
export type AgeBand = "ADULT" | "MINOR" | "UNKNOWN";

export function asAgeBand(v: unknown): AgeBand {
  return v === "ADULT" || v === "MINOR" ? v : "UNKNOWN";
}

/** Fail-closed: only a verified adult is an adult. */
export function treatAsMinor(band: AgeBand): boolean {
  return band !== "ADULT";
}

/* ---------------------------------------------------------------- bases */

export type BaseView = "BACK" | "THREE_QUARTER" | "FACE";

export interface AvatarBase {
  key: string;
  label: string;
  view: BaseView;
  viewLabel: string;
  role: "GIOCATORE" | "PORTIERE" | "MISTER" | "TIFOSO";
  src: string;
  alt: string;
}

/** Registered in config/scd-assets.v1.json as GENERATE_ORIGINAL / REFERENCE_PROTOTYPE (pending Direzione approval). */
export const AVATAR_BASES: readonly AvatarBase[] = [
  {
    key: "lampo-7",
    label: "Lampo 7",
    view: "BACK",
    viewLabel: "Di spalle",
    role: "GIOCATORE",
    src: "/media/avatar/bases/lampo-7.webp",
    alt: "Giocatore di spalle con maglia blu notte numero 7, stadio illuminato di sera",
  },
  {
    key: "falco-9",
    label: "Falco 9",
    view: "BACK",
    viewLabel: "Di spalle",
    role: "GIOCATORE",
    src: "/media/avatar/bases/falco-9.webp",
    alt: "Giocatrice di spalle con coda bionda e maglia blu numero 9, campo illuminato",
  },
  {
    key: "muro-1",
    label: "Muro 1",
    view: "BACK",
    viewLabel: "Portiere · di spalle",
    role: "PORTIERE",
    src: "/media/avatar/bases/muro-1.webp",
    alt: "Portiere di spalle con maglia gialla numero 1 e guanti, davanti alla porta",
  },
  {
    key: "roccia-10",
    label: "Roccia 10",
    view: "THREE_QUARTER",
    viewLabel: "Tre quarti",
    role: "GIOCATORE",
    src: "/media/avatar/bases/roccia-10.webp",
    alt: "Giocatore visto di tre quarti da dietro con maglia azzurra numero 10, stadio pieno di luci",
  },
  {
    key: "mister",
    label: "Mister",
    view: "FACE",
    viewLabel: "Con volto · adulto",
    role: "MISTER",
    src: "/media/avatar/bases/mister.webp",
    alt: "Allenatore adulto sorridente in tuta blu a bordo campo, di sera",
  },
  {
    key: "tifosa",
    label: "Tifosa",
    view: "FACE",
    viewLabel: "Con volto · adulta",
    role: "TIFOSO",
    src: "/media/avatar/bases/tifosa.webp",
    alt: "Tifosa adulta sorridente con felpa blu e sciarpa bianca, stadio sullo sfondo",
  },
];

export function baseByKey(key: string): AvatarBase | undefined {
  return AVATAR_BASES.find((b) => b.key === key);
}

/** Minors and unknown ages: back view only (plan §2.9, UD-100: never a recognisable face for a minor account). */
export function canUseBase(band: AgeBand, base: AvatarBase): boolean {
  return treatAsMinor(band) ? base.view === "BACK" : true;
}

export function basesFor(band: AgeBand): AvatarBase[] {
  return AVATAR_BASES.filter((b) => canUseBase(band, b));
}

/* ------------------------------------------------------- nickname/number */

export const NICKNAME_MAX = 14;
export const NICKNAME_MIN = 2;

export type NicknameCheck = { ok: true; value: string } | { ok: false; error: string };

export function normalizeNickname(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function validateNickname(raw: string): NicknameCheck {
  const value = normalizeNickname(raw);
  if (value.length < NICKNAME_MIN) return { ok: false, error: `Almeno ${NICKNAME_MIN} caratteri.` };
  if ([...value].length > NICKNAME_MAX) return { ok: false, error: `Massimo ${NICKNAME_MAX} caratteri.` };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '.-]*$/u.test(value))
    return { ok: false, error: "Solo lettere, numeri, spazio, apostrofo, punto o trattino." };
  if (/\d{5,}/.test(value)) return { ok: false, error: "Niente numeri di telefono o codici." };
  const hit = moderateText(value);
  if (!hit.ok) return { ok: false, error: hit.message };
  return { ok: true, value };
}

export type NumberCheck = { ok: true; value: number } | { ok: false; error: string };

export function validateShirtNumber(raw: string | number): NumberCheck {
  const s = typeof raw === "number" ? String(raw) : raw.trim();
  if (!/^\d{1,2}$/.test(s)) return { ok: false, error: "Un numero da 1 a 99." };
  const n = Number(s);
  if (n < 1 || n > 99) return { ok: false, error: "Un numero da 1 a 99." };
  return { ok: true, value: n };
}

/* ------------------------------------------------------------ moderation */

export type ModerationCategory =
  | "PERSONA_REALE"
  | "MARCHIO"
  | "SESSUALE"
  | "VIOLENZA"
  | "ODIO_OFFESE"
  | "DATI_PERSONALI"
  | "MINORI"
  | "SOSTANZE_SCOMMESSE";

export type ModerationOutcome = { ok: true } | { ok: false; category: ModerationCategory; message: string };

const MESSAGES: Record<ModerationCategory, string> = {
  PERSONA_REALE: "Niente nomi di persone reali o famose: il campione è un personaggio inventato.",
  MARCHIO: "Niente marchi, squadre reali, stemmi o sponsor: gli asset ufficiali SCD li aggiunge solo il club.",
  SESSUALE: "Contenuto non adatto: il campione è sempre vestito da calcio, niente riferimenti sessuali.",
  VIOLENZA: "Niente armi, sangue o violenza.",
  ODIO_OFFESE: "Niente offese, insulti o parole d'odio.",
  DATI_PERSONALI: "Niente e-mail, telefoni, indirizzi o link.",
  MINORI: "Il campione generato è sempre una figura adulta generica: niente bambini.",
  SOSTANZE_SCOMMESSE: "Niente alcol, fumo, droghe o scommesse.",
};

/** Lowercase, no accents, letters/digits only, padded with spaces for whole-word matching. */
export function normalizeForMatch(text: string): string {
  const s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${s} `;
}

/** Real people commonly typed into image generators (footballers, public figures). Matched as whole words. */
export const REAL_PEOPLE: readonly string[] = [
  "messi", "ronaldo", "cristiano", "cr7", "mbappe", "haaland", "neymar", "maradona", "pele", "totti", "buffon",
  "del piero", "baggio", "ibrahimovic", "ibra", "lautaro", "vlahovic", "leao", "osimhen", "kvaratskhelia", "kvara",
  "donnarumma", "barella", "yamal", "bellingham", "vinicius", "salah", "harry kane", "modric", "benzema",
  "lewandowski", "dybala", "insigne", "pirlo", "maldini", "zidane", "beckham", "ronaldinho", "kaka", "chiellini",
  "bonucci", "immobile", "retegui", "tonali", "spalletti", "ancelotti", "mourinho", "guardiola", "klopp", "allegri",
  "sinner", "ferragni", "fedez", "taylor swift", "elon musk", "musk", "trump", "biden", "putin", "zelensky", "meloni",
  "mattarella", "berlusconi", "salvini", "schlein", "papa francesco", "papa leone", "hitler", "mussolini",
];

/** Brands, sportswear makers, betting operators and real clubs: never generated (official assets only, server side). */
export const BRANDS: readonly string[] = [
  "nike", "adidas", "puma", "umbro", "macron", "errea", "joma", "kappa", "lotto", "diadora", "new balance",
  "under armour", "hummel", "mizuno", "coca cola", "cocacola", "pepsi", "red bull", "redbull", "monster energy",
  "mcdonald", "mcdonalds", "apple", "samsung", "gucci", "louis vuitton", "eurobet", "snai", "sisal", "bet365",
  "betsson", "goldbet", "lottomatica", "juventus", "juve", "inter", "milan", "napoli", "roma", "lazio", "atalanta",
  "fiorentina", "torino", "como 1907", "lecco", "barcellona", "barcelona", "real madrid", "psg", "chelsea",
  "liverpool", "manchester", "arsenal", "bayern", "borussia", "figc", "lnd", "serie a", "champions league", "uefa",
  "fifa", "stemma", "logo", "sponsor", "crest", "badge",
];

const SEXUAL: readonly string[] = [
  "nudo", "nuda", "nudi", "nude", "naked", "nudity", "sexy", "sesso", "sex", "porno", "porn", "erotico", "erotica",
  "erotic", "seno", "tette", "boobs", "breast", "breasts", "culo", "intimo", "lingerie", "topless", "nsfw", "sensuale",
  "provocante", "strip", "spogliarello", "fetish", "bondage", "bikini", "mutande", "underwear", "hentai",
];

const VIOLENT: readonly string[] = [
  "sangue", "sanguinante", "arma", "armi", "pistola", "fucile", "mitra", "coltello", "spada", "bomba", "esplosione",
  "morto", "morta", "morte", "uccidere", "ucciso", "cadavere", "ferito", "ferita", "guerra", "terrorista", "blood",
  "bloody", "gun", "guns", "rifle", "knife", "sword", "weapon", "weapons", "bomb", "explosion", "kill", "killing",
  "dead", "corpse", "gore", "war", "terrorist", "rissa", "pugno in faccia", "decapitato",
];

const HATE_OFFENSIVE: readonly string[] = [
  "negro", "negri", "frocio", "froci", "ricchione", "terrone", "terroni", "zingaro", "nazista", "nazi", "svastica",
  "swastika", "duce", "kkk", "stronzo", "stronza", "merda", "cazzo", "vaffanculo", "puttana", "troia", "coglione",
  "bastardo", "idiota", "deficiente", "fuck", "shit", "bitch", "slut", "whore", "retard", "faggot", "nigger",
];

const MINORS: readonly string[] = [
  "bambino", "bambina", "bambini", "bimbo", "bimba", "neonato", "ragazzino", "ragazzina", "minorenne", "child",
  "children", "kid", "kids", "toddler", "baby", "underage", "teen", "teenager",
];

const SUBSTANCES_BETTING: readonly string[] = [
  "droga", "droghe", "cocaina", "eroina", "canna", "spinello", "marijuana", "birra", "alcol", "alcool", "vino",
  "sigaretta", "sigarette", "fumare", "scommessa", "scommesse", "drug", "drugs", "cocaine", "weed", "beer",
  "alcohol", "cigarette", "smoking", "vape", "betting", "casino",
];

/** Common first names: "Nome Cognome" in free text or nickname is treated as a real person. */
const FIRST_NAMES: readonly string[] = [
  "marco", "luca", "andrea", "matteo", "alessandro", "lorenzo", "francesco", "giuseppe", "giovanni", "davide",
  "simone", "federico", "riccardo", "stefano", "paolo", "roberto", "antonio", "mario", "luigi", "fabio", "gabriele",
  "tommaso", "leonardo", "edoardo", "filippo", "nicola", "pietro", "samuele", "mattia", "diego", "emanuele",
  "giulia", "sofia", "aurora", "alice", "martina", "chiara", "sara", "francesca", "giorgia", "elena", "anna",
  "laura", "valentina", "beatrice", "ginevra", "emma", "greta", "noemi", "elisa", "federica", "silvia", "paola",
  "john", "james", "michael", "david", "robert", "mary", "jennifer", "linda", "sarah", "emily",
];

const LISTS: Array<[ModerationCategory, readonly string[]]> = [
  ["SESSUALE", SEXUAL],
  ["VIOLENZA", VIOLENT],
  ["ODIO_OFFESE", HATE_OFFENSIVE],
  ["MINORI", MINORS],
  ["SOSTANZE_SCOMMESSE", SUBSTANCES_BETTING],
  ["PERSONA_REALE", REAL_PEOPLE],
  ["MARCHIO", BRANDS],
];

function containsWord(norm: string, word: string): boolean {
  return norm.includes(` ${word} `);
}

function looksLikeFullName(text: string): boolean {
  // Two consecutive words where the first is a common first name and the second looks like a surname.
  const words = normalizeForMatch(text).trim().split(" ").filter(Boolean);
  for (let i = 0; i < words.length - 1; i++) {
    const first = words[i]!;
    const second = words[i + 1]!;
    if (FIRST_NAMES.includes(first) && /^[a-z]{3,}$/.test(second) && !FIRST_NAMES.includes(second)) {
      if (!GENERIC_AFTER_NAME.has(second)) return true;
    }
  }
  return false;
}

/** Words that may follow a first name without making it a surname ("Marco veloce"). */
const GENERIC_AFTER_NAME = new Set([
  "veloce", "forte", "alto", "alta", "basso", "bassa", "con", "che", "dai", "the", "and", "numero", "capitano",
]);

/** Deterministic text check (Italian + English). Server and client run the same function. */
export function moderateText(text: string): ModerationOutcome {
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text) || /(https?:\/\/|www\.)/i.test(text) || /(\+?\d[\s.-]?){7,}/.test(text))
    return { ok: false, category: "DATI_PERSONALI", message: MESSAGES.DATI_PERSONALI };
  const norm = normalizeForMatch(text);
  for (const [category, list] of LISTS) {
    if (list.some((w) => containsWord(norm, w))) return { ok: false, category, message: MESSAGES[category] };
  }
  if (looksLikeFullName(text)) return { ok: false, category: "PERSONA_REALE", message: MESSAGES.PERSONA_REALE };
  return { ok: true };
}

/* ------------------------------------------------------ text generation */

export const DESCRIPTION_MAX = 300;

export const QUICK_CHOICES = {
  hair: ["Ricci scuri", "Lisci castani", "Rasati", "Coda bionda", "Mossi rossi"],
  skin: ["Chiara", "Media", "Olivastra", "Scura"],
  build: ["Snella", "Atletica", "Robusta"],
  role: ["Portiere", "Difensore", "Centrocampista", "Attaccante", "Tifoso", "Mister"],
  celebration: ["Braccia al cielo", "Aereo", "Cuore"],
} as const;

export type QuickKey = keyof typeof QUICK_CHOICES;
export type QuickSelection = Partial<Record<QuickKey, string>>;

const QUICK_EN: Record<string, string> = {
  "Ricci scuri": "dark curly hair",
  "Lisci castani": "straight brown hair",
  Rasati: "buzz-cut hair",
  "Coda bionda": "blonde ponytail",
  "Mossi rossi": "wavy red hair",
  Chiara: "fair skin",
  Media: "medium skin tone",
  Olivastra: "olive skin",
  Scura: "dark skin",
  Snella: "slim build",
  Atletica: "athletic build",
  Robusta: "sturdy build",
  Portiere: "goalkeeper in a plain yellow goalkeeper jersey and gloves",
  Difensore: "defender",
  Centrocampista: "midfielder",
  Attaccante: "striker",
  Tifoso: "supporter in a plain blue hoodie and white scarf in the stands",
  Mister: "coach in a plain navy tracksuit on the touchline",
  "Braccia al cielo": "celebrating with both arms raised",
  Aereo: "celebrating with arms spread like wings",
  Cuore: "making a heart shape with the hands",
};

export function sanitizeQuick(sel: QuickSelection): QuickSelection {
  const out: QuickSelection = {};
  for (const k of Object.keys(QUICK_CHOICES) as QuickKey[]) {
    const v = sel[k];
    if (v && (QUICK_CHOICES[k] as readonly string[]).includes(v)) out[k] = v;
  }
  return out;
}

export interface DescriptionInput {
  description: string;
  quick: QuickSelection;
  nickname: string;
  shirtNumber: number;
}

export type DescriptionCheck = { ok: true; prompt: string } | { ok: false; error: string };

/**
 * Builds the provider prompt from moderated input. Fixed guard rails: fictitious adult, plain kit without logos,
 * crest, sponsor or text; back view (face not visible) for minor or unknown-age accounts.
 */
export function buildAvatarPrompt(input: DescriptionInput, band: AgeBand): DescriptionCheck {
  const description = input.description.replace(/\s+/g, " ").trim();
  if ([...description].length > DESCRIPTION_MAX) return { ok: false, error: `Massimo ${DESCRIPTION_MAX} caratteri.` };
  const quick = sanitizeQuick(input.quick);
  if (!description && Object.keys(quick).length === 0)
    return { ok: false, error: "Scrivi com'è il tuo campione o tocca almeno una scelta rapida." };
  if (description) {
    const m = moderateText(description);
    if (!m.ok) return { ok: false, error: m.message };
  }
  const nick = validateNickname(input.nickname);
  if (!nick.ok) return { ok: false, error: `Nickname: ${nick.error}` };
  const num = validateShirtNumber(input.shirtNumber);
  if (!num.ok) return { ok: false, error: `Numero: ${num.error}` };
  const details = (Object.keys(quick) as QuickKey[]).map((k) => QUICK_EN[quick[k]!]).filter(Boolean);
  const view = treatAsMinor(band)
    ? "seen from behind, face not visible, back of the jersey towards the camera"
    : "three-quarter view";
  const parts = [
    "Photorealistic sports portrait of a fictitious adult amateur football player, not resembling any real person",
    view,
    details.length ? details.join(", ") : null,
    "plain navy and royal blue football kit with no logos, no crest, no sponsor and no text except the shirt number " + num.value,
    "night match atmosphere, floodlit grass pitch, shallow depth of field, natural colours",
    "fully clothed, family friendly, no weapons, no alcohol",
    description ? `Extra details from the member (Italian): ${description}` : null,
  ];
  return { ok: true, prompt: parts.filter((p): p is string => !!p).join(". ") + "." };
}

/* ----------------------------------------------------------------- caps */

export const AVATAR_GEN_DAILY_CAP = 3;
export const AVATAR_GEN_MONTHLY_CAP = 10;

export interface CapState {
  allowed: boolean;
  remainingToday: number;
  remainingMonth: number;
  message: string | null;
}

export function capState(usedToday: number, usedMonth: number): CapState {
  const remainingToday = Math.max(0, AVATAR_GEN_DAILY_CAP - Math.max(0, usedToday));
  const remainingMonth = Math.max(0, AVATAR_GEN_MONTHLY_CAP - Math.max(0, usedMonth));
  if (remainingMonth === 0)
    return { allowed: false, remainingToday, remainingMonth, message: `Hai usato le ${AVATAR_GEN_MONTHLY_CAP} creazioni del mese.` };
  if (remainingToday === 0)
    return { allowed: false, remainingToday, remainingMonth, message: `Hai usato le ${AVATAR_GEN_DAILY_CAP} creazioni di oggi: riprova domani.` };
  return { allowed: true, remainingToday, remainingMonth, message: null };
}

/* ------------------------------------------------------ generation gate */

export const VERTEX_IMAGEN_MODEL = "imagen-4.0-fast-generate-001";
export const DEFAULT_VERTEX_LOCATION = "europe-west4";

export type GenDisabledReason = "FLAG_OFF" | "MISSING_CREDENTIALS" | "NON_EU_REGION";

export type GenConfig =
  | { enabled: true; projectId: string; location: string; model: string }
  | { enabled: false; reason: GenDisabledReason };

/** Generation runs only with SCD_AVATAR_GEN_ENABLED=true, a Vertex project, service-account JSON and an EU region. */
export function avatarGenConfig(env: Readonly<Record<string, string | undefined>>): GenConfig {
  if ((env["SCD_AVATAR_GEN_ENABLED"] ?? "").trim() !== "true") return { enabled: false, reason: "FLAG_OFF" };
  const projectId = (env["SCD_VERTEX_PROJECT_ID"] ?? "").trim();
  const sa = (env["SCD_VERTEX_SA_JSON"] ?? "").trim();
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || !sa) return { enabled: false, reason: "MISSING_CREDENTIALS" };
  const location = (env["SCD_VERTEX_LOCATION"] ?? DEFAULT_VERTEX_LOCATION).trim();
  if (!/^europe-[a-z]+\d+$/.test(location)) return { enabled: false, reason: "NON_EU_REGION" };
  return { enabled: true, projectId, location, model: VERTEX_IMAGEN_MODEL };
}

export const GEN_DISABLED_LABEL = "Generazione non ancora attiva";

export function genDisabledText(reason: GenDisabledReason): string {
  switch (reason) {
    case "FLAG_OFF":
      return "La Direzione non ha ancora acceso la creazione con IA: nessun testo viene inviato.";
    case "MISSING_CREDENTIALS":
      return "Il collegamento al servizio di generazione (Google Vertex AI, UE) non è ancora configurato.";
    case "NON_EU_REGION":
      return "Il servizio è configurato fuori dall'UE: la generazione resta spenta.";
  }
}

/** Vertex AI Imagen predict request (pure, so the shape is tested without any network call). */
export function vertexImagenRequest(cfg: { projectId: string; location: string; model: string }, prompt: string) {
  return {
    url: `https://${cfg.location}-aiplatform.googleapis.com/v1/projects/${cfg.projectId}/locations/${cfg.location}/publishers/google/models/${cfg.model}:predict`,
    body: {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "3:4",
        personGeneration: "allow_adult",
        safetySetting: "block_low_and_above",
        addWatermark: true,
        includeRaiReason: true,
        language: "en",
      },
    },
  };
}

export const AI_LABEL = "Creato con IA · non è una foto";

/* ---------------------------------------------------------------- photo */

export interface PhotoPathState {
  available: false;
  title: string;
  text: string;
  familyRoute: string | null;
}

/** v1: the face-photo path is visible but locked for everyone; minors are pointed to the Famiglia area. */
export function photoPathFor(band: AgeBand): PhotoPathState {
  return {
    available: false,
    title: "In arrivo",
    text: "Serve il consenso e la valutazione privacy (DPIA): fino ad allora nessuna foto viene caricata.",
    familyRoute: treatAsMinor(band) ? "/famiglia" : null,
  };
}

/* ---------------------------------------------------------------- cards */

export type CardKind = "TIFOSO" | "TESSERATO" | "FAMIGLIA";

export const CARD_LABEL: Record<CardKind, string> = {
  TIFOSO: "Card Tifoso",
  TESSERATO: "Card Tesserato",
  FAMIGLIA: "Card Famiglia",
};

const TESSERATO_ROLES = new Set(["ATHLETE", "MISTER", "STAFF", "MANAGER", "SECRETARIAT", "REGISTRATION", "TOURNAMENTS", "DIRECTION"]);

/** Derived from active membership roles (scd_memberships via scd_my_context). Every signed-in member is a Tifoso. */
export function cardsFromRoles(dbRoles: readonly string[]): { primary: CardKind; held: CardKind[] } {
  const held: CardKind[] = ["TIFOSO"];
  if (dbRoles.some((r) => TESSERATO_ROLES.has(r))) held.push("TESSERATO");
  if (dbRoles.includes("FAMILY")) held.push("FAMIGLIA");
  const primary: CardKind = held.includes("TESSERATO") ? "TESSERATO" : held.includes("FAMIGLIA") ? "FAMIGLIA" : "TIFOSO";
  return { primary, held };
}

export const CARD_INFO: Record<CardKind, { who: string; benefits: string[]; howToGet: string }> = {
  TIFOSO: {
    who: "Per chi si registra all'app: tifosi, amici e sostenitori.",
    benefits: ["Crediti con le attività del club", "Avatar e personalizzazioni", "Offerte dei partner (da concordare)"],
    howToGet: "Attiva con la registrazione.",
  },
  TESSERATO: {
    who: "Per atleti, mister, dirigenti e staff tesserati.",
    benefits: [
      "Ingresso gratuito alle gare casalinghe con 2 familiari",
      "Priorità a eventi e tornei (da definire)",
      "Vantaggi partner e club house (da concordare)",
    ],
    howToGet: "Si attiva quando la Segreteria collega il tuo tesseramento.",
  },
  FAMIGLIA: {
    who: "Per i genitori degli atleti del settore giovanile.",
    benefits: ["Un'unica card per la famiglia", "Avatar dei figli creati dal genitore", "Vantaggi famiglia (da definire)"],
    howToGet: "Si attiva quando la Segreteria collega il tuo account alla famiglia.",
  },
};

/* -------------------------------------------------------------- credits */

export interface CreditsView {
  balance: number;
  connected: boolean;
  note: string;
}

/** Read-only balance from scd_fan_points_ledger; when the ledger is not reachable: 0 with an honest note. */
export function creditsView(balance: number | null | undefined): CreditsView {
  if (typeof balance !== "number" || !Number.isFinite(balance))
    return {
      balance: 0,
      connected: false,
      note: "Il registro crediti non è ancora collegato a questa pagina: per ora il saldo è 0.",
    };
  const b = Math.max(0, Math.trunc(balance));
  return {
    balance: b,
    connected: true,
    note: b === 0 ? "Nessun credito registrato finora." : "Saldo dal registro crediti del club.",
  };
}

export const CREDITS_RULES_STATUS = "Valori in definizione dalla Direzione";

export const CREDITS_NOT_MONEY =
  "I crediti sono virtuali: non sono denaro, non si comprano, non si convertono e non si vincono a sorte.";

export interface EarnWay {
  code: string;
  label: string;
  detail: string;
}

/** Ways to earn credits listed by the Direzione (integration 13/10/2026 08:48). Values still to be decided. */
export const CREDIT_EARN_WAYS: readonly EarnWay[] = [
  {
    code: "DONATION_SOLIDARITY",
    label: "Donazioni al Fondo Solidale",
    detail: "Riconoscimento simbolico e uguale per ogni importo, legato alla ricevuta in tesoreria.",
  },
  {
    code: "DONATION_FACILITY",
    label: "Donazioni per migliorare il centro sportivo",
    detail: "Acquisti o migliorie del centro: riconoscimento simbolico, mai proporzionale all'importo.",
  },
  { code: "PARTNER_ACCOUNT", label: "Sponsor e partner", detail: "Per le aziende sponsor, secondo il contratto firmato." },
  { code: "PROPOSAL_ACCEPTED", label: "Idee e proposte", detail: "Quando la Direzione accoglie una tua proposta." },
  { code: "BIRTHDAY", label: "Compleanno", detail: "Un regalo all'anno; la data non viene mai mostrata." },
  { code: "EVENT_CHECKIN", label: "Tornei ed eventi", detail: "Partecipazione registrata all'ingresso." },
  {
    code: "MONTH_AWARD",
    label: "Migliori votati: portieri, attaccanti e altri ruoli",
    detail: "Premi del mese chiusi; per l'attività di base solo premi di squadra.",
  },
  { code: "FAIR_PLAY_MONTH", label: "Nessuna ammonizione", detail: "Mese senza cartellini, dal tabellino registrato; mai pubblico." },
  {
    code: "COACH_FEEDBACK",
    label: "Feedback positivo di mister e dirigenti",
    detail: "Visibile solo all'atleta e alla famiglia.",
  },
];
