/**
 * Teams are inside (UD-100, Direzione 13/10/2026: "Le squadre sono dentro non fuori. Fuori che aspetto creativo
 * comunicativo e commerciale"). Pure guards used by the server functions, so they can be unit-tested:
 * - rosters, people and training schedules need a signed-in member: anonymous callers get an explicit
 *   not-authorized result and no data;
 * - the calendar stays anonymous ONLY for fixtures (Direzione 09:03: "calendario settimana deve essere sempre"):
 *   date, time, home/away, venue, team label, opponent. Training sessions, notes and annata crest files are
 *   stripped for anonymous callers; signed-in members keep the full data.
 */
import type { PublicEvent, PublicGroup } from "./public-snapshots";

/** What the guards need from the verified session (auth.functions.ts SessionView). */
export interface SessionLike {
  user: { email: string } | null;
  memberships: readonly unknown[];
}

/** A signed-in person with at least one active membership of the club. Suspended logins are not members. */
export function isSignedInMember(s: SessionLike | null | undefined): boolean {
  return !!s?.user && s.memberships.length > 0;
}

export const SIGN_IN_REQUIRED = "sign-in-required" as const;

/** Explicit answer to an anonymous caller of a members-only server function. */
export interface NotAuthorized {
  authorized: false;
  reason: typeof SIGN_IN_REQUIRED;
}

export const NOT_AUTHORIZED: NotAuthorized = Object.freeze({ authorized: false, reason: SIGN_IN_REQUIRED });

/**
 * Official games only. The master calendar may also carry trainings, meetings or other internal entries: anything
 * whose type is not a game is kept out of the anonymous result (allowlist, so a new internal type stays private).
 */
const GAME_TYPE_RE = /^(CAMPIONATO|COPPA|TORNEO|AMICHEVOLE|GARA|PARTITA|PLAY[ -]?OFF|PLAY[ -]?OUT|RECUPERO|FINALE)\b/i;

export function isFixture(e: Pick<PublicEvent, "type">): boolean {
  return GAME_TYPE_RE.test(e.type.trim());
}

export interface CalendarPayload {
  season: string;
  sourceModifiedAt: string;
  groups: PublicGroup[];
  events: PublicEvent[];
  origin: string;
  throttled: boolean;
}

/** Audience of a calendar result: what the page may offer (training links, team details). */
export type CalendarAudience = "member" | "public";

/**
 * Anonymous calendar: fixtures only. Keeps the game facts (date, time, home/away, venue, team label, opponent,
 * competition, round, verification flags), drops trainings and any non-game entry, empties the free-text notes and
 * removes the annata crest file of every group (UD-098: annata crests are internal).
 */
export function publicFixturesOnly<T extends CalendarPayload>(cal: T): T & { audience: CalendarAudience } {
  const events = cal.events.filter(isFixture).map((e) => ({ ...e, notice: [] as string[] }));
  const groups = cal.groups.map((g) => ({ ...g, logo: null, count: events.filter((e) => e.group === g.id).length }));
  return { ...cal, groups, events, audience: "public" };
}

/** The calendar a caller may receive: full data for members, fixtures only for everyone else. */
export function calendarFor<T extends CalendarPayload>(cal: T, session: SessionLike | null | undefined): T & { audience: CalendarAudience } {
  return isSignedInMember(session) ? { ...cal, audience: "member" } : publicFixturesOnly(cal);
}

/**
 * Members-only payload: the value for members, the explicit not-authorized result otherwise.
 * `load` runs only for members, so nothing is read from the sources for anonymous callers.
 */
export async function forMembers<T>(session: SessionLike | null | undefined, load: () => Promise<T> | T): Promise<(T & { authorized: true }) | NotAuthorized> {
  if (!isSignedInMember(session)) return NOT_AUTHORIZED;
  const v = await load();
  return { ...v, authorized: true as const };
}
