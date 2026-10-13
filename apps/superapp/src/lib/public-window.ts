/**
 * Publication window of time-limited public content (promos, initiatives, events): Direzione 13/10/2026 15:57,
 * "iniziativa a parte da pubblicizzare a tempo".
 *
 * `showFrom` / `showUntil` are calendar days (YYYY-MM-DD) in Europe/Rome, both inclusive: an item appears at 00:00
 * Rome time of `showFrom` and disappears at 00:00 Rome time of the day after `showUntil`. The day is always the
 * SERVER's Rome day (see romeDay), never the visitor's clock. A missing bound is open; an invalid bound hides the item
 * (fail closed: a typo never publishes something early or forever).
 */

export interface PublicWindow {
  /** First Rome day the item is public (inclusive). */
  showFrom?: string | undefined;
  /** Last Rome day the item is public (inclusive). */
  showUntil?: string | undefined;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as YYYY-MM-DD. */
export function isIsoDay(v: string): boolean {
  const m = ISO_DAY.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** Rome calendar day (YYYY-MM-DD) of an instant; handles summer/winter time. */
export function romeDay(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

/** Whether an item is public on the given Rome day. */
export function isInWindow(w: PublicWindow, day: string): boolean {
  if (!isIsoDay(day)) return false;
  if (w.showFrom !== undefined && (!isIsoDay(w.showFrom) || day < w.showFrom)) return false;
  if (w.showUntil !== undefined && (!isIsoDay(w.showUntil) || day > w.showUntil)) return false;
  if (w.showFrom !== undefined && w.showUntil !== undefined && w.showFrom > w.showUntil) return false;
  return true;
}

/** The items public on the given Rome day, in their original order. */
export function visibleOn<T extends PublicWindow>(items: readonly T[], day: string): T[] {
  return items.filter((i) => isInWindow(i, day));
}

/**
 * Today's Rome day for the server. QA only: `SCD_QA_TODAY=YYYY-MM-DD` simulates another day for screenshots, and it
 * is ignored in production (`SCD_ENV=production` outside the staging gateway) and on any Render service (`RENDER`
 * is set by the platform), so a stray variable can never move the public calendar.
 */
export function serverRomeDay(
  env: Readonly<Record<string, string | undefined>>,
  nowMs: number,
): string {
  const qa = (env["SCD_QA_TODAY"] ?? "").trim();
  const production =
    (env["SCD_ENV"] ?? "").toLowerCase() === "production" && env["SCD_STAGING_GATEWAY"] !== "1";
  const hosted = (env["RENDER"] ?? "") !== "";
  if (qa && isIsoDay(qa) && !production && !hosted) return qa;
  return romeDay(nowMs);
}
