/**
 * Pulmini under the trainings, on the server (UD-108).
 *
 * Fail-closed chain for children's names:
 *   1. the work-area gate must open the page for a verified session (not the staging preview);
 *   2. the database must return the Pulmini board (scd_transport_board: Direzione, Segreteria, responsabile
 *      trasporti, autisti — role and position checked in Postgres, migration r74);
 *   3. names come only from scd_transport_rider_roster (migration r99), which repeats the same check.
 * Any missing link gives the plan without names (counts by team) or the locked plan (preview / not allowed).
 * Names are formatted here (RIDER_NAME_FORMAT) and nothing else of the child leaves the server: no Master code,
 * no phone, no parent, no note. Stop texts are read only to match one of the line's REGISTERED stops (UD-130,
 * Direzione 14/10/2026 "chi sale e scende e dove"): the free text never leaves. Nothing is logged.
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { trainingServiceFor } from "./member-services";
import type { TrainingSlot } from "./public-snapshots";
import { buildVanPlan, type RawRider, type RawStop, type SlotInput, type VanPlan } from "./pulmini-vans";
import { PULMINI_DEMAND } from "./roster-aggregates";
import { serverSupabase } from "./supabase.server";

export const NAMES_LOCKED_NOTE = "Nomi visibili solo con accesso del responsabile trasporti.";
export const NAMES_NOT_COPIED_NOTE = "I nomi dei ragazzi non sono ancora copiati dal Master Pulmini: si vedono quando la copia con i nomi è attiva (aggiornamento r99).";

export function slotInputs(slots: readonly TrainingSlot[]): SlotInput[] {
  return slots.map((s) => {
    const teams = [s.fields.C1, s.fields.C2].filter((t) => t && t.trim() && t.trim() !== "—").join(" · ");
    return { day: s.day, start: s.start, timeLabel: s.timeLabel, teams, served: trainingServiceFor(teams) };
  });
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function records(v: unknown): Array<Record<string, unknown>> {
  return (Array.isArray(v) ? v : []).map(obj).filter((x): x is Record<string, unknown> => x !== null);
}

export interface VansSources {
  gate: WorkAreaGate;
  /** Raw result of scd_transport_board, null when the database refused or is not reachable. */
  board: unknown;
  /** Raw result of scd_transport_rider_roster, null when refused, missing (r99 not applied) or failed. */
  roster: unknown;
  slots: readonly SlotInput[];
}

/**
 * Pure assembly of the van plan from what the database returned. Exported for the privacy tests:
 * names appear only with an open (non-preview) gate, a board AND a roster that carries names.
 */
export function vansFromSources({ gate, board, roster, slots }: VansSources): VanPlan | null {
  if (gate.view !== "page") return null;
  const b = obj(board);
  const locked = { riders: null, withNames: false, stops: null, slots, asOf: PULMINI_DEMAND.asOf, lineCounts: PULMINI_DEMAND.byLine, namesNote: NAMES_LOCKED_NOTE } as const;
  if (gate.preview || !b) return buildVanPlan(locked);
  const stops: RawStop[] = records(b["stops"]).map((x) => ({ line: x["line"], position: x["position"], town: x["town"], place: x["place"], eta: x["eta"] }));
  const sync = obj(b["sync"]);
  const asOf = typeof sync?.["source_modified_at"] === "string" ? sync["source_modified_at"].slice(0, 10) : typeof sync?.["synced_at"] === "string" ? sync["synced_at"].slice(0, 10) : null;
  const r = obj(roster);
  // Allowlist: only these keys of a rider are read; anything else the database might send is dropped here.
  const rosterRiders: RawRider[] = r && r["canSeeNames"] === true
    ? records(r["riders"]).map((x) => ({ teamGroup: x["teamGroup"], serviceStatus: x["serviceStatus"], line: x["line"], vehicle: x["vehicle"], days: x["days"], firstName: x["firstName"], lastName: x["lastName"], stopOut: x["stopOut"], stopBack: x["stopBack"], seat: x["seat"] }))
    : [];
  const named = rosterRiders.some((x) => typeof x.firstName === "string" && x.firstName.trim() !== "");
  const riders: RawRider[] = named ? rosterRiders : records(b["riders"]).map((x) => ({ teamGroup: x["teamGroup"], serviceStatus: x["serviceStatus"], line: x["line"], days: x["days"], stopOut: x["stopOut"], stopBack: x["stopBack"] }));
  return buildVanPlan({ riders, withNames: named, stops, slots, asOf, lineCounts: PULMINI_DEMAND.byLine, namesNote: named ? null : NAMES_NOT_COPIED_NOTE });
}

function romeDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export const getPulminiVans = createServerFn({ method: "GET" }).handler(async (): Promise<VanPlan | null> => {
  const session = await sessionView();
  const preview = stagingPreviewEnabled(process.env, import.meta.env.PROD);
  const gate = workAreaView("pulmini", { preview, sessionRoles: session.user ? new Set(session.roles) : null });
  if (gate.view !== "page") return null;
  const { loadQuadro } = await import("./quadro-data.server");
  const slots = slotInputs(loadQuadro().slots);
  const org = session.memberships[0] ?? null;
  const sb = !gate.preview && session.configured && session.user && org ? serverSupabase() : null;
  if (!sb || !org) return vansFromSources({ gate, board: null, roster: null, slots });
  const boardRes = await sb.rpc("scd_transport_board", { p_organization_id: org.organizationId, p_from: romeDate(-7), p_to: romeDate(0) });
  const board = boardRes.error ? null : boardRes.data;
  let roster: unknown = null;
  if (board) {
    const rosterRes = await sb.rpc("scd_transport_rider_roster", { p_organization_id: org.organizationId });
    roster = rosterRes.error ? null : rosterRes.data;
  }
  return vansFromSources({ gate, board, roster, slots });
});
