import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicContextInput } from "./assistant";
import { answerPublic, answerStaff, type StaffDeps } from "./assistant.server";
import type { SkyReply } from "./sky.functions";
import {
  STAFF_CLUB_AREAS,
  directoryContextLines,
  findStaff,
  groupStaff,
  isStaffContactQuestion,
  parseStaffDirectory,
  staffContactReply,
  telHref,
  type StaffDirectory,
} from "./staff-directory";

const path = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const SQL = readFileSync(path("../../../../supabase/migrations/20261017_r141_staff_directory.sql"), "utf8");
const BODY = SQL.split("\n")
  .filter((l) => !l.trimStart().startsWith("--"))
  .join("\n");

/* Invented people. Phone values are placeholders ("TEL-..."), never real numbers. */
const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const RAW = {
  viewer: "STAFF",
  callerAdult: true,
  clubAreas: [...STAFF_CLUB_AREAS],
  people: [
    { personId: UUID(1), name: "Mario Allenatore", roles: [{ label: "Mister", kind: "MISTER", teamCode: "u15", teamName: "U15", area: null, needsReview: false }], phoneState: "SHARED", phone: "TEL-MISTER" },
    { personId: UUID(2), name: "Sara Segreteria", roles: [{ label: "Segreteria front office", kind: "STAFF", teamCode: null, teamName: null, area: "segreteria", needsReview: false }], phoneState: "NOT_SHARED", phone: null },
    { personId: UUID(3), name: "Paolo Pulmini", roles: [{ label: "Responsabile servizio pulmini", kind: "RESPONSABILE", teamCode: null, teamName: null, area: "pulmini", needsReview: true }], phoneState: "SHARED", phone: "TEL-PULMINI" },
    { personId: UUID(4), name: "Dario Vice", roles: [{ label: "Secondo allenatore", kind: "MISTER", teamCode: "u15", teamName: "U15", area: null }], phoneState: "NOT_SHARED", phone: "TEL-SHOULD-NOT-SHOW" },
    { personId: "not-a-uuid", name: "Riga rotta", roles: [], phoneState: "SHARED", phone: "TEL-ROTTA" },
  ],
  me: { personId: UUID(1), consent: true, consentAt: "2026-10-17T10:00:00Z", hasPhone: true },
};
const DIR = parseStaffDirectory(RAW) as StaffDirectory;

describe("r141 migration (STAGED, rules mirrored in the app)", () => {
  it("is staged behind 'applica r141', after r132, with rollback, engines and measure", () => {
    expect(SQL).toMatch(/^-- r141:/);
    expect(SQL).toMatch(/STAGED: NOT APPLIED\. Apply only after Francesco writes "applica r141"/);
    expect(SQL).toMatch(/r132 .*APPLIED on SCD PULSE 15\/10\/2026/);
    expect(SQL).toMatch(/Never on dfnwzwutvnwiitiffwvr/);
    expect(SQL).toMatch(/-- Rollback/);
    expect(SQL).toMatch(/Engines: PERSONE .* and TEMPO/);
    expect(SQL).toMatch(/Measure:/);
    expect(BODY).toMatch(/^begin;/m);
    expect(BODY).toMatch(/^commit;/m);
    expect(BODY).toMatch(/raise exception 'r141 prerequisites missing/);
    expect(BODY).toContain("to_regclass('public.scd_person_consents_one_active_uidx') is null");
    expect(existsSync(path("../../../../supabase/tests/r141_staff_directory.pglite.mjs"))).toBe(true);
  });

  it("keeps the club areas equal to scd_staff_club_areas()", () => {
    const m = BODY.match(/scd_staff_club_areas\(\)[\s\S]*?array\[([^\]]+)\]::text\[\]/);
    expect(m?.[1]?.split(",").map((x) => x.trim().replace(/'/g, ""))).toEqual([...STAFF_CLUB_AREAS]);
  });

  it("extends existing registries only: no new table, phone stays on scd_people", () => {
    expect(BODY).not.toMatch(/create table/i);
    expect(BODY).toMatch(/add column if not exists needs_review boolean not null default false/);
    expect(BODY).toContain("'TELEFONO_STAFF_CONDIVISO'");
    for (const t of ["'IMMAGINI_ISTITUZIONALI'", "'COMM_EMAIL'", "'PRESA_VISIONE_AUTISTA'"]) expect(BODY).toContain(t);
    // contact_phone is only hardened (column grant), never written.
    expect(BODY).not.toMatch(/insert into public\.scd_structure_roles[^;]*contact_phone/);
    expect(BODY).toMatch(/revoke select on public\.scd_people from authenticated/);
    expect(BODY).toMatch(/column_name <> 'phone'/);
  });

  it("defines every public function as SECURITY DEFINER with a fixed search_path and no anon grant", () => {
    const fns = [...BODY.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)([\s\S]*?)\$\$;/g)];
    expect(fns.map((f) => f[1]).sort()).toEqual(
      ["scd_my_team_ids", "scd_person_phone", "scd_set_my_phone_share", "scd_staff_club_areas", "scd_staff_directory", "scd_staff_office", "scd_staff_phone_shared", "scd_staff_visible_person_ids", "scd_staff_visible_role_ids"].sort(),
    );
    for (const f of fns) {
      expect(f[3], f[1]).toMatch(/set search_path to 'public'/);
      if (f[1] !== "scd_staff_club_areas") expect(f[3], f[1]).toMatch(/security definer/);
      expect(BODY, f[1]).toMatch(new RegExp(`revoke all on function public\\.${f[1]}\\([^)]*\\) from public, anon`));
    }
    expect(BODY).not.toMatch(/to anon/);
    expect(BODY).toMatch(/revoke all on function public\.scd_staff_phone_shared\(uuid\) from public, anon, authenticated/);
  });

  it("never returns minors, e-mail or birth dates from the directory", () => {
    const fn = BODY.match(/function public\.scd_staff_directory[\s\S]*?\n\$\$;/)?.[0] ?? "";
    const vis = BODY.match(/function public\.scd_staff_visible_role_ids[\s\S]*?\n\$\$;/)?.[0] ?? "";
    expect(vis).toMatch(/coalesce\(public\.scd_is_minor\(p\.birth_date\), false\) = false/);
    expect(fn).not.toMatch(/'email'|'birth/);
    // A number only with the consent and to an adult caller.
    expect(fn).toMatch(/when v_adult and public\.scd_staff_phone_shared\(p\.id\) then/);
  });

  it("keeps the organigram names out of the public repository: seed only from the private session table", () => {
    expect(SQL).not.toMatch(/\$seed\$/);
    expect(SQL).not.toMatch(/[0-9a-f]{64}/);
    expect(SQL).not.toMatch(/bornBefore/);
    expect(BODY).toContain("to_regclass('pg_temp.r141_seed') is null");
    expect(BODY).toMatch(/drop table if exists pg_temp\.r141_seed;/);
    expect(BODY).toMatch(/t\.code = 'u18'/);
    // No sequence that looks like a phone number in the migration.
    expect(BODY).not.toMatch(/\d{7,}/);
  });

  it("is fail-closed on roles declared with a doubt", () => {
    expect(BODY).toMatch(/v_review := coalesce\(\(r ->> 'review'\)::boolean, false\) or r ->> 'mode' = 'SURNAME'/);
    expect(BODY).toMatch(/date '2026-10-17', not v_review, p_source/);
    const team = BODY.match(/create or replace function public\.scd_my_team_ids[\s\S]*?\n\$\$;/)?.[0] ?? "";
    expect(team.match(/not coalesce\(r\.needs_review, false\)/g)?.length).toBe(2);
    expect(BODY).toMatch(/create or replace view public\.scd_v_structure_public[\s\S]*?x\.needs_review\);/);
  });

  it("treats an unknown age as a minor for numbers and audits office reads", () => {
    const fn = BODY.match(/function public\.scd_staff_directory[\s\S]*?\n\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/p\.birth_date is not null and public\.scd_is_minor\(p\.birth_date\) = false/);
    const ph = BODY.match(/function public\.scd_person_phone[\s\S]*?\n\$\$;/)?.[0] ?? "";
    expect(ph).toMatch(/insert into public\.scd_audit_events[\s\S]*'PHONE_READ'/);
    expect(BODY).toMatch(/revoke all on public\.scd_people from anon;/);
    expect(BODY).toMatch(/column_name <> 'contact_phone'/);
  });
});

describe("parseStaffDirectory", () => {
  it("keeps only valid rows and drops a number the database marked as not shared", () => {
    expect(DIR.people.map((p) => p.name)).toEqual(["Mario Allenatore", "Sara Segreteria", "Paolo Pulmini", "Dario Vice"]);
    expect(DIR.people.find((p) => p.name === "Dario Vice")?.phone).toBeNull();
    expect(JSON.stringify(DIR)).not.toContain("TEL-SHOULD-NOT-SHOW");
    expect(JSON.stringify(DIR)).not.toContain("TEL-ROTTA");
    expect(DIR.me).toEqual({ personId: UUID(1), consent: true, consentAt: "2026-10-17T10:00:00Z", hasPhone: true });
  });

  it("refuses unknown shapes", () => {
    expect(parseStaffDirectory(null)).toBeNull();
    expect(parseStaffDirectory({ viewer: "ADMIN", people: [] })).toBeNull();
    expect(parseStaffDirectory({ viewer: "FAMILY" })?.people).toEqual([]);
  });
});

describe("groups, links", () => {
  it("lists teams first, then the club areas", () => {
    expect(groupStaff(DIR.people).map((g) => g.title)).toEqual(["U15", "Pulmini", "Segreteria"]);
    expect(groupStaff(DIR.people)[0]?.rows.map((r) => r.entry.name)).toEqual(["Mario Allenatore", "Dario Vice"]);
  });

  it("builds tel: links with digits only", () => {
    expect(telHref("+00 0000 000000")).toBe("tel:+000000000000");
    expect(telHref("TEL-X")).toBeNull();
    expect(telHref(null)).toBeNull();
  });
});

describe("Iride: who does what and numbers (rule 2)", () => {
  it("recognises contact questions", () => {
    expect(isStaffContactQuestion("qual è il numero del mister dell'U15?")).toBe(true);
    expect(isStaffContactQuestion("chi è il responsabile dei pulmini?")).toBe(true);
    expect(isStaffContactQuestion("quando gioca la prima squadra?")).toBe(false);
  });

  it("finds by name, by team + role, by club area", () => {
    expect(findStaff("numero di Allenatore", DIR).map((e) => e.name)).toEqual(["Mario Allenatore"]);
    expect(findStaff("numero del vice dell'u15", DIR).map((e) => e.name)).toEqual(["Dario Vice"]);
    expect(findStaff("numero del mister u15", DIR).map((e) => e.name)).toEqual(["Mario Allenatore"]);
    expect(findStaff("telefono responsabile pulmini", DIR).map((e) => e.name)).toEqual(["Paolo Pulmini"]);
  });

  it("gives a number only when the database sent it; otherwise hands over to the Segreteria", () => {
    const ok = staffContactReply("numero del mister u15", DIR);
    expect(ok.text).toContain("TEL-MISTER");
    expect(ok.links).toBeUndefined();
    const no = staffContactReply("numero del vice dell'u15", DIR);
    expect(no.text).toContain("il numero non è condiviso");
    expect(no.text).not.toContain("TEL-");
    expect(no.links).toEqual([{ label: "Scrivi alla Segreteria", to: "/contatti" }]);
  });

  it("names and roles without a number when the question is 'who'", () => {
    const r = staffContactReply("chi è il responsabile dei pulmini?", DIR);
    expect(r.text).toBe("Paolo Pulmini: Responsabile servizio pulmini (da confermare).");
  });

  it("hands over when nobody matches or the caller has no verified role", () => {
    expect(staffContactReply("numero del magazziniere di Dervio", DIR).links?.[0]?.to).toBe("/contatti");
    expect(staffContactReply("numero del mister", null).text).toMatch(/accesso verificato/);
  });

  it("puts names and roles in the model CONTEXT, never a number", () => {
    const lines = directoryContextLines(DIR);
    expect(lines).toContain("Mario Allenatore: Mister · U15");
    expect(lines.join("\n")).not.toMatch(/TEL-/);
  });
});

describe("assistant wiring (UD-167)", () => {
  const KEY = "sk-ant-test-key-never-real";
  const ON = { SCD_ASSISTANT_AI: "on", SCD_ANTHROPIC_API_KEY: KEY };
  const RULES: SkyReply = { text: "regole", mood: "info" };
  const ctx = (): PublicContextInput => ({
    today: "2026-10-17",
    calendar: { groups: [], events: [] },
    clubEvents: [],
    contacts: { email: "sportclubcolico@gmail.com", pec: "calciocolicoderviese@pec.it", site: "https://www.colicoderviese.it/", address: "Via Lido SNC, 23823 Colico (LC)" },
    sites: [],
    ticketing: null,
    registration: { interests: [], affiliations: [] },
    sponsorPackages: [],
    sponsorNames: [],
    resultLinks: [],
    safeguardingSubject: "RISERVATO - SAFEGUARDING",
  });
  afterEach(() => vi.restoreAllMocks());
  let seq = 0;
  const deps = (roles: string[], f: ReturnType<typeof vi.fn>, staffDirectory?: StaffDeps["staffDirectory"]): StaffDeps => ({
    env: ON,
    fetchImpl: f as never,
    rules: vi.fn(async () => RULES),
    kbSearch: vi.fn(async () => null),
    loadPublicContext: vi.fn(async () => ctx()),
    session: async () => ({ user: { email: `rubrica${++seq}@example.org` }, roles }),
    ...(staffDirectory ? { staffDirectory } : {}),
  });

  it("answers contact questions from the directory without the model", async () => {
    const f = vi.fn();
    const r = await answerStaff("mi serve il numero del mister u15", deps(["famiglia"], f, async () => DIR));
    expect(f).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ai: false });
    expect(r.text).toContain("TEL-MISTER");
  });

  it("still sends safeguarding to the rules engine first", async () => {
    const f = vi.fn();
    const d = deps(["famiglia"], f, async () => DIR);
    const r = await answerStaff("numero del responsabile safeguarding per una molestia", d);
    expect(r.text).toBe("regole");
  });

  it("gives the model names and roles only", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text: '{"text":"ok"}' }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }));
    await answerStaff("come organizziamo la trasferta?", deps(["mister"], f, async () => DIR));
    const body = String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(body).toContain("Mario Allenatore: Mister");
    expect(body).not.toContain("TEL-");
  });

  it("keeps today's behaviour while r141 is not applied (directory undefined)", async () => {
    const f = vi.fn();
    const d = { ...deps(["mister"], f, async () => undefined), env: {} };
    const r = await answerStaff("numero del mister u15", d);
    expect(r.text).toBe("regole");
  });

  it("never reaches the directory on public pages", async () => {
    const f = vi.fn();
    const r = await answerPublic({ message: "numero del mister u15", persona: "vera", ip: "10.9.9.9" }, { env: {}, fetchImpl: f as never, rules: vi.fn(async () => RULES), loadContext: vi.fn(async () => ctx()) });
    expect(r.text).not.toMatch(/TEL-/);
  });
});
