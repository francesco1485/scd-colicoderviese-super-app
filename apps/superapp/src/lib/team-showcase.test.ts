/**
 * «Vetrina squadre» (UD-168, r142): public payload safety and UNKNOWN != ZERO. The age/consent rule itself is tested on
 * the SQL function in supabase/tests/r142_public_team_showcase.pglite.mjs; here the server mapping is tested with
 * fixtures (invented names): whatever the database returns, only whitelisted fields reach the page.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { MEMBERS_ONLY_PREFIXES, PUBLIC_PREFIXES, isPublicPath } from "./http-policy";
import {
  SHOWCASE_TEAMS,
  isShowcaseTeam,
  parseShowcase,
  showcaseRole,
  showcaseSections,
  statText,
  statsSourceLine,
} from "./team-showcase";
import { readShowcase } from "./team-showcase.functions";
import { changedRoles } from "./team-roles";
import { parseTeamRoles, saveMessage } from "./team-roles.functions";

const ROOT = resolve(__dirname, "../../../..");
const APP = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(APP, p), "utf8");
const MIGRATION = readFileSync(resolve(ROOT, "supabase/migrations/20261017_r142_public_team_showcase.sql"), "utf8");

/** What a careless database answer could carry: the parser must drop every extra field. */
const RAW = {
  team: "u16",
  available: true,
  season: "2026/2027",
  count: 3,
  matchesRecorded: 2,
  birth_date: "2010-05-01",
  players: [
    {
      key: "p1",
      name: "Andrea Esempio",
      role: "A",
      shirt: 9,
      stats: { matches: 2, appearances: 2, goals: 1, yellow: 0, red: 0 },
      id: "40000000-0000-0000-0000-000000000001",
      last_name: "Esempio",
      birth_date: "2001-01-01",
      phone: "+39 000 1111111",
      fiscal_code: "XXXAAA00A00X000A",
      photo: "/foto.jpg",
    },
    { key: "p2", name: "Luca R.", role: null, shirt: null, stats: null, last_name: "Rossiminore", age: 15, town: "Colico" },
    { key: "p3", name: "Nome 3331234567", role: "D", shirt: null, stats: null },
    { key: "x", name: "Senza Chiave", role: "D", shirt: null, stats: null },
  ],
  staff: [
    { name: "Mario Misterprova", role: "Allenatore", phone: "+39 000 4444444", email: "m@example.org" },
    { name: "Sara Prova", role: "Dirigente 333 1234567" },
  ],
};

describe("showcase teams", () => {
  it("are exactly Prima Squadra, Juniores U19 Élite and Allievi U16 Élite", () => {
    expect([...SHOWCASE_TEAMS]).toEqual(["prima", "u19", "u16"]);
    for (const t of ["u15", "u18", "u17", "2014", "2015", "pulcini", "piccoliamici", "carte"]) expect(isShowcaseTeam(t), t).toBe(false);
  });

  it("match the database whitelist of r142", () => {
    expect(MIGRATION).toMatch(/code\.code in \('prima', 'u19', 'u16'\)/);
  });
});

describe("parseShowcase keeps only public fields", () => {
  const out = parseShowcase("u16", RAW);
  const json = JSON.stringify(out);

  it("drops ids, surnames of minors, birth dates, ages, towns, phones, e-mails, fiscal codes and photos", () => {
    for (const secret of ["40000000-", "Rossiminore", "2001-01-01", "2010-05-01", "000 1111111", "000 4444444", "example.org", "XXXAAA", "foto", "Colico", "age", "birth", "phone", "fiscal", "photo", "town", "last_name"]) {
      expect(json, secret).not.toContain(secret);
    }
    for (const p of out.players) expect(Object.keys(p).sort()).toEqual(["key", "name", "role", "shirt", "stats"]);
    for (const s of out.staff) expect(Object.keys(s).sort()).toEqual(["name", "role"]);
  });

  it("drops names and staff labels that carry digits (phones) and rows without a positional key", () => {
    expect(out.players.map((p) => p.name)).toEqual(["Andrea Esempio", "Luca R."]);
    expect(out.staff).toEqual([{ name: "Mario Misterprova", role: "Allenatore" }]);
  });

  it("keeps the minor's short name exactly as the database sent it", () => {
    expect(out.players[1]).toEqual({ key: "p2", name: "Luca R.", role: null, shirt: null, stats: null });
  });

  it("refuses other teams and marks a missing function or bad answer as pending", () => {
    expect(parseShowcase("u15", RAW).state).toBe("not-public");
    expect(parseShowcase("u15", RAW).players).toEqual([]);
    expect(parseShowcase("prima", RAW).state).toBe("pending"); // team mismatch
    expect(parseShowcase("u19", { team: "u19", available: false }).state).toBe("pending");
    expect(parseShowcase("u19", null).state).toBe("pending");
  });
});

describe("readShowcase (server mapping)", () => {
  it("never asks the database for a non-showcase team", async () => {
    const rpc = vi.fn();
    const out = await readShowcase("u15", { rpc });
    expect(rpc).not.toHaveBeenCalled();
    expect(out.state).toBe("not-public");
  });

  it("calls only scd_public_team_showcase and maps the answer through the whitelist", async () => {
    const rpc = vi.fn(async () => ({ data: RAW, error: null }));
    const out = await readShowcase("u16", { rpc });
    expect(rpc).toHaveBeenCalledWith("scd_public_team_showcase", { p_org_slug: "scd-colicoderviese", p_team_code: "u16" });
    expect(JSON.stringify(out)).not.toContain("Rossiminore");
    expect(out.state).toBe("ok");
  });

  it("an error (r142 not applied yet) becomes pending, never an invented roster", async () => {
    const out = await readShowcase("prima", { rpc: async () => ({ data: null, error: { message: "function does not exist" } }) });
    expect(out).toMatchObject({ state: "pending", players: [], staff: [], count: null });
    expect((await readShowcase("prima", null)).state).toBe("pending");
  });
});

describe("UNKNOWN is never zero", () => {
  it("labels unknown roles and stats «da confermare»", () => {
    expect(showcaseRole(null)).toBe("ruolo da confermare");
    expect(showcaseRole("P")).toBe("Portiere");
    expect(statText(null)).toBe("da confermare");
    expect(statText(undefined)).toBe("da confermare");
    expect(statText(0)).toBe("0");
    expect(statsSourceLine({ matchesRecorded: 0, season: "2026/2027" })).toContain("da confermare");
    expect(statsSourceLine({ matchesRecorded: null, season: null })).toContain("da confermare");
    expect(statsSourceLine({ matchesRecorded: 3, season: "2026/2027" })).toContain("3 gare");
  });

  it("keeps a player without recorded stats at null instead of zeros", () => {
    const out = parseShowcase("u16", RAW);
    expect(out.players[1]!.stats).toBeNull();
    // incomplete stats object = unknown, not partial zeros
    const partial = parseShowcase("u16", { ...RAW, players: [{ key: "p1", name: "Andrea Esempio", role: "A", shirt: null, stats: { matches: 1 } }] });
    expect(partial.players[0]!.stats).toBeNull();
  });

  it("groups roles P, D, C, A and puts unknown roles last under «Ruolo da confermare»", () => {
    const s = showcaseSections(parseShowcase("u16", RAW).players);
    expect(s.map((x) => x.label)).toEqual(["Attaccanti", "Ruolo da confermare"]);
  });
});

describe("routes and policy", () => {
  it("opens only the three team pages, /squadre stays members-only", () => {
    for (const p of ["/squadre/prima", "/squadre/u19", "/squadre/u16"]) {
      expect(PUBLIC_PREFIXES).toContain(p);
      expect(isPublicPath(p)).toBe(true);
    }
    expect(isPublicPath("/squadre")).toBe(false);
    expect(isPublicPath("/squadre/u15")).toBe(false);
    expect(MEMBERS_ONLY_PREFIXES).toContain("/squadre");
  });

  it("the team route uses the public showcase for the three teams and the route exists", () => {
    const route = read("src/routes/squadre_.$team.tsx");
    expect(route).toMatch(/createFileRoute\("\/squadre_\/\$team"\)/);
    expect(route).toMatch(/const showcase = isShowcaseTeam\(id\)/);
    expect(route).toMatch(/if \(!session\.user && !showcase\) return \{ signedIn: false as const, id \}/);
    expect(route).toMatch(/showcase \? getTeamShowcase/);
    expect(route).toMatch(/<TeamShowcaseSection/);
    expect(read("src/routeTree.gen.ts")).toContain("/squadre_/$team");
  });

  it("the mister desk has the «Ruoli della rosa» editor", () => {
    const mister = read("src/routes/gestionale.mister.tsx");
    expect(mister).toMatch(/title="Ruoli della rosa"/);
    expect(mister).toMatch(/<RosterRolesPanel/);
  });

  it("the showcase component never renders photos or birth data", () => {
    const comp = read("src/components/scd/TeamShowcase.tsx");
    expect(comp).not.toMatch(/<img|birth|nascita|telefono:|phone/i);
  });
});

describe("r142 migration", () => {
  it("is staged, not applied, with a PGlite behaviour test", () => {
    expect(MIGRATION).toMatch(/STAGED: NOT APPLIED/);
    expect(MIGRATION).toMatch(/applica r142/);
    expect(MIGRATION).not.toContain("dfnwzwutvnwiitiffwvr\n");
    expect(existsSync(resolve(ROOT, "supabase/tests/r142_public_team_showcase.pglite.mjs"))).toBe(true);
  });

  it("grants anon only the showcase and returns no private column", () => {
    const anon = [...MIGRATION.matchAll(/grant execute on function ([^\s(]+)\([^)]*\) to ([^;]+);/g)];
    expect(anon.filter((m) => m[2]!.includes("anon")).map((m) => m[1])).toEqual(["public.scd_public_team_showcase"]);
    const body = MIGRATION.slice(MIGRATION.indexOf("create or replace function public.scd_public_team_showcase"), MIGRATION.indexOf("-- ---------------------------------------------------------------- 3."));
    for (const col of ["p.phone", "p.email", "fiscal_code", "contact_phone", "contact_email", "'birth", "'age'", "photo"]) expect(body, col).not.toContain(col);
    const keys = [...body.replace(/ in \([^)]*\)/g, "").matchAll(/'([a-zA-Z]+)', /g)].map((m) => m[1]);
    for (const k of keys) expect(["team", "available", "season", "count", "matchesRecorded", "players", "staff", "key", "name", "role", "shirt", "stats", "matches", "appearances", "goals", "yellow", "red"], k).toContain(k);
  });
});

describe("Ruoli della rosa helpers", () => {
  it("sends only changed roles, null clears", () => {
    expect(changedRoles({ a: "P", b: null }, { a: "P", b: "D", c: null }, ["a", "b", "c"])).toEqual([{ athleteId: "b", role: "D" }]);
    expect(changedRoles({ a: "P" }, { a: null }, ["a"])).toEqual([{ athleteId: "a", role: null }]);
  });

  it("parses the roles answer and explains a refusal without technical detail", () => {
    const id = "40000000-0000-0000-0000-000000000001";
    expect(parseTeamRoles([{ athleteId: id, role: "C" }, { athleteId: "bad", role: "P" }, { athleteId: "40000000-0000-0000-0000-000000000002", role: "X" }])).toEqual({
      [id]: "C",
      "40000000-0000-0000-0000-000000000002": null,
    });
    expect(saveMessage({ message: "not allowed" })).toMatch(/Solo il mister/);
    expect(saveMessage({ message: "Could not find the function public.scd_staff_set_team_roles" })).toMatch(/r142/);
  });
});
