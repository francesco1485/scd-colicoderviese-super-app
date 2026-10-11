/**
 * Personalised access on the server (r65). Area gate "accessi" (Direzione, Segreteria) + the database guard
 * (scd_access_admin_guard) on every write. Nothing is cached.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { auditSummary, isDbRoleValue, type Account } from "./access-admin";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { DB_ROLES, type DbRole } from "./session";
import { serverSupabase } from "./supabase.server";

export interface AuditEntry {
  id: number;
  createdAt: string;
  action: string;
  actorEmail: string | null;
  targetEmail: string | null;
  targetPerson: string | null;
  /** Italian one-line summary of the change (computed on the server). */
  summary: string;
  note: string;
}

export interface AccessAdminData {
  gate: WorkAreaGate;
  connected: boolean;
  actorRole: DbRole | null;
  actorEmail: string | null;
  accounts: Account[];
  audit: AuditEntry[];
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("accessi", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  const actorRole = org && isDbRoleValue(org.role) ? org.role : null;
  const sb = s.configured && s.user ? serverSupabase() : null;
  return { gate, org, actorRole, actorEmail: s.user?.email?.toLowerCase() ?? null, sb };
}

type AccountRow = { user_id: string; email: string; role: string; positions: string[] | null; active: boolean; last_sign_in_at: string | null; created_at: string; persons: Account["persons"] | null };
type AuditRow = { id: number; created_at: string; action: string; actor_email: string | null; target_email: string | null; target_person: string | null; detail: Record<string, unknown> | null };

export const getAccessAdmin = createServerFn({ method: "GET" }).handler(async (): Promise<AccessAdminData> => {
  const { gate, org, actorRole, actorEmail, sb } = await context();
  const base: AccessAdminData = { gate, connected: false, actorRole, actorEmail, accounts: [], audit: [] };
  if (gate.view !== "page" || !sb || !org) return base;
  const [acc, aud] = await Promise.all([
    sb.rpc("scd_admin_accounts", { p_organization_id: org.organizationId }),
    sb.rpc("scd_admin_audit", { p_organization_id: org.organizationId, p_limit: 60 }),
  ]);
  if (acc.error) return base;
  return {
    ...base,
    connected: true,
    accounts: ((acc.data ?? []) as AccountRow[]).map((r) => ({
      userId: r.user_id,
      email: r.email,
      role: isDbRoleValue(r.role) ? r.role : "USER_BASE",
      positions: r.positions ?? [],
      active: r.active,
      lastSignInAt: r.last_sign_in_at,
      createdAt: r.created_at,
      persons: r.persons ?? [],
    })),
    audit: ((aud.data ?? []) as AuditRow[]).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      action: r.action,
      actorEmail: r.actor_email,
      targetEmail: r.target_email,
      targetPerson: r.target_person,
      summary: auditSummary(r.action, r.detail ?? {}),
      note: typeof r.detail?.["note"] === "string" ? (r.detail["note"] as string) : "",
    })),
  };
});

const RoleEnum = z.enum(DB_ROLES);

function explain(error: { code?: string; message: string }): string {
  const m = error.message;
  if (m.includes("cannot edit own access")) return "Non puoi modificare il tuo accesso: chiedilo a un'altra persona della Direzione.";
  if (m.includes("Direzione only")) return "Solo la Direzione può dare o togliere ruoli e aree d'ufficio, o modificare un account d'ufficio.";
  if (m.includes("last Direzione")) return "Deve restare almeno un accesso Direzione attivo.";
  if (m.includes("unknown position")) return "Area non riconosciuta.";
  if (m.includes("invalid email")) return "E-mail non valida.";
  if (error.code === "42501") return "Non hai i permessi per questa modifica.";
  return "Modifica non riuscita, riprova.";
}

export const setAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; role: DbRole; positions: string[]; active: boolean; note: string }) =>
    z.object({ userId: z.string().uuid(), role: RoleEnum, positions: z.array(z.string().regex(/^[a-z-]{3,40}$/)).max(20), active: z.boolean(), note: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    const { error } = await sb.rpc("scd_admin_set_access", {
      p_organization_id: org.organizationId,
      p_user_id: data.userId,
      p_role: data.role,
      p_positions: data.positions,
      p_active: data.active,
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: data.active ? "Accesso aggiornato: vale dal prossimo caricamento della pagina." : "Accesso sospeso." };
  });

export const grantPersonAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { personId: string; email: string; role: DbRole; positions: string[]; note: string }) =>
    z.object({ personId: z.string().uuid(), email: z.string().trim().toLowerCase().email().max(120), role: RoleEnum, positions: z.array(z.string().regex(/^[a-z-]{3,40}$/)).max(20), note: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    const { error } = await sb.rpc("scd_admin_grant_person_access", {
      p_organization_id: org.organizationId,
      p_person_id: data.personId,
      p_email: data.email,
      p_role: data.role,
      p_positions: data.positions,
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: "Accesso attivo: la persona entra da \"Accedi\" con questa e-mail." };
  });

export const revokeLink = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; personId: string; note: string }) =>
    z.object({ userId: z.string().uuid(), personId: z.string().uuid(), note: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    const { error } = await sb.rpc("scd_admin_revoke_link", { p_organization_id: org.organizationId, p_user_id: data.userId, p_person_id: data.personId, p_note: data.note.trim() || null });
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: "Collegamento revocato: quell'accesso non vede più questa persona." };
  });
