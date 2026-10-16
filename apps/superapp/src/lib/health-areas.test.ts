import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { workAreaView } from "./access";
import { canSeeMenuEntry, findArea, WORK_AREA_IDS } from "./areas";
import { tipProblems } from "./era-nutrition-tips";
import {
  CONSULT_MESSAGE,
  HEALTH_DENIED,
  NUTRITION_DISCLAIMER,
  NUTRITION_GROUPS,
  NUTRITION_GUIDANCE,
  R136_PENDING,
  READ_FAILED,
  SAVED_RELOAD,
  SITES,
  aedState,
  asConsultOutcome,
  consultTitle,
  dueState,
  engineText,
  familyChildren,
  groupsForFamily,
  guidanceProblems,
  kitProblem,
  nutritionGroupFor,
  nutritionView,
  onePerAthlete,
  shortName,
} from "./health-areas";
import { defaultRow, findSection, offeredPerimeters } from "./person-grants";
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

  it("the nutritionist calls the parent back, never the secretariat", () => {
    expect(CONSULT_MESSAGE.RECEIVED).toMatch(/ricontatta la nutrizionista/);
    for (const m of Object.values(CONSULT_MESSAGE)) expect(m).not.toMatch(/segreteria/i);
    expect(src("routes/nutrizionista.tsx")).not.toMatch(/ricontatta la segreteria|La società vi ricontatta|chiedi alla segreteria/);
    expect(SQL).toMatch(/la nutrizionista ricontatta il genitore/);
    expect(SQL).not.toMatch(/la segreteria ricontatta/);
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

  it("grants page offers only the infermeria perimeters that open something", () => {
    const inf = findSection("infermeria")!;
    expect(inf.perimeters).toEqual(["ALL", "OWN_SITE", "OWN_CHILDREN", "SELF"]); // r100 catalogue unchanged
    expect(offeredPerimeters(inf)).toEqual(["ALL", "OWN_SITE"]);
    expect(defaultRow(inf, { minor: false }).perimeter).toBe("ALL");
    expect(offeredPerimeters(findSection("famiglia")!)).toEqual(findSection("famiglia")!.perimeters);
  });

  it("an unknown position gets a clear sentence", () => {
    const fn = src("lib/access-admin.functions.ts");
    expect(fn).toMatch(/unknown position"\)\)\s*return "Il database non riconosce uno degli incarichi scelti: togli quell'incarico e salva\."/);
  });
});

describe("injuries register deferred (UD-043 consent design)", () => {
  it("no injury table, function, read, card or KPI anywhere", () => {
    const sqlCode = SQL.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
    expect(sqlCode).not.toMatch(/injur/i);
    expect(SQL).toMatch(/INJURIES REGISTER DEFERRED until the consent design \(UD-043/);
    for (const f of ["lib/health-areas.ts", "lib/infermeria.functions.ts", "components/scd/InfermeriaBoard.tsx"]) {
      const code = src(f).split("\n").filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join("\n");
      expect(code, f).not.toMatch(/injur|infortun|rtp_steps|RTP_STEPS|BODY_AREAS/i);
    }
  });

  it("the infermeria grant never promises minors' health data", () => {
    const sections = JSON.parse(readFileSync(repo("config/scd-sections.v1.json"), "utf8")) as { sections: Array<{ code: string; sees?: string; label: string }> };
    const inf = sections.sections.find((x) => x.code === "infermeria")!;
    expect(inf.sees).toMatch(/mai dati di salute dei minori/);
    expect(`${inf.label} ${inf.sees}`).not.toMatch(/infortun|rientro in campo/i);
  });
});

describe("unknown is never zero", () => {
  it("each engine state has its own sentence", () => {
    expect(engineText("not-applied")).toBe(R136_PENDING);
    expect(engineText("denied")).toBe(HEALTH_DENIED);
    expect(engineText("error")).toBe(READ_FAILED);
    expect(engineText("applied")).toBeNull();
    expect(new Set([R136_PENDING, HEALTH_DENIED, READ_FAILED]).size).toBe(3);
    expect(HEALTH_DENIED).toMatch(/Non hai l'abilitazione/);
    expect(READ_FAILED).toBe("Lettura non riuscita, riprova");
    expect(SAVED_RELOAD).toBe("Salvato, ricarica la pagina");
  });

  it("null from the database becomes 'denied', a generic error becomes 'error'", () => {
    const inf = src("lib/infermeria.functions.ts");
    expect(inf).toMatch(/board\.data === null \|\| board\.data === undefined \? "denied" : "applied"/);
    expect(inf).toMatch(/isMissingObjectError\(board\.error\) \? "not-applied" : "error"/);
    const nut = src("lib/nutrizionista.functions.ts");
    expect(nut).toMatch(/if \(data === null \|\| data === undefined\) return \{ \.\.\.base, connected: true, engine: "denied" \};/);
    expect(nut).toMatch(/isMissingObjectError\(error\) \? "not-applied" : "error"/);
  });

  it("a failed reload after a save says it was saved", () => {
    expect(src("components/scd/InfermeriaBoard.tsx")).toMatch(/catch\(\(\) => setNotice\(SAVED_RELOAD\)\)/);
    expect(src("routes/nutrizionista.tsx")).toMatch(/setMsg\(SAVED_RELOAD\)/);
  });

  it("certificates: one row per athlete, so KPIs never double count", () => {
    const rows = [{ athleteId: "a", teamCode: "2014" }, { athleteId: "a", teamCode: "2015" }, { athleteId: "b", teamCode: "2014" }];
    expect(onePerAthlete(rows)).toEqual([{ athleteId: "a", teamCode: "2014" }, { athleteId: "b", teamCode: "2014" }]);
    expect(SQL).toMatch(/select distinct on \(a\.id\)/);
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

  it("mirrors the sites of the database", () => {
    expect(SQL).toContain(`site in (${SITES.map((x) => `'${x.id}'`).join(",")})`);
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

describe("migration r136 (applied after Francesco's \"Applica r136\")", () => {
  it("records the explicit approval, the apply checks, and never targets the other project", () => {
    expect(SQL).toMatch(/APPLIED on SCD PULSE \(ndevtxxijbcnskgysdit\)/);
    expect(SQL).toMatch(/"Applica r136"\s*\n?--\s*\(07:04\)/);
    expect(SQL.match(/dfnwzwutvnwiitiffwvr/g)?.length ?? 0).toBe(1); // only the "never run on" warning
    expect(SQL).toMatch(/Never run on dfnwzwutvnwiitiffwvr/);
  });

  it("creates the two tables with RLS on, no policies and no table grants", () => {
    for (const t of ["scd_first_aid_kits", "scd_aed_devices"]) {
      expect(SQL).toMatch(new RegExp(`create table if not exists public\\.${t} \\(`));
      expect(SQL).toMatch(new RegExp(`alter table public\\.${t} enable row level security;`));
      expect(SQL).toMatch(new RegExp(`revoke all on table public\\.${t} from public, anon, authenticated;`));
    }
    expect(SQL).not.toMatch(/create policy/i);
    expect(SQL).not.toMatch(/grant (select|insert|update|delete)/i);
  });

  it("stores no free text: no note, diagnosis, symptom or therapy column", () => {
    const tables = SQL.match(/create table if not exists public\.scd_\w+ \([\s\S]*?\n\);/g) ?? [];
    expect(tables).toHaveLength(2);
    for (const t of tables) expect(t).not.toMatch(/\b(note|notes|diagnos\w*|symptom\w*|sintom\w*|therap\w*|terapi\w*|description|comment)\b/i);
  });

  it("every function is SECURITY DEFINER with a fixed search_path and checks access first", () => {
    const fns = [...SQL.matchAll(/create or replace function public\.(scd_\w+)\(/g)].map((m) => m[1]!);
    expect(fns).toEqual(expect.arrayContaining(["scd_health_staff", "scd_infermeria_certificate_board", "scd_infermeria_board", "scd_infermeria_kit_save", "scd_infermeria_aed_save", "scd_nutrition_request", "scd_nutrition_requests", "scd_nutrition_request_update", "scd_proposal_queue"]));
    for (const f of fns.filter((f) => f !== "scd_section_catalog" && f !== "scd_health_short_name"))
      expect(SQL, f).toMatch(new RegExp(`function public\\.${f}\\([\\s\\S]*?security definer\\s+set search_path to 'public'`));
    for (const f of ["scd_infermeria_kit_save", "scd_infermeria_aed_save", "scd_nutrition_request_update"])
      expect(SQL, f).toMatch(new RegExp(`function public\\.${f}\\([\\s\\S]*?begin\\s+if not public\\.scd_health_staff`));
  });

  it("exception messages never interpolate values and anon executes nothing", () => {
    // The r87 guard is copied verbatim (its "unknown position %" names a position, never a person or health data).
    const own = SQL.replace(/create or replace function public\.scd_access_admin_guard\([\s\S]*?\n\$\$;/, "");
    expect(own).not.toMatch(/raise exception '[^']*%/);
    expect(SQL).not.toMatch(/raise (notice|log|info|warning)/i);
    expect(SQL).not.toMatch(/grant execute[^;]*\banon\b/);
    expect(SQL).toMatch(/revoke all on function public\.scd_health_staff\(uuid, text, text, text\) from public, anon, authenticated;/);
    expect(SQL).toMatch(/revoke all on function public\.scd_health_short_name\(text, text, text\) from public, anon, authenticated;/);
    expect(SQL).not.toMatch(/grant execute on function public\.scd_health_(staff|short_name)/);
  });

  it("goes through the existing work-queue intake as RISERVATO, inserts no seed rows", () => {
    expect(SQL).toMatch(/public\.scd_proposal_ingest\(p_organization_id/);
    expect(SQL).toMatch(/'sensitivity', 'RISERVATO',/);
    expect(SQL).not.toMatch(/insert into public\.scd_proposals/);
    expect(SQL).not.toMatch(/insert into public\.scd_(first_aid_kits|aed_devices)[^;]*values\s*\('/i);
  });

  it("recreates the office queue identical to r79 except the nutrizione filter", () => {
    const fn = (sql: string) => sql.match(/create or replace function public\.scd_proposal_queue\(p_organization_id uuid\)[\s\S]*?\n\$\$;/)![0];
    const r79 = fn(readFileSync(repo("supabase/migrations/20261012_r79_proposals.sql"), "utf8"));
    const r136 = fn(SQL);
    const added = r136.split("\n").filter((l) => !r79.split("\n").includes(l));
    expect(added).toEqual(["          and q.area <> 'nutrizione' -- r136", "                             and d.area <> 'nutrizione' -- r136"]);
    expect(r79.split("\n").filter((l) => !r136.split("\n").includes(l))).toEqual([]);
  });

  it("health staff: verified identity links only, Direzione like the app", () => {
    const staff = SQL.match(/create or replace function public\.scd_health_staff\([\s\S]*?\n\$\$;/)![0];
    expect(staff).toMatch(/l\.link_state in \('AUTO_VERIFIED', 'VERIFIED_BY_STAFF'\)/);
    expect(staff).not.toMatch(/link_state <> 'REVOKED'/);
    expect(staff).toMatch(/array\['direzione', 'responsabile-infermeria'\]/);
    expect(staff).toMatch(/array\['direzione', 'nutrizionista'\]/);
  });

  it("has a PGlite behaviour test next to it", () => {
    const t = readFileSync(repo("supabase/tests/r136_infermeria_nutrizione.pglite.mjs"), "utf8");
    expect(t).toMatch(/a family cannot ask for another child/);
    expect(t).toMatch(/no board for/);
    expect(t).toMatch(/no nutrition request in the office queue/);
    expect(t).toMatch(/nutrition request is RISERVATO/);
  });
});
