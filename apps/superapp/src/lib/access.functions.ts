/**
 * Ingresso unico: un solo login per tutta la Super App.
 *
 * Usa il flusso reale di R20, lo stesso del Private Desk della PWA:
 *   1. `auth.request`  → invia il codice temporaneo all'email (se l'account è abilitato)
 *   2. `auth.login`    → email + codice/PIN → token di sessione
 *   3. `auth.identity.resolve` → ruolo e tipo persona del profilo
 *
 * Nessun segreto nel browser: tutte le chiamate partono da qui, lato server.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { doorsFor, type AccessProfile, type DoorId } from "./doors";

type LoginRaw = {
  token?: string;
  sessionToken?: string;
  accessToken?: string;
  mustChangePin?: boolean;
  firstAccessRequired?: boolean;
  user?: Record<string, unknown>;
  data?: { user?: Record<string, unknown> };
  dashboard?: { user?: Record<string, unknown> };
};

type IdentityRaw = { role?: string; personType?: string; matched?: boolean };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export type LoginResult =
  | { ok: true; token: string; profile: AccessProfile; doors: DoorId[]; mustChangePin: boolean }
  | { ok: false; message: string };

async function profileFrom(token: string, user: Record<string, unknown>, email: string): Promise<AccessProfile> {
  const { r20 } = await import("./appsscript.server");
  const identity = await r20.call<IdentityRaw>("auth.identity.resolve", {}, token);
  const id = identity.ok ? (identity.data ?? {}) : {};
  return {
    name: str(user["name"]),
    email: (str(user["email"]) || email).trim().toLowerCase(),
    role: str(id.role) || str(user["role"]) || str(user["coreRole"]),
    personType: str(id.personType) || str(user["type"]),
  };
}

export const requestCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data }) => {
    const { r20 } = await import("./appsscript.server");
    const res = await r20.call<{ pinReady?: boolean; message?: string }>("auth.request", { email: data.email });
    if (!res.ok) {
      return { ok: false as const, message: "Il gestionale non risponde: riprova tra poco." };
    }
    // Messaggio neutro: non rivela se l'email esiste.
    return {
      ok: true as const,
      message: "Se l'account è abilitato, il codice temporaneo è stato inviato alla tua email.",
    };
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) =>
    z.object({ email: z.string().trim().email(), code: z.string().trim().min(4).max(12) }).parse(d),
  )
  .handler(async ({ data }): Promise<LoginResult> => {
    const { r20 } = await import("./appsscript.server");
    const res = await r20.call<LoginRaw>("auth.login", { email: data.email, pin: data.code, code: data.code });
    if (!res.ok) {
      return {
        ok: false,
        message: /rete|abort|HTTP 5|non configurato/i.test(res.error)
          ? "Il gestionale non risponde: accesso non verificabile ora."
          : "Email o codice non validi.",
      };
    }
    const raw = res.data ?? {};
    const token = str(raw.token) || str(raw.sessionToken) || str(raw.accessToken);
    if (!token) return { ok: false, message: "Il gestionale non ha restituito una sessione valida." };
    const user = raw.user ?? raw.data?.user ?? raw.dashboard?.user ?? {};
    const profile = await profileFrom(token, user, data.email);
    try {
      await r20.call("auth.access.log", { eventType: "LOGIN_SUCCESS", clientKind: "WEB" }, token);
    } catch {
      // il registro accessi è facoltativo: non blocca l'ingresso
    }
    return {
      ok: true,
      token,
      profile,
      doors: doorsFor(profile),
      mustChangePin: raw.mustChangePin === true || raw.firstAccessRequired === true,
    };
  });

/** Riprende una sessione salvata: R20 conferma il token e ricalcola le porte. */
export const resume = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; email: string }) =>
    z.object({ token: z.string().min(8).max(2000), email: z.string().trim().max(200) }).parse(d),
  )
  .handler(async ({ data }): Promise<LoginResult> => {
    const { r20 } = await import("./appsscript.server");
    const check = await r20.call<{ user?: Record<string, unknown>; valid?: boolean }>("auth.validate", { token: data.token }, data.token);
    if (!check.ok || check.data?.valid === false) return { ok: false, message: "Sessione scaduta: entra di nuovo." };
    const profile = await profileFrom(data.token, check.data?.user ?? {}, data.email);
    return { ok: true, token: data.token, profile, doors: doorsFor(profile), mustChangePin: false };
  });
