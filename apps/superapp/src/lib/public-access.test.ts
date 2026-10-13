/**
 * UD-100 (Direzione 13/10/2026): "Le squadre sono dentro non fuori. Fuori che aspetto creativo comunicativo e
 * commerciale". Guards of the server functions (pure helpers) and a scan of the public routes.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { isPublicPath, MEMBERS_ONLY_PREFIXES } from "./http-policy";
import {
  calendarFor,
  forMembers,
  isFixture,
  isSignedInMember,
  NOT_AUTHORIZED,
  publicFixturesOnly,
  type CalendarPayload,
} from "./public-access";
import type { PublicEvent, PublicGroup } from "./public-snapshots";
import { staffRosterFor } from "./staff-roster.functions";

const ANON = { user: null, memberships: [] };
const SUSPENDED = { user: { email: "x@example.it" }, memberships: [] };
const MEMBER = { user: { email: "socio@example.it" }, memberships: [{ organization: "scd-colicoderviese", role: "family" }] };

function ev(id: string, type: string, extra: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id, date: "2026-10-17", time: "15:30", group: "u15", category: "Giovanissimi U15", type, homeAway: "CASA",
    opponent: "AVVERSARIA", venue: "Colico", round: "4A", source: "FIGC/LND", status: "OFFICIAL_CALENDAR",
    isVariation: false, notice: ["nota interna"], timeConfirmed: true, venueConfirmed: true, facilityReview: false,
    ...extra,
  };
}

const GROUPS: PublicGroup[] = [
  { id: "u15", label: "Giovanissimi U15", color: "#123456", logo: "SCD_U15.png", years: ["2012"], count: 3 },
];

const CAL: CalendarPayload = {
  season: "2026/27",
  sourceModifiedAt: "2026-10-10T08:00:00Z",
  groups: GROUPS,
  events: [ev("g1", "CAMPIONATO"), ev("t1", "ALLENAMENTO", { opponent: "" }), ev("g2", "COPPA"), ev("m1", "RIUNIONE STAFF")],
  origin: "mirror",
  throttled: false,
};

describe("members guard", () => {
  it("a member is signed in with at least one active membership", () => {
    expect(isSignedInMember(ANON)).toBe(false);
    expect(isSignedInMember(null)).toBe(false);
    expect(isSignedInMember(SUSPENDED)).toBe(false);
    expect(isSignedInMember(MEMBER)).toBe(true);
  });

  it("returns an explicit not-authorized result to anonymous callers without reading the source", async () => {
    const load = vi.fn(async () => ({ team: "u15", count: 2, players: [] }));
    expect(await forMembers(ANON, load)).toEqual(NOT_AUTHORIZED);
    expect(await forMembers(SUSPENDED, load)).toEqual({ authorized: false, reason: "sign-in-required" });
    expect(load).not.toHaveBeenCalled();
    expect(await forMembers(MEMBER, load)).toEqual({ team: "u15", count: 2, players: [], authorized: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("gives the staff roster (people) to members only", () => {
    const env = {
      SCD_STAFF_ROSTER_JSON: JSON.stringify({ asOf: "2026-10-09", people: [{ id: "p1", name: "Mario Rossi", role: "Allenatore U15" }] }),
    };
    const anon = staffRosterFor(env, ANON);
    expect(anon).toMatchObject({ authorized: false, reason: "sign-in-required", people: [] });
    expect(staffRosterFor(env, SUSPENDED).people).toEqual([]);
    const member = staffRosterFor(env, MEMBER);
    expect(member.authorized).toBe(true);
    expect(JSON.stringify(anon)).not.toContain("Mario");
  });
});

describe("anonymous calendar = fixtures only (Direzione 09:03: the games of the week are always public)", () => {
  it("recognises games and keeps internal entries out", () => {
    for (const t of ["CAMPIONATO", "COPPA", "TORNEO", "AMICHEVOLE", "Playoff"]) expect(isFixture({ type: t }), t).toBe(true);
    for (const t of ["ALLENAMENTO", "RIUNIONE STAFF", "", "TRAINING"]) expect(isFixture({ type: t }), t).toBe(false);
  });

  it("strips trainings, notes and annata crest files for anonymous callers", () => {
    const out = publicFixturesOnly(CAL);
    expect(out.audience).toBe("public");
    expect(out.events.map((e) => e.id)).toEqual(["g1", "g2"]);
    for (const e of out.events) {
      expect(e.notice).toEqual([]);
      // The game facts stay: date, time, home/away, venue, team, opponent.
      expect(e).toMatchObject({ date: "2026-10-17", time: "15:30", homeAway: "CASA", venue: "Colico", group: "u15", opponent: "AVVERSARIA" });
    }
    expect(out.groups[0]).toMatchObject({ id: "u15", label: "Giovanissimi U15", logo: null, count: 2 });
    // The source object is not mutated (the bridge keeps its cache).
    expect(CAL.events).toHaveLength(4);
    expect(CAL.groups[0]!.logo).toBe("SCD_U15.png");
  });

  it("keeps the full data for signed-in members", () => {
    const full = calendarFor(CAL, MEMBER);
    expect(full.audience).toBe("member");
    expect(full.events).toHaveLength(4);
    expect(full.events[0]!.notice).toEqual(["nota interna"]);
    expect(calendarFor(CAL, ANON).events.map((e) => e.id)).toEqual(["g1", "g2"]);
    expect(calendarFor(CAL, SUSPENDED).audience).toBe("public");
  });
});

/* ---------------- public routes scan ---------------- */

const SRC = resolve(__dirname, "..");
const ROUTES = resolve(SRC, "routes");

/** File-based route path of a TanStack route file (societa.tsx -> /societa, eventi.index.tsx -> /eventi). */
function routePathOf(file: string): string | null {
  if (file.startsWith("__") || !file.endsWith(".tsx")) return null;
  const segs = file
    .replace(/\.tsx$/, "")
    .split(".")
    .filter((s) => s !== "index" && s !== "route")
    .map((s) => s.replace(/_$/, ""))
    .filter((s) => s && !s.startsWith("_"));
  return `/${segs.join("/")}`;
}

const PUBLIC_ROUTE_FILES = readdirSync(ROUTES)
  .filter((f) => {
    const p = routePathOf(f);
    return p !== null && isPublicPath(p);
  })
  .sort();

/** Local modules (src/...) imported by a file, resolved to absolute paths. */
function localImports(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)) {
    const spec = m[1]!;
    let base: string | null = null;
    if (spec.startsWith("@/")) base = resolve(SRC, spec.slice(2));
    else if (spec.startsWith(".")) base = resolve(dirname(file), spec);
    if (!base || /\.(json|css|webp|png|svg)$/.test(base)) continue;
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")]) {
      try {
        readFileSync(cand, "utf8");
        out.push(cand);
        break;
      } catch {
        /* next candidate */
      }
    }
  }
  return out;
}

describe("public routes keep teams inside (UD-100)", () => {
  it("finds the public route files and leaves the members-only pages out", () => {
    expect(PUBLIC_ROUTE_FILES).toEqual(expect.arrayContaining(["index.tsx", "societa.tsx", "calendario.tsx", "comunicazioni.tsx"]));
    expect(PUBLIC_ROUTE_FILES).not.toContain("allenamenti.tsx");
    expect(PUBLIC_ROUTE_FILES).not.toContain("squadre.tsx");
    for (const p of MEMBERS_ONLY_PREFIXES) expect(isPublicPath(p), p).toBe(false);
  });

  it.each(PUBLIC_ROUTE_FILES)("%s does not import getPublicRoster nor the staff roster, directly or through its components", (file) => {
    const seen = new Set<string>();
    const queue = [resolve(ROUTES, file)];
    const hits: string[] = [];
    while (queue.length) {
      const f = queue.shift()!;
      if (seen.has(f)) continue;
      seen.add(f);
      const src = readFileSync(f, "utf8");
      if (/\bgetPublicRoster\b/.test(src) && !f.endsWith("public-roster.functions.ts")) hits.push(`${f}: getPublicRoster`);
      if (/\bgetStaffRoster\b/.test(src) && !f.endsWith("staff-roster.functions.ts")) hits.push(`${f}: getStaffRoster`);
      // Route modules of other pages are not followed: each one is checked on its own.
      for (const dep of localImports(f)) if (!dep.startsWith(`${ROUTES}/`)) queue.push(dep);
    }
    expect(hits).toEqual([]);
  });

  it("/societa shows no team grid, roster or team crest and points members inside", () => {
    const src = readFileSync(resolve(ROUTES, "societa.tsx"), "utf8");
    expect(src).not.toMatch(/hallTeams|getPublicCalendarSnapshot|getPublicRoster|teamCrest\(|squadre-t/);
    expect(src).toMatch(/Le squadre sono nell'area soci/);
    expect(src).toMatch(/to="\/accedi" search=\{\{ next: "\/squadre" \}\}/);
  });

  it("/allenamenti sends anonymous visitors to sign in and comes back", () => {
    const src = readFileSync(resolve(ROUTES, "allenamenti.tsx"), "utf8");
    expect(src).toMatch(/if \(!session\.user\) throw redirect\(\{ to: "\/accedi", search: \{ next: location\.href \} \}\)/);
    expect(src).toMatch(/noindex/);
  });

  it("/comunicazioni and /calendario offer teams and trainings only to members", () => {
    const comms = readFileSync(resolve(ROUTES, "comunicazioni.tsx"), "utf8");
    expect(comms).toMatch(/tab === "squadre" && member/);
    expect(comms).toMatch(/\.\.\.\(member\s*\?\s*\[\s*\{\s*label: "Squadre"/);
    const cal = readFileSync(resolve(ROUTES, "calendario.tsx"), "utf8");
    expect(cal).toMatch(/Entra per allenamenti e dettagli/);
    expect(cal).toMatch(/cal\.audience === "member" \? loadQuadro\(\)\.slots : \[\]/);
    expect(cal).not.toMatch(/const QUADRO_SLOTS/);
  });
});
