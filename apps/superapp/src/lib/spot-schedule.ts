/**
 * LED spot schedule ("palinsesto"), Francesco 14/10/2026: "quei video e spot devono girare".
 *
 * One clock for every screen: the LED wall player, the home block "Sul LED wall" and the regia of the sponsor
 * gestionale (/crm) all compute the spot on air from the Rome clock, so they show the same spot at the same moment
 * and a page reload (or a video that fails to load) never stops the rotation.
 *   - order of the day: spotsInDayOrder (same deterministic order as the logo LED wall);
 *   - slot length: the master length (LED_MASTER.seconds, 20 s);
 *   - slot at an instant: floor(ms since Rome midnight / slot) mod number of spots.
 * Passes per hour are CALCULATED from the slot length and the number of spots (never measured audiences).
 * The loop restarts at Rome midnight (a day has 4320 slots, not a multiple of every spot count) and jumps with the
 * daylight-saving change: both are expected and identical on every screen.
 */
import { msIntoRomeDay, slotIndexAt } from "./ledwall-rotation";
import { romeDay } from "./public-window";
import { LED_MASTER, spotsForLedwall, spotsInDayOrder, type SponsorSpot } from "./sponsor-spots";

export const SPOT_SLOT_MS = LED_MASTER.seconds * 1000;

export interface OnAir<T> {
  /** Rome day the order belongs to (YYYY-MM-DD). */
  day: string;
  /** Spots of the day in rotation order. */
  order: T[];
  /** Index in `order` of the spot on air; -1 when there is nothing to show. */
  index: number;
  current: T | null;
  next: T | null;
  /** Milliseconds already played of the current slot (to start a video at the right point). */
  elapsedMs: number;
  /** Milliseconds to the next spot. */
  remainingMs: number;
  /** Absolute slot number of the day (never wraps inside the day): its parity picks the player's video element. */
  slot: number;
}

/** Spot on air at an instant, for a given list (already filtered by the caller). */
export function onAirAt<T extends { slug: string }>(list: readonly T[], nowMs: number, order?: (l: readonly T[], day: string) => T[]): OnAir<T> {
  const day = romeDay(nowMs);
  const sorted = order ? order(list, day) : [...list];
  const n = sorted.length;
  const into = msIntoRomeDay(nowMs);
  const slot = Math.floor(Math.max(0, into) / SPOT_SLOT_MS);
  if (n === 0) return { day, order: sorted, index: -1, current: null, next: null, elapsedMs: 0, remainingMs: SPOT_SLOT_MS, slot };
  const index = slotIndexAt(n, into, SPOT_SLOT_MS);
  const elapsedMs = ((into % SPOT_SLOT_MS) + SPOT_SLOT_MS) % SPOT_SLOT_MS;
  return {
    day,
    order: sorted,
    index,
    current: sorted[index] ?? null,
    next: sorted[(index + 1) % n] ?? null,
    elapsedMs,
    remainingMs: SPOT_SLOT_MS - elapsedMs,
    slot,
  };
}

/** The LED wall schedule: showable spots (no MODIFICHE_RICHIESTE, confirmed sponsor) in the order of the Rome day. */
export function ledOnAir(nowMs: number, spots: readonly SponsorSpot[] = spotsForLedwall()): OnAir<SponsorSpot> {
  return onAirAt(spots, nowMs, spotsInDayOrder);
}

/** Calculated passes of each spot in one hour of LED wall switched on (one full loop = spots x slot). */
export function passesPerHour(spotCount: number, slotMs: number = SPOT_SLOT_MS): number {
  if (!(spotCount > 0) || !(slotMs > 0)) return 0;
  return Math.floor(3_600_000 / (slotMs * spotCount));
}

/** Length of one full loop in seconds. */
export function loopSeconds(spotCount: number, slotMs: number = SPOT_SLOT_MS): number {
  return spotCount > 0 ? Math.round((spotCount * slotMs) / 1000) : 0;
}

/** Start time (Rome, HH:MM:SS) of the next `count` slots, for the palinsesto list of the regia. */
export function upcomingSlots<T extends { slug: string }>(air: OnAir<T>, nowMs: number, count: number): { at: number; spot: T }[] {
  const n = air.order.length;
  if (n === 0 || air.index < 0) return [];
  const out: { at: number; spot: T }[] = [];
  const start = nowMs - air.elapsedMs;
  for (let k = 0; k < Math.min(count, n); k++) {
    const spot = air.order[(air.index + k) % n];
    if (spot) out.push({ at: start + k * SPOT_SLOT_MS, spot });
  }
  return out;
}

/**
 * Next start instants of one spot (for the sponsor's own review page): the slots of the same Rome day in which `slug`
 * is on air, from the current slot on. Empty when the spot is not in rotation. Never crosses midnight, because the
 * order of the next day is different (the loop restarts at Rome midnight).
 */
export function nextAirings<T extends { slug: string }>(
  list: readonly T[],
  slug: string,
  nowMs: number,
  count: number,
  order?: (l: readonly T[], day: string) => T[],
): number[] {
  const air = onAirAt(list, nowMs, order);
  const n = air.order.length;
  const idx = air.order.findIndex((s) => s.slug === slug);
  if (n === 0 || idx < 0 || air.index < 0 || count <= 0) return [];
  const start = nowMs - air.elapsedMs;
  const first = (idx - air.index + n) % n;
  const out: number[] = [];
  for (let j = 0; j < count; j++) {
    const at = start + (first + j * n) * SPOT_SLOT_MS;
    if (romeDay(at) !== air.day) break;
    out.push(at);
  }
  return out;
}

/** LED wall airings of one spot (showable spots, order of the Rome day). */
export function ledAirings(slug: string, nowMs: number, count: number, spots: readonly SponsorSpot[] = spotsForLedwall()): number[] {
  return nextAirings(spots, slug, nowMs, count, spotsInDayOrder);
}

/** Rome clock time of an instant, HH:MM:SS. */
export function romeClock(ms: number): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(ms));
}

export type VideoFormat = "mp4" | "webm";

/** File of a spot video in the chosen format: every spot MP4 (H.264) has a WebM (VP9) twin in the same folder. */
export function spotVideoFile(mp4: string, format: VideoFormat): string {
  return format === "webm" ? mp4.replace(/\.mp4$/, ".webm") : mp4;
}

/** H.264 when the browser plays it (Chrome, Safari, Edge, phones), otherwise VP9 (Chromium builds, some Linux PCs). */
export function chooseVideoFormat(probe: { canPlayType: (type: string) => string } | null | undefined): VideoFormat {
  if (!probe) return "mp4";
  if (probe.canPlayType('video/mp4; codecs="avc1.640028"')) return "mp4";
  if (probe.canPlayType('video/webm; codecs="vp9"')) return "webm";
  return "mp4";
}
