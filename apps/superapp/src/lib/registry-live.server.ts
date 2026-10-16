/**
 * Is migration r138 live on SCD PULSE? Server only. Asked once per request (cached on the request object) through
 * scd_position_slug, a harmless immutable function that exists only after r138 and that every signed-in user may
 * call. Until it answers, the r138 positions (session.ts R138_POSITIONS: direttori sportivi, responsabile
 * safeguarding, fisioterapista) do not exist for the app: not offered in Accessi, not confirmers, not routed.
 */
import { getRequest } from "@tanstack/react-start/server";

import { r139ProbeResult } from "./intake-kinds";
import { R138_PROBE_LABEL, r138ProbeResult } from "./position-catalog";

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

const perRequest = new WeakMap<object, Promise<boolean>>();
const perRequestR139 = new WeakMap<object, Promise<boolean>>();

export async function probeR138(sb: RpcClient | null): Promise<boolean> {
  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc("scd_position_slug", { p_label: R138_PROBE_LABEL });
    return r138ProbeResult(data, error);
  } catch {
    return false;
  }
}

/** Cached per request; without a request context (tests, scripts) it probes every time. */
export function r138Live(sb: RpcClient | null): Promise<boolean> {
  let key: object | null = null;
  try {
    key = getRequest() as unknown as object;
  } catch {
    key = null;
  }
  if (key) {
    const hit = perRequest.get(key);
    if (hit) return hit;
  }
  const p = probeR138(sb);
  if (key) perRequest.set(key, p);
  return p;
}

/**
 * Is migration r139 (Vetrina richieste F1, STAGED) live on SCD PULSE? Same pattern as r138: one harmless call
 * (scd_intake_kinds, immutable, callable by every signed-in user), cached per request. Until it answers exactly the
 * F1 kinds the Vetrina richieste reads nothing and writes nothing ("Funzione in preparazione").
 */
export async function probeR139(sb: RpcClient | null): Promise<boolean> {
  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc("scd_intake_kinds", {});
    return r139ProbeResult(data, error);
  } catch {
    return false;
  }
}

export function r139Live(sb: RpcClient | null): Promise<boolean> {
  let key: object | null = null;
  try {
    key = getRequest() as unknown as object;
  } catch {
    key = null;
  }
  if (key) {
    const hit = perRequestR139.get(key);
    if (hit) return hit;
  }
  const p = probeR139(sb);
  if (key) perRequestR139.set(key, p);
  return p;
}
