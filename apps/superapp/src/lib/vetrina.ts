/**
 * Vetrina engine of the public home with its PALINSESTO (UD-110, Direzione 13/10/2026 18:42–19:06).
 *
 * "devi decidere tu e essere sempre pronto anche a cambiare e far girare la vetrina, importante avere le giuste idee e
 * avere tutto sotto controllo" · "devi pensare a un mondo, un flusso programmato di dare info nel tempo così da rendere
 * la cosa interessante in base alle età".
 *
 * Types and pure functions only (SSR safe, no window access). Selection of a day for a world:
 *  1. WORLD: the audience world the visitor picked (never inferred from personal data). "tutti" = every public slot
 *     except the kids-only ones; "bambini" never receives commercial slots (guard here, not only in the data); Sky
 *     appears only in the kids' world (data: the Sky slot is audience ["bambini"]).
 *  2. WINDOW: showFrom/showUntil (Rome days) and optional recurring months (monthFrom/monthTo, wrap allowed).
 *  3. DAY: a slot is on air when its theme is one of the day's themes in VETRINA_RHYTHM (the weekly palinsesto),
 *     when it lists the weekday explicitly, when it is in its season peak, or when it is pinned.
 *  4. ROTATION: pinned/peak first, then a weighted draw seeded by the Rome day and the world (same result for
 *     everybody on a day); slots of the day's focus worlds weigh more.
 *  5. FLOOR: at least VETRINA_MIN slots, filled from evergreen real destinations; the kids' world always gets at
 *     least one kid-friendly slot.
 * The slot catalogue lives in vetrina-slots.server.ts; the day is decided by getVetrina (vetrina.functions.ts) on the
 * server's Rome day, which returns the pick of every world (the browser only keeps the visitor's choice of world).
 */
import { mulberry32, seedOf, dayNumber } from "./ledwall-rotation";
import { isInWindow, type PublicWindow } from "./public-window";

/** Maximum and minimum number of slots visible at once. */
export const VETRINA_MAX = 6;
export const VETRINA_MIN = 3;

/* --------------------------------------------------------------- worlds */

/** Audience worlds. "soci" exists only for signed-in members (derived from the session, never chosen publicly). */
export type VetrinaWorld =
  "tutti" | "bambini" | "ragazzi" | "famiglie" | "tifosi" | "soci";
export type AudienceWorld = Exclude<VetrinaWorld, "tutti">;

export const PUBLIC_WORLDS: readonly VetrinaWorld[] = [
  "tutti",
  "bambini",
  "ragazzi",
  "famiglie",
  "tifosi",
];
export const ALL_WORLDS: readonly VetrinaWorld[] = [...PUBLIC_WORLDS, "soci"];

export const WORLD_LABEL: Readonly<Record<VetrinaWorld, string>> = {
  tutti: "Tutti",
  bambini: "Bambini",
  ragazzi: "Ragazzi",
  famiglie: "Famiglie",
  tifosi: "Tifosi & territorio",
  soci: "Soci e staff",
};

/** Short description of each world as the visitor reads it (ages are a label only: nobody is asked for one). */
export const WORLD_HINT: Readonly<Record<VetrinaWorld, string>> = {
  tutti: "Il meglio del club, ogni giorno",
  bambini: "Fino a 13 anni, con Sky",
  ragazzi: "14–19 anni",
  famiglie: "Iscrizioni, servizi, kit",
  tifosi: "Partite, tornei, partner",
  soci: "Servizi e giochi per i tesserati",
};

export function isVetrinaWorld(v: unknown): v is VetrinaWorld {
  return typeof v === "string" && (ALL_WORLDS as readonly string[]).includes(v);
}

/* -------------------------------------------------------------- palinsesto */

export type VetrinaTheme =
  | "partner"
  | "convenzioni"
  | "card"
  | "formazione"
  | "servizi"
  | "squadre"
  | "weekend"
  | "dirette"
  | "racconti"
  | "eventi"
  | "iscrizioni"
  | "giochi"
  | "kids";

export interface RhythmDay {
  /** Day name as shown in the docs/report. */
  label: string;
  /** Themes on air that day. */
  themes: readonly VetrinaTheme[];
  /** Worlds the day speaks to first (their slots weigh more). */
  focus: readonly AudienceWorld[];
}

/**
 * THE WEEKLY PALINSESTO — the single place the Direzione edits (index = JS weekday, 0 = Sunday … 6 = Saturday).
 * Kids-friendly content ("kids", "giochi") is on air every day for the kids' world.
 */
export const VETRINA_RHYTHM: Readonly<
  Record<0 | 1 | 2 | 3 | 4 | 5 | 6, RhythmDay>
> = {
  1: {
    label: "Lunedì",
    themes: ["partner", "convenzioni", "card"],
    focus: ["tifosi", "famiglie"],
  },
  2: {
    label: "Martedì",
    themes: ["formazione"],
    focus: ["ragazzi", "bambini"],
  },
  3: { label: "Mercoledì", themes: ["servizi"], focus: ["famiglie"] },
  4: {
    label: "Giovedì",
    themes: ["squadre"],
    focus: ["bambini", "ragazzi", "famiglie", "tifosi"],
  },
  5: { label: "Venerdì", themes: ["weekend"], focus: ["tifosi"] },
  6: {
    label: "Sabato",
    themes: ["dirette"],
    focus: ["bambini", "ragazzi", "famiglie", "tifosi"],
  },
  0: {
    label: "Domenica",
    themes: ["racconti"],
    focus: ["bambini", "ragazzi", "famiglie", "tifosi"],
  },
};

/** Themes on air every day in the kids' world (instead of commercial ones). */
export const KIDS_DAILY_THEMES: readonly VetrinaTheme[] = ["kids", "giochi"];

/* --------------------------------------------------------------- slots */

export type VetrinaKind =
  | "event"
  | "tournament"
  | "initiative"
  | "service"
  | "promo"
  | "kit"
  | "join"
  | "kids"
  | "press"
  | "game"
  | "media"
  | "fixtures"
  /** Reserved (UD-110 19:03): club agreements with partners ("convenzioni"); data only, no items yet. */
  | "convenzione"
  /** Reserved: initiatives run by a partner with the club; data only, no items yet. */
  | "partner-initiative";

/**
 * Who the destination is for. "public": an open page. "members": a reserved page or a service for members, still
 * shown on the public home as a teaser (interaction between inside and outside) with the "Per i tesserati" badge;
 * the destination shows its own access screen to anonymous visitors.
 */
export type VetrinaAudience = "public" | "members";

/** Data conditions a slot may require; each one is computed on the server for the day. */
export type VetrinaRequirement = "pressRecent" | "partnerNews";
export type VetrinaFacts = Partial<Record<VetrinaRequirement, boolean>>;

export type VetrinaVisual =
  | {
      kind: "image";
      src: string;
      alt: string;
      position?: string;
      fit?: "cover" | "contain";
    }
  | { kind: "portrait"; src: string; alt: string }
  | { kind: "type"; big: string; small: string };

export interface VetrinaSlot extends PublicWindow {
  id: string;
  kind: VetrinaKind;
  theme: VetrinaTheme;
  kicker: string;
  title: string;
  text: string;
  /** Internal route of an existing page. */
  href: string;
  hash?: string;
  search?: Readonly<Record<string, string>>;
  cta: string;
  visual: VetrinaVisual;
  audience: VetrinaAudience;
  /** Worlds the slot speaks to. */
  audiences: readonly AudienceWorld[];
  /** Relative chance of being drawn (1..5). */
  weight: number;
  /** Always on while in its window. */
  pinned?: boolean;
  /** Sells or promotes something (partners, cards, kit, sponsorship): never in the kids' world. */
  commercial?: boolean;
  /** Suitable for children: guarantees the kids' world always has one. */
  kidFriendly?: boolean;
  /** Real destination always worth showing: used to keep at least VETRINA_MIN slots. */
  evergreen?: boolean;
  /** Extra JS weekdays (0 = Sunday) on which the slot is on air besides its theme days. */
  weekdays?: readonly number[];
  /** Recurring months (1..12, inclusive, wrap allowed e.g. 11→2) in which the slot may appear. */
  monthFrom?: number;
  monthTo?: number;
  /** Season peak (Rome days, inclusive): on air every day and drawn first. */
  peakFrom?: string;
  peakUntil?: string;
  /** Recurring peak months (1..12, inclusive, wrap allowed). */
  peakMonthFrom?: number;
  peakMonthTo?: number;
  requires?: VetrinaRequirement;
  badge?: string;
}

/* ------------------------------------------------------------ helpers */

/** JS weekday (0 = Sunday … 6 = Saturday) of a YYYY-MM-DD day; NaN when invalid. */
export function weekdayOf(day: string): number {
  const d = dayNumber(day);
  if (!Number.isFinite(d)) return Number.NaN;
  // 1970-01-01 was a Thursday (4).
  return (((d + 4) % 7) + 7) % 7;
}

/** Month 1..12 of a YYYY-MM-DD day (NaN when invalid). */
export function monthOf(day: string): number {
  return Number.isFinite(dayNumber(day)) ? Number(day.slice(5, 7)) : Number.NaN;
}

/** Whether month m is inside [from, to] (inclusive, wrapping over the year end). */
export function inMonths(
  m: number,
  from: number | undefined,
  to: number | undefined,
): boolean {
  if (from === undefined && to === undefined) return true;
  const f = from ?? 1;
  const t = to ?? 12;
  if (!Number.isFinite(m)) return false;
  return f <= t ? m >= f && m <= t : m >= f || m <= t;
}

export function inPeak(slot: VetrinaSlot, day: string): boolean {
  const hasDates = slot.peakFrom !== undefined || slot.peakUntil !== undefined;
  const hasMonths =
    slot.peakMonthFrom !== undefined || slot.peakMonthTo !== undefined;
  if (!hasDates && !hasMonths) return false;
  if (
    hasDates &&
    !isInWindow({ showFrom: slot.peakFrom, showUntil: slot.peakUntil }, day)
  )
    return false;
  if (
    hasMonths &&
    !inMonths(monthOf(day), slot.peakMonthFrom, slot.peakMonthTo)
  )
    return false;
  return true;
}

/** World filter (step 1). */
export function worldAccepts(slot: VetrinaSlot, world: VetrinaWorld): boolean {
  if (world === "bambini")
    return slot.audiences.includes("bambini") && !slot.commercial;
  if (world === "tutti")
    return slot.audiences.some((a) => a !== "bambini" && a !== "soci");
  return slot.audiences.includes(world);
}

/** Window and data filters (step 2): publication window, recurring months, data condition, weight. */
export function slotInWindow(
  slot: VetrinaSlot,
  day: string,
  facts: VetrinaFacts = {},
): boolean {
  if (!isInWindow(slot, day)) return false;
  if (!inMonths(monthOf(day), slot.monthFrom, slot.monthTo)) return false;
  if (slot.requires && facts[slot.requires] !== true) return false;
  return Number.isFinite(slot.weight) && slot.weight > 0;
}

/** Day filter (step 3): theme of the day, explicit weekday, season peak or pinned. */
export function onAir(
  slot: VetrinaSlot,
  day: string,
  world: VetrinaWorld,
): boolean {
  if (slot.pinned || inPeak(slot, day)) return true;
  const wd = weekdayOf(day);
  if (!Number.isFinite(wd)) return false;
  if (slot.weekdays?.includes(wd)) return true;
  const rhythm = VETRINA_RHYTHM[wd as 0 | 1 | 2 | 3 | 4 | 5 | 6];
  if (rhythm.themes.includes(slot.theme)) return true;
  return world === "bambini" && KIDS_DAILY_THEMES.includes(slot.theme);
}

/** Back-compat helper: eligible for the "tutti" world on a day. */
export function slotEligible(
  slot: VetrinaSlot,
  day: string,
  facts: VetrinaFacts = {},
  world: VetrinaWorld = "tutti",
): boolean {
  return (
    worldAccepts(slot, world) &&
    slotInWindow(slot, day, facts) &&
    onAir(slot, day, world)
  );
}

function draw(
  list: readonly VetrinaSlot[],
  seed: string,
  focus: readonly AudienceWorld[],
): VetrinaSlot[] {
  const rand = mulberry32(seedOf(seed));
  return list
    .map((s) => {
      const boost = s.audiences.some((a) => focus.includes(a)) ? 2 : 1;
      return {
        s,
        key: Math.pow(rand() || Number.MIN_VALUE, 1 / (s.weight * boost)),
      };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.s);
}

/**
 * The vetrina of a Rome day for a world. Deterministic: same day, world and inputs → same result for everybody.
 * Duplicate ids keep the first occurrence. Invalid day → empty (fail closed).
 */
export function pickVetrina(
  slots: readonly VetrinaSlot[],
  day: string,
  facts: VetrinaFacts = {},
  max: number = VETRINA_MAX,
  world: VetrinaWorld = "tutti",
): VetrinaSlot[] {
  const wd = weekdayOf(day);
  if (!Number.isFinite(wd)) return [];
  const limit = Math.max(0, Math.floor(max));
  const seen = new Set<string>();
  const pool = slots.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return worldAccepts(s, world) && slotInWindow(s, day, facts);
  });
  const focus = VETRINA_RHYTHM[wd as 0 | 1 | 2 | 3 | 4 | 5 | 6].focus;
  const first = pool
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s.pinned || inPeak(x.s, day))
    .sort((a, b) => b.s.weight - a.s.weight || a.i - b.i)
    .map((x) => x.s);
  const firstIds = new Set(first.map((s) => s.id));
  const today = draw(
    pool.filter((s) => !firstIds.has(s.id) && onAir(s, day, world)),
    `scd-vetrina:${day}:${world}`,
    focus,
  );
  let out = [...first, ...today].slice(0, limit);
  const floor = Math.min(VETRINA_MIN, limit);
  if (out.length < floor) {
    const ids = new Set(out.map((s) => s.id));
    const fill = draw(
      pool.filter((s) => s.evergreen && !ids.has(s.id)),
      `scd-vetrina-fill:${day}:${world}`,
      focus,
    );
    out = [...out, ...fill].slice(0, Math.max(floor, out.length));
  }
  if (world === "bambini" && limit > 0 && !out.some((s) => s.kidFriendly)) {
    const kid = draw(
      pool.filter((s) => s.kidFriendly),
      `scd-vetrina-kid:${day}`,
      focus,
    )[0];
    if (kid) out = [kid, ...out].slice(0, limit);
  }
  return out;
}

/** Pick of every world for a day (the server sends all of them; the browser shows the visitor's choice). */
export function pickAllWorlds(
  slots: readonly VetrinaSlot[],
  day: string,
  facts: VetrinaFacts = {},
  worlds: readonly VetrinaWorld[] = ALL_WORLDS,
): Record<VetrinaWorld, VetrinaSlot[]> {
  const out = {} as Record<VetrinaWorld, VetrinaSlot[]>;
  for (const w of ALL_WORLDS)
    out[w] = worlds.includes(w)
      ? pickVetrina(slots, day, facts, VETRINA_MAX, w)
      : [];
  return out;
}

/** Every internal route the catalogue points to (for the route-existence test). */
export function vetrinaRoutes(slots: readonly VetrinaSlot[]): string[] {
  return [...new Set(slots.map((s) => s.href))];
}

/** localStorage key of the visitor's world (per-device convenience only: no age, no profile, no tracking). */
export const WORLD_STORAGE_KEY = "scd-vetrina-world";

/** No slot for any world (fallback when the server function fails: the vetrina is simply not shown). */
export const EMPTY_WORLDS: Readonly<Record<VetrinaWorld, VetrinaSlot[]>> = {
  tutti: [],
  bambini: [],
  ragazzi: [],
  famiglie: [],
  tifosi: [],
  soci: [],
};
