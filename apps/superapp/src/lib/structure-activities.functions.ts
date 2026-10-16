/**
 * "Attività in struttura" on the server (staged migration r135 NOT APPLIED).
 *
 * The page gate is the shared work-area gate (registry area "struttura"). The quadro of the trainings comes from
 * getTrainingQuadro (server only, UD-100) and the home matches from the calendar snapshot. r135 is read with the
 * caller's own Supabase session (publishable key + cookies): scd_structure_week checks roles and positions by itself,
 * nothing here trusts the browser. Until r135 is applied every read fails closed: `ready: false`, the page says
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
import { parseStructureActivities, structureWindow, type StructureActivity } from "./structure-activities";
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
  error: string | null;
  slots: TrainingSlot[];
  quadroUTC: string;
  /** Home matches only, from the calendar snapshot. */
  events: PublicEvent[];
  calendarModifiedAt: string;
}

export const STRUCTURE_OFF = "Funzione in preparazione: serve applicare r135.";

/** Board of a closed gate: nothing read, nothing serialised. */
export function emptyStructureBoard(gate: WorkAreaGate): StructureBoard {
  return {
    gate,
    today: romeParts(new Date().toISOString())?.date ?? new Date().toISOString().slice(0, 10),
    connected: false,
    ready: false,
    activities: null,
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
  const sb = s.configured && s.user && org ? serverSupabase() : null;
  if (!sb || !org) return open;
  const win = structureWindow(base.today);
  const { data, error } = await sb.rpc("scd_structure_week", { p_organization_id: org.organizationId, p_from: win.from, p_to: win.to });
  if (machineMissing(error)) return { ...open, connected: true };
  if (error) return { ...open, connected: true, ready: true, error: "Lettura non riuscita: serve un accesso Direzione, Segreteria o responsabile della struttura." };
  return { ...open, connected: true, ready: true, activities: parseStructureActivities(data) };
});
