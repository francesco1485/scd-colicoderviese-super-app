/**
 * Role templates on the server (r111, Direzione 15/10/2026). Same gate as /direzione/accessi; reading is for the
 * Direzione, writing only for the Presidente and the Direttore Generale, enforced again by the database
 * (scd_is_role_creator inside every write function). Nothing is cached.
 *
 * Fail-closed: while r111 is not applied the page shows the platforms, the empty role and the models as a preview,
 * but creating, editing and deactivating answer "Da attivare" and nothing is written anywhere.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { LEVELS, PERIMETERS, isLevel, isPerimeter } from "./person-grants";
import { isMissingObjectError, type GrantsEngine } from "./person-grants.server";
import {
  PLATFORMS,
  explainRoleError,
  isPlatform,
  isRoleCreatorByRoles,
  presetGrants,
  sortGrants,
  templateProblem,
  type RoleTemplate,
  type TemplateGrant,
} from "./role-templates";
import { serverSupabase } from "./supabase.server";

export const ROLES_NOT_APPLIED = "Da attivare: serve «applica r111» di Francesco. Nessun ruolo è stato salvato.";

export interface RoleTemplatesData {
  gate: WorkAreaGate;
  /** False without a database session (staging preview, signed out). */
  connected: boolean;
  /** r111 applied on the database? Writes only when "applied". */
  engine: GrantsEngine;
  actor: { isDirection: boolean; isCreator: boolean; email: string | null };
  templates: RoleTemplate[];
}

type Sb = NonNullable<ReturnType<typeof serverSupabase>>;
type TemplateDb = {
  id: string;
  platform: string;
  label: string;
  description: string | null;
  active: boolean;
  updated_at: string;
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
  return { id: r.id, platform: r.platform, label: r.label, description: r.description ?? "", active: r.active, grants: sortGrants(grants), updatedAt: r.updated_at };
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

export async function readTemplates(sb: Sb, organizationId: string): Promise<RoleTemplate[]> {
  const { data, error } = await sb
    .from("scd_role_templates")
    .select("id,platform,label,description,active,updated_at,scd_role_template_grants(section_code,level,perimeter)")
    .eq("organization_id", organizationId)
    .order("platform")
    .order("label");
  if (error) return [];
  return ((data ?? []) as TemplateDb[]).map(toTemplate).filter((t): t is RoleTemplate => t !== null);
}

export const getRoleTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<RoleTemplatesData> => {
  const { gate, org, isDirection, actorEmail, sb } = await context();
  const base: RoleTemplatesData = { gate, connected: false, engine: "unknown", actor: { isDirection, isCreator: false, email: actorEmail }, templates: [] };
  if (gate.view !== "page" || !sb || !org) return base;
  const engine = await roleTemplatesEngine(sb);
  const isCreator = isDirection && (await creatorOf(sb, org.organizationId, engine));
  return {
    ...base,
    connected: true,
    engine,
    actor: { isDirection, isCreator, email: actorEmail },
    templates: engine === "applied" && isDirection ? await readTemplates(sb, org.organizationId) : [],
  };
});

/** Active roles for the person checklist ("Carica un ruolo"); empty while r111 is not applied or for non-Direzione. */
export const getActiveRoleTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<{ engine: GrantsEngine; templates: RoleTemplate[] }> => {
  const { gate, org, isDirection, sb } = await context();
  if (gate.view !== "page" || !sb || !org || !isDirection) return { engine: "unknown", templates: [] };
  const engine = await roleTemplatesEngine(sb);
  if (engine !== "applied") return { engine, templates: [] };
  return { engine, templates: (await readTemplates(sb, org.organizationId)).filter((t) => t.active) };
});

const GrantInput = z.object({
  sectionCode: z.string().regex(/^[a-z0-9-]{2,40}$/),
  level: z.enum(LEVELS),
  perimeter: z.enum(PERIMETERS),
});
const Label = z.string().max(120);
const Note = z.string().max(300);

type Result = { ok: boolean; message: string; id?: string };

async function writeContext(): Promise<{ ok: false; message: string } | { ok: true; sb: Sb; organizationId: string }> {
  const { gate, org, isDirection, sb } = await context();
  if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
  if (!isDirection) return { ok: false, message: "Solo il Presidente e il Direttore Generale creano e modificano i ruoli." };
  if ((await roleTemplatesEngine(sb)) !== "applied") return { ok: false, message: ROLES_NOT_APPLIED };
  return { ok: true, sb, organizationId: org.organizationId };
}

/** Creates a role on a platform: always empty first; with a model, the model's sections are saved right after. */
export const createRoleTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { platform: string; label: string; description: string; preset: string | null }) =>
    z.object({ platform: z.enum(PLATFORMS), label: Label, description: Note, preset: z.string().regex(/^[a-z0-9-]{2,40}$/).nullable() }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const w = await writeContext();
    if (!w.ok) return w;
    const grants = presetGrants(data.platform, data.preset);
    const problem = templateProblem(data.platform, grants);
    if (problem) return { ok: false, message: problem };
    const { data: id, error } = await w.sb.rpc("scd_create_role_template", {
      p_organization_id: w.organizationId,
      p_platform: data.platform,
      p_label: data.label,
      p_description: data.description,
    });
    if (error || typeof id !== "string") return { ok: false, message: error ? explainRoleError(error, ROLES_NOT_APPLIED) : "Creazione non riuscita, riprova." };
    if (grants.length) {
      const { error: e2 } = await w.sb.rpc("scd_set_role_template", {
        p_organization_id: w.organizationId,
        p_template_id: id,
        p_label: data.label,
        p_description: data.description,
        p_grants: grants.map((g) => ({ section: g.sectionCode, level: g.level, perimeter: g.perimeter })),
        p_note: `modello ${data.preset}`,
      });
      if (e2) return { ok: false, id, message: `Ruolo creato vuoto; il modello non è stato copiato: ${explainRoleError(e2, ROLES_NOT_APPLIED)}` };
    }
    return { ok: true, id, message: grants.length ? "Ruolo creato dal modello: controlla le sezioni e salva se cambi qualcosa." : "Ruolo vuoto creato: tutte le sezioni sono su “Nessuno”." };
  });

export const saveRoleTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; platform: string; label: string; description: string; grants: Array<z.infer<typeof GrantInput>>; note: string }) =>
    z.object({ id: z.string().uuid(), platform: z.enum(PLATFORMS), label: Label, description: Note, grants: z.array(GrantInput).max(60), note: Note }).parse(d))
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
    return { ok: true, id: data.id, message: count ? `Ruolo salvato: ${count} ${count === 1 ? "sezione" : "sezioni"}.` : "Ruolo salvato vuoto: tutte le sezioni su “Nessuno”." };
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
