/**
 * Supabase SCD on the server (config/scd-supabase.v1.json, project ndevtxxijbcnskgysdit).
 * One client per request, bound to the request cookies, so the session is verified on the
 * server and never trusted from the browser. Keys come from the environment only; when they are
 * missing the app says "accesso non configurato" instead of pretending.
 */
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

import { REMEMBER_COOKIE, REMEMBER_PREF_MAX_AGE, rememberFrom, sessionCookieOptions, type CookieOptionsLike } from "./auth-remember";

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function supabaseEnv(env: Readonly<Record<string, string | undefined>> = process.env): SupabaseEnv | null {
  const url = env["SCD_SUPABASE_URL"] ?? env["VITE_SCD_SUPABASE_URL"];
  const publishableKey = env["VITE_SCD_SUPABASE_PUBLISHABLE_KEY"] ?? env["SCD_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !publishableKey) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) return null;
  return { url, publishableKey };
}

/**
 * `remember` overrides the device preference for the request that signs in (the preference
 * cookie set in that same request is not readable yet); later requests read it from the cookie.
 */
export function serverSupabase(opts: { remember?: boolean } = {}) {
  const env = supabaseEnv();
  if (!env) return null;
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        const remember = opts.remember ?? rememberFrom(getCookies());
        for (const c of list) {
          const options = sessionCookieOptions(c.options as CookieOptionsLike | undefined, remember);
          const clean = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined));
          setCookie(c.name, c.value, { path: "/", sameSite: "lax", httpOnly: true, secure: true, ...clean });
        }
      },
    },
  });
}

/** Stores the "Ricordami" choice of this device (no personal data). */
export function setRememberPreference(remember: boolean) {
  setCookie(REMEMBER_COOKIE, remember ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: true,
    ...(remember ? { maxAge: REMEMBER_PREF_MAX_AGE } : {}),
  });
}
