/**
 * Catalogo ruoli on the server (migration r138, STAGED until "applica r138").
 *
 * Read: the page gate is the shared work-area gate (registry area "organigramma"). The catalogue is read with the
 * caller's own Supabase session (scd_position_catalog_board checks the reader itself, nothing here trusts the
 * browser). When the function is missing (r138 not applied) or the read fails, the page shows the repo catalogue
 * (config/scd-position-catalog.v1.json) with holders UNKNOWN ("da collegare"), never zero. Counts only, no names.
 *
 * Write: "Crea ruolo nuovo" and the approval of a new role go through scd_create_custom_position /
 * scd_set_position_status, which allow only the Presidente and the Direttore generale (r111 scd_is_role_creator) and
 * write scd_access_audit. While r138 is missing a creator (r111 answers) reads "Creazione non ancora attiva"; anybody
 * else sees no entry at all. Nothing is optimistic: after a write the page reloads from the database. Server side,
 * only error codes are logged, never messages or details.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import {
  CATALOG_WRITE_DENIED,
  CATALOG_WRITE_FAILED,
  CATALOG_WRITE_NO_SESSION,
  CATALOG_WRITE_OFF,
  DRAFT_MESSAGES,
  POSITION_GROUPS,
  ROLE_KINDS,
  createState,
  parseCatalogBoard,
  validateCustomDraft,
  type CatalogPosition,
  type CatalogSource,
  type CatalogWriteOutcome,
  type CreateState,
} from "./position-catalog";
import { machineMissing } from "./request-machine.functions";
import { serverSupabase } from "./supabase.server";

export interface PositionCatalogView {
  source: CatalogSource;
  positions: CatalogPosition[];
  create: CreateState;
  /** Message of a failed read (role="alert"); null otherwise. */
  error: string | null;
}

export const CATALOG_READ_DENIED = "Lettura del catalogo non riuscita: serve un accesso Direzione, Segreteria o dell'organigramma.";
export const CATALOG_READ_FAILED = "Lettura del catalogo non riuscita, riprova più tardi.";

type DbError = { code?: string | null; message?: string | null } | null | undefined;
const missing = (e: NonNullable<DbError>) => machineMissing({ code: e.code ?? undefined, message: e.message ?? "" } as Parameters<typeof machineMissing>[0]);

/** Club organization of the caller: the one where the session is Direzione, then office, then the first one. */
export function catalogOrganization<M extends { organizationId: string; role: string }>(memberships: readonly M[]): M | null {
  return (
    memberships.find((m) => m.role === "DIRECTION") ??
    memberships.find((m) => m.role === "SECRETARIAT" || m.role === "REGISTRATION") ??
    memberships[0] ??
    null
  );
}

/** View of a failed or missing board read: the repo catalogue with unknown holders. */
export function catalogFallback(
  repo: CatalogPosition[],
  error: DbError,
  creator: boolean | null,
): PositionCatalogView {
  const positions = repo.map((p) => ({ ...p, holders: null }));
  if (error && missing(error)) return { source: "not-applied", positions, create: createState("not-applied", creator), error: null };
  if (error) {
    if (error.code !== "42501") console.warn(`[catalogo-ruoli] scd_position_catalog_board non riuscita: codice ${error.code || "unknown"}`);
    return { source: "unavailable", positions, create: "off", error: error.code === "42501" ? CATALOG_READ_DENIED : CATALOG_READ_FAILED };
  }
  return { source: "unavailable", positions, create: "off", error: null };
}

export const getPositionCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<PositionCatalogView> => {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("organigramma", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  // Closed gate: nothing of the catalogue is serialised.
  if (gate.view !== "page") return { source: "unavailable", positions: [], create: "off", error: null };
  const { repoCatalog } = await import("./position-catalog.data");
  const repo = repoCatalog();
  const org = catalogOrganization(s.memberships);
  const sb = s.configured && s.user && org ? serverSupabase() : null;
  if (!sb || !org) return catalogFallback(repo, null, null);
  const { data, error } = await sb.rpc("scd_position_catalog_board", { p_organization_id: org.organizationId });
  if (error) {
    let creator: boolean | null = null;
    if (missing(error)) {
      // r138 missing: r111 (applied) still says whether this person creates roles, so the entry can say "non ancora attiva".
      const probe = await sb.rpc("scd_is_role_creator", { p_organization_id: org.organizationId });
      creator = probe.error ? null : probe.data === true;
    }
    return catalogFallback(repo, error, creator);
  }
  const board = parseCatalogBoard(data);
  if (!board) {
    console.warn("[catalogo-ruoli] scd_position_catalog_board: risposta non valida");
    return { ...catalogFallback(repo, null, null), error: CATALOG_READ_FAILED };
  }
  return { source: "live", positions: board.positions, create: createState("live", board.canCreate), error: null };
});

/* ------------------------------------------------------------------ writes (Presidente / Direttore generale) */

async function writeContext() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("organigramma", { preview: false, sessionRoles: roles });
  const org = catalogOrganization(s.memberships);
  if (gate.view !== "page" || !s.configured || !s.user || !org) return null;
  const sb = serverSupabase();
  return sb ? { sb, org } : null;
}

/** Outcome of scd_create_custom_position in plain words. */
export function createOutcome(data: unknown, error: DbError): CatalogWriteOutcome {
  if (error) {
    if (missing(error)) return { ok: false, message: CATALOG_WRITE_OFF };
    if (error.code === "42501") return { ok: false, message: CATALOG_WRITE_DENIED };
    if (error.code === "23505") return { ok: false, message: DRAFT_MESSAGES.exists };
    if (error.code === "22023") return { ok: false, message: `${DRAFT_MESSAGES.label} ${DRAFT_MESSAGES.contact}` };
    console.warn(`[catalogo-ruoli] creazione non riuscita: codice ${error.code || "unknown"}`);
    return { ok: false, message: CATALOG_WRITE_FAILED };
  }
  if (typeof data !== "string" || !data.startsWith("custom-")) return { ok: false, message: CATALOG_WRITE_FAILED };
  return { ok: true, message: "Ruolo creato: resta «da approvare» finché il Presidente o il Direttore generale non lo approva." };
}

/** Outcome of scd_set_position_status in plain words. */
export function statusOutcome(status: "ACTIVE" | "RETIRED", data: unknown, error: DbError): CatalogWriteOutcome {
  if (error) {
    if (missing(error)) return { ok: false, message: CATALOG_WRITE_OFF };
    if (error.code === "42501") return { ok: false, message: CATALOG_WRITE_DENIED };
    if (error.code === "22023") return { ok: false, message: "Il ruolo ha ancora titolari: prima chiudi le assegnazioni nel registro." };
    if (error.code === "P0002") return { ok: false, message: "Ruolo non trovato: ricarica la pagina." };
    console.warn(`[catalogo-ruoli] cambio stato non riuscito: codice ${error.code || "unknown"}`);
    return { ok: false, message: CATALOG_WRITE_FAILED };
  }
  if (data === false) return { ok: true, message: "Nessuna modifica da salvare." };
  return { ok: true, message: status === "ACTIVE" ? "Ruolo approvato: ora si può assegnare." : "Ruolo ritirato: non si assegna più, lo storico resta." };
}

const createSchema = z.object({
  label: z.string().max(200),
  group: z.enum(POSITION_GROUPS),
  roleKind: z.enum(ROLE_KINDS),
  description: z.string().max(400),
});
export type CreatePositionInput = z.input<typeof createSchema>;

export const createCustomPosition = createServerFn({ method: "POST" })
  .inputValidator((d: CreatePositionInput) => createSchema.parse(d))
  .handler(async ({ data }): Promise<CatalogWriteOutcome> => {
    const v = validateCustomDraft(data);
    if (!v.ok) return { ok: false, message: DRAFT_MESSAGES[v.code] };
    const ctx = await writeContext();
    if (!ctx) return { ok: false, message: CATALOG_WRITE_NO_SESSION };
    const { data: out, error } = await ctx.sb.rpc("scd_create_custom_position", {
      p_organization_id: ctx.org.organizationId,
      p_label: v.value.label,
      p_group: v.value.group,
      p_role_kind: v.value.roleKind,
      p_description: v.value.description,
    });
    return createOutcome(out, error);
  });

const statusSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60),
  status: z.enum(["ACTIVE", "RETIRED"]),
});
export type PositionStatusInput = z.input<typeof statusSchema>;

export const setPositionStatus = createServerFn({ method: "POST" })
  .inputValidator((d: PositionStatusInput) => statusSchema.parse(d))
  .handler(async ({ data }): Promise<CatalogWriteOutcome> => {
    const ctx = await writeContext();
    if (!ctx) return { ok: false, message: CATALOG_WRITE_NO_SESSION };
    const { data: out, error } = await ctx.sb.rpc("scd_set_position_status", {
      p_organization_id: ctx.org.organizationId,
      p_code: data.code,
      p_status: data.status,
      p_note: null,
    });
    return statusOutcome(data.status, out, error);
  });
