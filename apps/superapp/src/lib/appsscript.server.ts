/**
 * Adapter server-side verso il backend Apps Script R20.
 * Contratto: POST JSON { action, payload, sessionToken }.
 * Nessun segreto nel browser: il client chiama solo server function.
 */

// Import nel repo SCD: l'URL del deployment Apps Script R20 non è più nel codice.
// Va fornito solo lato server tramite la variabile d'ambiente APPS_SCRIPT_URL.

/** Azioni realmente esposte oggi dal backend R20. */
export const R20_ACTIONS = [
  "public.feed",
  "public.club",
  "public.match",
  "dashboard.summary",
  "auth.validate",
  "auth.request",
  "auth.login",
  "auth.identity.resolve",
  "auth.access.log",
  "training.mine",
  "attendance.get",
  "attendance.save",
  "auth.pin.change",
  "auth.pin.set",
] as const;

/** Azioni previste ma NON ancora implementate lato R20 (stub dichiarati). */
export const R20_PLANNED_ACTIONS = [
  "public.calendar",
  "public.initiatives",
  "public.registration",
  "public.partnerLead",
  "public.communitySubmit",
  "public.ticketSubmit",
  "safeguarding.submit",
  "direction.leads",
  "direction.moderation",
] as const;

export type R20Action = (typeof R20_ACTIONS)[number];
export type R20PlannedAction = (typeof R20_PLANNED_ACTIONS)[number];

export type R20Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; notImplemented?: boolean };

async function call<T>(
  action: R20Action | R20PlannedAction,
  payload: Record<string, unknown> = {},
  sessionToken: string | null = null,
): Promise<R20Result<T>> {
  const url = process.env["APPS_SCRIPT_URL"];
  if (!url) return { ok: false, error: "APPS_SCRIPT_URL non configurato" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      redirect: "follow",
      // text/plain evita il preflight su Apps Script; il corpo è JSON.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload, sessionToken }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: "Risposta non JSON" };
    }
    const obj = json as { ok?: boolean; error?: string; data?: T };
    if (obj && obj.ok === false) {
      const err = obj.error ?? "Errore backend";
      return { ok: false, error: err, notImplemented: /unknown|non supportat|not found|invalid action/i.test(err) };
    }
    return { ok: true, data: (obj && "data" in obj ? obj.data : json) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore di rete" };
  } finally {
    clearTimeout(timer);
  }
}

export const r20 = {
  /** Azioni disponibili. */
  call: <T>(action: R20Action, payload?: Record<string, unknown>, token?: string | null) =>
    call<T>(action, payload, token ?? null),
  /**
   * Azioni pianificate: vengono tentate, ma se R20 non le conosce l'esito è
   * esplicitamente "non ancora attivo". Nessuna finta conferma.
   */
  planned: <T>(action: R20PlannedAction, payload?: Record<string, unknown>, token?: string | null) =>
    call<T>(action, payload, token ?? null),
};
