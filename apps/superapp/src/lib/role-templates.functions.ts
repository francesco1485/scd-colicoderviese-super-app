/**
 * Role templates on the server (r111, Direzione 15/10/2026). Same gate as /direzione/accessi; reading is for the
 * Direzione, writing only for the Presidente and the Direttore Generale, enforced again by the database
 * (scd_is_role_creator inside every write function). Nothing is cached.
 *
 * Fail-closed: while r111 is not applied the page shows the platforms, the empty role and the models as a preview,
 * but creating, editing and deactivating answer "Da attivare" and nothing is written anywhere.
 * r111 is APPLIED on SCD PULSE since 16/10/2026 13:37–13:45 (PC chat, on Francesco's «applica r111»).
 *
 * r112 (STAGED, NOT APPLIED): a role can name the organigram position (r138 catalogue) it is meant for. Until r112 is
 * applied the position choice is shown switched off and nothing about positions is read or written; the role itself
 * still saves. The link opens nothing: it only puts the role first in "Carica un ruolo" for holders of that position.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { LEVELS, PERIMETERS, isLevel, isPerimeter } from "./person-grants";
import { isMissingObjectError, type GrantsEngine } from "./person-grants.server";
import { parseCatalogBoard } from "./position-catalog";
import {
  PLATFORMS,
  explainRoleError,
  positionChoices,
  suggestedTemplateIds,
  isPlatform,
  isRoleCreatorByRoles,
  sortGrants,
  templateProblem,
  type PositionOption,
  type RoleTemplate,
  type TemplateGrant,
} from "./role-templates";
import { serverSupabase } from "./supabase.server";

export const ROLES_NOT_APPLIED = "Da attivare: serve «applica r111» di Francesco. Nessun ruolo è stato salvato.";
export const POSITIONS_NOT_APPLIED = "Collegamento alla posizione da attivare: serve «applica r112» di Francesco.";

export interface RoleTemplatesData {
  gate: WorkAreaGate;
  /** False without a database session (staging preview, signed out). */
  connected: boolean;
  /** r111 applied on the database? Writes only when "applied". */
  engine: GrantsEngine;
  actor: { isDirection: boolean; isCreator: boolean; email: string | null };
  templates: RoleTemplate[];
  /** True when r111 is applied but the roles could not be read (never shown as "no roles"). */
  readError: boolean;
  /** r112 (role ↔ organigram position) applied? The position choice is on only when "applied". */
  positionLink: GrantsEngine;
  /** Organigram positions (r138 catalogue; repo copy when the live board is not readable). Codes and labels only. */
  positions: PositionOption[];
}

type Sb = NonNullable<ReturnType<typeof serverSupabase>>;
type TemplateDb = {
  id: string;
  platform: string;
  label: string;
  description: string | null;
  active: boolean;
  updated_at: string;
  position_code?: string | null;
  scd_role_template_grants: Array<{ section_code: string; level: string; perimeter: string }> | null;
};

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("accessi", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  const isDirection = org?.role === "DIRECTION";
  const sb = s.configured && s.user ? serverSupabase() : null;
  return { gate, org, isDirection, actorEmail: s.user?.email?.toLowerCase() ?? null, sb };
}

/** Is r111 applied on the connected database? "unknown" when the check itself failed for another reason. */
export async function roleTemplatesEngine(sb: Sb | null): Promise<GrantsEngine> {
  if (!sb) return "unknown";
  try {
    const { error } = await sb.from("scd_role_templates").select("id", { head: true, count: "exact" }).limit(1);
    if (!error) return "applied";
    return isMissingObjectError(error) ? "not-applied" : "unknown";
  } catch {
    return "unknown";
  }
}

export function toTemplate(r: TemplateDb): RoleTemplate | null {
  if (!isPlatform(r.platform)) return null;
  const grants: TemplateGrant[] = (r.scd_role_template_grants ?? [])
    .filter((g) => isLevel(g.level) && isPerimeter(g.perimeter))
    .map((g) => ({ sectionCode: g.section_code, level: g.level as TemplateGrant["level"], perimeter: g.perimeter as TemplateGrant["perimeter"] }));
  return {
    id: r.id,
    platform: r.platform,
    label: r.label,
    description: r.description ?? "",
    active: r.active,
    grants: sortGrants(grants),
    updatedAt: r.updated_at,
    positionCode: typeof r.position_code === "string" ? r.position_code : null,
  };
}

/** Is the signed-in user Presidente or DG? From the database when r111 is applied, else from the organigramma (display only). */
async function creatorOf(sb: Sb, organizationId: string, engine: GrantsEngine): Promise<boolean> {
  if (engine === "applied") {
    const { data, error } = await sb.rpc("scd_is_role_creator", { p_organization_id: organizationId });
    return !error && data === true;
  }
  const { data: me } = await sb.auth.getUser();
  const userId = me.user?.id ?? null;
  if (!userId) return false;
  const { data: links } = await sb
    .from("scd_identity_links")
    .select("person_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .neq("link_state", "REVOKED");
  const personIds = ((links ?? []) as Array<{ person_id: string }>).map((l) => l.person_id);
  if (!personIds.length) return false;
  const { data: roles } = await sb
    .from("scd_structure_roles")
    .select("role_label,active,valid_to")
    .eq("organization_id", organizationId)
    .in("person_id", personIds);
  const today = new Date().toISOString().slice(0, 10);
  const labels = ((roles ?? []) as Array<{ role_label: string; active: boolean; valid_to: string | null }>)
    .filter((r) => r.active && (!r.valid_to || r.valid_to >= today))
    .map((r) => r.role_label);
  return isRoleCreatorByRoles(labels);
}

/** Is r112 applied (scd_role_templates.position_code)? Probed only after r111 answered "applied". */
export async function positionLinkEngine(sb: Sb | null, roles: GrantsEngine): Promise<GrantsEngine> {
  if (!sb || roles !== "applied") return roles === "not-applied" ? "not-applied" : "unknown";
  try {
    const { error } = await sb.from("scd_role_templates").select("position_code", { head: true, count: "exact" }).limit(1);
    if (!error) return "applied";
    return isMissingObjectError(error) ? "not-applied" : "unknown";
  } catch {
    return "unknown";
  }
}

/** Positions for the editor: the live r138 board when readable (codes, labels, status), else the repo catalogue. */
async function readPositions(sb: Sb | null, organizationId: string | null, current: readonly RoleTemplate[]): Promise<PositionOption[]> {
  const linked = current.map((t) => t.positionCode);
  if (sb && organizationId) {
    const { data, error } = await sb.rpc("scd_position_catalog_board", { p_organization_id: organizationId });
    const board = !error ? parseCatalogBoard(data) : null;
    if (board) return positionChoices(board.positions.map((p) => ({ code: p.code, label: p.label, group: p.group, status: p.status })), linked);
  }
  const { repoCatalog } = await import("./position-catalog.data");
  return positionChoices(repoCatalog().map((p) => ({ code: p.code, label: p.label, group: p.group, status: p.status })), linked);
}

export async function readTemplates(sb: Sb, organizationId: string, withPosition = false): Promise<RoleTemplate[] | null> {
  const columns: string = `id,platform,label,description,active,updated_at,${withPosition ? "position_code," : ""}scd_role_template_grants(section_code,level,perimeter)`;
  const { data, error } = await sb
    .from("scd_role_templates")
    .select(columns)
    .eq("organization_id", organizationId)
    .order("platform")
    .order("label");
  if (error) return null;
  return ((data ?? []) as unknown as TemplateDb[]).map(toTemplate).filter((t): t is RoleTemplate => t !== null);
}

export const getRoleTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<RoleTemplatesData> => {
  const { gate, org, isDirection, actorEmail, sb } = await context();
  const base: RoleTemplatesData = {
    gate,
    connected: false,
    engine: "unknown",
    actor: { isDirection, isCreator: false, email: actorEmail },
    templates: [],
    readError: false,
    positionLink: "unknown",
    positions: [],
  };
  // Closed gate: nothing (not even the position catalogue) is serialised.
  if (gate.view !== "page") return base;
  if (!sb || !org) return { ...base, positions: await readPositions(null, null, []) };
  const engine = await roleTemplatesEngine(sb);
  const positionLink = await positionLinkEngine(sb, engine);
  const isCreator = isDirection && (await creatorOf(sb, org.organizationId, engine));
  const templates = engine === "applied" && isDirection ? await readTemplates(sb, org.organizationId, positionLink === "applied") : [];
  return {
    ...base,
    connected: true,
    engine,
    actor: { isDirection, isCreator, email: actorEmail },
    templates: templates ?? [],
    readError: templates === null,
    positionLink,
    positions: await readPositions(sb, org.organizationId, templates ?? []),
  };
});

/** Organigram positions (r138 position_code) the person holds today; [] when unknown. Codes only. */
async function personPositions(sb: Sb, organizationId: string, personId: string): Promise<string[]> {
  const { data, error } = await sb
    .from("scd_structure_roles")
    .select("position_code,active,valid_to")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .not("position_code", "is", null);
  if (error) return [];
  const today = new Date().toISOString().slice(0, 10);
  return ((data ?? []) as Array<{ position_code: string | null; active: boolean; valid_to: string | null }>)
    .filter((r) => r.active && (!r.valid_to || r.valid_to >= today) && typeof r.position_code === "string")
    .map((r) => r.position_code as string);
}

/**
 * Active roles for the person checklist ("Carica un ruolo"); empty while r111 is not applied or for non-Direzione.
 * With r112 applied and a person id, `suggested` lists the roles meant for one of that person's positions.
 */
export const getActiveRoleTemplates = createServerFn({ method: "GET" })
  .inputValidator((d: { personId?: string } | undefined) => z.object({ personId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<{ engine: GrantsEngine; templates: RoleTemplate[]; readError: boolean; suggested: string[] }> => {
    const { gate, org, isDirection, sb } = await context();
    if (gate.view !== "page" || !sb || !org || !isDirection) return { engine: "unknown", templates: [], readError: false, suggested: [] };
    const engine = await roleTemplatesEngine(sb);
    if (engine !== "applied") return { engine, templates: [], readError: false, suggested: [] };
    const withPosition = (await positionLinkEngine(sb, engine)) === "applied";
    const templates = await readTemplates(sb, org.organizationId, withPosition);
    const active = (templates ?? []).filter((t) => t.active);
    const suggested = withPosition && data.personId ? suggestedTemplateIds(active, await personPositions(sb, org.organizationId, data.personId)) : [];
    return { engine, templates: active, readError: templates === null, suggested };
  });

const GrantInput = z.object({
  sectionCode: z.string().regex(/^[a-z0-9-]{2,40}$/),
  level: z.enum(LEVELS),
  perimeter: z.enum(PERIMETERS),
});
const Label = z.string().max(120);
const PositionCode = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60).nullable();
const Note = z.string().max(300);

type Result = { ok: boolean; message: string; id?: string };

async function writeContext(): Promise<{ ok: false; message: string } | { ok: true; sb: Sb; organizationId: string }> {
  const { gate, org, isDirection, sb } = await context();
  if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
  if (!isDirection) return { ok: false, message: "Solo il Presidente e il Direttore Generale creano e modificano i ruoli." };
  if ((await roleTemplatesEngine(sb)) !== "applied") return { ok: false, message: ROLES_NOT_APPLIED };
  // Defence in depth: the database checks it again inside every write function.
  if (!(await creatorOf(sb, org.organizationId, "applied"))) return { ok: false, message: "Solo il Presidente e il Direttore Generale creano e modificano i ruoli." };
  return { ok: true, sb, organizationId: org.organizationId };
}

/**
 * r112: links the role to an organigram position (or removes the link with null) after the role itself was saved.
 * Returns the extra sentence for the message; "" when nothing changed. Never fails the role save.
 */
async function linkPosition(sb: Sb, organizationId: string, templateId: string, positionCode: string | null | undefined, note: string): Promise<string> {
  if (positionCode === undefined) return "";
  if ((await positionLinkEngine(sb, "applied")) !== "applied") return positionCode ? ` ${POSITIONS_NOT_APPLIED}` : "";
  const { data, error } = await sb.rpc("scd_set_role_template_position", {
    p_organization_id: organizationId,
    p_template_id: templateId,
    p_position_code: positionCode,
    p_note: note.trim() || null,
  });
  if (error) return ` Posizione non collegata: ${explainRoleError(error, POSITIONS_NOT_APPLIED)}`;
  if (data !== true) return "";
  return positionCode ? " Posizione dell'organigramma collegata." : " Collegamento alla posizione tolto.";
}

/** Creates a role on a platform in one call: empty (no sections) or with the sections chosen on screen. */
export const createRoleTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { platform: string; label: string; description: string; grants: Array<z.infer<typeof GrantInput>>; positionCode?: string | null }) =>
    z.object({ platform: z.enum(PLATFORMS), label: Label, description: Note, grants: z.array(GrantInput).max(60), positionCode: PositionCode.optional() }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const w = await writeContext();
    if (!w.ok) return w;
    const problem = templateProblem(data.platform, data.grants);
    if (problem) return { ok: false, message: problem };
    const { data: id, error } = await w.sb.rpc("scd_create_role_template", {
      p_organization_id: w.organizationId,
      p_platform: data.platform,
      p_label: data.label,
      p_description: data.description,
      p_grants: data.grants.map((g) => ({ section: g.sectionCode, level: g.level, perimeter: g.perimeter })),
    });
    if (error || typeof id !== "string") return { ok: false, message: error ? explainRoleError(error, ROLES_NOT_APPLIED) : "Creazione non riuscita, riprova." };
    const n = data.grants.length;
    const extra = data.positionCode ? await linkPosition(w.sb, w.organizationId, id, data.positionCode, "") : "";
    return { ok: true, id, message: (n ? `Ruolo creato: ${n} ${n === 1 ? "sezione" : "sezioni"}.` : "Ruolo vuoto creato: tutte le sezioni sono su “Nessuno”.") + extra };
  });

export const saveRoleTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; platform: string; label: string; description: string; grants: Array<z.infer<typeof GrantInput>>; note: string; positionCode?: string | null }) =>
    z.object({ id: z.string().uuid(), platform: z.enum(PLATFORMS), label: Label, description: Note, grants: z.array(GrantInput).max(60), note: Note, positionCode: PositionCode.optional() }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const w = await writeContext();
    if (!w.ok) return w;
    const problem = templateProblem(data.platform, data.grants);
    if (problem) return { ok: false, message: problem };
    const { data: n, error } = await w.sb.rpc("scd_set_role_template", {
      p_organization_id: w.organizationId,
      p_template_id: data.id,
      p_label: data.label,
      p_description: data.description,
      p_grants: data.grants.map((g) => ({ section: g.sectionCode, level: g.level, perimeter: g.perimeter })),
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explainRoleError(error, ROLES_NOT_APPLIED) };
    const count = typeof n === "number" ? n : data.grants.length;
    const extra = await linkPosition(w.sb, w.organizationId, data.id, data.positionCode, data.note);
    return { ok: true, id: data.id, message: (count ? `Ruolo salvato: ${count} ${count === 1 ? "sezione" : "sezioni"}.` : "Ruolo salvato vuoto: tutte le sezioni su “Nessuno”.") + extra };
  });

export const setRoleTemplateActive = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; active: boolean; note: string }) => z.object({ id: z.string().uuid(), active: z.boolean(), note: Note }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const w = await writeContext();
    if (!w.ok) return w;
    const { data: changed, error } = await w.sb.rpc("scd_set_role_template_active", {
      p_organization_id: w.organizationId,
      p_template_id: data.id,
      p_active: data.active,
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explainRoleError(error, ROLES_NOT_APPLIED) };
    if (changed !== true) return { ok: true, id: data.id, message: "Nessun cambiamento." };
    return { ok: true, id: data.id, message: data.active ? "Ruolo riattivato." : "Ruolo disattivato: non si può più caricare sulle persone. Le abilitazioni già date restano finché la Direzione non le toglie." };
  });
