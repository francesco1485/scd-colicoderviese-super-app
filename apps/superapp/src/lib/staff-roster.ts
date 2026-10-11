/**
 * Staff roster (UD-046): the "omini" shown next to pitches, changing rooms and vans.
 *
 * Adults only (managers, coaches, drivers, area managers), from the club's own
 * "ELENCO DIRIGENTI E RUOLI" copied into env SCD_STAFF_ROSTER_JSON. Names and roles
 * are the public projection; e-mail and phone never leave the server unless the
 * caller is inside an open work area (contacts projection). Children are never in
 * this roster.
 */

export type StaffKind = "dirigente" | "mister" | "autista" | "responsabile" | "staff";

export interface StaffPerson {
  id: string;
  /** Display name as the club writes it ("Mario Rossi"). */
  name: string;
  /** Role label as in the club list ("Dirigente accompagnatore U15"). */
  role: string;
  kind: StaffKind;
  /** Team labels this person follows ("U15", "2015", "Prima"); matched against quadro texts. */
  teams: string[];
  /** Area ids for area managers ("pulmini", "club-house", "infermeria", ...). */
  areas: string[];
  /** Optional avatar path (synthetic avatar, never a photo of a minor). */
  avatar: string | null;
}

export interface StaffContacts {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface StaffRoster {
  asOf: string | null;
  people: StaffPerson[];
}

const KIND_RULES: Array<{ kind: StaffKind; re: RegExp }> = [
  { kind: "autista", re: /autist/i },
  { kind: "mister", re: /allenator|mister|preparator|portier/i },
  { kind: "dirigente", re: /dirigent|team manager|direttore sportivo|accompagnat/i },
  { kind: "responsabile", re: /responsabil|coordinator|direttore generale|president|segretari|tesorier/i },
];

export function kindOf(role: string): StaffKind {
  return KIND_RULES.find((r) => r.re.test(role))?.kind ?? "staff";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

function list(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => text(x, 40)).filter((x): x is string => x !== null).slice(0, max);
}

function parsePerson(v: unknown): { person: StaffPerson; contacts: StaffContacts } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = text(o["id"], 40);
  const name = text(o["name"], 60);
  const role = text(o["role"], 80);
  if (!id || !name || !role || !/^[a-z0-9-]+$/.test(id)) return null;
  const email = text(o["email"], 120);
  const phone = text(o["phone"], 30);
  const avatar = text(o["avatar"], 160);
  return {
    person: {
      id,
      name,
      role,
      kind: kindOf(role),
      teams: list(o["teams"], 12),
      areas: list(o["areas"], 8).map((a) => a.toLowerCase()),
      avatar: avatar && avatar.startsWith("/media/") ? avatar : null,
    },
    contacts: { id, email: email && EMAIL.test(email) ? email : null, phone: phone && /^[+\d][\d ./-]{5,}$/.test(phone) ? phone : null },
  };
}

/** Strict parser: returns the public roster and, separately, the contacts. */
export function parseRoster(raw: string | null | undefined): { roster: StaffRoster; contacts: StaffContacts[] } {
  const empty = { roster: { asOf: null, people: [] }, contacts: [] };
  if (!raw || !raw.trim()) return empty;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!data || typeof data !== "object") return empty;
  const o = data as Record<string, unknown>;
  const asOf = typeof o["asOf"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o["asOf"]) ? o["asOf"] : null;
  const items = (Array.isArray(o["people"]) ? o["people"] : []).map(parsePerson).filter((x): x is NonNullable<typeof x> => x !== null).slice(0, 200);
  const seen = new Set<string>();
  const unique = items.filter((x) => (seen.has(x.person.id) ? false : (seen.add(x.person.id), true)));
  return { roster: { asOf, people: unique.map((x) => x.person) }, contacts: unique.map((x) => x.contacts) };
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àá]/g, "a")
    .replace(/[èé]/g, "e")
    .replace(/[ìí]/g, "i")
    .replace(/[òó]/g, "o")
    .replace(/[ùú]/g, "u");
}

/** Does a team label ("U15", "2015", "Prima") refer to the people on this pitch text? */
export function teamMatches(pitchText: string, teamLabel: string): boolean {
  const t = norm(pitchText);
  const l = norm(teamLabel).trim();
  if (!l) return false;
  if (/^\d{4}$/.test(l)) {
    // "2015" also matches "2014/2015" and "2015/16" spans
    return new RegExp(`(?<!\\d)${l}(?!\\d)`).test(t) || new RegExp(`(?<!\\d)${l.slice(0, 2)}\\d{2}\\s*/\\s*${l.slice(2)}(?!\\d)`).test(t);
  }
  if (/^u\d{1,2}$/.test(l)) return new RegExp(`(?<![a-z])${l}(?!\\d)`).test(t);
  return t.includes(l);
}

/** People following at least one of the teams named in the given pitch texts, by kind order. */
export function peopleOnPitch(people: readonly StaffPerson[], pitchTexts: readonly string[]): StaffPerson[] {
  const texts = pitchTexts.filter(Boolean);
  if (!texts.length) return [];
  const order: StaffKind[] = ["dirigente", "mister", "staff", "responsabile", "autista"];
  return people
    .filter((p) => p.kind !== "autista" && p.teams.some((team) => texts.some((pt) => teamMatches(pt, team))))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
}

export function peopleForArea(people: readonly StaffPerson[], area: string): StaffPerson[] {
  const a = area.toLowerCase();
  return people.filter((p) => p.areas.includes(a)).sort((x, y) => x.name.localeCompare(y.name));
}

/** "Mario Rossi" → "MR"; one-word names give the first two letters. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
