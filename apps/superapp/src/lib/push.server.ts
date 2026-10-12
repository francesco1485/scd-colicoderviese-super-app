/**
 * Web Push on the server (r67). The only bridge to the callup-push edge function: it forwards the caller's own
 * Supabase access token (the function verifies it again) and never sees the private key, which lives in Vault.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./supabase.server";

type Sb = SupabaseClient;

export interface PushDelivery {
  devices: number;
  callups: number;
}

async function callEdge(
  sb: Sb,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch(`${env.url}/functions/v1/callup-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Public key from Vault; asks the edge function to create the pair the first time. */
export async function pushPublicKey(sb: Sb): Promise<string | null> {
  const { data, error } = await sb.rpc("scd_push_public_key");
  if (!error && typeof data === "string" && data) return data;
  const r = await callEdge(sb, { action: "init" });
  return typeof r?.["publicKey"] === "string"
    ? (r["publicKey"] as string)
    : null;
}

/** Notify the families of a match's new call-ups. Never throws: a failed push must not undo a call-up. */
export async function notifyCallups(
  sb: Sb,
  matchId: string,
): Promise<PushDelivery | null> {
  const r = await callEdge(sb, { action: "callup", match_id: matchId });
  if (!r) return null;
  const n = (k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0);
  return { devices: n("devices"), callups: n("callups") };
}

/** Notify the followers of a channel of a new approved post (r89). Never throws: a failed push must not undo a post. */
export async function notifyPostFollowers(
  sb: Sb,
  postId: string,
  label: string,
): Promise<number | null> {
  const r = await callEdge(sb, {
    action: "post",
    post_id: postId,
    label: label.slice(0, 60),
  });
  if (!r) return null;
  return typeof r["devices"] === "number" ? (r["devices"] as number) : 0;
}
