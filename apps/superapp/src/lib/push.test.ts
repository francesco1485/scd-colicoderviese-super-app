import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PUSH_COPY, PUSH_SW_SCOPE, PUSH_SW_URL, bufferToBase64Url, deliveryNote, isIos, pushSupport, urlBase64ToUint8Array } from "./push";

const dev = (o: Partial<Parameters<typeof pushSupport>[0]>) => ({ userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/129", standalone: false, hasServiceWorker: true, hasPushManager: true, hasNotification: true, ...o });
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

describe("phone notifications", () => {
  it("asks iPhone users to add the app to the home screen first", () => {
    expect(isIos(IPHONE)).toBe(true);
    expect(pushSupport(dev({ userAgent: IPHONE }))).toBe("ios-install");
    expect(pushSupport(dev({ userAgent: IPHONE, standalone: true }))).toBe("ready");
    expect(pushSupport(dev({}))).toBe("ready");
    expect(pushSupport(dev({ hasPushManager: false }))).toBe("unsupported");
  });

  it("round-trips base64url keys", () => {
    const bytes = urlBase64ToUint8Array("BFBx-_9w");
    expect(bytes.length).toBe(6);
    expect(bufferToBase64Url(bytes.buffer as ArrayBuffer)).toBe("BFBx-_9w");
    expect(bufferToBase64Url(null)).toBe("");
  });

  it("tells the mister what happened", () => {
    expect(deliveryNote(null)).toBe("");
    expect(deliveryNote({ devices: 0, callups: 0 })).toMatch(/Nessuna famiglia/);
    expect(deliveryNote({ devices: 3, callups: 2 })).toBe(" Avviso inviato sul telefono per 2 convocati.");
  });

  it("has copy for every state", () => {
    for (const k of ["checking", "unsupported", "ios-install", "denied", "off", "on", "working", "error"] as const) expect(PUSH_COPY[k].title).toBeTruthy();
  });

  it("keeps the push worker separate from the offline worker and free of caching", () => {
    const sw = readFileSync(fileURLToPath(new URL("../../public/push-sw.js", import.meta.url)), "utf8");
    expect(PUSH_SW_URL).toBe("/push-sw.js");
    expect(PUSH_SW_SCOPE).not.toBe("/");
    expect(sw).not.toMatch(/addEventListener\("fetch"/);
    expect(sw).not.toMatch(/caches\./);
    expect(sw).toContain("notificationclick");
  });

  it("never lets authenticated users read subscriptions or the private key (r67, r67_1)", () => {
    const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261011_r67_callup_push.sql", import.meta.url)), "utf8");
    const vault = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261011_r67_1_push_keys_in_vault.sql", import.meta.url)), "utf8");
    expect(sql).toContain("revoke all on table public.scd_push_subscriptions from anon, authenticated");
    expect(sql).toContain("revoke all on function public.scd_push_callup_targets(uuid) from public, anon, authenticated");
    expect(vault).toContain("revoke all on function public.scd_push_vapid_get() from public, anon, authenticated");
    expect(sql + vault).not.toMatch(/privateKey"\s*:\s*"[A-Za-z0-9_-]{20,}/);
  });
});
