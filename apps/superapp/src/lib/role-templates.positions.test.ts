import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TONES } from "../components/home/tones";
import {
  PLATFORMS,
  PLATFORM_TONE,
  explainRoleError,
  orderSuggestedFirst,
  positionChoices,
  positionLabelOf,
  rolesBanner,
  suggestedTemplateIds,
  type RoleTemplate,
} from "./role-templates";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const src = (p: string) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");
const SQL112 = readFileSync(repo("supabase/migrations/20261016_r112_role_template_positions.sql"), "utf8");
const SQL138 = readFileSync(repo("supabase/migrations/20261016_r138_position_catalog.sql"), "utf8");
const PAGE = src("components/scd/RoleTemplatesPage.tsx");
const LOADER = src("components/scd/RoleLoader.tsx");
const LINK = src("components/scd/RolesLink.tsx");
const ACCESSI = src("routes/direzione_.accessi.tsx");
const FNS = src("lib/role-templates.functions.ts");
const CSS = src("styles.css");

function tpl(over: Partial<RoleTemplate>): RoleTemplate {
  return { id: "t", platform: "CORE", label: "Ruolo", description: "", active: true, grants: [], updatedAt: "2026-10-16", positionCode: null, ...over };
}

describe("one club colour per platform (Francesco 16/10 21:54)", () => {
  it("ONE azzurro, CORE navy, GROW sole: three different tones, all defined", () => {
    expect(PLATFORM_TONE).toEqual({ ONE: "azzurro", CORE: "navy", GROW: "sole" });
    expect(new Set(PLATFORMS.map((p) => PLATFORM_TONE[p])).size).toBe(3);
    for (const p of PLATFORMS) expect(TONES[PLATFORM_TONE[p]].band).toBeTruthy();
  });

  it("never gold on yellow: the sole band acts with the navy metal button", () => {
    expect(TONES.sole.cta).toBe("scd-navy-btn");
    expect(PAGE).toMatch(/\$\{T\.cta\} scd-focus/);
    expect(PAGE).not.toMatch(/scd-band-sole[^"]*scd-gold/);
  });

  it("the club colour classes are present in styles.css (copied from feat/cloud-grafica)", () => {
    for (const c of [".scd-band-azzurro {", ".scd-band-sole {", ".scd-navy-btn {"]) expect(CSS).toContain(c);
    expect(CSS.indexOf(".scd-navy-btn {")).toBeLessThan(CSS.indexOf(".scd-gold {"));
  });
});

describe("organigram positions (r138) linked to roles (r112)", () => {
  const positions = [
    { code: "presidente", label: "Presidente", group: "direzione", status: "ACTIVE" },
    { code: "allenatore-responsabile", label: "Allenatore responsabile", group: "tecnici", status: "ACTIVE" },
    { code: "custom-palloni", label: "Addetto ai palloni", group: "operativi", status: "PROPOSED" },
    { code: "vecchio", label: "Vecchio ruolo", group: "dirigenti", status: "RETIRED" },
  ];

  it("offers active positions only, sorted by group, but keeps one already linked", () => {
    expect(positionChoices(positions).map((p) => p.code)).toEqual(["presidente", "allenatore-responsabile"]);
    expect(positionChoices(positions, ["vecchio"]).map((p) => p.code)).toContain("vecchio");
    expect(positionChoices(positions)[0]).not.toHaveProperty("status");
  });

  it("an unknown linked position reads 'da confermare', never empty or invented", () => {
    expect(positionLabelOf(null, positionChoices(positions))).toBeNull();
    expect(positionLabelOf("presidente", positionChoices(positions))).toBe("Presidente");
    expect(positionLabelOf("sparita", positionChoices(positions))).toMatch(/da confermare/);
  });

  it("suggests only active roles meant for a position the person holds, and keeps every role in the list", () => {
    const a = tpl({ id: "a", positionCode: "allenatore-responsabile" });
    const b = tpl({ id: "b", positionCode: "presidente", active: false });
    const c = tpl({ id: "c" });
    expect(suggestedTemplateIds([a, b, c], ["allenatore-responsabile", "presidente"])).toEqual(["a"]);
    expect(suggestedTemplateIds([a, b, c], [])).toEqual([]);
    expect(orderSuggestedFirst([c, a], ["a"]).map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("plain Italian for the r112 errors", () => {
    expect(explainRoleError({ code: "22023", message: "unknown position" }, "x")).toMatch(/non trovata/);
    expect(explainRoleError({ code: "22023", message: "position not active" }, "x")).toMatch(/approvata/);
  });

  it("r112 is a staged file, guarded, creator-only, audited, and grants nothing", () => {
    expect(SQL112.split("\n")[1]).toMatch(/APPLIED on SCD PULSE .* «ok ruoli - applica r112 - applica r113»/);
    expect(SQL112).toMatch(/r112 prerequisites missing/);
    expect(SQL112).toMatch(/if not public\.scd_is_role_creator\(p_organization_id\) then/);
    expect(SQL112).toMatch(/'CHANGE_ROLE'/);
    expect(SQL112).toMatch(/foreign key \(organization_id, position_code\) references public\.scd_position_catalog \(organization_id, code\)/);
    expect(SQL112).toMatch(/revoke all on function public\.scd_set_role_template_position\(uuid, uuid, text, text\) from public, anon;/);
    const code = SQL112.replace(/^--.*$/gm, "");
    expect(code).not.toMatch(/scd_person_grants|grant (select|insert|update|delete)|create policy|drop table|truncate/i);
    expect(code).not.toMatch(/dfnwzwutvnwiitiffwvr/);
  });

  it("r112 also protects the Presidente / DG positions of r138 like their labels (no self-assignment)", () => {
    expect(SQL112).toMatch(/scd_is_creator_position\(new\.position_code\)/);
    expect(SQL112).toMatch(/scd_is_creator_position\(r\.position_code\)/);
    expect(SQL112).toMatch(/coalesce\(p_code, ''\) in \('presidente', 'direttore-generale'\)/);
    // The creator rule itself is not redefined here.
    expect(SQL112).not.toMatch(/create or replace function public\.scd_is_role_creator/);
  });

  it("r112 builds on r138 instead of duplicating it", () => {
    expect(SQL138).toMatch(/create table if not exists public\.scd_position_catalog/);
    expect(SQL112).not.toMatch(/create table/i);
  });
});

describe("page, link and server wiring", () => {
  it("notice follows the real state: offline, r111 missing, unknown, creator or read-only", () => {
    expect(rolesBanner({ connected: false, engine: "applied", actor: { isCreator: true } })).toBe("offline");
    expect(rolesBanner({ connected: true, engine: "not-applied", actor: { isCreator: true } })).toBe("not-applied");
    expect(rolesBanner({ connected: true, engine: "unknown", actor: { isCreator: true } })).toBe("unknown");
    expect(rolesBanner({ connected: true, engine: "applied", actor: { isCreator: true } })).toBe("creator");
    expect(rolesBanner({ connected: true, engine: "applied", actor: { isCreator: false } })).toBe("read-only");
  });

  it("the page uses the METAL bands, the platform tones and keeps tabs keyboard-operable", () => {
    expect(PAGE).toContain('className="scd-band relative overflow-hidden rounded-2xl');
    expect(PAGE).toContain("PLATFORM_TONE[p]");
    expect(PAGE).toContain('role="tablist"');
    expect(PAGE).toContain("onKeyDown={onTabKey}");
    expect(PAGE).not.toMatch(/#8fa3c7/);
  });

  it("the position choice is off until r112 and is sent only when r112 is applied", () => {
    expect(PAGE).toMatch(/disabled=\{positionLink !== "applied"/);
    expect(PAGE).toMatch(/data\.positionLink === "applied" \? \{ positionCode: e\.positionCode \|\| null \} : \{\}/);
    expect(FNS).toMatch(/if \(\(await positionLinkEngine\(sb, "applied"\)\) !== "applied"\) return/);
  });

  it("writes stay behind the creator check on the server and in the database", () => {
    const w = FNS.slice(FNS.indexOf("async function writeContext"));
    expect(w).toMatch(/if \(!isDirection\)/);
    expect(w).toMatch(/creatorOf\(sb, org\.organizationId, "applied"\)/);
    expect(FNS).not.toMatch(/service_role|SUPABASE_SERVICE/);
  });

  it("closed gate serialises nothing, not even the position catalogue", () => {
    expect(FNS).toMatch(/if \(gate\.view !== "page"\) return base;/);
  });

  it("Accessi links to Ruoli with the METAL band and a gold action; the link grants nothing", () => {
    expect(ACCESSI).toContain("<RolesLink />");
    expect(LINK).toContain('to="/direzione/ruoli"');
    expect(LINK).toMatch(/scd-band/);
    expect(LINK).toMatch(/scd-gold/);
    expect(LINK).not.toMatch(/createServerFn|useServerFn/);
  });

  it("'Carica un ruolo' asks for suggestions of this person only and keeps them as proposals", () => {
    expect(LOADER).toMatch(/load\(\{ data: personId \? \{ personId \} : \{\} \}\)/);
    expect(LOADER).toMatch(/Resta una proposta/);
  });
});
