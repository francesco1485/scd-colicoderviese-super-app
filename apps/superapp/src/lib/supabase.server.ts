/**
 * Supabase SCD on the server (config/scd-supabase.v1.json, project ndevtxxijbcnskgysdit).
 * One client per request, bound to the request cookies, so the session is verified on the
 * server and never trusted from the browser. Keys come from the environment only; when they are
 * missing the app says "accesso non configurato" instead of pretending.
 */
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

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

export function serverSupabase() {
  const env = supabaseEnv();
  if (!env) return null;
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const c of list) setCookie(c.name, c.value, { path: "/", sameSite: "lax", httpOnly: true, secure: true, ...c.options });
      },
    },
  });
}
