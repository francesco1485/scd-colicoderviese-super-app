/**
 * Calendario incassi (Direzione 13/10/2026): for each day of a month, the home matches with the ticket office
 * (official calendar snapshot + config/scd-ticketing.v1.json) and the Club House days (Colico, Dervio), with the
 * registered takings when a register row exists, otherwise "da registrare" and the office in charge.
 * Pure functions. No amount is ever estimated: tariffs are shown as rules, takings only when registered.
 */
import { ticketingFor, type Tariff } from "./match-extras";
import { type PrimaNotaRow } from "./prima-nota";

export type Site = "colico" | "dervio";
export const SITE_LABEL: Readonly<Record<Site, string>> = {
  colico: "Colico",
  dervio: "Dervio",
};

export interface CalendarMatch {
  id: string;
  date: string;
  time: string;
  group: string;
  type: string;
  homeAway: string;
  opponent: string;
  venue: string;
}

/** Site of a home venue from the FIGC venue string ("COLICO - CAMPO 1"). Null for venues elsewhere. */
export function siteOf(venue: string): Site | null {
  const v = venue.toUpperCase();
  if (/\bDERVIO\b/.test(v)) return "dervio";
  if (/\bCOLICO\b/.test(v)) return "colico";
  return null;
}

export type TakingState = "registrato" | "da-registrare" | "in-programma";

export interface DayMatch {
  match: CalendarMatch;
  site: Site | null;
  office: "biglietteria" | "gratuito";
  tariff: Tariff | null;
  cup: boolean;
}

export interface DayTill {
  kind: "biglietteria" | "club-house";
  site: Site;
  /** Registered takings of the day for this till (sum of register rows), null when nothing is registered. */
  registered: number | null;
  rows: number;
  state: TakingState;
}

export interface IncassiDay {
  date: string;
  inMonth: boolean;
  weekday: number; // 1 = Monday … 7 = Sunday
  matches: DayMatch[];
  tills: DayTill[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Monday-first weeks covering the month; days of nearby months are marked inMonth = false. */
export function monthWeeks(month: string): string[][] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const weeks: string[][] = [];
  const cur = new Date(start);
  while (cur <= last) {
    const w: string[] = [];
    for (let i = 0; i < 7; i++) {
      w.push(iso(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(w);
  }
  return weeks;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/**
 * Register rows that count as takings of a till: proposed centre biglietteria or club house of the site.
 * Club House rows without a site are attributed to Colico only when Colico is the only site open that day.
 */
function tillRows(
  rows: readonly PrimaNotaRow[],
  day: string,
  kind: DayTill["kind"],
  site: Site,
  onlySite: boolean,
): PrimaNotaRow[] {
  return rows.filter((r) => {
    if (r.day !== day || r.entry.amount <= 0) return false;
    const c = r.proposal.center;
    if (kind === "biglietteria") return c === "biglietteria";
    if (c === `club-house-${site}`) return true;
    return c === "club-house" && onlySite;
  });
}

/**
 * Builds the month. A Club House day is a day with at least one home match at that site (the Club House opens for
 * home matches): it is INFERRED from the calendar until the Club House opening calendar is connected.
 */
export function buildIncassiMonth(
  month: string,
  events: readonly CalendarMatch[],
  rows: readonly PrimaNotaRow[],
  today: string,
): IncassiDay[] {
  const weeks = monthWeeks(month);
  const home = events.filter((e) => e.homeAway === "CASA");
  return weeks.flat().map((date, i) => {
    const matches: DayMatch[] = home
      .filter((e) => e.date === date)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((e) => {
        const t = ticketingFor({
          homeAway: e.homeAway,
          group: e.group,
          competition: e.type,
        });
        return {
          match: e,
          site: siteOf(e.venue),
          office: t?.kind === "office" ? "biglietteria" : "gratuito",
          tariff: t?.kind === "office" ? t.tariff : null,
          cup: t?.kind === "office" ? t.cup : false,
        };
      });
    const sites = [
      ...new Set(
        matches.map((m) => m.site).filter((s): s is Site => s !== null),
      ),
    ];
    const tills: DayTill[] = [];
    const state = (registered: number | null): TakingState =>
      registered !== null
        ? "registrato"
        : date <= today
          ? "da-registrare"
          : "in-programma";
    for (const site of sites) {
      if (matches.some((m) => m.site === site && m.office === "biglietteria")) {
        const r = tillRows(
          rows,
          date,
          "biglietteria",
          site,
          sites.length === 1,
        );
        const sum = r.length
          ? round2(r.reduce((s, x) => s + x.entry.amount, 0))
          : null;
        tills.push({
          kind: "biglietteria",
          site,
          registered: sum,
          rows: r.length,
          state: state(sum),
        });
      }
      const r = tillRows(rows, date, "club-house", site, sites.length === 1);
      const sum = r.length
        ? round2(r.reduce((s, x) => s + x.entry.amount, 0))
        : null;
      tills.push({
        kind: "club-house",
        site,
        registered: sum,
        rows: r.length,
        state: state(sum),
      });
    }
    return {
      date,
      inMonth: date.startsWith(month),
      weekday: (i % 7) + 1,
      matches,
      tills,
    };
  });
}

export interface IncassiTotals {
  registered: number;
  ticketing: number;
  clubHouse: number;
  toRegister: number;
  planned: number;
  matches: number;
  ticketedMatches: number;
}

export function incassiTotals(days: readonly IncassiDay[]): IncassiTotals {
  const t: IncassiTotals = {
    registered: 0,
    ticketing: 0,
    clubHouse: 0,
    toRegister: 0,
    planned: 0,
    matches: 0,
    ticketedMatches: 0,
  };
  for (const d of days) {
    if (!d.inMonth) continue;
    t.matches += d.matches.length;
    t.ticketedMatches += d.matches.filter(
      (m) => m.office === "biglietteria",
    ).length;
    for (const x of d.tills) {
      if (x.registered !== null) {
        t.registered += x.registered;
        if (x.kind === "biglietteria") t.ticketing += x.registered;
        else t.clubHouse += x.registered;
      }
      if (x.state === "da-registrare") t.toRegister++;
      if (x.state === "in-programma") t.planned++;
    }
  }
  t.registered = round2(t.registered);
  t.ticketing = round2(t.ticketing);
  t.clubHouse = round2(t.clubHouse);
  return t;
}

/** POS/link credits of the month: real money on the account that cannot be attributed to a day or till. */
export function unattributedPos(
  rows: readonly PrimaNotaRow[],
  month: string,
): { count: number; total: number } {
  const r = rows.filter(
    (x) =>
      x.month === month &&
      x.proposal.center === "incassi-pos" &&
      x.entry.amount > 0,
  );
  return {
    count: r.length,
    total: round2(r.reduce((s, x) => s + x.entry.amount, 0)),
  };
}
