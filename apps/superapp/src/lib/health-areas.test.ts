import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { workAreaView } from "./access";
import { canSeeMenuEntry, findArea, WORK_AREA_IDS } from "./areas";
import { tipProblems } from "./era-nutrition-tips";
import {
  BODY_AREAS,
  CONSULT_MESSAGE,
  INJURY_STATUSES,
  NUTRITION_DISCLAIMER,
  NUTRITION_GROUPS,
  NUTRITION_GUIDANCE,
  R136_PENDING,
  RTP_STEPS,
  aedState,
  asConsultOutcome,
  consultTitle,
  dueState,
  familyChildren,
  groupsForFamily,
  guidanceProblems,
  injuryCounts,
  injuryProblem,
  kitProblem,
  normalizeSteps,
  nutritionGroupFor,
  nutritionView,
  shortName,
  sortInjuries,
  toInjuryRow,
} from "./health-areas";
import { findSection } from "./person-grants";
import { KNOWN_POSITIONS, landingFor } from "./session";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const src = (p: string) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");
const SQL = readFileSync(repo("supabase/migrations/20261016_r136_infermeria_nutrizione.sql"), "utf8");
const TODAY = "2026-10-16";

describe("output guard of the nutrition copy (Era guard + no therapy)", () => {
  it("every guidance text, title, group label and the disclaimer pass", () => {
    for (const g of NUTRITION_GROUPS) {
      expect(guidanceProblems(g.label), g.id).toEqual([]);
      expect(NUTRITION_GUIDANCE[g.id].length, g.id).toBeGreaterThanOrEqual(3);
      for (const t of NUTRITION_GUIDANCE[g.id]) {
        expect(guidanceProblems(t.title), t.id).toEqual([]);
        expect(guidanceProblems(t.text), t.id).toEqual([]);
      }
    }
    expect(guidanceProblems(NUTRITION_DISCLAIMER)).toEqual([]);
  });

  it("refuses diets, numbers, body weight, supplements, medicines and therapies", () => {
    expect(guidanceProblems("Segui questa dieta")).not.toEqual([]);
    expect(guidanceProblems("Mangia 200 grammi di pasta")).not.toEqual([]);
    expect(guidanceProblems("Controlla il peso ogni settimana")).not.toEqual([]);
    expect(guidanceProblems("Prendi un integratore")).not.toEqual([]);
    expect(guidanceProblems("Un farmaco prima della gara")).not.toEqual([]);
    expect(guidanceProblems("Inizia una terapia")).not.toEqual([]);
    expect(guidanceProblems("Vitamine ogni mattina")).not.toEqual([]);
    expect(guidanceProblems("Bevi acqua nelle pause")).toEqual([]);
  });

  it("extends Era's guard, never weakens it", () => {
    for (const t of ["dieta", "calorie", "peso", "integratori", "12"]) expect(guidanceProblems(t).length).toBeGreaterThanOrEqual(tipProblems(t).length);
  });

  it("consultation messages never promise a diagnosis or a plan", () => {
    for (const m of Object.values(CONSULT_MESSAGE)) expect(m).not.toMatch(/dieta|piano|diagnos|terapi|farmac/i);
  });
});

describe("age groups and family scope", () => {
  it("maps the sports age of the 2026/27 season", () => {
    expect(nutritionGroupFor(2020)).toBe("piccoli");
    expect(nutritionGroupFor(2015)).toBe("pulcini-esordienti");
    expect(nutritionGroupFor(2012)).toBe("giovanissimi-allievi");
    expect(nutritionGroupFor(2008)).toBe("juniores-adulti");
    expect(nutritionGroupFor(2023)).toBeNull();
    expect(nutritionGroupFor(null)).toBeNull();
  });

  const members = [
    { personId: "p-self", displayName: "Anna Verdi", relationship: "SELF", birthYear: 1985, minor: false, teamCodes: [] },
    { personId: "p-kid", displayName: "Luca Verdi", relationship: "FIGLIO", birthYear: 2014, minor: true, teamCodes: ["2014"] },
    { personId: "p-kid2", displayName: "Sara Verdi", relationship: "FIGLIA", birthYear: 2019, minor: true, teamCodes: [] },
  ];

  it("a family sees only its own children, with first name and initial", () => {
    const kids = familyChildren(members);
    expect(kids.map((k) => k.personId)).toEqual(["p-kid", "p-kid2"]);
    expect(kids.map((k) => k.name)).toEqual(["Luca V.", "Sara V."]);
    expect(JSON.stringify(kids)).not.toMatch(/Verdi|Anna/);
  });

  it("a family cannot see another child: guidance groups come only from its own circle", () => {
    const mine = familyChildren(members);
    expect(groupsForFamily(mine)).toEqual(["piccoli", "pulcini-esordienti"]);
    // A child of another family is never in scd_my_family's answer, so its group never appears.
    expect(groupsForFamily(mine)).not.toContain("giovanissimi-allievi");
    expect(groupsForFamily([])).toEqual([]);
  });

  it("the family view reads only scd_my_family (scoped to auth.uid() in the database)", () => {
    const fn = src("lib/nutrizionista.functions.ts");
    expect(fn).toMatch(/sb\.rpc\("scd_my_family"/);
    expect(fn).not.toMatch(/scd_certificate_register|scd_team_roster|scd_people/);
  });

  it("an adult athlete with a team sees their own group", () => {
    expect(familyChildren([{ personId: "me", displayName: "Paolo Rossi", relationship: "SELF", birthYear: 2006, minor: false, teamCodes: ["JUN"] }])).toEqual([
      { personId: "me", name: "Paolo R.", group: "juniores-adulti", teamCodes: ["JUN"] },
    ]);
  });

  it("shortens names (public-name rule)", () => {
    expect(shortName("Mario Rossi")).toBe("Mario R.");
    expect(shortName("Mario De Rossi")).toBe("Mario R.");
    expect(shortName("Mario R.")).toBe("Mario R.");
    expect(shortName("Mario")).toBe("Mario");
    expect(shortName("")).toBe("—");
  });
});

describe("guards: public sees nothing, families never enter the infermeria", () => {
  it("both areas are work areas behind the server gate", () => {
    expect(WORK_AREA_IDS).toContain("infermeria");
    expect(WORK_AREA_IDS).toContain("nutrizionista");
    expect(findArea("infermeria")?.roles).toEqual(["responsabile-infermeria", "direzione"]);
    expect(findArea("nutrizionista")?.roles).toEqual(["nutrizionista", "direzione", "famiglia", "atleta"]);
  });

  it("public (no session) gets the access screen on both", () => {
    for (const id of ["infermeria", "nutrizionista"]) {
      expect(workAreaView(id, { preview: false, sessionRoles: null })).toEqual({ view: "access", preview: false });
      expect(workAreaView(id, { preview: false, sessionRoles: new Set() })).toEqual({ view: "access", preview: false });
      expect(canSeeMenuEntry({ id, reserved: true }, null)).toBe(false);
    }
    expect(nutritionView(null)).toBe("access");
  });

  it("infermeria: only the infermeria position and Direzione", () => {
    const view = (r: string[]) => workAreaView("infermeria", { preview: false, sessionRoles: new Set(r) }).view;
    expect(view(["responsabile-infermeria"])).toBe("page");
    expect(view(["direzione"])).toBe("page");
    for (const r of ["famiglia", "atleta", "mister", "segreteria", "dirigente-annata", "nutrizionista", "partner"]) expect(view([r]), r).toBe("access");
  });

  it("nutrizionista: staff list for nutritionist and Direzione, guidance for families, nothing for others", () => {
    const view = (r: string[]) => workAreaView("nutrizionista", { preview: false, sessionRoles: new Set(r) }).view;
    expect(view(["famiglia"])).toBe("page");
    expect(view(["nutrizionista"])).toBe("page");
    for (const r of ["mister", "segreteria", "responsabile-infermeria", "partner"]) expect(view([r]), r).toBe("access");
    expect(nutritionView(new Set(["famiglia"]))).toBe("family");
    expect(nutritionView(new Set(["atleta"]))).toBe("family");
    expect(nutritionView(new Set(["nutrizionista"]))).toBe("staff");
    expect(nutritionView(new Set(["direzione", "famiglia"]))).toBe("staff");
    expect(nutritionView(new Set(["segreteria", "famiglia"]))).toBe("family");
    expect(nutritionView(new Set(["segreteria"]))).toBe("access");
  });

  it("closed gates read nothing: the loaders return before any data call", () => {
    for (const r of ["routes/infermeria.tsx", "routes/nutrizionista.tsx"]) {
      const code = src(r);
      expect(code, r).toMatch(/if \(gate\.view !== "page"\) return \{ gate, interior: false as const \};/);
    }
    expect(src("lib/infermeria.functions.ts")).toMatch(/if \(gate\.view !== "page" \|\| !sb \|\| !org\) return base;/);
    expect(src("lib/nutrizionista.functions.ts")).toMatch(/if \(gate\.view !== "page" \|\| !sb \|\| !org \|\| view === "access"\) return base;/);
  });

  it("health data is never logged and database messages are never shown", () => {
    for (const f of ["lib/infermeria.functions.ts", "lib/nutrizionista.functions.ts", "components/scd/InfermeriaBoard.tsx", "routes/nutrizionista.tsx", "routes/infermeria.tsx"]) {
      const code = src(f);
      expect(code, f).not.toMatch(/console\.(log|info|warn|error|debug)/);
      expect(code, f).not.toMatch(/message:\s*[\w.]*error\.message/);
    }
  });

  it("positions, landings and grant sections are registered", () => {
    expect(KNOWN_POSITIONS).toContain("responsabile-infermeria");
    expect(KNOWN_POSITIONS).toContain("nutrizionista");
    expect(landingFor(new Set(["responsabile-infermeria"]))).toBe("/infermeria");
    expect(landingFor(new Set(["nutrizionista"]))).toBe("/nutrizionista");
    expect(findSection("infermeria")?.path).toBe("/infermeria");
    expect(findSection("nutrizione")).toMatchObject({ area: "nutrizionista", path: "/nutrizionista", sensitive: true, perimeters: ["ALL"] });
    expect(findSection("salute-minori")?.hardBlocked).toBe(true);
  });
});

describe("injuries and return to play", () => {
  const ok = { athleteId: "a", occurredOn: "2026-10-10", bodyArea: "GINOCCHIO", status: "FERMO", steps: ["STOP"] };

  it("accepts a valid entry and refuses free text, future dates and unknown steps", () => {
    expect(injuryProblem(ok, TODAY)).toBeNull();
    expect(injuryProblem({ ...ok, bodyArea: "lesione al crociato" }, TODAY)).toMatch(/zona del corpo/);
    expect(injuryProblem({ ...ok, occurredOn: "2026-10-20" }, TODAY)).toMatch(/futuro/);
    expect(injuryProblem({ ...ok, occurredOn: "2024-01-01" }, TODAY)).toMatch(/lontana/);
    expect(injuryProblem({ ...ok, steps: ["ANTIDOLORIFICO"] }, TODAY)).toMatch(/non valido/);
    expect(injuryProblem({ ...ok, athleteId: "" }, TODAY)).toMatch(/atleta/);
  });

  it("Rientrato only with every step ticked", () => {
    expect(injuryProblem({ ...ok, status: "RIENTRATO" }, TODAY)).toMatch(/tutti i passi/);
    expect(injuryProblem({ ...ok, status: "RIENTRATO", steps: RTP_STEPS.map((s) => s.id).reverse() }, TODAY)).toBeNull();
    expect(normalizeSteps(["OK_STAFF_MISTER", "STOP", "STOP", "X"])).toEqual(["STOP", "OK_STAFF_MISTER"]);
  });

  it("parses database rows defensively and sorts open cases first", () => {
    const base = { id: "1", athlete_id: "a", short_name: "Luca Verdi", team_name: null, occurred_on: "2026-10-01", body_area: "PIEDE", status: "RIENTRATO", rtp_steps: [], updated_at: null };
    expect(toInjuryRow({ ...base, body_area: "testa rotta" })).toBeNull();
    expect(toInjuryRow(base)?.name).toBe("Luca V.");
    const rows = [
      { status: "RIENTRATO" as const, occurredOn: "2026-10-12" },
      { status: "FERMO" as const, occurredOn: "2026-10-01" },
      { status: "IN_RECUPERO" as const, occurredOn: "2026-10-05" },
      { status: "FERMO" as const, occurredOn: "2026-10-09" },
    ];
    expect(sortInjuries(rows).map((r) => `${r.status}:${r.occurredOn}`)).toEqual(["FERMO:2026-10-09", "FERMO:2026-10-01", "IN_RECUPERO:2026-10-05", "RIENTRATO:2026-10-12"]);
    expect(injuryCounts(rows)).toEqual({ fermi: 2, inRecupero: 1, rientrati: 1 });
  });
});

describe("kits and defibrillators", () => {
  it("unknown is never 'in regola'", () => {
    expect(dueState(null, TODAY, 14)).toBe("mai");
    expect(dueState("2026-10-15", TODAY, 14)).toBe("scaduto");
    expect(dueState("2026-10-20", TODAY, 14)).toBe("in-scadenza");
    expect(dueState("2027-01-20", TODAY, 14)).toBe("ok");
    expect(aedState({ padsExpiry: "2027-06-01", batteryExpiry: null }, TODAY)).toBe("mai");
    expect(aedState({ padsExpiry: "2026-10-01", batteryExpiry: null }, TODAY)).toBe("scaduto");
    expect(aedState({ padsExpiry: "2027-06-01", batteryExpiry: "2028-01-01" }, TODAY)).toBe("ok");
  });

  it("validates kit entries", () => {
    expect(kitProblem({ site: "COLICO", kit: "Borsa campo A", lastCheck: "2026-10-01", nextCheck: "2026-11-01" })).toBeNull();
    expect(kitProblem({ site: "LECCO", kit: "Borsa", lastCheck: "", nextCheck: "" })).toMatch(/sede/);
    expect(kitProblem({ site: "COLICO", kit: "x", lastCheck: "", nextCheck: "" })).toMatch(/caratteri/);
    expect(kitProblem({ site: "COLICO", kit: "Borsa", lastCheck: "2026-11-01", nextCheck: "2026-10-01" })).toMatch(/dopo/);
  });
});

describe("work queue title (nutrition requests)", () => {
  it("carries only the team, never a name or a health detail", () => {
    expect(consultTitle("Esordienti 2014")).toBe("Richiesta consulenza nutrizionista · Esordienti 2014");
    expect(consultTitle(null)).toBe("Richiesta consulenza nutrizionista · squadra non indicata");
    expect(SQL).toMatch(/'title', 'Richiesta consulenza nutrizionista · ' \|\| coalesce\(nullif\(trim\(v_team\), ''\), 'squadra non indicata'\)/);
    expect(asConsultOutcome("RECEIVED")).toBe("RECEIVED");
    expect(asConsultOutcome("whatever")).toBe("ERROR");
    expect(CONSULT_MESSAGE.NOT_APPLIED).toBe(R136_PENDING);
  });
});

describe("migration r136 (staged, never applied by an agent)", () => {
  it("is written, not applied, and never targets the other project", () => {
    expect(SQL).toMatch(/STAGED: written, NOT applied/);
    expect(SQL).toMatch(/"applica"/);
    expect(SQL.match(/dfnwzwutvnwiitiffwvr/g)?.length ?? 0).toBe(1); // only the "never run on" warning
    expect(SQL).toMatch(/Never run on dfnwzwutvnwiitiffwvr/);
  });

  it("creates the three tables with RLS on, no policies and no table grants", () => {
    for (const t of ["scd_health_injuries", "scd_first_aid_kits", "scd_aed_devices"]) {
      expect(SQL).toMatch(new RegExp(`create table if not exists public\\.${t} \\(`));
      expect(SQL).toMatch(new RegExp(`alter table public\\.${t} enable row level security;`));
      expect(SQL).toMatch(new RegExp(`revoke all on table public\\.${t} from public, anon, authenticated;`));
    }
    expect(SQL).not.toMatch(/create policy/i);
    expect(SQL).not.toMatch(/grant (select|insert|update|delete)/i);
  });

  it("stores no free text: no note, diagnosis, symptom or therapy column", () => {
    const tables = SQL.match(/create table if not exists public\.scd_(health_injuries|first_aid_kits|aed_devices) \([\s\S]*?\n\);/g) ?? [];
    expect(tables).toHaveLength(3);
    for (const t of tables) expect(t).not.toMatch(/\b(note|notes|diagnos\w*|symptom\w*|sintom\w*|therap\w*|terapi\w*|description|comment)\b/i);
  });

  it("mirrors the fixed lists of the app", () => {
    const list = (xs: ReadonlyArray<{ id: string }>) => xs.map((x) => `'${x.id}'`).join(",");
    expect(SQL).toContain(`body_area in (${list(BODY_AREAS)})`);
    expect(SQL).toContain(`status in (${list(INJURY_STATUSES)})`);
    expect(SQL).toContain(`array[${list(RTP_STEPS)}]::text[]`);
  });

  it("every function is SECURITY DEFINER with a fixed search_path and checks access first", () => {
    const fns = [...SQL.matchAll(/create or replace function public\.(scd_\w+)\(/g)].map((m) => m[1]!);
    expect(fns).toEqual(expect.arrayContaining(["scd_health_staff", "scd_infermeria_certificate_board", "scd_infermeria_board", "scd_infermeria_injury_save", "scd_infermeria_kit_save", "scd_infermeria_aed_save", "scd_nutrition_request", "scd_nutrition_requests", "scd_nutrition_request_update"]));
    for (const f of fns.filter((f) => f !== "scd_section_catalog" && f !== "scd_health_short_name"))
      expect(SQL, f).toMatch(new RegExp(`function public\\.${f}\\([\\s\\S]*?security definer\\s+set search_path to 'public'`));
    for (const f of ["scd_infermeria_injury_save", "scd_infermeria_kit_save", "scd_infermeria_aed_save", "scd_nutrition_request_update"])
      expect(SQL, f).toMatch(new RegExp(`function public\\.${f}\\([\\s\\S]*?begin\\s+if not public\\.scd_health_staff`));
  });

  it("exception messages never interpolate values and anon executes nothing", () => {
    // The r87 guard is copied verbatim (its "unknown position %" names a position, never a person or health data).
    const own = SQL.replace(/create or replace function public\.scd_access_admin_guard\([\s\S]*?\n\$\$;/, "");
    expect(own).not.toMatch(/raise exception '[^']*%/);
    expect(SQL).not.toMatch(/raise (notice|log|info|warning)/i);
    expect(SQL).not.toMatch(/grant execute[^;]*\banon\b/);
    expect(SQL).toMatch(/revoke all on function public\.scd_health_staff\(uuid, text, text, text\) from public, anon;/);
  });

  it("goes through the existing work-queue intake, inserts no seed rows", () => {
    expect(SQL).toMatch(/public\.scd_proposal_ingest\(p_organization_id/);
    expect(SQL).not.toMatch(/insert into public\.scd_proposals/);
    expect(SQL).not.toMatch(/insert into public\.scd_(health_injuries|first_aid_kits|aed_devices)[^;]*values\s*\('/i);
  });

  it("has a PGlite behaviour test next to it", () => {
    const t = readFileSync(repo("supabase/tests/r136_infermeria_nutrizione.pglite.mjs"), "utf8");
    expect(t).toMatch(/a family cannot ask for another child/);
    expect(t).toMatch(/no board for/);
  });
});
