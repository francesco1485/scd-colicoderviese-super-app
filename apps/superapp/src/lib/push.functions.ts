/**
 * Phone notifications for the signed-in person (r67): read the public key, save or switch off this device.
 * Every call runs with the caller's own session; the database functions only touch the caller's rows.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { pushPublicKey } from "./push.server";
import { serverSupabase } from "./supabase.server";

export interface PushConfig {
  signedIn: boolean;
  publicKey: string | null;
  devices: number;
}

async function scope() {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? serverSupabase() : null;
  return org && sb ? { org, sb } : null;
}

export const getPushConfig = createServerFn({ method: "GET" }).handler(async (): Promise<PushConfig> => {
  const c = await scope();
  if (!c) return { signedIn: false, publicKey: null, devices: 0 };
  const [key, devices] = await Promise.all([pushPublicKey(c.sb), c.sb.rpc("scd_push_my_devices", { p_organization_id: c.org.organizationId })]);
  return { signedIn: true, publicKey: key, devices: typeof devices.data === "number" ? devices.data : 0 };
});

const SubInput = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  p256dh: z.string().regex(/^[A-Za-z0-9_-]{40,200}={0,2}$/),
  auth: z.string().regex(/^[A-Za-z0-9_-]{10,100}={0,2}$/),
  userAgent: z.string().max(200),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SubInput>) => SubInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const c = await scope();
    if (!c) return { ok: false };
    const { error } = await c.sb.rpc("scd_push_subscribe", {
      p_organization_id: c.org.organizationId,
      p_endpoint: data.endpoint,
      p_p256dh: data.p256dh,
      p_auth: data.auth,
      p_user_agent: data.userAgent,
    });
    return { ok: !error };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: { endpoint: string }) => z.object({ endpoint: z.string().url().max(1000) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const c = await scope();
    if (!c) return { ok: false };
    const { error } = await c.sb.rpc("scd_push_unsubscribe", { p_endpoint: data.endpoint });
    return { ok: !error };
  });
