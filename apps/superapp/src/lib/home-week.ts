/**
 * Home "La settimana SCD": unisce il calendario pubblico validato (stessa fonte di /calendario:
 * mirror Drive allowlistato o copia di sicurezza inclusa) con eventuali voci R20.
 * Funzioni pure, senza rete: testate in home-week.test.ts.
 */
import type { FeedItem, Match } from "./club.types";
import type { PublicEvent, PublicGroup } from "./public-snapshots";

export const CLUB_SHORT = "SCD";
export const CLUB_FULL = "S.C.D. ColicoDerviese";

/** Sedi del centro sportivo SCD: Colico e Dervio. */
export const CENTRE_VENUE = /\b(colico|dervio)\b/i;

export type WeekItem = {
  id: string;
  date: string; // YYYY-MM-DD (Europe/Rome)
  time: string; // HH:MM o ""
  title: string;
  kind: "Gara" | "Evento" | "Iniziativa";
  origin: "calendario" | "r20";
  homeAway: "CASA" | "FUORI" | "";
  venue: string;
  group: string;
  groupLabel: string;
  /** Orario e sede registrati nel Calendario SCD (flag del master; assente = non confermato). */
  certain: boolean;
  facilityReview: boolean;
  isVariation: boolean;
  /** Chiave di deduplica: data + avversario normalizzato. */
  dedupeKey: string;
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const isUs = (team: string) => /colico/i.test(team);

/** Titolo come nella card del calendario: "SCD – Avversario" in casa, "Avversario – SCD" fuori. */
export function eventTitle(e: Pick<PublicEvent, "homeAway" | "opponent">): string {
  const opp = e.opponent || "Avversario da definire";
  return e.homeAway === "CASA" ? `${CLUB_SHORT} – ${opp}` : `${opp} – ${CLUB_SHORT}`;
}

export function calendarToWeekItems(events: readonly PublicEvent[], groups: readonly PublicGroup[]): WeekItem[] {
  return events.map((e) => {
    const g = groups.find((x) => x.id === e.group);
    return {
      id: e.id,
      date: e.date,
      time: e.time,
      title: eventTitle(e),
      kind: "Gara",
      origin: "calendario",
      homeAway: e.homeAway === "CASA" || e.homeAway === "FUORI" ? e.homeAway : "",
      venue: e.venue,
      group: e.group,
      groupLabel: g?.label ?? e.category,
      certain: e.timeConfirmed && e.venueConfirmed,
      facilityReview: e.facilityReview,
      isVariation: e.isVariation,
      dedupeKey: `${e.date}|${norm(e.opponent)}`,
    };
  });
}

/** Data e ora (Europe/Rome) da un ISO R20. */
export function romeParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

/** ISO UTC di una data/ora locale Europe/Rome (gestisce ora legale/solare). */
export function romeToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = (time || "12:00").split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const local = romeParts(new Date(guess).toISOString());
  if (!local) return new Date(guess).toISOString();
  const [ly, lm, ld] = local.date.split("-").map(Number) as [number, number, number];
  const [lh, lmin] = local.time.split(":").map(Number) as [number, number];
  const offset = Date.UTC(ly, lm - 1, ld, lh, lmin) - guess;
  return new Date(guess - offset).toISOString();
}

export function r20MatchToWeekItem(m: Match): WeekItem | null {
  const at = m.startAt ? romeParts(m.startAt) : null;
  if (!at) return null;
  const home = isUs(m.casa);
  const opp = home ? m.ospite : m.casa;
  return {
    id: `r20-${m.id}`,
    date: at.date,
    time: at.time,
    title: `${m.casa} – ${m.ospite}`,
    kind: "Gara",
    origin: "r20",
    homeAway: home ? "CASA" : isUs(m.ospite) ? "FUORI" : "",
    venue: m.campo ?? "",
    group: "",
    groupLabel: m.squadra,
    certain: true,
    facilityReview: false,
    isVariation: false,
    dedupeKey: `${at.date}|${norm(opp)}`,
  };
}

export function r20ItemToWeekItem(i: FeedItem): WeekItem | null {
  if (!["event", "community"].includes(i.kind) || !i.startAt) return null;
  const at = romeParts(i.startAt);
  if (!at) return null;
  return {
    id: `r20-${i.id}`, date: at.date, time: at.time, title: i.title,
    kind: i.kind === "event" ? "Evento" : "Iniziativa", origin: "r20", homeAway: "",
    venue: i.venue ?? "", group: "", groupLabel: i.category ?? "", certain: true,
    facilityReview: false, isVariation: false, dedupeKey: `${at.date}|${norm(i.title)}`,
  };
}

/**
 * Unione senza doppioni: a parità di data e avversario vince la voce del calendario validato
 * (porta i flag di verifica); le voci solo-R20 vengono aggiunte. Ordine per data e ora.
 */
export function mergeWeekItems(calendar: readonly WeekItem[], r20: readonly WeekItem[]): WeekItem[] {
  const seen = new Set(calendar.map((i) => i.dedupeKey));
  const ids = new Set(calendar.map((i) => i.id));
  const extra = r20.filter((i) => !seen.has(i.dedupeKey) && !ids.has(i.id));
  return [...calendar, ...extra].sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
}

export const itemsOn = (items: readonly WeekItem[], date: string) => items.filter((i) => i.date === date);

/** Prossima gara: prima gara da adesso (oggi con orario non ancora passato, o giorni successivi). */
export function nextMatchItem(items: readonly WeekItem[], today: string, nowHHMM: string): WeekItem | null {
  return items.find((i) => i.kind === "Gara" && (i.date > today || (i.date === today && (i.time === "" || i.time >= nowHHMM)))) ?? null;
}

/** "Oggi al centro sportivo": voci di oggi in casa nelle sedi di Colico o Dervio. */
export function todayAtCentre(items: readonly WeekItem[], today: string): WeekItem[] {
  return items.filter((i) => i.date === today && i.homeAway !== "FUORI" && CENTRE_VENUE.test(i.venue));
}

/** Differenza in giorni di calendario (Europe/Rome) tra due date ISO YYYY-MM-DD. */
export function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function countdownLabel(today: string, date: string): string | null {
  const n = dayDiff(today, date);
  if (n < 0) return null;
  return n === 0 ? "Oggi" : n === 1 ? "Domani" : `Tra ${n} giorni`;
}

/** Converte una voce del calendario nel formato Match usato dal Match center della Home. */
export function weekItemToMatch(i: WeekItem, opponent: string): Match {
  const home = i.homeAway === "CASA";
  const dataLabel = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${i.date}T12:00:00Z`));
  return {
    id: i.id,
    competizione: "",
    squadra: i.groupLabel,
    casa: home ? CLUB_FULL : opponent || "Avversario da definire",
    ospite: home ? opponent || "Avversario da definire" : CLUB_FULL,
    avversario: undefined,
    startAt: romeToIso(i.date, i.time),
    dataLabel: `${dataLabel}${i.time ? ` · ${i.time}` : ""}${i.certain ? "" : " (orario da confermare)"}`,
    campo: i.venue || undefined,
    golCasa: null,
    golOspite: null,
    stats: {},
  };
}
