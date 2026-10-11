/** Aree riservate: ogni lettura passa dal token di sessione verificato da R20. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { R20_LOGIN_LIVE } from "./satellites";

/** Legacy e-mail + PIN login stays closed until R20_LOGIN_LIVE (audit 2026-10-12: no unthrottled PIN guessing). */
const CLOSED = { ok: false as const, message: "Accesso con PIN non attivo: entra con la tua e-mail da Accedi." };

const area = z.enum(["famiglia", "atleta", "staff", "direzione"]);

export const validateAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; pin: string; area: string }) =>
    z.object({ email: z.string().trim().email(), pin: z.string().trim().min(3).max(12), area }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!R20_LOGIN_LIVE) return CLOSED;
    const { r20 } = await import("./appsscript.server");
    const res = await r20.call<{ sessionToken?: string; token?: string; role?: string; ruolo?: string; name?: string }>(
      "auth.validate",
      { email: data.email, pin: data.pin, area: data.area },
    );
    const token = res.ok ? (res.data?.sessionToken ?? res.data?.token) : undefined;
    if (!res.ok || !token) {
      return {
        ok: false as const,
        message: res.ok ? "Credenziali non valide." : "Gestionale non raggiungibile: accesso non verificabile ora.",
      };
    }
    return { ok: true as const, token, role: res.data?.role ?? res.data?.ruolo ?? data.area, name: res.data?.name ?? "" };
  });

const tokenInput = (d: { token: string }) => z.object({ token: z.string().min(8).max(2000) }).parse(d);

export const getDashboard = createServerFn({ method: "POST" })
  .inputValidator(tokenInput)
  .handler(async ({ data }) => {
    if (!R20_LOGIN_LIVE) return { summary: null, training: null, error: CLOSED.message };
    const { r20 } = await import("./appsscript.server");
    const [summary, training] = await Promise.all([
      r20.call<unknown>("dashboard.summary", {}, data.token),
      r20.call<unknown>("training.mine", {}, data.token),
    ]);
    return {
      summary: summary.ok ? JSON.stringify(summary.data ?? null) : null,
      training: training.ok ? JSON.stringify(training.data ?? null) : null,
      error: summary.ok ? null : summary.error,
    };
  });

/** Direzione: stub dichiarati, il permesso è verificato da R20 tramite token. */
export const getDirectionData = createServerFn({ method: "POST" })
  .inputValidator(tokenInput)
  .handler(async ({ data }) => {
    if (!R20_LOGIN_LIVE) return { leads: null, moderation: null, leadsActive: false, moderationActive: false };
    const { r20 } = await import("./appsscript.server");
    const [leads, moderation] = await Promise.all([
      r20.planned<unknown>("direction.leads", {}, data.token),
      r20.planned<unknown>("direction.moderation", {}, data.token),
    ]);
    return {
      leads: leads.ok ? JSON.stringify(leads.data ?? null) : null,
      moderation: moderation.ok ? JSON.stringify(moderation.data ?? null) : null,
      leadsActive: leads.ok,
      moderationActive: moderation.ok,
    };
  });
