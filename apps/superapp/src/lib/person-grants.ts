/**
 * Person grants (r100, UD-112 — Direzione 14/10/2026). Pure rules shared by the server functions
 * (person-grants.functions.ts), the admin page (/direzione/accessi/$personId) and the tests.
 *
 * The decision that supersedes any "derived access from roles":
 * - a role is ONLY a description: it opens nothing;
 * - every account gets only the base sections (public pages, own profile, own card);
 * - the Direzione enables EACH section for EACH person with a level (READ/WRITE/APPROVE) and a
 *   perimeter (ALL/OWN_TEAMS/OWN_SITE/OWN_CHILDREN/SELF);
 * - "copia da" and "proponi in base al ruolo" are helpers that never save by themselves;
 * - hard blocks always stay: minors' health data, Safeguarding, no self-edit, club account protected.
 *
 * The database enforces the same rules (supabase/migrations/20261014_r100_person_grants.sql:
 * scd_can, scd_set_person_grants, scd_copy_person_grants, scd_suggest_grants). Nothing here grants
 * anything: it shapes the screen and mirrors the SQL so that tests pin both to one contract.
 */
import sectionsJson from "../../../../config/scd-sections.v1.json";

export const LEVELS = ["READ", "WRITE", "APPROVE"] as const;
export type Level = (typeof LEVELS)[number];
export const PERIMETERS = [
  "ALL",
  "OWN_TEAMS",
  "OWN_SITE",
  "OWN_CHILDREN",
  "SELF",
] as const;
export type Perimeter = (typeof PERIMETERS)[number];
export const SITES = ["COLICO", "DERVIO"] as const;
export type Site = (typeof SITES)[number];

export interface SectionDef {
  code: string;
  label: string;
  group: string;
  path?: string;
  area?: string;
  base?: boolean;
  levels: readonly Level[];
  perimeters: readonly Perimeter[];
  sensitive?: boolean;
  hardBlocked?: boolean;
  directionOnly?: boolean;
  blockReason?: string;
  /** Plain words for the "Vedrà" preview ("rosa, convocazioni e distinte"). */
  sees?: string;
}

export interface SuggestionRule {
  section: string;
  level: Level;
  perimeter: Perimeter;
  site?: Site;
}

interface SectionsFile {
  schema: string;
  status: string;
  levels: ReadonlyArray<{ code: Level; label: string; hint: string }>;
  perimeters: ReadonlyArray<{ code: Perimeter; label: string; hint: string }>;
  sites: ReadonlyArray<{ code: Site; label: string }>;
  groups: ReadonlyArray<{ code: string; label: string }>;
  sections: readonly SectionDef[];
  roleSuggestions: {
    positions: Readonly<Record<string, readonly SuggestionRule[]>>;
    roleKindPositions: Readonly<Record<string, string>>;
  };
}

export const SECTIONS_FILE = sectionsJson as unknown as SectionsFile;
export const SECTIONS: readonly SectionDef[] = SECTIONS_FILE.sections;
export const SECTION_GROUPS = SECTIONS_FILE.groups;

export const LEVEL_LABEL: Readonly<Record<Level, string>> = Object.fromEntries(
  SECTIONS_FILE.levels.map((l) => [l.code, l.label]),
) as Record<Level, string>;
export const PERIMETER_LABEL: Readonly<Record<Perimeter, string>> =
  Object.fromEntries(
    SECTIONS_FILE.perimeters.map((p) => [p.code, p.label]),
  ) as Record<Perimeter, string>;
export const PERIMETER_HINT: Readonly<Record<Perimeter, string>> =
  Object.fromEntries(
    SECTIONS_FILE.perimeters.map((p) => [p.code, p.hint]),
  ) as Record<Perimeter, string>;
export const SITE_LABEL: Readonly<Record<Site, string>> = Object.fromEntries(
  SECTIONS_FILE.sites.map((s) => [s.code, s.label]),
) as Record<Site, string>;

/** The club account (SCD_GMAIL / SCD_DRIVE owner in the manifest): its access is never edited from here. */
export const CLUB_ACCOUNT_EMAIL = "sportclubcolico@gmail.com";

export function findSection(code: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.code === code);
}

/** Sections that a Direzione can tick for a person (not base, not hard-blocked, not Direzione-only). */
export function isGrantable(s: SectionDef | undefined): boolean {
  return Boolean(
    s &&
    !s.base &&
    !s.hardBlocked &&
    !s.directionOnly &&
    s.levels.length > 0 &&
    s.perimeters.length > 0,
  );
}

export const GRANTABLE_SECTIONS: readonly SectionDef[] = SECTIONS.filter((s) =>
  isGrantable(s),
);
export const BASE_SECTIONS: readonly SectionDef[] = SECTIONS.filter(
  (s) => s.base,
);

export function isLevel(x: unknown): x is Level {
  return typeof x === "string" && (LEVELS as readonly string[]).includes(x);
}
export function isPerimeter(x: unknown): x is Perimeter {
  return typeof x === "string" && (PERIMETERS as readonly string[]).includes(x);
}
export function isSite(x: unknown): x is Site {
  return typeof x === "string" && (SITES as readonly string[]).includes(x);
}

/** READ < WRITE < APPROVE: a higher level includes the lower ones. */
export function levelRank(l: Level): number {
  return LEVELS.indexOf(l);
}
export function levelCovers(granted: Level, required: Level): boolean {
  return levelRank(granted) >= levelRank(required);
}

/** What the Direzione chose for one section of one person. */
export interface Grant {
  sectionCode: string;
  level: Level;
  perimeter: Perimeter;
  /** Team ids (scd_teams.id) for OWN_TEAMS, empty otherwise. */
  teamIds: readonly string[];
  /** COLICO / DERVIO for OWN_SITE, null otherwise. */
  site: Site | null;
}

/** A stored row (scd_person_grants). */
export interface GrantRow extends Grant {
  id: string;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
  note: string | null;
}

export function isActive(row: Pick<GrantRow, "revokedAt">): boolean {
  return row.revokedAt === null;
}

/** Canonical form: teams only for OWN_TEAMS (sorted, unique), site only for OWN_SITE. */
export function normalizeGrant(g: Grant): Grant {
  return {
    sectionCode: g.sectionCode,
    level: g.level,
    perimeter: g.perimeter,
    teamIds: g.perimeter === "OWN_TEAMS" ? [...new Set(g.teamIds)].sort() : [],
    site: g.perimeter === "OWN_SITE" ? g.site : null,
  };
}

export function sameGrant(a: Grant, b: Grant): boolean {
  const x = normalizeGrant(a);
  const y = normalizeGrant(b);
  return (
    x.sectionCode === y.sectionCode &&
    x.level === y.level &&
    x.perimeter === y.perimeter &&
    x.site === y.site &&
    x.teamIds.join() === y.teamIds.join()
  );
}

export interface TargetFacts {
  /** True when the person is under 18 (people.isMinor); null when the birth date is unknown. */
  minor: boolean | null;
}

/**
 * Why a grant cannot be saved, in plain Italian, or null when it is valid. Mirrors the checks of
 * scd_set_person_grants. `note` is the reason typed by the Direzione for this save.
 */
export function grantProblem(
  g: Grant,
  target: TargetFacts,
  note = "",
): string | null {
  const s = findSection(g.sectionCode);
  if (!s) return "Sezione sconosciuta.";
  if (s.hardBlocked)
    return `${s.label}: parte protetta, non si abilita da qui.`;
  if (s.directionOnly) return `${s.label}: solo la Direzione.`;
  if (s.base) return `${s.label}: è già compresa nella base.`;
  if (!s.levels.includes(g.level))
    return `${s.label}: livello "${LEVEL_LABEL[g.level] ?? g.level}" non previsto.`;
  if (!s.perimeters.includes(g.perimeter))
    return `${s.label}: perimetro "${PERIMETER_LABEL[g.perimeter] ?? g.perimeter}" non previsto.`;
  if (g.perimeter === "OWN_TEAMS" && g.teamIds.length === 0)
    return `${s.label}: scegli almeno una squadra.`;
  if (g.perimeter === "OWN_SITE" && !isSite(g.site))
    return `${s.label}: scegli la sede (Colico o Dervio).`;
  if (target.minor === true && g.perimeter !== "SELF")
    return `${s.label}: a un minorenne si abilita solo "Solo sé".`;
  if (s.sensitive && note.trim().length < 3)
    return `${s.label}: dato riservato, scrivi il motivo.`;
  return null;
}

export interface EditActor {
  /** Active membership with role DIRECTION. */
  isDirection: boolean;
  /** Persons linked to the actor's own login (scd_identity_links, not revoked). */
  personIds: readonly string[];
}

export interface EditTarget {
  personId: string;
  /** True when the person is linked to the club account (CLUB_ACCOUNT_EMAIL). */
  isClubAccount: boolean;
}

/** Why the actor may not change this person's grants, or null. Same order as scd_person_grants_guard. */
export function editRefusal(
  actor: EditActor,
  target: EditTarget,
): string | null {
  if (!actor.isDirection) return "Solo la Direzione abilita le sezioni.";
  if (actor.personIds.includes(target.personId))
    return "Sono le tue abilitazioni: le può cambiare solo un'altra persona della Direzione.";
  if (target.isClubAccount)
    return "Account del club: è protetto e non si modifica da qui.";
  return null;
}

/** Context of one check: which record the caller is about to see or change. Empty = can open the section. */
export interface CheckContext {
  teamId?: string | null;
  /** Teams of the subject person (athlete memberships or staff roles). */
  subjectTeamIds?: readonly string[];
  site?: Site | null;
  /** The person the record is about. */
  personId?: string | null;
}

export interface CallerFacts {
  /** Membership active (not suspended). */
  active: boolean;
  isDirection: boolean;
  /** Persons linked to the caller's login. */
  personIds: readonly string[];
  /** Persons in families where one of the caller's persons is guardian. */
  childPersonIds: readonly string[];
}

function emptyContext(c: CheckContext): boolean {
  return (
    !c.teamId &&
    !(c.subjectTeamIds && c.subjectTeamIds.length) &&
    !c.site &&
    !c.personId
  );
}

export function perimeterMatches(
  g: Grant,
  c: CheckContext,
  f: CallerFacts,
): boolean {
  if (emptyContext(c)) return true;
  switch (g.perimeter) {
    case "ALL":
      return true;
    case "OWN_TEAMS":
      return Boolean(
        (c.teamId && g.teamIds.includes(c.teamId)) ||
        (c.subjectTeamIds ?? []).some((t) => g.teamIds.includes(t)),
      );
    case "OWN_SITE":
      return Boolean(c.site && g.site === c.site);
    case "OWN_CHILDREN":
      return Boolean(c.personId && f.childPersonIds.includes(c.personId));
    case "SELF":
      return Boolean(c.personId && f.personIds.includes(c.personId));
  }
}

/**
 * The pure twin of SQL `scd_can`: reads ONLY active grants plus the hard blocks. Roles are never
 * consulted, except that an active Direzione membership opens every non-protected section (the
 * Direzione is the one who grants; see the report for the decision this needs).
 */
export function can(
  grants: readonly GrantRow[],
  sectionCode: string,
  level: Level,
  ctx: CheckContext,
  caller: CallerFacts,
): boolean {
  const s = findSection(sectionCode);
  if (!s || s.hardBlocked) return false;
  if (!caller.active) return false;
  if (caller.isDirection) return true;
  if (s.directionOnly) return false;
  if (s.base) return s.levels.some((l) => levelCovers(l, level));
  return grants.some(
    (g) =>
      isActive(g) &&
      g.sectionCode === sectionCode &&
      levelCovers(g.level, level) &&
      perimeterMatches(g, ctx, caller),
  );
}

/* ---------- suggestions (never applied by themselves) ---------- */

export interface RoleFacts {
  /** Positions of the person's linked login(s): coarse role baseline + scope.positions (session.ts). */
  positions: readonly string[];
  /** Active structure roles (scd_structure_roles). */
  structureRoles: ReadonlyArray<{
    kind: string;
    teamId: string | null;
    label: string;
  }>;
  isGuardian: boolean;
  isAthlete: boolean;
}

export interface Suggestion extends Grant {
  /** Plain reason ("Ruolo: Mister U15"). */
  reason: string;
}

const PERIM_BREADTH: Readonly<Record<Perimeter, number>> = {
  ALL: 4,
  OWN_SITE: 3,
  OWN_TEAMS: 2,
  OWN_CHILDREN: 1,
  SELF: 0,
};

/** Every position the person carries according to the club's data, with the reason shown to the Direzione. */
export function positionsFor(f: RoleFacts): Map<string, string> {
  const out = new Map<string, string>();
  const kindPos = SECTIONS_FILE.roleSuggestions.roleKindPositions;
  for (const p of f.positions) out.set(p, `Accesso: ${p.replace(/-/g, " ")}`);
  for (const r of f.structureRoles) {
    const p = kindPos[r.kind];
    if (p && !out.has(p)) out.set(p, `Ruolo: ${r.label}`);
  }
  if (f.isGuardian && !out.has("famiglia"))
    out.set("famiglia", "Genitore o tutore");
  if (f.isAthlete && !out.has("atleta")) out.set("atleta", "Atleta");
  return out;
}

/**
 * "Proponi in base al ruolo": suggested ticks from the person's roles. Same section from two roles →
 * the higher level and the broader perimeter win (teams merged). OWN_TEAMS takes the teams of the
 * structure roles; when there are none the suggestion keeps an empty team list and must be completed.
 * The result is ONLY a proposal: nothing is saved until the Direzione confirms each row.
 */
export function suggestGrants(f: RoleFacts): Suggestion[] {
  const rules = SECTIONS_FILE.roleSuggestions.positions;
  const teams = [
    ...new Set(
      f.structureRoles
        .map((r) => r.teamId)
        .filter((t): t is string => Boolean(t)),
    ),
  ].sort();
  const bySection = new Map<string, Suggestion>();
  for (const [pos, reason] of positionsFor(f)) {
    for (const r of rules[pos] ?? []) {
      if (!isGrantable(findSection(r.section))) continue;
      const next: Suggestion = normalizeSuggestion({
        sectionCode: r.section,
        level: r.level,
        perimeter: r.perimeter,
        teamIds: r.perimeter === "OWN_TEAMS" ? teams : [],
        site: r.perimeter === "OWN_SITE" ? (r.site ?? null) : null,
        reason,
      });
      const cur = bySection.get(r.section);
      if (!cur) {
        bySection.set(r.section, next);
        continue;
      }
      const level =
        levelRank(next.level) > levelRank(cur.level) ? next.level : cur.level;
      const wider =
        PERIM_BREADTH[next.perimeter] > PERIM_BREADTH[cur.perimeter]
          ? next
          : cur;
      bySection.set(
        r.section,
        normalizeSuggestion({
          ...wider,
          level,
          teamIds:
            wider.perimeter === "OWN_TEAMS"
              ? [...cur.teamIds, ...next.teamIds]
              : [],
          reason:
            cur.reason === next.reason
              ? cur.reason
              : `${cur.reason}; ${next.reason}`,
        }),
      );
    }
  }
  return [...bySection.values()].sort(
    (a, b) =>
      SECTIONS.findIndex((s) => s.code === a.sectionCode) -
      SECTIONS.findIndex((s) => s.code === b.sectionCode),
  );
}

function normalizeSuggestion(s: Suggestion): Suggestion {
  return { ...normalizeGrant(s), reason: s.reason };
}

/* ---------- draft (what the checklist holds before saving) ---------- */

export type DraftOrigin = "saved" | "manual" | "suggested" | "copied";

export interface DraftRow extends Grant {
  on: boolean;
  origin: DraftOrigin;
  /** Suggestions and copies stay proposals until the Direzione confirms each row. */
  confirmed: boolean;
  reason?: string;
}

export type Draft = Readonly<Record<string, DraftRow>>;

/** Default level/perimeter offered when a row is ticked by hand: the lowest level, the narrowest useful perimeter. */
export function defaultRow(s: SectionDef, target: TargetFacts): DraftRow {
  const perimeter: Perimeter =
    target.minor === true && s.perimeters.includes("SELF")
      ? "SELF"
      : (s.perimeters[0] ?? "ALL");
  return {
    sectionCode: s.code,
    level: s.levels[0] ?? "READ",
    perimeter,
    teamIds: [],
    site: null,
    on: false,
    origin: "manual",
    confirmed: true,
  };
}

export function draftFromGrants(rows: readonly GrantRow[]): Draft {
  const out: Record<string, DraftRow> = {};
  for (const g of rows)
    if (isActive(g))
      out[g.sectionCode] = {
        ...normalizeGrant(g),
        on: true,
        origin: "saved",
        confirmed: true,
      };
  return out;
}

/** Puts suggestions in the draft as unconfirmed proposals. Rows already ticked are left as they are. */
export function applyProposals(
  draft: Draft,
  proposals: readonly (Grant & { reason?: string })[],
  origin: "suggested" | "copied",
): Draft {
  const out: Record<string, DraftRow> = { ...draft };
  for (const p of proposals) {
    if (!isGrantable(findSection(p.sectionCode))) continue;
    const cur = out[p.sectionCode];
    if (cur?.on && cur.confirmed) continue;
    out[p.sectionCode] = {
      ...normalizeGrant(p),
      on: true,
      origin,
      confirmed: false,
      ...(p.reason ? { reason: p.reason } : {}),
    };
  }
  return out;
}

/** Drops every proposal that was not confirmed (back to the saved state for those rows). */
export function discardProposals(
  draft: Draft,
  saved: readonly GrantRow[],
): Draft {
  const base = draftFromGrants(saved);
  const out: Record<string, DraftRow> = {};
  for (const [code, row] of Object.entries(draft)) {
    if (row.confirmed) out[code] = row;
    else if (base[code]) out[code] = base[code]!;
  }
  return out;
}

/** What a save would write: ticked rows that are confirmed. Unconfirmed proposals are NEVER included. */
export function grantsToSave(draft: Draft): Grant[] {
  return Object.values(draft)
    .filter(
      (r) => r.on && r.confirmed && isGrantable(findSection(r.sectionCode)),
    )
    .map((r) => normalizeGrant(r))
    .sort((a, b) => a.sectionCode.localeCompare(b.sectionCode));
}

export function pendingProposals(draft: Draft): DraftRow[] {
  return Object.values(draft).filter((r) => r.on && !r.confirmed);
}

export interface GrantDiff {
  added: Grant[];
  changed: Array<{ before: Grant; after: Grant }>;
  removed: Grant[];
}

export function diffGrants(
  current: readonly Grant[],
  next: readonly Grant[],
): GrantDiff {
  const cur = new Map(current.map((g) => [g.sectionCode, normalizeGrant(g)]));
  const nxt = new Map(next.map((g) => [g.sectionCode, normalizeGrant(g)]));
  const diff: GrantDiff = { added: [], changed: [], removed: [] };
  for (const [code, g] of nxt) {
    const before = cur.get(code);
    if (!before) diff.added.push(g);
    else if (!sameGrant(before, g)) diff.changed.push({ before, after: g });
  }
  for (const [code, g] of cur) if (!nxt.has(code)) diff.removed.push(g);
  return diff;
}

export function diffIsEmpty(d: GrantDiff): boolean {
  return d.added.length + d.changed.length + d.removed.length === 0;
}

/* ---------- copy from another person (explicit Direzione action) ---------- */

export interface CopyPlan {
  /** Grants the copy would write on the target (replacing the target's grant on the same section). */
  apply: Grant[];
  skipped: Array<{ grant: Grant; reason: string }>;
}

/** Mirrors scd_copy_person_grants: copies active grants that are valid for the target; sections not in the source are left alone. */
export function copyPlan(
  source: readonly GrantRow[],
  target: TargetFacts,
): CopyPlan {
  const plan: CopyPlan = { apply: [], skipped: [] };
  for (const g of source) {
    if (!isActive(g)) continue;
    const s = findSection(g.sectionCode);
    const grant = normalizeGrant(g);
    if (!isGrantable(s)) {
      plan.skipped.push({ grant, reason: "parte protetta o solo Direzione" });
      continue;
    }
    if (target.minor === true && grant.perimeter !== "SELF") {
      plan.skipped.push({ grant, reason: 'minorenne: solo "Solo sé"' });
      continue;
    }
    plan.apply.push(grant);
  }
  return plan;
}

/* ---------- plain words ---------- */

export function perimeterText(
  g: Pick<Grant, "perimeter" | "teamIds" | "site">,
  teamName: (id: string) => string = (id) => id,
): string {
  switch (g.perimeter) {
    case "ALL":
      return "tutta la società";
    case "OWN_TEAMS":
      return g.teamIds.length
        ? `squadre ${g.teamIds.map(teamName).join(", ")}`
        : "squadre da scegliere";
    case "OWN_SITE":
      return g.site ? `sede di ${SITE_LABEL[g.site]}` : "sede da scegliere";
    case "OWN_CHILDREN":
      return "solo i suoi figli";
    case "SELF":
      return "solo i propri dati";
  }
}

const VERB: Readonly<Record<Level, string>> = {
  READ: "vede",
  WRITE: "vede e modifica",
  APPROVE: "vede, modifica e approva",
};

export interface SeeLine {
  code: string;
  label: string;
  text: string;
  base: boolean;
}

/** "Vedrà": what the person will see with these grants, base first, in plain Italian. */
export function willSee(
  grants: readonly Grant[],
  teamName?: (id: string) => string,
): SeeLine[] {
  const base: SeeLine[] = BASE_SECTIONS.map((s) => ({
    code: s.code,
    label: s.label,
    text: s.sees ?? s.label,
    base: true,
  }));
  const extra: SeeLine[] = [];
  for (const g of grants) {
    const s = findSection(g.sectionCode);
    if (!s || !isGrantable(s)) continue;
    extra.push({
      code: s.code,
      label: s.label,
      text: `${VERB[g.level]} ${s.sees ?? s.label.toLowerCase()} · ${perimeterText(g, teamName)}`,
      base: false,
    });
  }
  extra.sort(
    (a, b) =>
      SECTIONS.findIndex((s) => s.code === a.code) -
      SECTIONS.findIndex((s) => s.code === b.code),
  );
  return [...base, ...extra];
}

/** One line for the audit list and the confirmation dialog. */
export function grantLine(g: Grant, teamName?: (id: string) => string): string {
  const s = findSection(g.sectionCode);
  return `${s?.label ?? g.sectionCode}: ${LEVEL_LABEL[g.level]} · ${perimeterText(g, teamName)}`;
}

/* ---------- audit ---------- */

export const GRANT_AUDIT_LABEL: Readonly<Record<string, string>> = {
  GRANT_SECTION: "Sezione abilitata",
  CHANGE_SECTION: "Abilitazione cambiata",
  REVOKE_SECTION: "Sezione tolta",
  COPY_GRANTS: "Abilitazioni copiate",
};

function grantFromDetail(section: string, v: unknown): Grant | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!isLevel(o["level"]) || !isPerimeter(o["perimeter"])) return null;
  return {
    sectionCode: section,
    level: o["level"],
    perimeter: o["perimeter"],
    teamIds: Array.isArray(o["team_ids"])
      ? (o["team_ids"] as unknown[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [],
    site: isSite(o["site"]) ? o["site"] : null,
  };
}

/** One-line Italian summary of a section-grant audit row (scd_access_audit.detail written by r100). */
export function grantAuditSummary(
  action: string,
  detail: Record<string, unknown>,
  teamName?: (id: string) => string,
): string {
  const section =
    typeof detail["section"] === "string" ? detail["section"] : "";
  const label = findSection(section)?.label ?? section;
  if (action === "COPY_GRANTS") {
    const n = Array.isArray(detail["sections"]) ? detail["sections"].length : 0;
    return `${n} ${n === 1 ? "sezione copiata" : "sezioni copiate"} da un'altra persona`;
  }
  const before = grantFromDetail(section, detail["before"]);
  const after = grantFromDetail(section, detail["after"]);
  if (action === "GRANT_SECTION" && after) return grantLine(after, teamName);
  if (action === "REVOKE_SECTION")
    return `${label}: tolta${before ? ` (era ${LEVEL_LABEL[before.level]} · ${perimeterText(before, teamName)})` : ""}`;
  if (action === "CHANGE_SECTION" && after)
    return `${label}: ${before ? `${LEVEL_LABEL[before.level]} · ${perimeterText(before, teamName)} → ` : ""}${LEVEL_LABEL[after.level]} · ${perimeterText(after, teamName)}`;
  return label || "modifica";
}
