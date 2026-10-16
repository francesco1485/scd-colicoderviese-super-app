import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import catalog from "../../../../config/scd-position-catalog.v1.json";
import sections from "../../../../config/scd-sections.v1.json";
import {
  POSITION_GROUPS,
  POSITION_GROUP_LABEL,
  ROLE_KINDS,
  createState,
  groupCatalog,
  holdersLabel,
  parseCatalogBoard,
  parsePosition,
  R138_PROBE_LABEL,
  positionSlug,
  r138ProbeResult,
  validateCustomDraft,
  type CatalogPosition,
} from "./position-catalog";
import { repoCatalog } from "./position-catalog.data";
import {
  CATALOG_READ_DENIED,
  CATALOG_READ_FAILED,
  catalogFallback,
  catalogOrganization,
  createOutcome,
  statusOutcome,
} from "./position-catalog.functions";
import { probeR138 } from "./registry-live.server";
import { KNOWN_POSITIONS } from "./session";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const SQL = read("../../../../supabase/migrations/20261016_r138_position_catalog.sql");
const BODY = SQL.split("\n")
  .filter((l) => !l.trimStart().startsWith("--"))
  .join("\n");
const literal = (tag: string) => JSON.parse(SQL.match(new RegExp(`\\$${tag}\\$\\n(\\[[\\s\\S]*?\\])\\n?\\$${tag}\\$`))?.[1] ?? "null");
const fn = (src: string, name: string) => src.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))?.[0] ?? "";

describe("r138 migration (STAGED, applied only after 'applica r138')", () => {
  it("is staged, transactional, guarded, documents engines, measure and rollback", () => {
    expect(SQL).toMatch(/STAGED: NOT APPLIED\. Apply only after Francesco writes "applica r138"/);
    expect(SQL).toMatch(/Never on dfnwzwutvnwiitiffwvr/);
    expect(SQL).toMatch(/-- Engines: PERSONE/);
    expect(SQL).toMatch(/-- Measure:/);
    expect(SQL).toMatch(/-- Rollback/);
    expect(BODY).toMatch(/^begin;/m);
    expect(BODY).toMatch(/^commit;/m);
    expect(BODY).toContain("raise exception 'r138 prerequisites missing");
  });

  it("is additive: no drop of tables, columns or policies, no update or delete of existing rows", () => {
    expect(BODY).not.toMatch(/\bdrop\s+(table|column|policy|index|function|type)\b/i);
    expect(BODY).not.toMatch(/\btruncate\b|\bdelete from\b/i);
    expect(BODY).not.toMatch(/update public\.(?!scd_position_catalog\b)/i);
    for (const m of BODY.matchAll(/create table [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    for (const m of BODY.matchAll(/create (unique )?index [^(]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    for (const m of BODY.matchAll(/add column [^;]*/gi)) expect(m[0]).toMatch(/if not exists/i);
    expect(BODY).toMatch(/on conflict \(organization_id, code\) do nothing/);
    expect(BODY).toMatch(/on conflict \(code\) do nothing/);
  });

  it("locks both tables: RLS on, no policies, no table grants, nothing for anon", () => {
    for (const t of ["scd_position_catalog", "scd_coach_qualifications"]) {
      expect(BODY).toContain(`alter table public.${t} enable row level security;`);
      expect(BODY).toContain(`revoke all on table public.${t} from anon, authenticated;`);
    }
    expect(BODY).not.toMatch(/create policy/i);
    expect(BODY).not.toMatch(/grant [a-z, ]+ on table/i);
    expect(BODY).not.toMatch(/to anon\b/i);
    for (const f of [...BODY.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1]!)) {
      expect(fn(BODY, f), f).toMatch(/set search_path to 'public'/);
      expect(BODY, f).toMatch(new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon`));
    }
    for (const w of ["scd_create_custom_position", "scd_set_position_status"]) {
      const body = fn(BODY, w);
      expect(body, w).toMatch(/security definer/);
      expect(body, w).toMatch(/if not public\.scd_is_role_creator\(p_organization_id\) then\s+raise exception '[^']+' using errcode = '42501'/);
      expect(body, w).toMatch(/insert into public\.scd_access_audit/);
    }
    const board = fn(BODY, "scd_position_catalog_board");
    expect(board).toMatch(/security definer/);
    expect(board).toMatch(/if not public\.scd_position_catalog_reader\(p_organization_id\) then/);
    expect(board).not.toMatch(/person_id|display_name|first_name|last_name|created_by/);
    expect(BODY).toContain("revoke all on function public.scd_position_catalog_reader(uuid) from public, anon, authenticated;");
  });

  it("keeps every r100 and r111 audit action and adds CREATE_POSITION / POSITION_STATUS", () => {
    const list = BODY.match(/scd_access_audit_action_check check \(action in \(([\s\S]*?)\)\);/)?.[1] ?? "";
    const actions = [...list.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(actions).toEqual([
      "SET_ACCESS", "GRANT_PERSON", "REVOKE_LINK", "APPROVE_REQUEST", "REJECT_REQUEST",
      "GRANT_SECTION", "CHANGE_SECTION", "REVOKE_SECTION", "COPY_GRANTS",
      "CREATE_ROLE", "CHANGE_ROLE", "ROLE_STATUS",
      "CREATE_POSITION", "POSITION_STATUS",
    ]);
  });

  it("scd_section_platform = config/scd-sections.v1.json platforms (r111 list + nutrizione)", () => {
    const fromSql = literal("plat") as Array<{ code: string; platform: string }>;
    const fromConfig = sections.sections.map((s) => ({ code: s.code, platform: (s as { platform?: string }).platform }));
    expect(fromConfig.every((s) => s.platform === "ONE" || s.platform === "CORE" || s.platform === "GROW")).toBe(true);
    expect([...fromSql].sort((a, b) => a.code.localeCompare(b.code))).toEqual([...fromConfig].sort((a, b) => a.code.localeCompare(b.code)));
    expect(fromSql.find((s) => s.code === "nutrizione")).toEqual({ code: "nutrizione", platform: "CORE" });
    expect(sections.platforms.map((p) => p.code)).toEqual(["ONE", "CORE", "GROW"]);
  });

  it("seeds exactly the positions and qualifications of config/scd-position-catalog.v1.json", () => {
    const keys = ["code", "label", "group", "roleKind", "appPosition", "source", "sourceUrl", "sourceRef", "lndLabel", "evidence", "requiresLicence", "mandatoryForClub", "acceptsQualification"] as const;
    const pick = (p: Record<string, unknown>) => Object.fromEntries(keys.map((k) => [k, p[k]]));
    expect(literal("pos")).toEqual(catalog.positions.map(pick));
    expect(literal("qual")).toEqual(catalog.coachQualifications.map((q) => ({ code: q.code, label: q.label, legacy: q.legacy, sourceRef: q.sourceRef })));
    // Vocabularies of the table equal the TS ones.
    const check = (col: string) => [...(BODY.match(new RegExp(`${col} text not null[^,]*?check \\(${col} in \\(([^)]*)\\)`))?.[1] ?? "").matchAll(/'([A-Za-z_]+)'/g)].map((m) => m[1]);
    expect(check("group_code")).toEqual([...POSITION_GROUPS]);
    expect(check("role_kind")).toEqual([...ROLE_KINDS]);
    // Same role kinds as scd_structure_roles (r59).
    const r59 = read("../../../../supabase/migrations/20261011_r59_people_lifecycle_and_consents.sql");
    expect([...(r59.match(/role_kind in \(([^)]*)\)/)?.[1] ?? "").matchAll(/'([A-Z_]+)'/g)].map((m) => m[1])).toEqual([...ROLE_KINDS]);
  });

  it("recreates the r133 confirmers identical except the two direttori sportivi", () => {
    const before = fn(read("../../../../supabase/migrations/20261015_r133_requests_machine.sql"), "scd_request_group_confirmers");
    const after = fn(BODY, "scd_request_group_confirmers");
    expect(after).not.toBe("");
    expect(
      after
        .replace("then array['direttore-sportivo-agonistica']", "then array[]::text[]")
        .replace("then array['direttore-sportivo-generale']", "then array[]::text[]"),
    ).toBe(before);
  });
});

describe("catalogue config (Francesco 16/10/2026 13:35)", () => {
  const positions = catalog.positions;

  it("lists organigram positions only: qualifications, lavoratore sportivo, RASD card and socio are attributes", () => {
    expect(positions).toHaveLength(85);
    expect(catalog.coachQualifications).toHaveLength(24);
    expect(catalog.relationshipAttributes.sportWorker).toHaveLength(8);
    expect(catalog.relationshipAttributes.rasdCard).toHaveLength(5);
    expect(catalog.relationshipAttributes.associative.map((a) => a.code)).toEqual(["socio"]);
    const codes = positions.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    const attrs = [
      ...catalog.coachQualifications.map((q) => q.code),
      ...catalog.relationshipAttributes.sportWorker.map((q) => q.code),
      ...catalog.relationshipAttributes.rasdCard.map((q) => q.code),
      "socio",
      "custom",
    ];
    for (const a of attrs) expect(codes, a).not.toContain(a);
    for (const c of codes) expect(c).not.toMatch(/^custom-|^ls-|^rasd-tessera-/);
  });

  it("covers every adult club position of the registry exactly once (no position outside the catalogue)", () => {
    const mapped = positions.map((p) => p.appPosition).filter((x): x is string => !!x);
    expect(new Set(mapped).size).toBe(mapped.length);
    for (const m of mapped) expect(KNOWN_POSITIONS, m).toContain(m);
    const roleSeats = ["dirigenza", "famiglia", "atleta", "partner"];
    expect([...mapped].sort()).toEqual(KNOWN_POSITIONS.filter((p) => !roleSeats.includes(p)).sort());
  });

  it("has the two direttori sportivi decided by Francesco (13:32)", () => {
    for (const code of ["direttore-sportivo-agonistica", "direttore-sportivo-generale"]) {
      const p = positions.find((x) => x.code === code);
      expect(p, code).toMatchObject({ group: "dirigenti", roleKind: "DIRIGENTE", appPosition: code, source: "CLUB", evidence: "VERIFIED" });
    }
  });

  it("groups and kinds are known, official sources are https, no personal data", () => {
    expect(catalog.groups.map((g) => g.code)).toEqual([...POSITION_GROUPS]);
    for (const g of catalog.groups) expect(POSITION_GROUP_LABEL[g.code as keyof typeof POSITION_GROUP_LABEL]).toBe(g.label);
    for (const p of positions) {
      expect(POSITION_GROUPS as readonly string[], p.code).toContain(p.group);
      expect(ROLE_KINDS as readonly string[], p.code).toContain(p.roleKind);
      if (p.sourceUrl) expect(p.sourceUrl, p.code).toMatch(/^https:\/\//);
      expect(JSON.stringify(p), p.code).not.toContain("@");
      expect(p.label, p.code).not.toMatch(/(\+|00)?[0-9]([ ./-]?[0-9]){8,}/);
    }
    // Only coach-like positions take a qualification.
    expect(positions.filter((p) => p.acceptsQualification).map((p) => p.code).sort()).toEqual(
      ["allenatore-in-seconda", "allenatore-responsabile", "allenatore-settore-giovanile", "collaboratore-tecnico", "dirigente-allenatore", "dirigente-tecnico-prima-squadra", "responsabile-attivita-di-base", "responsabile-settore-giovanile", "responsabile-tecnico-settore-giovanile"].sort(),
    );
    expect(catalog.privacy).toMatch(/NO_PERSONAL_NAMES/);
  });

  it("maps every qualifica of the Portale Società LND (Organigramma, VERIFIED 16/10/2026 14:30) to a VERIFIED position", () => {
    const portal = ["Presidente", "Vice Presidente", "Consigliere", "Direttore Generale", "Cassiere", "Football Director", "Team Manager", "Dirigente", "Dirigente accompagnatore", "Dirigente-Allenatore", "Dirigente-Tecnico I Squadra", "Allenatore iscritto ALBO"];
    const labels = positions.map((p) => p.lndLabel).filter((x): x is string => !!x);
    expect([...new Set(labels)].sort()).toEqual([...portal].sort());
    for (const p of positions.filter((x) => x.lndLabel)) expect(p.evidence, p.code).toBe("VERIFIED");
    const by = (code: string) => positions.find((p) => p.code === code)!;
    expect(by("tesoriere").lndLabel).toBe("Cassiere");
    for (const ds of ["direttore-sportivo", "direttore-sportivo-agonistica", "direttore-sportivo-generale"]) expect(by(ds).lndLabel).toBe("Football Director");
    expect(by("direttore-sportivo-agonistica").source).toBe("CLUB");
    expect(by("allenatore-responsabile")).toMatchObject({ lndLabel: "Allenatore iscritto ALBO", acceptsQualification: true });
    for (const d of ["dirigente-allenatore", "dirigente-tecnico-prima-squadra"])
      expect(by(d)).toMatchObject({ group: "dirigenti", roleKind: "DIRIGENTE", acceptsQualification: true, source: "LND", sourceUrl: "https://iscrizioni.lnd.it", evidence: "VERIFIED" });
    for (const code of ["team-manager", "direttore-generale", "tesoriere"]) expect(by(code)).toMatchObject({ evidence: "VERIFIED", sourceRef: "Portale Società LND – Organigramma" });
    // Not used on the portal for this club: stay INFERRED.
    for (const code of ["segretario", "delegato-sicurezza", "addetto-stampa"]) expect(by(code)).toMatchObject({ evidence: "INFERRED", lndLabel: null });
    // D3: the two new access positions map one catalogue entry each.
    expect(by("operatore-sanitario").appPosition).toBe("fisioterapista");
    expect(by("responsabile-safeguarding").appPosition).toBe("responsabile-safeguarding");
  });

  it("the repo fallback parses every position, ACTIVE with unknown holders (never zero)", () => {
    const repo = repoCatalog();
    expect(repo).toHaveLength(85);
    expect(repo.every((p) => p.status === "ACTIVE" && p.holders === null)).toBe(true);
    expect(holdersLabel(repo[0]!)).toBe("da collegare");
  });
});

describe("custom positions", () => {
  it("folds labels like scd_position_slug", () => {
    expect(positionSlug("  Allenatore   Portieri U12 ")).toBe("allenatore-portieri-u12");
    expect(positionSlug("Addetto àccoglienza ospiti")).toBe("addetto-accoglienza-ospiti");
    expect(positionSlug("Responsabile dell'area è OK!")).toBe("responsabile-dell-area-e-ok");
    expect(positionSlug("!!!")).toBe("");
    expect(positionSlug("x".repeat(80))).toHaveLength(50);
    // Review R3: a cut on a hyphen leaves no trailing hyphen (same as btrim(left(...,50),'-') in r138).
    expect(positionSlug(`${"a".repeat(49)} bcd`)).toBe("a".repeat(49));
    expect(BODY).toContain("select btrim(left(btrim(regexp_replace(");
  });

  it("validates the draft like scd_create_custom_position", () => {
    const ok = validateCustomDraft({ label: " Responsabile  lotteria ", group: "servizi", roleKind: "STAFF", description: "" });
    expect(ok).toEqual({ ok: true, value: { label: "Responsabile lotteria", group: "servizi", roleKind: "STAFF", description: "", code: "custom-responsabile-lotteria" } });
    expect(validateCustomDraft({ label: "ab", group: "servizi", roleKind: "STAFF", description: "" })).toEqual({ ok: false, code: "label" });
    expect(validateCustomDraft({ label: "!!!", group: "servizi", roleKind: "STAFF", description: "" })).toEqual({ ok: false, code: "label" });
    expect(validateCustomDraft({ label: "Chiama 333 123 4567", group: "servizi", roleKind: "STAFF", description: "" })).toEqual({ ok: false, code: "contact" });
    expect(validateCustomDraft({ label: "Ruolo", group: "servizi", roleKind: "STAFF", description: "scrivi a x@y.it" })).toEqual({ ok: false, code: "contact" });
    expect(validateCustomDraft({ label: "Ruolo", group: "famiglie", roleKind: "STAFF", description: "" })).toEqual({ ok: false, code: "group" });
    expect(validateCustomDraft({ label: "Ruolo", group: "servizi", roleKind: "ATLETA", description: "" })).toEqual({ ok: false, code: "roleKind" });
    expect(validateCustomDraft({ label: "Ruolo", group: "servizi", roleKind: "STAFF", description: "x".repeat(301) })).toEqual({ ok: false, code: "description" });
    expect(validateCustomDraft({ label: "presidente", group: "direzione", roleKind: "ORGANO_SOCIETARIO", description: "" }, ["Presidente"])).toEqual({ ok: false, code: "exists" });
  });
});

describe("board parsing and labels", () => {
  const live = (over: Record<string, unknown> = {}) => ({
    code: "dirigente-accompagnatore",
    label: "Dirigente accompagnatore ufficiale",
    group: "dirigenti",
    roleKind: "DIRIGENTE",
    source: "FIGC",
    sourceUrl: "https://example.org/noif.pdf",
    evidence: "VERIFIED",
    status: "ACTIVE",
    holders: 0,
    ...over,
  });

  it("parses the database answer and drops malformed rows", () => {
    const b = parseCatalogBoard({ canCreate: true, positions: [live(), live({ code: "Bad Code" }), live({ group: "x" }), live({ status: "NOPE" }), null] });
    expect(b?.canCreate).toBe(true);
    expect(b?.positions.map((p) => p.code)).toEqual(["dirigente-accompagnatore"]);
    expect(parseCatalogBoard({ positions: "no" })).toBeNull();
    expect(parseCatalogBoard(null)).toBeNull();
    expect(parseCatalogBoard({ positions: [] })?.canCreate).toBe(false);
    expect(parsePosition(live({ sourceUrl: "http://insecure" }), true)?.sourceUrl).toBeNull();
    expect(parsePosition(live({ holders: -1 }), true)?.holders).toBeNull();
  });

  it("says da assegnare only when the database says nobody holds it", () => {
    const p = (o: Partial<CatalogPosition>) => ({ status: "ACTIVE", holders: 0, ...o }) as CatalogPosition;
    expect(holdersLabel(p({ holders: 0 }))).toBe("da assegnare");
    expect(holdersLabel(p({ holders: null }))).toBe("da collegare");
    expect(holdersLabel(p({ holders: 1 }))).toBe("1 assegnato");
    expect(holdersLabel(p({ holders: 3 }))).toBe("3 assegnati");
    expect(holdersLabel(p({ status: "PROPOSED" }))).toBe("da approvare");
    expect(holdersLabel(p({ status: "RETIRED" }))).toBe("ritirato");
  });

  it("groups in the fixed order, counts to-assign only when known", () => {
    const list = [
      parsePosition(live(), true)!,
      parsePosition(live({ code: "team-manager", label: "Team manager", holders: 2 }), true)!,
      parsePosition(live({ code: "presidente", label: "Presidente", group: "direzione", roleKind: "ORGANO_SOCIETARIO", holders: null }), true)!,
    ];
    const g = groupCatalog(list);
    expect(g.map((x) => x.group)).toEqual(["direzione", "dirigenti"]);
    expect(g[0]!.toAssign).toBeNull();
    expect(g[1]!.toAssign).toBe(1);
  });

  it("offers Crea ruolo nuovo only to creators, and says 'non ancora attiva' before r138", () => {
    expect(createState("live", true)).toBe("on");
    expect(createState("live", false)).toBe("off");
    expect(createState("not-applied", true)).toBe("not-applied");
    expect(createState("not-applied", null)).toBe("off");
    expect(createState("unavailable", true)).toBe("off");
  });
});

describe("is r138 live? (review R1)", () => {
  it("only the exact answer of scd_position_slug means live; anything else fails closed", () => {
    expect(r138ProbeResult("probe-r138", null)).toBe(true);
    expect(r138ProbeResult(null, { code: "PGRST202" })).toBe(false);
    expect(r138ProbeResult("probe-r138", { code: "42501" })).toBe(false);
    expect(r138ProbeResult("other", null)).toBe(false);
    expect(positionSlug(R138_PROBE_LABEL)).toBe("probe-r138");
  });

  it("probeR138 asks the database once and never throws", async () => {
    const ok = { rpc: vi.fn(async () => ({ data: "probe-r138", error: null })) };
    expect(await probeR138(ok)).toBe(true);
    expect(ok.rpc).toHaveBeenCalledWith("scd_position_slug", { p_label: "Probe R138" });
    expect(await probeR138({ rpc: vi.fn(async () => ({ data: null, error: { code: "PGRST202" } })) })).toBe(false);
    expect(await probeR138({ rpc: vi.fn(async () => { throw new Error("down"); }) })).toBe(false);
    expect(await probeR138(null)).toBe(false);
  });
});

describe("server outcomes (no network)", () => {
  afterEach(() => vi.restoreAllMocks());
  const repo = repoCatalog();

  it("falls back to the repo catalogue with unknown holders", () => {
    const missing = catalogFallback(repo, { code: "PGRST202", message: "Could not find the function" }, true);
    expect(missing.source).toBe("not-applied");
    expect(missing.create).toBe("not-applied");
    expect(missing.positions.every((p) => p.holders === null)).toBe(true);
    expect(catalogFallback(repo, { code: "PGRST202", message: "" }, false).create).toBe("off");
    const denied = catalogFallback(repo, { code: "42501", message: "x" }, true);
    expect(denied).toMatchObject({ source: "unavailable", create: "off", error: CATALOG_READ_DENIED });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(catalogFallback(repo, { code: "XX000", message: "secret detail" }, true).error).toBe(CATALOG_READ_FAILED);
    expect(warn.mock.calls.flat().join(" ")).not.toContain("secret detail");
    expect(catalogFallback(repo, null, null)).toMatchObject({ source: "unavailable", create: "off", error: null });
  });

  it("picks the Direzione organization first", () => {
    expect(catalogOrganization([{ organizationId: "a", role: "FAMILY" }, { organizationId: "b", role: "DIRECTION" }])?.organizationId).toBe("b");
    expect(catalogOrganization([{ organizationId: "a", role: "FAMILY" }, { organizationId: "c", role: "SECRETARIAT" }])?.organizationId).toBe("c");
    expect(catalogOrganization([])).toBeNull();
  });

  it("maps database answers to plain Italian", () => {
    expect(createOutcome("custom-responsabile-lotteria", null).ok).toBe(true);
    expect(createOutcome(null, { code: "PGRST202", message: "Could not find the function" }).message).toMatch(/non ancora attiva/);
    expect(createOutcome(null, { code: "42501", message: "" }).message).toMatch(/Presidente o il Direttore generale/);
    expect(createOutcome(null, { code: "23505", message: "" }).message).toMatch(/Esiste già/);
    expect(createOutcome(null, { code: "22023", message: "" }).ok).toBe(false);
    expect(createOutcome("weird", null).ok).toBe(false);
    expect(statusOutcome("ACTIVE", true, null).message).toMatch(/approvato/);
    expect(statusOutcome("RETIRED", true, null).message).toMatch(/ritirato/);
    expect(statusOutcome("ACTIVE", false, null).message).toMatch(/Nessuna modifica/);
    expect(statusOutcome("RETIRED", null, { code: "22023", message: "" }).message).toMatch(/titolari/);
  });
});
