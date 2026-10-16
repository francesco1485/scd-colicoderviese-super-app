/**
 * G14 "Rubrica chi fa cosa" (UD-141, UD-154, UD-155, UD-156, UD-159). Pure routing: from a topic, a site and
 * optionally a team to the POSITIONS of the organigram registry that must decide, prepare or be informed, each with
 * a reason, plus the hierarchy rule of UD-141 (request from a superior = confirmed and the people below are
 * notified; request from below = "da confermare" by the superior, the others are notified after acceptance).
 *
 * What this module never does: it names no person, holds no address or phone number and sends nothing. Recipient
 * people are resolved elsewhere from the gestionale registry (positions and person grants), never from addresses
 * found in a mail (UD-141 limits). Only adult positions with a club role can be returned: never families, athletes
 * (minors), partners or external people. Positions Francesco named that the registry does not have yet
 * (none since r138, UD-161) and r138 positions before r138 is live are reported as missing and never used as
 * recipients (fail closed).
 *
 * Users: Iride staff alerts (UD-155), the Google Calendar agent (UD-141) and the request machine (UD-154).
 * Who holds a responsibility is decided in the gestionale by the Direttore Generale and the Presidente (UD-159),
 * not here: this table says which POSITION is concerned by a topic, the registry says who holds it.
 *
 * Engine: TEMPO (the right people are told at the first message, no phone round-trips) and PERSONE (one clear
 * owner per topic). Measure: share of Iride/Calendar notices routed by this table without manual correction by the
 * Segreteria (target >= 90%), and share of Dervio notices that reach the UD-156 set (target 100%).
 */
import { z } from "zod";

import { POSITION_LABEL } from "./access-admin";
import { REQUEST_TEAMS, REQUEST_WATCHERS, confirmerFor, positionExists, teamLabel } from "./request-machine";
import { KNOWN_POSITIONS, R138_POSITIONS, positionLive } from "./session";

/* ------------------------------------------------------------------ vocabulary */

export const CHI_FA_COSA_TOPICS = [
  "allenamenti",
  "gara",
  "pulmini",
  "iscrizioni",
  "pagamenti",
  "salute",
  "minori-organizzativo",
  "impianti",
  "tornei",
  "sponsor",
  "comunicazioni",
  "emergenza",
] as const;
export type ChiFaCosaTopic = (typeof CHI_FA_COSA_TOPICS)[number];

export const TOPIC_LABEL: Readonly<Record<ChiFaCosaTopic, string>> = {
  allenamenti: "Allenamenti",
  gara: "Gara o amichevole",
  pulmini: "Pulmini",
  iscrizioni: "Iscrizioni e tesseramenti",
  pagamenti: "Quote e pagamenti",
  salute: "Salute e infermeria",
  "minori-organizzativo": "Minori: aspetti organizzativi",
  impianti: "Impianti e campi",
  tornei: "Tornei",
  sponsor: "Sponsor e partner",
  comunicazioni: "Comunicazioni del club",
  emergenza: "Emergenza",
};

export const CHI_FA_COSA_SITES = ["COLICO", "DERVIO", "ENTRAMBE"] as const;
export type ChiFaCosaSite = (typeof CHI_FA_COSA_SITES)[number];

/** What the position does with the notice. */
export type Duty = "DECIDE" | "PREPARE" | "INFORM";
/** When the position is told: now, or only after the superior accepted a request from below (UD-141). */
export type NoticeTime = "NOW" | "AFTER_CONFIRMATION";
/** Outcome of the hierarchy rule. IMMEDIATO: emergencies are never held for a confirmation. */
export type RoutingStatus = "CONFERMATA" | "DA_CONFERMARE" | "IMMEDIATO";

/* ------------------------------------------------------------------ who may be a recipient */

/** Registry positions that are never recipients: families and athletes (minors) come only from the coarse role, partners are external. */
export const NEVER_RECIPIENTS: readonly string[] = ["famiglia", "atleta", "partner"];

/**
 * Francesco 16/10/2026 (D3, UD-161): the safeguarding lead has an access of its own, but tutela reports travel ONLY in
 * the dedicated Safeguarding channel (AGENTS.md: safeguarding never in ordinary flows). This table never routes it.
 */
export const SAFEGUARDING_CHANNEL_ONLY: readonly string[] = ["responsabile-safeguarding"];

/** Adult club positions that can be routed (registry KNOWN_POSITIONS minus NEVER_RECIPIENTS and the safeguarding lead). */
export const ROUTABLE_POSITIONS: readonly string[] = KNOWN_POSITIONS.filter(
  (p) => !NEVER_RECIPIENTS.includes(p) && !SAFEGUARDING_CHANNEL_ONLY.includes(p),
);

/**
 * Routable now. r138 positions (session.ts R138_POSITIONS) only when r138Live is true, a value verified on the server
 * (registry-live.server.ts); default false = fail closed.
 */
export function isRoutablePosition(p: string, r138Live = false): boolean {
  return ROUTABLE_POSITIONS.includes(p) && positionLive(p, r138Live);
}

/**
 * Hierarchy rank, 0 = top (UD-141 "da presidente a scendere fino a Mister"). Equal rank counts as superior-or-equal
 * (UD-141: "confirmed when equal"). A position missing here is not part of the hierarchy (it can be informed, but a
 * request coming only from it is always "da confermare").
 */
export const POSITION_RANK: Readonly<Record<string, number>> = {
  presidente: 0,
  direzione: 0,
  "direttore-generale": 1,
  // Francesco 16/10/2026 (D2) "Sopra il coordinatore": below DG/Presidente, above coordinatore and RAB.
  "direttore-sportivo-agonistica": 1.5,
  "direttore-sportivo-generale": 1.5,
  "coordinatore-attivita-sportiva": 2,
  "responsabile-attivita-base": 2,
  dirigenza: 3,
  segreteria: 3,
  tesoreria: 3,
  "responsabile-trasporti": 3,
  "responsabile-campi": 3,
  "responsabile-struttura": 3,
  "responsabile-struttura-colico": 3,
  "responsabile-struttura-dervio": 3,
  "responsabile-infermeria": 3,
  fisioterapista: 3,
  nutrizionista: 3,
  "responsabile-tornei": 3,
  "responsabile-magazzino": 3,
  "responsabile-club-house": 3,
  "responsabile-lavanderia": 3,
  "dirigente-annata": 4,
  mister: 4,
  "segreteria-presenza": 5,
  "segreteria-remoto": 5,
  "dirigente-collaboratore": 5,
  autista: 5,
  "addetto-biglietteria": 5,
  "collaboratore-magazzino": 5,
  "collaboratore-lavanderia-pulizia": 5,
  moderatore: 5,
};

/** Highest rank (lowest number) among the requester's positions, null when none is in the hierarchy. */
export function requesterRank(positions: readonly string[] | null | undefined): number | null {
  if (!positions) return null;
  let best: number | null = null;
  for (const p of positions) {
    const r = POSITION_RANK[p];
    if (r === undefined) continue;
    if (best === null || r < best) best = r;
  }
  return best;
}

/* ------------------------------------------------------------------ fixed rules */

/**
 * Always informed, now: the request machine's watchers (request-machine.ts REQUEST_WATCHERS, one list): the Direttore
 * Generale (UD-141 "sempre il direttore generale") and the Coordinatore Attività Sportiva (UD-154: sees every request).
 */
export { REQUEST_WATCHERS };

/**
 * UD-156 (Francesco 16/10/2026 06:57 "Dervio decido io e responsabile attività di base e coordinatore attività
 * sportiva e presidente e segreteria sempre informata"): always told of anything that touches Dervio.
 * Same positions as the Dervio readers of r135, extended by r138 with the two direttori sportivi, plus the Segreteria.
 */
export const DERVIO_ALWAYS: readonly string[] = [
  "presidente",
  "direttore-generale",
  "coordinatore-attivita-sportiva",
  "responsabile-attivita-base",
  // Francesco (DG) 16/10/2026 13:32: the two direttori sportivi see Dervio too (r138 adds them to the r135 readers).
  "direttore-sportivo-agonistica",
  "direttore-sportivo-generale",
  "segreteria",
];

/**
 * Positions Francesco named that do not exist in the registry yet: reported, never routed (fail closed). Empty since
 * r138 (UD-161 D3: fisioterapista and responsabile-safeguarding get their own access); until r138 is live the r138
 * positions are still reported as "ruolo non ancora attivo" by routeChiFaCosa.
 */
export const NAMED_MISSING_POSITIONS: Readonly<Record<string, string>> = {};

/* ------------------------------------------------------------------ topic table */

interface Entry {
  position: string;
  duty: Duty;
  reason: string;
}

interface TopicRule {
  /** Positions that decide or prepare (decider = approver for the hierarchy rule) and those informed. */
  entries: readonly Entry[];
  /** When a team is given: add the team's mister and dirigente di annata. Never for health or safeguarding. */
  teamStaff: boolean;
  /** When a team is given: the confirmer of its birth-year group (UD-154) becomes the decider. */
  teamConfirmerDecides: boolean;
  /** Add the structure positions of the site (Colico/Dervio). */
  siteStructure: boolean;
  /** Positions Francesco named for this topic that the registry does not have yet. */
  missing: readonly string[];
  /** What the notice text must never carry. */
  contentLimits: readonly string[];
  /** Emergency: everybody now, no confirmation step. */
  immediate: boolean;
}

const NO_NAMES_OF_MINORS = "Nessun nome di minori: solo squadra e annata";
const NO_HEALTH = "Nessun dettaglio di salute: solo «serve un contatto dell'infermeria»";
const NO_AMOUNTS = "Nessun importo, IBAN o codice fiscale";
const NO_COPY = "Mai copiare frasi del messaggio ricevuto";

const BASE_LIMITS: readonly string[] = [NO_NAMES_OF_MINORS, NO_COPY];

/**
 * Francesco 16/10/2026 11:58 «ok chi decide Presidente e Consiglio Direttivo»: for sponsor, minori-organizzativo,
 * salute and impianti (Colico and Dervio) the deciders are the Presidente AND the Consiglio Direttivo. The registry
 * has no separate "consiglio-direttivo" position: the board is the role DIRECTION, whose position is 'direzione'
 * (session.ts ROLE_POSITIONS.DIRECTION; 'dirigenza' is the purchasing seat of the same role). So the Consiglio
 * Direttivo is routed as 'direzione'.
 */
export const BOARD_POSITION = "direzione";
const BOARD_DECIDERS: readonly Entry[] = [
  { position: "presidente", duty: "DECIDE", reason: "decide con il Consiglio Direttivo (Francesco 16/10/2026)" },
  { position: BOARD_POSITION, duty: "DECIDE", reason: "Consiglio Direttivo: decide con il Presidente (Francesco 16/10/2026)" },
];

/**
 * ONE table "topic -> positions" (G14). Deciders follow the existing chains: UD-154 for matches (group confirmer),
 * UD-155 examples (infermeria -> fisioterapista + DG; friendly -> direttore sportivo + mister + DG), UD-159 (DG and
 * Presidente decide the activities).
 */
export const CHI_FA_COSA_TABLE: Readonly<Record<ChiFaCosaTopic, TopicRule>> = {
  allenamenti: {
    entries: [
      { position: "coordinatore-attivita-sportiva", duty: "DECIDE", reason: "coordina orari e turni degli allenamenti" },
      { position: "responsabile-campi", duty: "INFORM", reason: "uso dei campi" },
    ],
    teamStaff: true,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: BASE_LIMITS,
    immediate: false,
  },
  gara: {
    entries: [
      { position: "coordinatore-attivita-sportiva", duty: "INFORM", reason: "vede ogni richiesta (UD-154)" },
      { position: "segreteria", duty: "PREPARE", reason: "Master Calendario e modulo federale (UD-154)" },
      { position: "responsabile-campi", duty: "INFORM", reason: "campo per le gare in casa" },
    ],
    teamStaff: true,
    teamConfirmerDecides: true,
    siteStructure: false,
    missing: [],
    contentLimits: BASE_LIMITS,
    immediate: false,
  },
  pulmini: {
    entries: [
      { position: "responsabile-trasporti", duty: "DECIDE", reason: "assegna mezzi e autisti" },
      { position: "autista", duty: "INFORM", reason: "guida il viaggio confermato" },
    ],
    teamStaff: true,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: BASE_LIMITS,
    immediate: false,
  },
  iscrizioni: {
    entries: [
      { position: "segreteria", duty: "DECIDE", reason: "iscrizioni e tesseramenti" },
      { position: "tesoreria", duty: "INFORM", reason: "quota collegata all'iscrizione" },
    ],
    teamStaff: false,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: [...BASE_LIMITS, NO_AMOUNTS],
    immediate: false,
  },
  pagamenti: {
    entries: [
      { position: "tesoreria", duty: "DECIDE", reason: "quote, compensi e pagamenti" },
      { position: "segreteria", duty: "INFORM", reason: "posizione amministrativa del tesserato" },
    ],
    teamStaff: false,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: [...BASE_LIMITS, NO_AMOUNTS],
    immediate: false,
  },
  salute: {
    entries: [
      ...BOARD_DECIDERS,
      { position: "responsabile-infermeria", duty: "INFORM", reason: "appuntamenti e infermeria (UD-155)" },
      // UD-161 D3: the physio is told that a contact is needed, never health data (NO_HEALTH below).
      { position: "fisioterapista", duty: "INFORM", reason: "serve un contatto del fisioterapista (nessun dato di salute)" },
    ],
    teamStaff: false,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: [...BASE_LIMITS, NO_HEALTH],
    immediate: false,
  },
  "minori-organizzativo": {
    entries: [
      ...BOARD_DECIDERS,
      { position: "segreteria", duty: "PREPARE", reason: "regole organizzative e documenti" },
      { position: "coordinatore-attivita-sportiva", duty: "INFORM", reason: "organizzazione delle squadre" },
    ],
    teamStaff: false,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: [
      ...BASE_LIMITS,
      NO_HEALTH,
      "Solo aspetti organizzativi: le segnalazioni di tutela vanno solo nel canale Safeguarding dedicato",
    ],
    immediate: false,
  },
  impianti: {
    entries: [...BOARD_DECIDERS, { position: "responsabile-campi", duty: "INFORM", reason: "campi e impianti" }],
    teamStaff: false,
    teamConfirmerDecides: false,
    siteStructure: true,
    missing: [],
    contentLimits: BASE_LIMITS,
    immediate: false,
  },
  tornei: {
    entries: [
      { position: "responsabile-tornei", duty: "DECIDE", reason: "organizza i tornei" },
      { position: "segreteria", duty: "PREPARE", reason: "omologazione e moduli" },
      { position: "coordinatore-attivita-sportiva", duty: "INFORM", reason: "squadre coinvolte" },
    ],
    teamStaff: true,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: BASE_LIMITS,
    immediate: false,
  },
  sponsor: {
    entries: [
      ...BOARD_DECIDERS,
      { position: "tesoreria", duty: "INFORM", reason: "incassi e fatture" },
    ],
    teamStaff: false,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: [...BASE_LIMITS, NO_AMOUNTS],
    immediate: false,
  },
  comunicazioni: {
    entries: [
      { position: "segreteria", duty: "DECIDE", reason: "comunicazioni ufficiali del club" },
      { position: "moderatore", duty: "INFORM", reason: "contenuti nell'app" },
    ],
    teamStaff: true,
    teamConfirmerDecides: false,
    siteStructure: false,
    missing: [],
    contentLimits: BASE_LIMITS,
    immediate: false,
  },
  emergenza: {
    entries: [
      { position: "presidente", duty: "DECIDE", reason: "emergenza: responsabile legale" },
      { position: "segreteria", duty: "PREPARE", reason: "coordina i contatti" },
      { position: "coordinatore-attivita-sportiva", duty: "INFORM", reason: "squadre in campo" },
    ],
    teamStaff: true,
    teamConfirmerDecides: false,
    siteStructure: true,
    missing: [],
    contentLimits: [...BASE_LIMITS, NO_HEALTH, "Se c'è pericolo: prima il 112"],
    immediate: true,
  },
};

/**
 * Structure positions per site (registry positions only). DERVIO is empty: UD-156 keeps Dervio with the Direzione,
 * the Segreteria and the DERVIO_ALWAYS positions; the other structure positions do not see Dervio.
 */
export const SITE_STRUCTURE: Readonly<Record<"COLICO" | "DERVIO", readonly string[]>> = {
  COLICO: ["responsabile-struttura-colico", "responsabile-struttura"],
  DERVIO: [],
};

/**
 * UD-156: positions that do not see Dervio (same list as the r135 per-site readers rule). Removed from every route
 * that touches Dervio (Dervio, both sites, unknown site), whatever the topic table says; emergenza excepted below.
 */
export const DERVIO_EXCLUDED: readonly string[] = [
  "responsabile-struttura-dervio",
  "responsabile-campi",
  "responsabile-club-house",
  "responsabile-struttura",
  "responsabile-struttura-colico",
];

/**
 * Francesco 16/10/2026 11:58 «sì emergenze struttura Dervio»: in an EMERGENZA at Dervio the Dervio structure
 * positions are told too. Only for topic "emergenza"; every other topic follows UD-156.
 */
export const DERVIO_EMERGENCY_STRUCTURE: readonly string[] = [
  "responsabile-struttura-dervio",
  "responsabile-struttura",
];

/**
 * VERIFIED (Francesco 16/10/2026 11:58 «ok DG conferma come direzione»): when the Direzione fallback decides a
 * group whose confirmer position does not exist yet, the Direttore Generale confirms as Direzione. Applied only when
 * 'direzione' is the sole decider (UD-154 fallback); where the Presidente decides too, the Presidente's rank counts.
 */
const FALLBACK_CONFIRM_RANK = 1;

/** UD-154: until a group confirmer position exists, only the Direzione confirms that group. */
export const CONFIRMER_FALLBACK = "direzione";

/* ------------------------------------------------------------------ input and output */

export const chiFaCosaInputSchema = z.object({
  topic: z.enum(CHI_FA_COSA_TOPICS),
  /** null = site not known: Dervio rule applied (fail towards informing the Direzione), structure not added. */
  site: z.enum(CHI_FA_COSA_SITES).nullable(),
  teamKey: z.string().trim().min(1).max(40).nullable().optional(),
  /**
   * Positions of the requester. Callers MUST pass only `sessionRolesFrom()` (session.ts) of a VERIFIED session
   * (memberships read server-side from the registry), never a role claimed in a mail, WhatsApp or form, never input
   * from the browser. null/empty or strings that are not registry positions = unknown -> "da confermare".
   */
  requesterPositions: z.array(z.string().max(60)).max(40).nullable().optional(),
  /**
   * Whether migration r138 is live (direttori sportivi, fisioterapista exist). Callers MUST pass only the value
   * verified on the server (registry-live.server.ts r138Live), never input from the browser. Default false.
   */
  r138Live: z.boolean().optional(),
});
export type ChiFaCosaInput = z.input<typeof chiFaCosaInputSchema>;

export interface RoutedPosition {
  position: string;
  label: string;
  duty: Duty;
  when: NoticeTime;
  reasons: string[];
  /** Team scope for team positions (mister, dirigente di annata): the registry picks the holder of THIS team. */
  teamKey: string | null;
}

export interface MissingPosition {
  position: string;
  label: string;
  reason: string;
}

export interface ChiFaCosaRoute {
  topic: ChiFaCosaTopic;
  topicLabel: string;
  site: ChiFaCosaSite | null;
  teamKey: string | null;
  teamLabel: string | null;
  status: RoutingStatus;
  /** Positions whose acceptance is needed when the request comes from below (the deciders). */
  approvers: string[];
  recipients: RoutedPosition[];
  missingPositions: MissingPosition[];
  warnings: string[];
  contentLimits: string[];
}

export function labelOf(position: string): string {
  return POSITION_LABEL[position] ?? NAMED_MISSING_POSITIONS[position] ?? position.replace(/-/g, " ");
}

const DUTY_ORDER: Readonly<Record<Duty, number>> = { DECIDE: 0, PREPARE: 1, INFORM: 2 };

/* ------------------------------------------------------------------ routing */

/**
 * Route a topic to positions. Pure and deterministic: same input, same output, ordered by duty then rank then id.
 * Throws a ZodError on an invalid topic/site (callers validate first with chiFaCosaInputSchema.safeParse).
 */
export function routeChiFaCosa(raw: ChiFaCosaInput): ChiFaCosaRoute {
  const input = chiFaCosaInputSchema.parse(raw);
  const rule = CHI_FA_COSA_TABLE[input.topic];
  const warnings: string[] = [];
  const missing = new Map<string, MissingPosition>();
  const byPos = new Map<string, { duty: Duty; reasons: string[]; teamKey: string | null }>();

  const r138Live = input.r138Live === true;
  const add = (position: string, duty: Duty, reason: string, teamKey: string | null = null) => {
    if (!isRoutablePosition(position, r138Live)) {
      if (!missing.has(position))
        missing.set(position, {
          position,
          label: labelOf(position),
          reason: R138_POSITIONS.includes(position)
            ? "ruolo non ancora attivo (r138 da applicare): nessun avviso"
            : "posizione non presente nel registro",
        });
      return;
    }
    const cur = byPos.get(position);
    if (!cur) {
      byPos.set(position, { duty, reasons: [reason], teamKey });
      return;
    }
    if (DUTY_ORDER[duty] < DUTY_ORDER[cur.duty]) cur.duty = duty;
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    if (teamKey && !cur.teamKey) cur.teamKey = teamKey;
  };

  for (const e of rule.entries) add(e.position, e.duty, e.reason);

  // Team: only known calendar groups; an unknown key is ignored, never guessed.
  let teamKey: string | null = null;
  if (input.teamKey) {
    if (REQUEST_TEAMS.some((t) => t.key === input.teamKey)) teamKey = input.teamKey;
    else warnings.push("Squadra non riconosciuta: ignorata, da indicare");
  }

  if (teamKey) {
    if (rule.teamStaff) {
      add("mister", "INFORM", `mister di ${teamLabel(teamKey)}`, teamKey);
      add("dirigente-annata", "INFORM", `dirigente di ${teamLabel(teamKey)}`, teamKey);
    }
    const conf = confirmerFor(teamKey);
    if (conf && (rule.teamConfirmerDecides || rule.teamStaff)) {
      const duty: Duty = rule.teamConfirmerDecides ? "DECIDE" : "INFORM";
      const why = rule.teamConfirmerDecides ? `conferma per ${teamLabel(teamKey)} (UD-154)` : `responsabile del gruppo ${teamLabel(teamKey)}`;
      if (positionExists(conf.position, r138Live)) {
        add(conf.position, duty, why);
      } else {
        missing.set(conf.position, {
          position: conf.position,
          label: conf.label,
          reason: "ruolo non ancora creato: decide la Direzione (UD-154)",
        });
        if (rule.teamConfirmerDecides) add(CONFIRMER_FALLBACK, "DECIDE", `${why}: ruolo ${conf.label} non ancora creato`);
      }
    }
  } else if (rule.teamConfirmerDecides) {
    warnings.push("Squadra da indicare: chi conferma dipende dall'annata");
  }

  // Site.
  const sites: Array<"COLICO" | "DERVIO"> =
    input.site === "ENTRAMBE" ? ["COLICO", "DERVIO"] : input.site ? [input.site] : [];
  if (rule.siteStructure) {
    if (sites.length === 0) warnings.push("Sede da indicare: responsabili di struttura non avvisati");
    for (const s of sites) {
      const where = s === "COLICO" ? "Colico" : "Dervio";
      for (const p of SITE_STRUCTURE[s]) add(p, "INFORM", `struttura di ${where}`);
      if (s === "DERVIO" && rule.immediate)
        for (const p of DERVIO_EMERGENCY_STRUCTURE)
          add(p, "INFORM", "emergenza a Dervio (Francesco 16/10/2026)");
    }
  }
  const touchesDervio = input.site === "DERVIO" || input.site === "ENTRAMBE" || input.site === null;
  if (input.site === null) warnings.push("Sede non indicata: avvisati come per Dervio (UD-156)");
  if (touchesDervio) {
    // UD-156: who does not see Dervio is not told about it (emergenza keeps only its own structure additions).
    const keep = rule.immediate
      ? new Set<string>([...SITE_STRUCTURE.COLICO, ...DERVIO_EMERGENCY_STRUCTURE])
      : new Set<string>();
    let removed = false;
    for (const p of DERVIO_EXCLUDED) if (!keep.has(p) && byPos.delete(p)) removed = true;
    if (removed && input.site === "ENTRAMBE")
      warnings.push("Colico e Dervio: i responsabili di struttura di Colico vanno avvisati a parte, solo per Colico (UD-156)");
    for (const p of DERVIO_ALWAYS) add(p, "INFORM", "Dervio: sempre informato (UD-156)");
  }

  // UD-141 / UD-154: DG and Coordinatore always, now.
  for (const p of REQUEST_WATCHERS) add(p, "INFORM", "vede ogni richiesta (UD-141, UD-154)");

  for (const m of rule.missing)
    missing.set(m, {
      position: m,
      label: labelOf(m),
      reason: "indicato da Francesco ma non presente nel registro: nessun avviso finché la Direzione non lo crea",
    });

  // Hierarchy (UD-141).
  const approvers = [...byPos.entries()].filter(([, v]) => v.duty === "DECIDE").map(([p]) => p);
  const approverRank = approvers.length
    ? Math.min(
        ...approvers.map((p) =>
          p === CONFIRMER_FALLBACK ? FALLBACK_CONFIRM_RANK : (POSITION_RANK[p] ?? Number.POSITIVE_INFINITY),
        ),
      )
    : POSITION_RANK["direttore-generale"]!;
  const rank = requesterRank(input.requesterPositions);
  let status: RoutingStatus;
  if (rule.immediate) status = "IMMEDIATO";
  else if (rank !== null && rank <= approverRank) status = "CONFERMATA";
  else status = "DA_CONFERMARE";
  if (rank === null && !rule.immediate)
    warnings.push("Richiedente senza ruolo riconosciuto nel registro: da confermare");

  const nowAlways = new Set<string>([...REQUEST_WATCHERS, ...(touchesDervio ? DERVIO_ALWAYS : [])]);
  const recipients: RoutedPosition[] = [...byPos.entries()]
    .map(([position, v]) => ({
      position,
      label: labelOf(position),
      duty: v.duty,
      // UD-141/UD-154: deciders and preparers (the Segreteria drafts and forwards) are told now, so are the watchers.
      when: (status !== "DA_CONFERMARE" || v.duty !== "INFORM" || nowAlways.has(position)
        ? "NOW"
        : "AFTER_CONFIRMATION") as NoticeTime,
      reasons: v.reasons,
      teamKey: v.teamKey,
    }))
    .sort(
      (a, b) =>
        DUTY_ORDER[a.duty] - DUTY_ORDER[b.duty] ||
        (POSITION_RANK[a.position] ?? 99) - (POSITION_RANK[b.position] ?? 99) ||
        a.position.localeCompare(b.position),
    );

  return {
    topic: input.topic,
    topicLabel: TOPIC_LABEL[input.topic],
    site: input.site,
    teamKey,
    teamLabel: teamKey ? teamLabel(teamKey) : null,
    status,
    approvers: approvers.sort(),
    recipients,
    missingPositions: [...missing.values()].sort((a, b) => a.position.localeCompare(b.position)),
    warnings,
    contentLimits: [...rule.contentLimits],
  };
}

/** Positions to notify now (the rest waits for the superior's acceptance). */
export function notifyNow(route: ChiFaCosaRoute): string[] {
  return route.recipients.filter((r) => r.when === "NOW").map((r) => r.position);
}

/** Positions to notify once the request is accepted (empty when already confirmed or immediate). */
export function notifyAfterConfirmation(route: ChiFaCosaRoute): string[] {
  return route.recipients.filter((r) => r.when === "AFTER_CONFIRMATION").map((r) => r.position);
}
