/**
 * "Risultati del weekend" on the home (UD-116): only when a real source has them. The app does not publish scores
 * of its own (official-links.ts); the one source in the repository is the R20 public feed (public.match "last" and
 * feed items of kind "result" carrying a match with both scores). Without R20 or without scores the block is hidden:
 * no placeholder reaches the public. Teams of the attività di base never show a result (SGS CU n.2 2026/27).
 */
import type { Match, PublicFeed } from "./club.types";
import { romeParts } from "./home-week";

export interface ResultRow {
  id: string;
  team: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  date: string;
}

/** Days back from today that count as "the weekend just played" (Friday to Monday). */
export const RESULTS_WINDOW_DAYS = 3;

/** Base-activity teams by label: no results, no standings during the season. */
const BASE_ACTIVITY =
  /pulcini|primi\s*calci|piccoli|esordienti|\bu1[0-3]\b|20(1[4-9]|2\d)/i;

const shift = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

function row(m: Match): ResultRow | null {
  if (typeof m.golCasa !== "number" || typeof m.golOspite !== "number")
    return null;
  if (!Number.isFinite(m.golCasa) || !Number.isFinite(m.golOspite)) return null;
  const at = m.startAt ? romeParts(m.startAt) : null;
  if (!at) return null;
  if (BASE_ACTIVITY.test(m.squadra)) return null;
  return {
    id: m.id,
    team: m.squadra,
    home: m.casa,
    away: m.ospite,
    homeGoals: m.golCasa,
    awayGoals: m.golOspite,
    date: at.date,
  };
}

/** Results of the last days with both scores, newest first, one per match. */
export function weekendResults(
  feed: Pick<PublicFeed, "items" | "lastResult"> | null,
  today: string,
): ResultRow[] {
  if (!feed) return [];
  const from = shift(today, -RESULTS_WINDOW_DAYS);
  const matches: Match[] = [
    ...(feed.lastResult ? [feed.lastResult] : []),
    ...feed.items
      .filter(
        (i) => i.kind === "result" && i.match && i.audience.includes("public"),
      )
      .map((i) => i.match as Match),
  ];
  const seen = new Set<string>();
  const out: ResultRow[] = [];
  for (const m of matches) {
    const r = row(m);
    if (!r || r.date < from || r.date > today || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
}

/** Our side in a result: the S.C.D. ColicoDerviese name ("ColicoDerviese", "Colico Derviese", any case) on exactly one side. */
const OURS = /colico\s*-?\s*derviese/i;

/**
 * True when the row is a ColicoDerviese win (UD-134, Francesco 15/10/2026 09:18: "coriandoli se si vince"). A draw,
 * a defeat, or a row where our name is on both sides or on neither (not ours, or a derby between our own teams) is
 * never a win.
 */
export function isClubWin(
  r: Pick<ResultRow, "home" | "away" | "homeGoals" | "awayGoals">,
): boolean {
  const atHome = OURS.test(r.home);
  const away = OURS.test(r.away);
  if (atHome === away) return false;
  return atHome ? r.homeGoals > r.awayGoals : r.awayGoals > r.homeGoals;
}

/** Confetti pieces of a celebration: deterministic (no random at render), spread across the width. */
export function confettiPieces(
  count: number,
): { x: number; delay: number; spin: number; drift: number; color: number }[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => ({
    x: Math.round(((i * 37) % 100) * 10) / 10,
    delay: (i % 7) * 70,
    spin: ((i * 53) % 2 === 0 ? 1 : -1) * (360 + ((i * 97) % 360)),
    drift: ((i * 29) % 41) - 20,
    color: i % 4,
  }));
}
