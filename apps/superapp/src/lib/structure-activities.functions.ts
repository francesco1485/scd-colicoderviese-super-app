/**
 * "Attività in struttura" on the server (staged migration r135 NOT APPLIED).
 *
 * The page gate is the shared work-area gate (registry area "struttura"). The quadro of the trainings comes from
 * getTrainingQuadro (server only, UD-100) and the home matches from the calendar snapshot. r135 is read with the
 * caller's own Supabase session (publishable key + cookies): scd_structure_week checks roles and positions by itself,
 * nothing here trusts the browser. Per site (UD-156): Dervio rows only for Direzione, Segreteria, presidente, DG,
 * coordinatore attività sportiva and responsabile attività di base; the answer says which sites the caller reads. Until r135 is applied every read fails closed: `ready: false`, the page says
 * "Funzione in preparazione: serve applicare r135" and the shift KPIs stay unknown, never zero. Nothing is written.
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { romeParts } from "./home-week";
import { stagingPreviewEnabled } from "./impianti-access";
import { loadCalendar, type PublicEvent, type TrainingSlot } from "./public-snapshots";
import { getTrainingQuadro } from "./quadro.functions";
import { machineMissing } from "./request-machine.functions";
import {
  parseStructureWeekResult,
  structureReadableSites,
  structureWindow,
  type StructureActivity,
  type StructureSite,
} from "./structure-activities";
import { serverSupabase } from "./supabase.server";

export interface StructureBoard {
  gate: WorkAreaGate;
  /** Club day (Europe/Rome) on the server when the board was read. */
  today: string;
  /** False without Supabase keys, session or organization (e.g. the staging preview). */
  connected: boolean;
  /** False while r135 is not applied: activities is then null. */
  ready: boolean;
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
}

export const STRUCTURE_OFF = "Funzione in preparazione: serve applicare r135.";

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
    activities: null,
    readableSites: [],
    error: null,
    slots: [],
    quadroUTC: "",
    events: [],
    calendarModifiedAt: "",
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
  if (!sb || !org) return { ...open, readableSites: mirror };
  const win = structureWindow(base.today);
  const { data, error } = await sb.rpc("scd_structure_week", { p_organization_id: org.organizationId, p_from: win.from, p_to: win.to });
  if (machineMissing(error)) return { ...open, connected: true, readableSites: mirror };
  if (error) {
    // 42501: the database says the caller reads no site; any other failure keeps the session rule.
    return { ...open, connected: true, ready: true, readableSites: error.code === "42501" ? [] : mirror, error: structureReadError(error) };
  }
  const read = parseStructureWeekResult(data);
  return { ...open, connected: true, ready: true, activities: read.activities, readableSites: read.readableSites };
});
