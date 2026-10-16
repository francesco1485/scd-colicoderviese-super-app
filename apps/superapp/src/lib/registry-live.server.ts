/**
 * Is migration r138 live on SCD PULSE? Server only. Asked once per request (cached on the request object) through
 * scd_position_slug, a harmless immutable function that exists only after r138 and that every signed-in user may
 * call. Until it answers, the r138 positions (session.ts R138_POSITIONS: direttori sportivi, responsabile
 * safeguarding, fisioterapista) do not exist for the app: not offered in Accessi, not confirmers, not routed.
 */
import { getRequest } from "@tanstack/react-start/server";

import { R138_PROBE_LABEL, r138ProbeResult } from "./position-catalog";

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

const perRequest = new WeakMap<object, Promise<boolean>>();

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
