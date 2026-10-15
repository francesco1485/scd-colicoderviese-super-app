/**
 * "Pulmino in diretta" (r110) server functions.
 *   - getLiveDriverPanel: today's runs of the caller when the caller's account is linked to the assigned driver;
 *   - startLiveRun / pingLive / stopLiveRun: the driver's phone (the database checks driver, window and rate again);
 *   - getFamilyLive: status, last update, distance and "stima" of arrival of today's runs of the caller's circle —
 *     never coordinates, never a name.
 * Fail-closed like r101 (giving.server.ts): until r110 is applied (`scd_transport_live_engine` missing) every function
 * answers "not active" and nothing is sent or read. Every call uses the caller's own session.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { isMissingObjectError } from "./person-grants.server";
import { serverSupabase } from "./supabase.server";
import {
  ARRIVAL_KEYS,
  DRIVER_ACK_VERSION,
  LIVE_ENGINE,
  arrivalPoint,
  createPingLimiter,
  estimateArrival,
  liveErrorText,
  parseLiveView,
  validatePing,
  type DriverRun,
  type LiveState,
} from "./transport-live";

export type LiveEngine = "applied" | "not-applied" | "unknown";

type RpcClient = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> };

/** Is r110 applied on the connected database? "unknown" when the probe failed for another reason. */
export async function liveEngineState(sb: RpcClient | null): Promise<LiveEngine> {
  if (!sb) return "unknown";
  try {
    const { data, error } = await sb.rpc("scd_transport_live_engine", {});
    if (!error) return data === LIVE_ENGINE ? "applied" : "unknown";
    return isMissingObjectError(error) ? "not-applied" : "unknown";
  } catch {
    return "unknown";
  }
}

async function context() {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? (serverSupabase() as unknown as RpcClient | null) : null;
  return { signedIn: Boolean(s.user), org, sb };
}

/* ------------------------------------------------------------------ driver */

export type DriverPanelState = "signed-out" | "not-active" | "none" | "open" | "unavailable";

export interface DriverPanel {
  state: DriverPanelState;
  /** Staging preview without a session: the page shows "Funzione in preparazione" only. */
  preview: boolean;
  acknowledged: boolean;
  runs: DriverRun[];
  arrivals: { key: string; label: string }[];
}

const ARRIVALS = ARRIVAL_KEYS.map((k) => ({ key: k, label: arrivalPoint(k)!.label }));

export const getLiveDriverPanel = createServerFn({ method: "GET" }).handler(async (): Promise<DriverPanel> => {
  const preview = stagingPreviewEnabled(process.env, import.meta.env.PROD);
  const base = { preview, acknowledged: false, runs: [] as DriverRun[], arrivals: ARRIVALS };
  const { signedIn, org, sb } = await context();
  if (!signedIn || !org || !sb) return { ...base, state: preview ? "not-active" : "signed-out" };
  const engine = await liveEngineState(sb);
  if (engine === "not-applied") return { ...base, state: "not-active" };
  if (engine !== "applied") return { ...base, state: "unavailable" };
  const { data, error } = await sb.rpc("scd_transport_live_view", { p_organization_id: org.organizationId });
  if (error) return { ...base, state: "unavailable" };
  const view = parseLiveView(data);
  if (!view?.driver) return { ...base, state: "none" };
  return { ...base, state: "open", acknowledged: view.driver.acknowledged, runs: view.driver.runs };
});

export interface LiveOutcome {
  ok: boolean;
  message: string;
  code?: string;
  sessionId?: string;
  expiresAt?: string;
}

function outcome(data: unknown): { ok: boolean; code: string | null; id: string | null; expiresAt: string | null } {
  const r = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    ok: r["ok"] === true,
    code: typeof r["code"] === "string" ? r["code"] : null,
    id: typeof r["id"] === "string" ? r["id"] : null,
    expiresAt: typeof r["expiresAt"] === "string" ? r["expiresAt"] : null,
  };
}

/** One write of the driver: only with a session and r110 applied; the database decides the rest. */
async function driverCall(fn: string, args: (orgId: string) => Record<string, unknown>): Promise<LiveOutcome & { raw?: ReturnType<typeof outcome> }> {
  const { org, sb } = await context();
  if (!org || !sb) return { ok: false, code: "SIGNED_OUT", message: liveErrorText("SIGNED_OUT") };
  const engine = await liveEngineState(sb);
  if (engine === "not-applied") return { ok: false, code: "NOT_ACTIVE", message: liveErrorText("NOT_ACTIVE") };
  if (engine !== "applied") return { ok: false, code: "ERROR", message: liveErrorText("ERROR") };
  const { data, error } = await sb.rpc(fn, args(org.organizationId));
  if (error) return { ok: false, code: isMissingObjectError(error) ? "NOT_ACTIVE" : "ERROR", message: liveErrorText(isMissingObjectError(error) ? "NOT_ACTIVE" : "ERROR") };
  const r = outcome(data);
  return { ok: r.ok, message: r.ok ? "" : liveErrorText(r.code), raw: r, ...(r.code ? { code: r.code } : {}) };
}

const StartIn = z.object({
  runId: z.string().uuid(),
  acknowledged: z.boolean(),
  arrival: z.enum(ARRIVAL_KEYS).nullable(),
});

export const startLiveRun = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof StartIn>) => StartIn.parse(d))
  .handler(async ({ data }): Promise<LiveOutcome> => {
    const target = arrivalPoint(data.arrival);
    const res = await driverCall("scd_transport_live_start", (orgId) => ({
      p_organization_id: orgId,
      p_run_id: data.runId,
      p_acknowledged: data.acknowledged,
      p_ack_version: data.acknowledged ? DRIVER_ACK_VERSION : null,
      p_target_label: target?.label ?? null,
      p_target_lat: target?.lat ?? null,
      p_target_lng: target?.lng ?? null,
    }));
    if (!res.ok || !res.raw?.id) return { ok: false, message: res.message || liveErrorText(null), ...(res.code ? { code: res.code } : {}) };
    return { ok: true, message: "Posizione condivisa con le famiglie dei ragazzi confermati su questa trasferta.", sessionId: res.raw.id, ...(res.raw.expiresAt ? { expiresAt: res.raw.expiresAt } : {}) };
  });

const allowPing = createPingLimiter();

export const pingLive = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data }): Promise<LiveOutcome> => {
    const v = validatePing(data);
    if (!v.ok) {
      const code = v.problem === "INACCURATE" ? "inaccurate" : v.problem === "STALE" ? "stale" : "invalid";
      return { ok: false, code, message: liveErrorText(code) };
    }
    const p = v.value;
    if (!allowPing(p.sessionId)) return { ok: false, code: "BUSY", message: liveErrorText("BUSY") };
    const res = await driverCall("scd_transport_live_ping", (orgId) => ({
      p_organization_id: orgId,
      p_session_id: p.sessionId,
      p_lat: p.lat,
      p_lng: p.lng,
      p_accuracy: p.accuracy,
      p_speed: p.speed,
      p_heading: p.heading,
      p_recorded_at: p.recordedAt,
    }));
    return { ok: res.ok, message: res.message, ...(res.code ? { code: res.code } : {}) };
  });

export const stopLiveRun = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<LiveOutcome> => {
    const res = await driverCall("scd_transport_live_stop", (orgId) => ({ p_organization_id: orgId, p_session_id: data.sessionId }));
    return { ok: res.ok, message: res.ok ? "Corsa terminata: la posizione non è più condivisa." : res.message, ...(res.code ? { code: res.code } : {}) };
  });

/* ------------------------------------------------------------------ family */

export interface FamilyLiveItem {
  runId: string;
  title: string;
  departure: string;
  state: LiveState;
  lastUpdate: string | null;
  targetLabel: string | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  arriving: boolean;
}

export interface FamilyLive {
  state: "signed-out" | "not-active" | "open" | "unavailable";
  items: FamilyLiveItem[];
  checkedAt: string;
}

export const getFamilyLive = createServerFn({ method: "GET" }).handler(async (): Promise<FamilyLive> => {
  const checkedAt = new Date().toISOString();
  const { org, sb } = await context();
  if (!org || !sb) return { state: "signed-out", items: [], checkedAt };
  const engine = await liveEngineState(sb);
  if (engine === "not-applied") return { state: "not-active", items: [], checkedAt };
  if (engine !== "applied") return { state: "unavailable", items: [], checkedAt };
  const { data, error } = await sb.rpc("scd_transport_live_view", { p_organization_id: org.organizationId });
  if (error) return { state: "unavailable", items: [], checkedAt };
  const view = parseLiveView(data);
  if (!view) return { state: "unavailable", items: [], checkedAt };
  const items = view.live.map((r): FamilyLiveItem => {
    const est = estimateArrival(r.distanceKm, r.avgSpeedKmh);
    return {
      runId: r.runId,
      title: r.title,
      departure: r.departure,
      state: r.state,
      lastUpdate: r.lastUpdate,
      targetLabel: r.targetLabel,
      distanceKm: est ? Math.round(est.distanceKm * 10) / 10 : null,
      etaMinutes: est ? est.minutes : null,
      arriving: est?.arriving ?? false,
    };
  });
  return { state: "open", items, checkedAt };
});
