/**
 * In-app LED wall: every current club partner in rotation on the real pitch-side board (UD-107, Direzione
 * 13/10/2026 17:38: "si dovrebbero preparare a tutti i nostri partner e a rotazione farli girare sulla pagina vetrina
 * e eventualmente qualche volta anche su pagina iniziale").
 *
 * Pure functions, no window or network access at module level (SSR safe), tested in ledwall-rotation.test.ts.
 * - Order: a deterministic shuffle seeded by the Rome calendar day, so every visitor sees the same order on a given
 *   day; the first slot moves one partner forward per day, so over SPONSORS.length consecutive days each partner
 *   opens the rotation exactly once. Within a cycle every partner appears exactly once (equal exposure).
 * - A club slot ("PARTNER UFFICIALE · S.C.D. COLICODERVIESE 2026/27") is interleaved after every
 *   LEDWALL_CLUB_EVERY partners.
 * - The slot shown is tied to the clock of the Rome day (like a real board, everybody sees the same slot at the
 *   same moment); the component only uses it as the starting point.
 * - LEDWALL_HOME_DAYS is the single switch the Direzione changes to decide when the board also appears on the
 *   public home.
 */
import { SPONSOR_ART } from "./logo-art.gen";
import { sponsorLabel, type Sponsor } from "./sponsors";

/* -------------------------------------------------------------- the board */

/** Empty-board pitch still (same camera as the LED fac-simile video), 1920x1080 master. */
export const LEDWALL_STILL = {
  src: "/media/sponsor/ledwall-board-empty-1280.webp",
  srcSet: "/media/sponsor/ledwall-board-empty-1280.webp 1280w, /media/sponsor/ledwall-board-empty-1920.webp 1920w",
  width: 1920,
  height: 1080,
} as const;

/** LED board rectangle in the 1920x1080 frame (px, frontal flat rectangle: no perspective). */
export const LEDWALL_BOARD_PX = { x0: 246, y0: 422, x1: 1718, y1: 540 } as const;

export interface PercentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The board rectangle as percentages of the frame, used to position the board layer over the still. */
export function boardRect(
  px: { x0: number; y0: number; x1: number; y1: number } = LEDWALL_BOARD_PX,
  frame: { width: number; height: number } = LEDWALL_STILL,
): PercentRect {
  const r = (v: number) => Math.round(v * 10_000) / 10_000;
  return {
    left: r((px.x0 / frame.width) * 100),
    top: r((px.y0 / frame.height) * 100),
    width: r(((px.x1 - px.x0) / frame.width) * 100),
    height: r(((px.y1 - px.y0) / frame.height) * 100),
  };
}

export const LEDWALL_BOARD: PercentRect = boardRect();

/* ----------------------------------------------------------- the rotation */

/** Duration of one slot on the board (ms). */
export const LEDWALL_SLOT_MS = 4_000;

/** A club slot after every N partners. */
export const LEDWALL_CLUB_EVERY = 6;

/** Text of the club slot (navy board, yellow + white). */
export const LEDWALL_CLUB_TEXT = {
  kicker: "PARTNER UFFICIALE",
  title: "S.C.D. COLICODERVIESE 2026/27",
} as const;

export const LEDWALL_CREST = "/media/brand/logo-scd.webp";

export type LedSlot =
  | { kind: "partner"; key: string; slug: string; label: string; src: string; ordinal: number }
  | { kind: "club"; key: string };

/** Logo file shown on the board: the trimmed transparent cut-out when present, otherwise the original file. */
export function ledArt(s: Pick<Sponsor, "slug" | "src">): string {
  return SPONSOR_ART[s.slug]?.src ?? s.src;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 of a YYYY-MM-DD day (calendar arithmetic, no time zone involved); NaN when invalid. */
export function dayNumber(day: string): number {
  const m = ISO.exec(day);
  if (!m) return Number.NaN;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000);
}

/** FNV-1a 32-bit hash: stable seed from a string. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: small deterministic PRNG in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Partner order of a Rome day: Fisher-Yates shuffle seeded by the day, then rotated so that the partner at
 * position (dayNumber mod n) of the official list opens the rotation. Same day → same order for everybody.
 */
export function dailyOrder<T extends { slug: string }>(list: readonly T[], day: string): T[] {
  const n = list.length;
  if (n === 0) return [];
  const rand = mulberry32(seedOf(`scd-ledwall:${day}`));
  const order = [...list];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const d = dayNumber(day);
  const leadIdx = Number.isFinite(d) ? ((d % n) + n) % n : 0;
  const lead = list[leadIdx]!;
  const at = order.findIndex((s) => s.slug === lead.slug);
  return [...order.slice(at), ...order.slice(0, at)];
}

/** Slots of a day's cycle: partners in the daily order with a club slot after every `clubEvery` partners. */
export function ledwallSequence(
  list: readonly Sponsor[],
  day: string,
  clubEvery: number = LEDWALL_CLUB_EVERY,
): LedSlot[] {
  const out: LedSlot[] = [];
  const order = dailyOrder(list, day);
  order.forEach((s, i) => {
    out.push({ kind: "partner", key: `p-${s.slug}`, slug: s.slug, label: sponsorLabel(s), src: ledArt(s), ordinal: i + 1 });
    if (clubEvery > 0 && (i + 1) % clubEvery === 0) out.push({ kind: "club", key: `club-${i + 1}` });
  });
  if (out.length === 0) out.push({ kind: "club", key: "club-0" });
  return out;
}

/** Milliseconds elapsed since 00:00 of the Rome day of an instant (summer/winter time handled by Intl). */
let romeClockFormat: Intl.DateTimeFormat | null = null;
export function msIntoRomeDay(nowMs: number): number {
  if (!Number.isFinite(nowMs)) return 0;
  romeClockFormat ??= new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = romeClockFormat.formatToParts(new Date(nowMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const ms = ((nowMs % 1000) + 1000) % 1000;
  return ((get("hour") * 60 + get("minute")) * 60 + get("second")) * 1000 + ms;
}

/** Slot shown at a moment of the day: the board loops through the cycle from Rome midnight. */
export function slotIndexAt(length: number, msIntoDay: number, slotMs: number = LEDWALL_SLOT_MS): number {
  if (!(length > 0) || !(slotMs > 0) || !Number.isFinite(msIntoDay)) return 0;
  return Math.floor(Math.max(0, msIntoDay) / slotMs) % length;
}

/** Next/previous index in a cycle (wraps both ways). */
export const stepIndex = (i: number, delta: number, length: number): number =>
  length > 0 ? (((i + delta) % length) + length) % length : 0;

/** Whether the board may advance by itself: never when the visitor asked for reduced motion (or without window). */
export function mayAnimate(win: Pick<Window, "matchMedia"> | undefined): boolean {
  if (!win || typeof win.matchMedia !== "function") return false;
  return !win.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ------------------------------------------------- when it is on the home */

/**
 * The single switch of the Direzione: on which days the board also appears on the public home.
 * - weekdays: ISO weekday numbers (1 = Monday ... 7 = Sunday);
 * - homeMatchDays: also on any day with a home game in the official public calendar.
 * The sponsor showcase page (/sponsor) always shows it.
 */
// UD-110 (Direzione 13/10/2026): the LED wall is part of the single sponsor zone of the home, every day.
export const LEDWALL_HOME_DAYS = {
  weekdays: [1, 2, 3, 4, 5, 6, 7] as readonly number[],
  homeMatchDays: true,
} as const;

export type LedwallHomeConfig = { weekdays: readonly number[]; homeMatchDays: boolean };

/** ISO weekday (1 = Monday ... 7 = Sunday) of a YYYY-MM-DD day; NaN when invalid. */
export function isoWeekday(day: string): number {
  const d = dayNumber(day);
  if (!Number.isFinite(d)) return Number.NaN;
  // 1970-01-01 was a Thursday (ISO 4).
  return ((((d + 3) % 7) + 7) % 7) + 1;
}

/** Whether a day has a home game in a list of calendar items (only certain kinds of item count). */
export function hasHomeMatch(
  items: readonly { date: string; kind: string; homeAway: string }[],
  day: string,
): boolean {
  return items.some((i) => i.date === day && i.kind === "Gara" && i.homeAway === "CASA");
}

/** Whether the compact board appears on the public home on a Rome day. Invalid day → never (fail closed). */
export function showLedwallOnHome(
  day: string,
  opts: { homeMatch?: boolean } = {},
  config: LedwallHomeConfig = LEDWALL_HOME_DAYS,
): boolean {
  const wd = isoWeekday(day);
  if (!Number.isFinite(wd)) return false;
  if (config.weekdays.includes(wd)) return true;
  return config.homeMatchDays && opts.homeMatch === true;
}
