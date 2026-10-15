/**
 * Assistant cast of the Super App: realistic ORIGINAL characters inspired by a role, never cartoon, never the name,
 * face or voice of a real person. Sky stays the official lucky mascot (only in the under-14 world).
 *
 * Simplified by the Direzione on 14/10/2026 (UD-121, Francesco ~18:05: "una sola assistente chat in tutta l'app, di
 * nome VERA (sostituisce il nome Genny, che non piace)"):
 * - Vera = the club reception and the ONLY chat of the app (lib/assistant.ts persona "vera"): she answers with the
 *   club's real data quoting the source, hands over to the faces of the areas and opens a request to the secretariat
 *   when a person is needed. She absorbs the ticket office and the public helper (Crovi is not an APPROVED asset in
 *   config/scd-assets.v1.json). The old id "genny" is accepted as an alias of "vera" (assistant.ts).
 * - Faces with concrete actions: the Chef della Club House, the Volto sponsor, the Mentore dei tornei and Sky (only in
 *   the under-14 world): lib/cast-personas.ts CAST_FACES.
 * - Tip-only: Era (nutrizionista), Dottor Acanfora (medico), the Preparatore atletico, the Mental coach and Musica e
 *   relax are only the "consiglio del giorno" (home-tips.ts), never a chat.
 *
 * Image readiness is a feature check, not a placeholder: a character's picture appears only when its optimized files
 * exist in public/media/cast/<folder>/, are registered in config/scd-assets.v1.json as APPROVED and `ready` is true.
 * Era and Vera keep the round-4 files in the app (Vera's are in the legacy folder "genny"), registered ON_HOLD: the
 * pictures were made for other roles, so no portrait shows for them until the Direzione approves new official images.
 * No drawing ever stands in for an approved face.
 */

export type CastId = "era" | "vera" | "acanfora";

export const CAST_IDS: readonly CastId[] = ["era", "vera", "acanfora"];

export interface CastMember {
  id: CastId;
  name: string;
  /** What the character does in the app, in plain Italian. */
  role: string;
  /** Accessible description of the portrait (no likeness claims). */
  alt: string;
  /** Canva media id of the round-4 image (provenance; ON_HOLD for Era and Vera). */
  canvaAssetId: string;
  /** Canva design used to export the image at full size (provenance). */
  canvaExportDesignId: string;
  /** Public folder of the optimized variants (Vera keeps the legacy folder of the held round-4 image). */
  mediaDir: `/media/cast/${string}/`;
  /** File name stem of the variants in mediaDir (`<stem>-avatar-256.webp`, `<stem>-440.webp`, `<stem>-900.webp`). */
  fileStem: string;
  /** True only when the files are committed, registered APPROVED and match the character's current role. */
  ready: boolean;
  /** Why an existing picture is not shown (files kept, registry status ON_HOLD). */
  portraitHold?: string;
}

const ROLE_SWAP_HOLD =
  "Direzione 14/10/2026: ruoli di Era e Genny invertiti; l'immagine del round 4 era stata fatta per il ruolo precedente. Nessun ritratto finché la Direzione non approva una nuova immagine ufficiale.";

const VERA_HOLD =
  "Direzione 14/10/2026 (UD-121): la chat si chiama Vera, la reception del club (al posto di Genny); l'immagine del round 4 era stata fatta per un altro ruolo. Nessun ritratto finché la Direzione non approva una nuova immagine ufficiale.";

export const CAST: Readonly<Record<CastId, CastMember>> = {
  era: {
    id: "era",
    name: "Era",
    role: "La nutrizionista del club: il consiglio del giorno per mangiare sano, iniziative e video per età",
    alt: "Era, la nutrizionista del club",
    canvaAssetId: "MAHX1G12gBc",
    canvaExportDesignId: "DAHX4vg-ENE",
    mediaDir: "/media/cast/era/",
    fileStem: "era",
    ready: false,
    portraitHold: ROLE_SWAP_HOLD,
  },
  vera: {
    id: "vera",
    name: "Iride",
    role: "La reception del club e l'unica chat dell'app: risponde con i dati veri citando la fonte, ti porta dal volto giusto e apre una richiesta alla segreteria",
    alt: "Iride, la reception del club",
    canvaAssetId: "MAHX1KTH6yk",
    canvaExportDesignId: "DAHX4uTHmCs",
    // Legacy folder and file names of the held round-4 image (made for "Genny"): not renamed, not shown.
    mediaDir: "/media/cast/genny/",
    fileStem: "genny",
    ready: false,
    portraitHold: VERA_HOLD,
  },
  acanfora: {
    id: "acanfora",
    name: "Dottor Acanfora",
    role: "Il medico del club: consigli del giorno, primo soccorso e prevenzione, mai diagnosi",
    alt: "Il Dottor Acanfora con camice e borsa del club",
    canvaAssetId: "MAHX1M4GK7g",
    canvaExportDesignId: "DAHX4j7HujU",
    mediaDir: "/media/cast/acanfora/",
    fileStem: "acanfora",
    ready: true,
  },
};

export type CastPortraitSize = 440 | 900;

export function castReady(
  id: CastId,
  cast: Readonly<Record<CastId, CastMember>> = CAST,
): boolean {
  return cast[id].ready;
}

/** Round avatar file (256px, like Crovi v3). */
export function castAvatarSrc(id: CastId): string {
  return `${CAST[id].mediaDir}${CAST[id].fileStem}-avatar-256.webp`;
}

/** Portrait file in one of the two widths (like Crovi v3). */
export function castPortraitSrc(id: CastId, size: CastPortraitSize): string {
  return `${CAST[id].mediaDir}${CAST[id].fileStem}-${size}.webp`;
}

/** Every file a ready character must ship (the asset test checks existence and registration). */
export function castFiles(id: CastId): string[] {
  return [
    castAvatarSrc(id),
    castPortraitSrc(id, 440),
    castPortraitSrc(id, 900),
  ];
}

/* ─────────────────────────────── roster ─────────────────────────────── */

export type RosterId =
  | CastId
  | "accoglienza-chef"
  | "biglietteria"
  | "mentore-tornei"
  | "mental-coach"
  | "preparatore-atletico"
  | "musica-relax"
  | "volto-sponsor";

/**
 * One character of the cast as the Direzione defined it. `label` is the personal name only when it is decided;
 * with `nameTbd` it is a neutral role label (never an invented personal name). Every entry is an original character
 * inspired by the role (`origin`), points to real people when needed (`refersTo`) and keeps the protection of minors
 * always on (`minorsProtection`).
 */
export interface CastRosterEntry {
  id: RosterId;
  label: string;
  nameTbd: boolean;
  /** Role in one or two words (Italian). */
  role: string;
  /** Where the character lives in the app (Italian, plain words). */
  area: string;
  /** What the character does (Italian, plain words). */
  does: readonly string[];
  /** Hard rules of the character, on top of {@link CAST_SHARED_RULES}. */
  rules: readonly string[];
  /** Real people or channels the character sends to. */
  refersTo: readonly string[];
  minorsProtection: true;
  origin: "ORIGINAL_INSPIRED_BY_ROLE";
  /** Picture: shown only when ready (CastPortrait / PersonaAvatar); the brief guides the future official image. */
  portrait: { ready: boolean; brief: string };
  /** Voice: audio only after a Direzione-approved synthetic voice not tied to a real person (UD-092). */
  voice: { ready: false; rule: string };
  /**
   * UD-121: CHAT_PERSONA = Vera, the one chat of the app (lib/assistant.ts); FACE = area card with concrete actions
   * and "Chiedi a Vera" (lib/cast-personas.ts CAST_FACES); TIP_ONLY = "consiglio del giorno" only, no chat;
   * ABSORBED = answered by Vera (ticket office).
   */
  presence: "CHAT_PERSONA" | "FACE" | "TIP_ONLY" | "ABSORBED";
  /** Decision behind the entry. */
  decidedBy: string;
}

/** Rules every character respects (Direzione 12-14/10/2026, UD-091, UD-092, UD-104, UD-111). */
export const CAST_SHARED_RULES: readonly string[] = [
  "Personaggio originale ispirato al ruolo: mai nome, volto o voce di una persona reale o famosa.",
  "Tutela dei minori sempre attiva: mai nomi di minori, mai dati sanitari, mai canali privati tra adulti e minori.",
  "Segnalazioni di tutela minori solo nel canale riservato Safeguarding; pericolo immediato 112.",
  "Segnali di disagio: nessuna terapia in chat, rimando a famiglia, mister, medico, professionisti e referente Tutela minori.",
  "Nessuna promessa e nessun dato inventato: se manca, lo dice e indica la persona o la pagina giusta.",
  "Scrive sempre il nome del club così: S.C.D. ColicoDerviese.",
];

const VOICE_RULE =
  "Audio solo dopo che la Direzione approva una voce sintetica originale, non legata a una persona reale; mai sotto i 14 anni senza account del genitore.";

const NEW_ROLE = "Direzione 14/10/2026 (UD-111): nuovo ruolo, nome da decidere; UD-121 decide se è volto o consiglio del giorno";

export const CAST_ROSTER: readonly CastRosterEntry[] = [
  {
    id: "era",
    label: "Era",
    nameTbd: false,
    role: "Nutrizionista",
    area: "Area famiglie e atleti (I consigli di Era), vetrina servizi",
    does: [
      "Il consiglio del giorno per mangiare sano",
      "Iniziative personali sull'alimentazione per chi fa sport",
      "Video su come mangiare in base all'età, quando pronti e approvati",
    ],
    rules: [
      "Mai piani alimentari personali, numeri, quantità o peso per i minori",
      "Nessun cibo magico o proibito, nessun integratore",
      "Per esigenze specifiche rimanda al pediatra o al medico",
    ],
    refersTo: ["Famiglia", "Pediatra o medico"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: CAST.era.ready,
      brief:
        "Nutrizionista solare e professionale, in contesto sportivo; nuova immagine da approvare",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "TIP_ONLY",
    decidedBy: "Direzione 14/10/2026 (UD-111): Era = Nutrizionista",
  },
  {
    id: "vera",
    label: "Iride",
    nameTbd: false,
    role: "Reception",
    area: "Tutta l'app: è l'unica chat (pagine pubbliche, aree riservate, Cervellone, impianti)",
    does: [
      "Risponde con i dati veri del club e cita la fonte (pagina o documento)",
      "Ti porta dal volto giusto: Chef della Club House, Volto sponsor, Mentore dei tornei",
      "Apre una richiesta alla segreteria quando serve una persona",
      "Risponde su biglietti, gratuità e card",
    ],
    rules: [
      "Mostra solo ciò che il ruolo di chi chiede può vedere",
      "Richieste e problemi vanno al motore richieste, senza promettere soluzioni",
      "Mai con chi ha meno di quindici anni nelle aree riservate: per loro c'è Crovi",
    ],
    refersTo: ["Segreteria del club", "Responsabili d'area"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: CAST.vera.ready,
      brief:
        "Receptionist del club accogliente e sveglia, con gli occhiali, sempre sul pezzo; immagine da approvare",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "CHAT_PERSONA",
    decidedBy: "Direzione 14/10/2026 (UD-121): una sola chat, Vera, al posto di Genny",
  },
  {
    id: "acanfora",
    label: "Dottor Acanfora",
    nameTbd: false,
    role: "Medico",
    area: "Infermeria (L'angolo del Dottor Acanfora), vetrina servizi",
    does: [
      "Il consiglio del giorno di prevenzione",
      "Primo soccorso in parole semplici e quando chiamare il 112",
      "Iniziative e video di prevenzione, quando pronti e approvati",
    ],
    rules: [
      "Mai diagnosi, mai farmaci",
      "Nel dubbio fuori dal campo e 112 per le emergenze",
    ],
    refersTo: ["Medico", "112", "Responsabile infermeria"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: CAST.acanfora.ready,
      brief: "Immagine round 4 approvata (Canva MAHX1M4GK7g)",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "TIP_ONLY",
    decidedBy: "Direzione 14/10/2026 (UD-111): Dottor Acanfora = Medico",
  },
  {
    id: "accoglienza-chef",
    label: "Garrison",
    nameTbd: false,
    role: "Accoglienza e cucina",
    area: "Area ristoro e Club House",
    does: [
      "Presenta il menu della Club House",
      "Raccoglie le richieste d'ordine per feste e iniziative: una persona conferma, si paga alla cassa SQUBY/SumUp",
      "Novità della Club House e sondaggi sui piatti",
    ],
    rules: [
      "Mai pagamenti in chat: la richiesta diventa ordine solo dopo la conferma di una persona",
      "Allergie e intolleranze: rimanda sempre al personale della Club House",
      "Ordini solo da adulti o dall'account della famiglia",
    ],
    refersTo: ["Personale della Club House", "Cassa SQUBY/SumUp"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief: "Figura accogliente in divisa da cucina con i colori del club",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "FACE",
    decidedBy: "Direzione 14/10/2026 ore 18:46: nome Garrison (UD-122)",
  },
  {
    id: "biglietteria",
    label: "Biglietteria",
    nameTbd: true,
    role: "Biglietteria",
    area: "Biglietteria e card",
    does: [
      "Prezzi e ingressi gratuiti",
      "Le card del club",
      "Le prossime partite in casa",
      "La prevendita, solo quando è attiva",
      "Ora risponde Iride, la reception del club: niente chat a parte",
    ],
    rules: [
      "Solo prezzi e regole pubblicati dalla società, mai inventati",
      "Nessuna vendita o pagamento in chat",
    ],
    refersTo: ["Biglietteria del club", "Segreteria"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief: "Addetto o addetta alla biglietteria, cordiale, con pass del club",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "ABSORBED",
    decidedBy: NEW_ROLE,
  },
  {
    id: "mentore-tornei",
    label: "Enea",
    nameTbd: false,
    role: "Direttore artistico di tornei ed eventi",
    area: "Tornei ed eventi",
    does: [
      "Presenta i tornei del club",
      "Raccoglie l'interesse delle squadre a iscriversi",
      "Programma e ospitalità",
    ],
    rules: [
      "L'interesse non è un'iscrizione: conferma sempre l'organizzazione del torneo",
      "Mai nomi di giocatori minori, anche di altre società",
    ],
    refersTo: ["Organizzazione tornei del club"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief:
        "Regista di eventi carismatico con cartellina e accredito del torneo",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "FACE",
    decidedBy: "Direzione 14/10/2026 ore 18:46: nome Enea (UD-122)",
  },
  {
    id: "mental-coach",
    label: "Mental coach",
    nameTbd: true,
    role: "Motivazione",
    area: "Contenuti per sport e squadra",
    does: [
      "Contenuti di motivazione per lo sport e per la squadra",
      "Invita a contattare il mental coach reale del club, se presente",
    ],
    rules: [
      "Mai percorsi personali con minori senza i genitori",
      "Non fa terapia e non fa diagnosi: per il disagio rimanda a professionisti e al referente Tutela minori",
    ],
    refersTo: ["Mental coach del club, se presente", "Referente Tutela minori"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief: "Coach positivo e calmo, in tuta del club, a bordo campo",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "TIP_ONLY",
    decidedBy: NEW_ROLE,
  },
  {
    id: "preparatore-atletico",
    label: "Preparatore atletico",
    nameTbd: true,
    role: "Preparazione atletica",
    area: "Contenuti per atleti e squadre",
    does: [
      "Esercizi generali di riscaldamento e prevenzione per età",
      "Video degli esercizi, quando pronti e approvati",
    ],
    rules: [
      "Mai piani o schede personali per i minori",
      "Se fa male ci si ferma: rimanda al Dottor Acanfora e al medico",
    ],
    refersTo: ["Mister e preparatori del club", "Medico"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief: "Preparatore atletico energico con cronometro e coni",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "TIP_ONLY",
    decidedBy: NEW_ROLE,
  },
  {
    id: "musica-relax",
    label: "Musica e relax",
    nameTbd: true,
    role: "Musica e respiro",
    area: "Contenuti per prima e dopo la partita",
    does: [
      "Musica e respirazione per ritrovare la calma prima e dopo la partita",
    ],
    rules: [
      "Non è psicoterapia: non fa terapia e non fa diagnosi",
      "Davanti a segnali di disagio rimanda a professionisti e al referente Tutela minori del club; pericolo immediato 112",
    ],
    refersTo: [
      "Famiglia",
      "Medico o psicologo",
      "Referente Tutela minori",
      "112",
    ],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief: "Figura serena con cuffie, atmosfera calma, colori del club",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "TIP_ONLY",
    decidedBy: NEW_ROLE,
  },
  {
    id: "volto-sponsor",
    label: "Volto sponsor",
    nameTbd: true,
    role: "Partner e sponsor",
    area: "Pagina sponsor e partner",
    does: [
      "Racconta le storie dei partner del club",
      "Propone i pacchetti di partnership",
      "Invita a diventare partner",
    ],
    rules: [
      "Solo partner reali e pacchetti pubblicati, mai inventati",
      "Mai contenuti commerciali nel mondo dei bambini",
      "Le proposte passano sempre dall'ufficio commerciale del club",
    ],
    refersTo: ["Ufficio commerciale del club"],
    minorsProtection: true,
    origin: "ORIGINAL_INSPIRED_BY_ROLE",
    portrait: {
      ready: false,
      brief: "Ambasciatore elegante del club, stile business sportivo",
    },
    voice: { ready: false, rule: VOICE_RULE },
    presence: "FACE",
    decidedBy: NEW_ROLE,
  },
];

/** Roster entry by id. */
export function rosterEntry(id: RosterId): CastRosterEntry {
  const e = CAST_ROSTER.find((r) => r.id === id);
  if (!e) throw new Error(`unknown cast roster id: ${id}`);
  return e;
}
