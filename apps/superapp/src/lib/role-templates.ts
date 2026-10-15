/**
 * Role templates (r111 — Francesco, Direzione 15/10/2026). Pure rules shared by the server functions
 * (role-templates.functions.ts), the page /direzione/ruoli, the person checklist and the tests.
 *
 * Francesco's decisions (claude.ai project doc claude/SCD_DELEGHE_DECISIONI_2026-10-15.md):
 * - every platform (ONE, CORE, GROW) always offers "Crea ruolo vuoto": a new role has every section at "Nessuno";
 * - only the Presidente and the Direttore Generale create, edit or deactivate roles;
 * - a team role sees its own team; a responsabile sees more teams, areas or platforms only as the Direzione grants
 *   them, and only after the person has the base access (an active account of the club).
 *
 * A role opens nothing by itself: it is loaded into one person's checklist as PROPOSALS (yellow, to confirm) with
 * that person's teams or site, and saved through r100 scd_set_person_grants. The database enforces the same rules
 * (supabase/migrations/20261015_r111_role_templates.sql); these functions mirror it so tests pin both.
 */
import {
  SECTIONS,
  SECTIONS_FILE,
  findSection,
  isGrantable,
  type Grant,
  type Level,
  type Perimeter,
  type SectionDef,
  type Site,
} from "./person-grants";

export const PLATFORMS = ["ONE", "CORE", "GROW"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(x: unknown): x is Platform {
  return typeof x === "string" && (PLATFORMS as readonly string[]).includes(x);
}

interface PlatformDef {
  code: Platform;
  label: string;
  hint: string;
}

export interface TemplateGrant {
  sectionCode: string;
  level: Level;
  perimeter: Perimeter;
}

export interface RolePreset {
  code: string;
  label: string;
  grants: readonly { section: string; level: Level; perimeter: Perimeter }[];
}

interface RoleTemplatesFile {
  platforms: readonly PlatformDef[];
  roleTemplates: { rules: readonly string[]; presets: Readonly<Record<Platform, readonly RolePreset[]>> };
}

const FILE = SECTIONS_FILE as unknown as RoleTemplatesFile;

export const PLATFORM_DEFS: readonly PlatformDef[] = FILE.platforms;
export const PLATFORM_LABEL: Readonly<Record<Platform, string>> = Object.fromEntries(
  FILE.platforms.map((p) => [p.code, p.label]),
) as Record<Platform, string>;
export const PLATFORM_HINT: Readonly<Record<Platform, string>> = Object.fromEntries(
  FILE.platforms.map((p) => [p.code, p.hint]),
) as Record<Platform, string>;
export const ROLE_RULES: readonly string[] = FILE.roleTemplates.rules;
/** The same rules as config "roleTemplates.rules", in plain Italian for the page. */
export const ROLE_RULES_IT: readonly string[] = [
  "In ogni piattaforma puoi sempre creare un ruolo vuoto e aggiungere solo le sezioni che servono.",
  "Solo il Presidente e il Direttore Generale creano, modificano o disattivano i ruoli.",
  "Un ruolo non apre nulla da solo: la Direzione lo carica sulla persona, sceglie le sue squadre o la sede e conferma.",
  "Un incarico di squadra vede solo la sua squadra. Un responsabile vede più squadre, aree o piattaforme solo se la Direzione gliele dà, una per una.",
  "Prima serve l'accesso base: senza un accesso attivo al club non si abilita nulla.",
];

export const ROLE_PRESETS: Readonly<Record<Platform, readonly RolePreset[]>> = FILE.roleTemplates.presets;

/** Labels of the structure roles (organigramma) that may create roles. Mirrors scd_is_role_creator. */
export const ROLE_CREATOR_LABELS = ["presidente", "direttore generale"] as const;

export function sectionPlatform(code: string): Platform | null {
  const p = findSection(code)?.platform;
  return isPlatform(p) ? p : null;
}

/** Sections a role of this platform can contain (grantable ones only, in catalogue order). */
export function platformSections(platform: Platform): SectionDef[] {
  return SECTIONS.filter((s) => isGrantable(s) && sectionPlatform(s.code) === platform);
}

export interface RoleTemplate {
  id: string;
  platform: Platform;
  label: string;
  description: string;
  active: boolean;
  grants: readonly TemplateGrant[];
  updatedAt: string;
}

/** True when one of the person's active structure roles is Presidente or Direttore Generale. */
export function isRoleCreatorByRoles(roleLabels: readonly string[]): boolean {
  return roleLabels.some((l) => (ROLE_CREATOR_LABELS as readonly string[]).includes(l.trim().toLowerCase()));
}

/** The label typed for a role, cleaned the way the database stores it. */
export function cleanLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

/** Why a role name cannot be used on this platform, or null. `others` = the other active roles. */
export function labelProblem(label: string, platform: Platform, others: readonly Pick<RoleTemplate, "id" | "label" | "platform" | "active">[], selfId?: string): string | null {
  const l = cleanLabel(label);
  if (l.length < 2) return "Scrivi un nome di almeno 2 lettere.";
  if (l.length > 80) return "Il nome è troppo lungo (massimo 80 caratteri).";
  const taken = others.some((o) => o.active && o.platform === platform && o.id !== selfId && o.label.trim().toLowerCase() === l.toLowerCase());
  return taken ? `Esiste già un ruolo “${l}” in ${PLATFORM_LABEL[platform]}.` : null;
}

/** Why a set of sections cannot be saved for a role of this platform, or null. Mirrors scd_role_template_grants_valid. */
export function templateProblem(platform: Platform, grants: readonly TemplateGrant[]): string | null {
  if (grants.length > 60) return "Troppe sezioni.";
  const seen = new Set<string>();
  for (const g of grants) {
    if (seen.has(g.sectionCode)) return "Una sezione compare due volte.";
    seen.add(g.sectionCode);
    const s = findSection(g.sectionCode);
    if (!s || !isGrantable(s)) return `${s?.label ?? g.sectionCode}: non si mette in un ruolo (parte protetta o non prevista).`;
    if (sectionPlatform(s.code) !== platform) return `${s.label}: appartiene a ${PLATFORM_LABEL[sectionPlatform(s.code) ?? "CORE"]}, non a ${PLATFORM_LABEL[platform]}.`;
    if (!s.levels.includes(g.level)) return `${s.label}: livello non previsto.`;
    if (!s.perimeters.includes(g.perimeter)) return `${s.label}: perimetro non previsto.`;
  }
  return null;
}

/** The sections of a preset ("Parti da un modello"); the empty role is simply []. */
export function presetGrants(platform: Platform, presetCode: string | null): TemplateGrant[] {
  if (!presetCode) return [];
  const p = ROLE_PRESETS[platform]?.find((x) => x.code === presetCode);
  return (p?.grants ?? []).map((g) => ({ sectionCode: g.section, level: g.level, perimeter: g.perimeter }));
}

export function sortGrants(grants: readonly TemplateGrant[]): TemplateGrant[] {
  return [...grants].sort((a, b) => a.sectionCode.localeCompare(b.sectionCode));
}

/** Does applying this role need teams (a "Sue annate" section) or a site ("Sua sede")? */
export function needsTeams(t: Pick<RoleTemplate, "grants">): boolean {
  return t.grants.some((g) => g.perimeter === "OWN_TEAMS");
}
export function needsSite(t: Pick<RoleTemplate, "grants">): boolean {
  return t.grants.some((g) => g.perimeter === "OWN_SITE");
}

export interface ApplyChoice {
  teamIds: readonly string[];
  site: Site | null;
  /** The person is under 18 (people.isMinor); null when unknown. */
  minor: boolean | null;
}

export interface ApplyPlan {
  /** Proposals for the person's checklist: they stay yellow until the Direzione confirms them. */
  proposals: Array<Grant & { reason: string }>;
  skipped: Array<{ sectionCode: string; reason: string }>;
  /** What is still missing before the role can be loaded ("Scegli almeno una squadra" …), or null. */
  missing: string | null;
}

/** Turns a role into proposals for one person, with that person's teams or site. Nothing is saved here. */
export function applyPlan(t: Pick<RoleTemplate, "label" | "grants" | "active">, choice: ApplyChoice): ApplyPlan {
  if (!t.active) return { proposals: [], skipped: [], missing: "Ruolo disattivato." };
  if (needsTeams(t) && choice.teamIds.length === 0) return { proposals: [], skipped: [], missing: "Scegli almeno una squadra: il ruolo vale solo per le squadre di questa persona." };
  if (needsSite(t) && !choice.site) return { proposals: [], skipped: [], missing: "Scegli la sede (Colico o Dervio)." };
  const proposals: ApplyPlan["proposals"] = [];
  const skipped: ApplyPlan["skipped"] = [];
  for (const g of t.grants) {
    const s = findSection(g.sectionCode);
    if (!s || !isGrantable(s)) {
      skipped.push({ sectionCode: g.sectionCode, reason: "sezione non più abilitabile" });
      continue;
    }
    if (choice.minor === true && g.perimeter !== "SELF") {
      skipped.push({ sectionCode: g.sectionCode, reason: "minorenne: solo “Solo sé”" });
      continue;
    }
    proposals.push({
      sectionCode: g.sectionCode,
      level: g.level,
      perimeter: g.perimeter,
      teamIds: g.perimeter === "OWN_TEAMS" ? [...new Set(choice.teamIds)].sort() : [],
      site: g.perimeter === "OWN_SITE" ? choice.site : null,
      reason: `Ruolo “${t.label}”`,
    });
  }
  return { proposals, skipped, missing: null };
}

/** Roles grouped by platform for the page (active first, then by name). */
export function byPlatform(templates: readonly RoleTemplate[]): Record<Platform, RoleTemplate[]> {
  const out: Record<Platform, RoleTemplate[]> = { ONE: [], CORE: [], GROW: [] };
  for (const t of templates) out[t.platform].push(t);
  for (const p of PLATFORMS) out[p].sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label, "it"));
  return out;
}

/** One line per section of a role, for lists ("Squadra: … · Modifica · Sue annate"). */
export function templateLines(t: Pick<RoleTemplate, "grants">, labels: { level: Readonly<Record<Level, string>>; perimeter: Readonly<Record<Perimeter, string>> }): string[] {
  return sortGrants(t.grants).map((g) => `${findSection(g.sectionCode)?.label ?? g.sectionCode} · ${labels.level[g.level]} · ${labels.perimeter[g.perimeter]}`);
}

/** Plain Italian for the database errors of r111. */
export function explainRoleError(error: { code?: string; message: string }, notApplied: string): string {
  const m = error.message;
  if (/does not exist|could not find the (table|function)/i.test(m) || ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code ?? "")) return notApplied;
  if (m.includes("Presidente or Direttore Generale only")) return "Solo il Presidente e il Direttore Generale creano e modificano i ruoli.";
  if (m.includes("role label already used")) return "Esiste già un ruolo attivo con questo nome in questa piattaforma.";
  if (m.includes("section of another platform")) return "Una sezione appartiene a un'altra piattaforma.";
  if (m.includes("section not grantable")) return "Una sezione non si mette in un ruolo (parte protetta o non prevista).";
  if (m.includes("duplicate or missing section")) return "Una sezione compare due volte.";
  if (m.includes("role is not active")) return "Il ruolo è disattivato: riattivalo prima di modificarlo.";
  if (m.includes("role not found")) return "Ruolo non trovato.";
  if (m.includes("label length")) return "Il nome deve avere da 2 a 80 caratteri.";
  if (m.includes("unknown platform")) return "Piattaforma non riconosciuta.";
  if (error.code === "42501") return "Non hai i permessi per questa modifica.";
  return "Modifica non riuscita, riprova.";
}

/** Default "su cosa" when a section is switched on in a role: the narrowest perimeter it allows, never "Tutto" first. */
const NARROW_FIRST: readonly Perimeter[] = ["OWN_TEAMS", "OWN_SITE", "OWN_CHILDREN", "SELF", "ALL"];
export function narrowestPerimeter(s: Pick<SectionDef, "perimeters">): Perimeter {
  return NARROW_FIRST.find((p) => s.perimeters.includes(p)) ?? "ALL";
}
