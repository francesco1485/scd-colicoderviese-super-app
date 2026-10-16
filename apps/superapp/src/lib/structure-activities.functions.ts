/**
 * "Attività in struttura" on the server (migration r135, APPLIED on SCD PULSE 16/10/2026).
 *
 * The page gate is the shared work-area gate (registry area "struttura"). The quadro of the trainings comes from
 * getTrainingQuadro (server only, UD-100) and the home matches from the calendar snapshot. r135 is read with the
 * caller's own Supabase session (publishable key + cookies): scd_structure_week checks roles and positions by itself,
 * nothing here trusts the browser. Per site (UD-156): Dervio rows only for Direzione, Segreteria, presidente, DG,
 * coordinatore attività sportiva and responsabile attività di base; the answer says which sites the caller reads. Every
 * read fails closed. Function not reachable (machineMissing): `ready: false`, offReason "unreachable", the page says
 * "Registro non raggiungibile, riprova più tardi". No session or no club organization: `ready: false`, offReason
 * "not-linked", the page says "Accesso al registro non collegato al tuo profilo club". A malformed answer is a read
 * error (activities null). Shift KPIs stay unknown in every such case, never zero.
 *
 * Writing (migration r137, STAGED until "applica r137"): create, edit and cancel go through SECURITY DEFINER functions
 * that allow only the Direzione, the Presidente and the Direttore generale (UD-159) and put an in-app notice for the
 * Segreteria in the work queue for every change (UD-156). The page asks scd_structure_write_access first: when that
 * function is missing the form stays closed and writers read "Scrittura non ancora attiva" (fail closed). Nothing is
 * optimistic: after a write the page reloads the week from the database.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { romeParts } from "./home-week";
import { stagingPreviewEnabled } from "./impianti-access";
import { loadCalendar, type PublicEvent, type TrainingSlot } from "./public-snapshots";
import { getTrainingQuadro } from "./quadro.functions";
import { machineMissing } from "./request-machine.functions";
import {
  STRUCTURE_AREAS,
  STRUCTURE_KINDS,
  STRUCTURE_NOTICED,
  STRUCTURE_SITES,
  STRUCTURE_WRITE_DENIED,
  STRUCTURE_WRITE_FAILED,
  STRUCTURE_WRITE_MESSAGES,
  STRUCTURE_WRITE_NO_SESSION,
  STRUCTURE_WRITE_OFF,
  isStructureWriteCode,
  type StructureWriteOutcome,
  parseStructureWeekResult,
  parseWriteAccess,
  structureCanWrite,
  structureReadableSites,
  structureWindow,
  structureWriteState,
  validateCancelReason,
  validateStructureDraft,
  type StructureActivity,
  type StructureSite,
  type StructureWriteProbe,
  type StructureWriteState,
} from "./structure-activities";
import { serverSupabase } from "./supabase.server";

export interface StructureBoard {
  gate: WorkAreaGate;
  /** Club day (Europe/Rome) on the server when the board was read. */
  today: string;
  /** False without Supabase keys, session or organization (e.g. the staging preview). */
  connected: boolean;
  /** False when the registry was not read (see offReason): activities is then null. */
  ready: boolean;
  /** Why the registry was not read: "unreachable" (function missing on the database) or "not-linked" (no session or organization). */
  offReason: StructureOffReason | null;
  activities: StructureActivity[] | null;
  /**
   * Sites whose r135 rows the caller reads (UD-156: Dervio only for Direzione, Segreteria, presidente, DG, coordinatore
   * attività sportiva, responsabile attività di base). From scd_structure_week when it answers; otherwise from the
   * same rule on the verified session (structureReadableSites). Empty without a session (preview): Dervio stays
   * reserved. The page opens Colico through the area gate and Dervio only when listed here.
   */
  readableSites: StructureSite[];
  error: string | null;
  slots: TrainingSlot[];
  quadroUTC: string;
  /** Home matches only, from the calendar snapshot. */
  events: PublicEvent[];
  calendarModifiedAt: string;
  /** Whether the page offers the form (r137): only "on" opens it; see structureWriteState. */
  write: StructureWriteState;
}

export type StructureOffReason = "unreachable" | "not-linked";

export const STRUCTURE_UNREACHABLE = "Registro non raggiungibile, riprova più tardi";
export const STRUCTURE_NOT_LINKED = "Accesso al registro non collegato al tuo profilo club";

/** Notice of a board whose registry was not read; null when it was read (errors use the role="alert" message). */
export function structureOffMessage(reason: StructureOffReason | null): string | null {
  if (reason === "unreachable") return STRUCTURE_UNREACHABLE;
  if (reason === "not-linked") return STRUCTURE_NOT_LINKED;
  return null;
}

export const STRUCTURE_DENIED = "Lettura non riuscita: serve un accesso Direzione, Segreteria o responsabile della struttura.";
export const STRUCTURE_READ_FAILED = "Lettura non riuscita, riprova più tardi";

/**
 * Message for a failed read of r135. Only insufficient_privilege (42501, raised by scd_structure_week for a caller
 * who is not a reader) is a permission problem; anything else is a generic failure. Server side, only the error code
 * is logged: never the message, details or hint (they may carry identifiers).
 */
export function structureReadError(error: { code?: string | null } | null | undefined): string {
  const code = typeof error?.code === "string" && error.code ? error.code : "unknown";
  if (code === "42501") return STRUCTURE_DENIED;
  console.warn(`[struttura] scd_structure_week non riuscita: codice ${code}`);
  return STRUCTURE_READ_FAILED;
}

/** Board of a closed gate: nothing read, nothing serialised. */
export function emptyStructureBoard(gate: WorkAreaGate): StructureBoard {
  return {
    gate,
    today: romeParts(new Date().toISOString())?.date ?? new Date().toISOString().slice(0, 10),
    connected: false,
    ready: false,
    offReason: null,
    activities: null,
    readableSites: [],
    error: null,
    slots: [],
    quadroUTC: "",
    events: [],
    calendarModifiedAt: "",
    write: "off",
  };
}

export const getStructureBoard = createServerFn({ method: "GET" }).handler(async (): Promise<StructureBoard> => {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("struttura", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const cal = loadCalendar();
  const base: StructureBoard = { ...emptyStructureBoard(gate), calendarModifiedAt: cal.sourceModifiedAt };
  // Closed gate: nothing of the board is read or serialised, only the access screen renders.
  if (gate.view !== "page") return base;

  const { quadro } = await getTrainingQuadro();
  const open: StructureBoard = {
    ...base,
    slots: quadro.slots,
    quadroUTC: quadro.generatedUTC,
    events: cal.events.filter((e) => e.homeAway === "CASA"),
  };

  const org = s.memberships[0] ?? null;
  // Until the database answers, the same per-site rule on the verified session of the club membership.
  const mirror: StructureSite[] = org
    ? structureReadableSites(
        s.memberships.filter((m) => m.organizationId === org.organizationId).map((m) => m.role),
        new Set(s.roles),
      )
    : [];
  const sb = s.configured && s.user && org ? serverSupabase() : null;
  if (!sb || !org) return { ...open, offReason: "not-linked", readableSites: mirror };
  const sessionWriter = structureCanWrite(
    s.memberships.filter((m) => m.organizationId === org.organizationId).map((m) => m.role),
    new Set(s.roles),
  );
  const win = structureWindow(base.today);
  const [week, access] = await Promise.all([
    sb.rpc("scd_structure_week", { p_organization_id: org.organizationId, p_from: win.from, p_to: win.to }),
    sb.rpc("scd_structure_write_access", { p_organization_id: org.organizationId }),
  ]);
  const write = structureWriteState(sessionWriter, writeProbe(access));
  const { data, error } = week;
  if (machineMissing(error)) return { ...open, connected: true, offReason: "unreachable", readableSites: mirror, write };
  if (error) {
    // 42501: the database says the caller reads no site; any other failure keeps the session rule.
    return { ...open, connected: true, ready: true, readableSites: error.code === "42501" ? [] : mirror, error: structureReadError(error), write };
  }
  const read = parseStructureWeekResult(data);
  // Malformed answer: unknown, never an empty week; the session rule keeps the sites, the page shows one alert.
  if (read.activities === null) {
    console.warn("[struttura] scd_structure_week: risposta non valida");
    return { ...open, connected: true, ready: true, readableSites: mirror, error: STRUCTURE_READ_FAILED, write };
  }
  return { ...open, connected: true, ready: true, activities: read.activities, readableSites: read.readableSites, write };
});

type DbError = { code?: string | null; message?: string | null } | null | undefined;
const missing = (e: NonNullable<DbError>) => machineMissing({ code: e.code ?? undefined, message: e.message ?? "" } as Parameters<typeof machineMissing>[0]);

/** Answer of scd_structure_write_access as a probe: missing function (r137 not applied), failure, or the answer. */
export function writeProbe(res: { data: unknown; error: DbError }): StructureWriteProbe {
  if (res.error) {
    if (missing(res.error)) return "missing";
    console.warn(`[struttura] scd_structure_write_access non riuscita: codice ${res.error.code || "unknown"}`);
    return "error";
  }
  return parseWriteAccess(res.data);
}

/* ------------------------------------------------------------------------------------------------ writing (r137) */

export type StructureWriteAction = "create" | "update" | "cancel";

const DONE: Readonly<Record<StructureWriteAction, string>> = {
  create: "Attività salvata.",
  update: "Modifiche salvate.",
  cancel: "Attività annullata.",
};

/**
 * Outcome of a write RPC in plain words. Missing function: "Scrittura non ancora attiva" (r137 not applied).
 * 42501: not a writer. Any other failure: generic, and only the error code is logged (never message or details).
 * "Segreteria avvisata" is said only when the database confirms the notice (noticed: true).
 */
export function structureWriteOutcome(action: StructureWriteAction, data: unknown, error: DbError): StructureWriteOutcome {
  if (error) {
    if (missing(error)) return { ok: false, message: STRUCTURE_WRITE_OFF };
    if (error.code === "42501") return { ok: false, message: STRUCTURE_WRITE_DENIED };
    console.warn(`[struttura] scrittura ${action} non riuscita: codice ${error.code || "unknown"}`);
    return { ok: false, message: STRUCTURE_WRITE_FAILED };
  }
  const r = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  if (r["ok"] !== true) {
    const code = r["code"];
    return { ok: false, message: isStructureWriteCode(code) ? STRUCTURE_WRITE_MESSAGES[code] : STRUCTURE_WRITE_FAILED };
  }
  if (r["unchanged"] === true) return { ok: true, message: "Nessuna modifica da salvare." };
  return { ok: true, message: DONE[action] + (r["noticed"] === true ? STRUCTURE_NOTICED : "") };
}

const draftSchema = z.object({
  site: z.enum(STRUCTURE_SITES),
  area: z.enum(STRUCTURE_AREAS),
  kind: z.enum(STRUCTURE_KINDS),
  title: z.string().max(200),
  date: z.string().max(10),
  start: z.string().max(5),
  end: z.string().max(5),
  responsibleRole: z.string().max(60).nullable(),
  covered: z.boolean(),
  notes: z.string().max(400).nullable(),
});
const saveSchema = z.object({ id: z.string().uuid().nullable(), draft: draftSchema });
export type SaveStructureInput = z.input<typeof saveSchema>;
const cancelSchema = z.object({ id: z.string().uuid(), reason: z.string().max(400).nullable() });
export type CancelStructureInput = z.input<typeof cancelSchema>;

/** Session, page gate and organization of a write; null when any is missing (the database checks the writer). */
async function writeContext() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("struttura", { preview: false, sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  if (gate.view !== "page" || !s.configured || !s.user || !org) return null;
  const sb = serverSupabase();
  if (!sb) return null;
  return { sb, org, today: romeParts(new Date().toISOString())?.date ?? new Date().toISOString().slice(0, 10) };
}

/** Create (id null) or edit (id) an activity. Checked here and again by the database. */
export const saveStructureActivity = createServerFn({ method: "POST" })
  .inputValidator((d: SaveStructureInput) => saveSchema.parse(d))
  .handler(async ({ data }): Promise<StructureWriteOutcome> => {
    const ctx = await writeContext();
    if (!ctx) return { ok: false, message: STRUCTURE_WRITE_NO_SESSION };
    const v = validateStructureDraft(data.draft, ctx.today);
    if (!v.ok) return { ok: false, message: STRUCTURE_WRITE_MESSAGES[v.code] };
    if (data.id) {
      const { data: out, error } = await ctx.sb.rpc("scd_structure_activity_update", {
        p_organization_id: ctx.org.organizationId,
        p_id: data.id,
        p_activity: v.value,
      });
      return structureWriteOutcome("update", out, error);
    }
    const { data: out, error } = await ctx.sb.rpc("scd_structure_activity_create", { p_organization_id: ctx.org.organizationId, p_activity: v.value });
    return structureWriteOutcome("create", out, error);
  });

/** Cancel an activity (never deleted), with an optional short reason. */
export const cancelStructureActivity = createServerFn({ method: "POST" })
  .inputValidator((d: CancelStructureInput) => cancelSchema.parse(d))
  .handler(async ({ data }): Promise<StructureWriteOutcome> => {
    const ctx = await writeContext();
    if (!ctx) return { ok: false, message: STRUCTURE_WRITE_NO_SESSION };
    const r = validateCancelReason(data.reason);
    if (!r.ok) return { ok: false, message: STRUCTURE_WRITE_MESSAGES[r.code] };
    const { data: out, error } = await ctx.sb.rpc("scd_structure_activity_cancel", {
      p_organization_id: ctx.org.organizationId,
      p_id: data.id,
      p_reason: r.value,
    });
    return structureWriteOutcome("cancel", out, error);
  });
