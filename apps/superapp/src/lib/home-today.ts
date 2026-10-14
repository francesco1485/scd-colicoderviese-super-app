/**
 * "Oggi e questa settimana" (UD-116, Direzione 14/10/2026 10:59): what really matters at the top of the home.
 *
 * Pure functions, no network, no invented data:
 * - matches come from the calendar the home already loads (Master Calendario mirror or its validated copy, the same
 *   source as /calendario); for anonymous visitors that payload is fixtures-only and has no notices;
 * - trainings come from the weekly Quadro allenamenti (members only, server side) and are a weekly template: the
 *   view always says that the coach's notice wins;
 * - changes are the master's own flags (variation, notices, time/venue not confirmed) and the R20 "alert" items
 *   inside their window. Nothing is guessed: no flag, no highlight.
 * Signed in, the list is limited to the person's teams (staff) and children's teams (families); signed out, the home
 * shows today's games and the next home game of each team.
 */
import { addDays, quadroDay, shortTeams } from "./board-data";
import type { FeedItem } from "./club.types";
import { groupForTeamCode } from "./roster";
import type {
  PublicEvent,
  PublicGroup,
  TrainingSlot,
} from "./public-snapshots";
import { calendarGroupFor } from "./transport-requests";

/** Days covered by "questa settimana": today and the next six. */
export const HOME_WEEK_DAYS = 7;

export type TodayKind = "gara" | "allenamento";

export interface TodayEntry {
  id: string;
  kind: TodayKind;
  /** Rome day YYYY-MM-DD. */
  date: string;
  /** "HH:MM" or "" when the source has none (shown as "orario da definire"). */
  time: string;
  /** End time when the source states it (trainings). */
  end: string;
  /** Calendar group id ("u15", "prima"...): the first of `groups`. */
  group: string;
  /** Every calendar group concerned (a quadro cell may hold several teams). */
  groups: string[];
  /** Team label as the source writes it. */
  team: string;
  /** Opponent for games, "" otherwise. */
  opponent: string;
  homeAway: "CASA" | "FUORI" | "";
  /** Venue (games) or "Colico · Campo 1" (trainings). */
  place: string;
  /** Changes to highlight (variation, notices), in plain Italian, from the source flags only. */
  changes: string[];
  /** What the club has not confirmed yet (time, venue): shown softly, not as a change. */
  pending: string[];
  /** First names of the signed-in family's children concerned (never on the public home). */
  forNames: string[];
}

/** What the club has not confirmed yet for a game (master verification flags). */
export function matchPending(
  e: Pick<PublicEvent, "timeConfirmed" | "venueConfirmed">,
): string[] {
  if (!e.timeConfirmed && !e.venueConfirmed)
    return ["Orario e campo da confermare"];
  if (!e.timeConfirmed) return ["Orario da confermare"];
  if (!e.venueConfirmed) return ["Campo da confermare"];
  return [];
}

/** Changes of a calendar game, from the master's variation flag and notices only. */
export function matchChanges(
  e: Pick<PublicEvent, "isVariation" | "notice">,
): string[] {
  const out: string[] = [];
  if (e.isVariation) out.push("Variazione in calendario");
  for (const n of e.notice) {
    const t = n.trim();
    // Internal facility checks are for the office, not for families.
    if (t && !/utilizzo struttura|attesa verifica/i.test(t) && !out.includes(t))
      out.push(t);
  }
  return out;
}

export function matchEntry(
  e: PublicEvent,
  groups: readonly PublicGroup[],
): TodayEntry {
  const g = groups.find((x) => x.id === e.group);
  return {
    id: e.id,
    kind: "gara",
    date: e.date,
    time: e.time,
    end: "",
    group: e.group,
    groups: [e.group],
    team: g?.label ?? e.category,
    opponent: e.opponent,
    homeAway: e.homeAway === "CASA" || e.homeAway === "FUORI" ? e.homeAway : "",
    place: e.venue,
    changes: matchChanges(e),
    pending: matchPending(e),
    forNames: [],
  };
}

const order = (a: TodayEntry, b: TodayEntry) =>
  (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")) ||
  a.team.localeCompare(b.team);

/** Games from `today` for `days` days, optionally limited to some groups (null = every team). */
export function weekMatches(
  events: readonly PublicEvent[],
  groups: readonly PublicGroup[],
  today: string,
  only: ReadonlySet<string> | null,
  days = HOME_WEEK_DAYS,
): TodayEntry[] {
  const last = addDays(today, days - 1);
  return events
    .filter(
      (e) =>
        e.date >= today &&
        e.date <= last &&
        (only === null || only.has(e.group)),
    )
    .map((e) => matchEntry(e, groups))
    .sort(order);
}

/** Next home game of every team from now (today with a time not yet passed, or a later day). */
export function nextHomeMatchPerTeam(
  events: readonly PublicEvent[],
  groups: readonly PublicGroup[],
  today: string,
  nowHHMM: string,
): TodayEntry[] {
  const seen = new Set<string>();
  const out: TodayEntry[] = [];
  const upcoming = [...events]
    .filter(
      (e) =>
        e.homeAway === "CASA" &&
        (e.date > today ||
          (e.date === today && (e.time === "" || e.time >= nowHHMM))),
    )
    .sort((a, b) =>
      (a.date + (a.time || "99:99")).localeCompare(
        b.date + (b.time || "99:99"),
      ),
    );
  for (const e of upcoming) {
    if (!e.group || seen.has(e.group)) continue;
    seen.add(e.group);
    out.push(matchEntry(e, groups));
  }
  return out;
}

/**
 * Calendar groups written in a quadro cell. A cell may hold several teams ("U15 2012/2013 + U12 2015 + U11
 * 2016/2017"): each part is matched on its own with explicit names or years written in both sources (same rules as
 * the gestionale colour dots; "Under 13" stays unmatched because the master does not tie it to an annata).
 */
const QUADRO_RULES: readonly [RegExp, string][] = [
  [/prima squadra/i, "prima"],
  [/juniores|\bu19\b/i, "u19"],
  [/\bu16\b|under\s*16/i, "u16"],
  [/\bu15\b|under\s*15/i, "u15"],
  [/\bu12\b.*\b2015\b|\b2015\b/i, "2015"],
  [/\bu11\b|pulcini/i, "pulcini"],
  [/primi calci/i, "primicalci"],
  [/piccoli amici/i, "piccoli"],
];

export function quadroGroups(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/\+|\n/)) {
    for (const [re, id] of QUADRO_RULES) {
      if (re.test(part) && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

/**
 * Trainings of the week for some groups, from the weekly quadro (Colico, Monday to Friday). Each slot cell becomes
 * one entry per day; cells of several teams list every group concerned.
 */
export function weekTrainings(
  slots: readonly TrainingSlot[],
  today: string,
  only: ReadonlySet<string>,
  groupLabel: (id: string) => string,
  days = HOME_WEEK_DAYS,
): TodayEntry[] {
  const out: TodayEntry[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const day = quadroDay(date);
    if (!day) continue;
    for (const s of slots) {
      if (s.day !== day) continue;
      for (const field of ["C1", "C2"] as const) {
        const text = s.fields[field].trim();
        if (!text) continue;
        const mine = quadroGroups(text).filter((g) => only.has(g));
        if (mine.length === 0) continue;
        const [time = "", end = ""] = s.timeLabel
          .split(/[–-]/)
          .map((t) => t.trim());
        out.push({
          id: `tr-${date}-${s.timeLabel}-${field}`,
          kind: "allenamento",
          date,
          time,
          end,
          group: mine[0]!,
          groups: mine,
          team:
            mine.length > 1
              ? mine.map(groupLabel).join(" + ")
              : groupLabel(mine[0]!) || shortTeams(text),
          opponent: "",
          homeAway: "",
          place: `Colico · ${field === "C1" ? "Campo 1" : "Campo 2"}`,
          changes: [],
          pending: [],
          forNames: [],
        });
      }
    }
  }
  return out.sort(order);
}

/* ------------------------------------------------------------------ scope */

export interface FamilyLike {
  displayName: string;
  relationship: string;
  teamCodes: readonly string[];
}

export interface HomeChild {
  /** First name only: the home never shows a full name. */
  firstName: string;
  groups: string[];
}

/** First word of a display name, or "" when unknown. */
export function firstName(displayName: string): string {
  const w = displayName.trim().split(/\s+/)[0] ?? "";
  return /^nome non indicato$/i.test(displayName.trim()) ? "" : w;
}

/** Children (and the person themself, when registered) of a family, with their calendar groups. */
export function familyChildren(members: readonly FamilyLike[]): HomeChild[] {
  return members
    .filter((m) => m.teamCodes.length > 0)
    .map((m) => ({
      firstName: m.relationship === "SELF" ? "" : firstName(m.displayName),
      groups: [...new Set(m.teamCodes.map(calendarGroupFor))],
    }));
}

/** Calendar groups of the teams a staff member follows (scd_my_team_roster team codes). */
export function rosterGroups(teamCodes: readonly string[]): string[] {
  return [...new Set(teamCodes.map(groupForTeamCode))];
}

/** Adds the children's first names to the entries of their groups. */
export function tagChildren(
  entries: readonly TodayEntry[],
  children: readonly HomeChild[],
): TodayEntry[] {
  return entries.map((e) => {
    const names = children
      .filter((c) => c.firstName && c.groups.some((g) => e.groups.includes(g)))
      .map((c) => c.firstName);
    return names.length ? { ...e, forNames: [...new Set(names)] } : e;
  });
}

/* ----------------------------------------------------------------- alerts */

export interface UrgentNotice {
  id: string;
  title: string;
  body: string;
  link: string;
}

/**
 * Urgent club notices (campo chiuso, orario spostato, pioggia…): the R20 feed items of kind "alert" for this
 * audience whose window includes now. Without R20 or without alerts the list is empty.
 */
export function urgentNotices(
  items: readonly FeedItem[],
  nowMs: number,
  signedIn: boolean,
): UrgentNotice[] {
  return items
    .filter((i) => i.kind === "alert")
    .filter(
      (i) =>
        i.audience.includes("public") ||
        (signedIn && i.audience.some((a) => a !== "public")),
    )
    .filter((i) => {
      const from = i.startAt ? Date.parse(i.startAt) : Number.NaN;
      const to = i.endAt ? Date.parse(i.endAt) : Number.NaN;
      if (Number.isFinite(from) && nowMs < from) return false;
      if (Number.isFinite(to) && nowMs > to) return false;
      // An alert without an end date stays only for the day it starts (never forever).
      if (!Number.isFinite(to))
        return Number.isFinite(from) ? nowMs - from < 86_400_000 : false;
      return true;
    })
    .map((i) => ({
      id: i.id,
      title: i.title,
      body: i.body ?? "",
      link: i.link ?? "",
    }))
    .slice(0, 3);
}

/** Splits the entries into today's and the following days', and counts the highlighted changes. */
export function splitWeek(
  entries: readonly TodayEntry[],
  today: string,
): { today: TodayEntry[]; later: TodayEntry[]; changes: number } {
  const sorted = [...entries].sort(order);
  return {
    today: sorted.filter((e) => e.date === today),
    later: sorted.filter((e) => e.date > today),
    changes: sorted.filter((e) => e.changes.length > 0).length,
  };
}
