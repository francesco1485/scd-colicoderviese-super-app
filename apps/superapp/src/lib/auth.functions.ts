/**
 * Identity elevator of the Super App (UD-054): one login for every area, on the existing
 * Supabase SCD project. E-mail + password (Direzione 2026-10-13) with "Ricordami", or the
 * e-mail magic link (first access and forgotten password); session in httpOnly cookies, roles read on the server from `scd_my_context()` (migration r35) and turned into
 * registry positions by src/lib/session.ts. Nothing here creates roles or memberships.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

import { PASSWORD_MAX, PASSWORD_PAGE, hasAppPassword, passwordProblem } from "./auth-remember";
import { landingFor, safeNext, sessionBadge, sessionRolesFrom, type Membership } from "./session";
import { configuredSiteUrl } from "./http-policy";
import { serverSupabase, setRememberPreference } from "./supabase.server";

export interface SessionView {
  /** False when the server has no Supabase keys: the login page explains it. */
  configured: boolean;
  user: { email: string } | null;
  /** Registry positions of the session (empty when logged in without membership). */
  roles: string[];
  /** Where this person lands when no `next` is asked (session.ts landingFor). */
  landing: string;
  badge: string | null;
  /** True once the person has chosen a password in the app (can sign in without a link). */
  hasPassword: boolean;
  memberships: Array<{ organizationId: string; organization: string; role: string }>;
}

const ANON: SessionView = { configured: false, user: null, roles: [], landing: "/aree", badge: null, hasPassword: false, memberships: [] };

/** The verified session of the caller, or an anonymous view. Used by gates and by the header. */
export async function sessionView(): Promise<SessionView> {
  const sb = serverSupabase();
  if (!sb) return ANON;
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return { ...ANON, configured: true };
  const email = data.user.email ?? "";
  const ctx = await sb.rpc("scd_my_context");
  const memberships: Membership[] = Array.isArray(ctx.data)
    ? (ctx.data as Array<Record<string, unknown>>).map((m) => ({
        organization_id: String(m["organization_id"] ?? ""),
        organization_slug: String(m["organization_slug"] ?? ""),
        role: String(m["role"] ?? ""),
        scope: m["scope"],
        active: m["active"] === true,
      }))
    : [];
  const roles = sessionRolesFrom(memberships);
  return {
    configured: true,
    user: { email },
    roles: [...roles],
    landing: landingFor(roles),
    badge: sessionBadge(roles),
    hasPassword: hasAppPassword(data.user.user_metadata),
    memberships: memberships.filter((m) => m.active).map((m) => ({ organizationId: m.organization_id, organization: m.organization_slug, role: m.role })),
  };
}

/** Positions of the caller for the area gates: null when there is no verified session. */
export async function sessionRoles(): Promise<ReadonlySet<string> | null> {
  const v = await sessionView();
  return v.user ? new Set(v.roles) : null;
}

export const getSession = createServerFn({ method: "GET" }).handler(async (): Promise<SessionView> => sessionView());

export interface MagicLinkOutcome {
  sent: boolean;
  /** Plain Italian for the form; never the raw provider error. */
  message: string;
}

export const requestMagicLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; next?: string | undefined; remember?: boolean | undefined }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(120), next: z.string().max(200).optional(), remember: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<MagicLinkOutcome> => {
    const sb = serverSupabase();
    if (!sb) return { sent: false, message: "L'accesso non è ancora configurato su questo server." };
    // Audit 2026-10-12: the link points to the configured public URL, never to whatever Host header arrived.
    const origin = configuredSiteUrl(process.env) ?? getRequestUrl().origin;
    // Only carry a destination when one was asked; otherwise the confirm step lands by role (session.ts landingFor).
    const params = new URLSearchParams();
    if (data.next) params.set("next", safeNext(data.next));
    if (data.remember === false) params.set("r", "0");
    const query = params.toString();
    const redirect = `${origin}/accedi/conferma${query ? `?${query}` : ""}`;
    const { error } = await sb.auth.signInWithOtp({
      email: data.email,
      options: { emailRedirectTo: redirect, shouldCreateUser: false },
    });
    // Same answer whether or not the address has an account (no account enumeration, audit 2026-10-12).
    const neutral = "Se questa e-mail è abilitata, entro un minuto ricevi il link: aprilo da questo stesso telefono o computer. Se non arriva, controlla lo spam o chiedi l'accesso dal pulsante qui sotto.";
    if (error) {
      const notFound = /signups not allowed|user not found|otp_disabled/i.test(error.message);
      if (notFound) return { sent: true, message: neutral };
      return { sent: false, message: "Invio non riuscito, riprova tra un minuto." };
    }
    return { sent: true, message: neutral };
  });

export const confirmMagicLink = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; next?: string | undefined; remember?: boolean | undefined }) =>
    z.object({ code: z.string().min(8).max(400), next: z.string().max(200).optional(), remember: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; next: string; message: string }> => {
    const remember = data.remember !== false;
    const sb = serverSupabase({ remember });
    const next = safeNext(data.next);
    if (!sb) return { ok: false, next, message: "L'accesso non è ancora configurato su questo server." };
    setRememberPreference(remember);
    const { data: exchanged, error } = await sb.auth.exchangeCodeForSession(data.code);
    if (error) return { ok: false, next, message: "Link scaduto o già usato: richiedine uno nuovo." };
    const landing = data.next ? next : (await sessionView()).landing;
    // First access by link: invite the person to choose a password so next time no e-mail is needed.
    if (!hasAppPassword(exchanged.user?.user_metadata)) {
      return { ok: true, next: `${PASSWORD_PAGE}?benvenuto=1&next=${encodeURIComponent(landing)}`, message: "Sei dentro." };
    }
    return { ok: true, next: landing, message: "Sei dentro." };
  });

export interface PasswordOutcome {
  ok: boolean;
  /** Where to go after a successful sign-in. */
  next: string;
  /** Plain Italian for the form; never the raw provider error. */
  message: string;
}

export const signInWithPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; remember: boolean; next?: string | undefined }) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(120),
        password: z.string().min(1).max(PASSWORD_MAX),
        remember: z.boolean(),
        next: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PasswordOutcome> => {
    const sb = serverSupabase({ remember: data.remember });
    const next = safeNext(data.next);
    if (!sb) return { ok: false, next, message: "L'accesso non è ancora configurato su questo server." };
    setRememberPreference(data.remember);
    const { error } = await sb.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) {
      if (/rate limit|too many/i.test(error.message)) return { ok: false, next, message: "Troppi tentativi: aspetta qualche minuto e riprova." };
      if (/not confirmed/i.test(error.message)) return { ok: false, next, message: "Questo indirizzo non è ancora confermato: entra con il link via e-mail." };
      // Same answer for unknown e-mail and wrong password (no account enumeration).
      return { ok: false, next, message: "E-mail o password non corretti. Se è il primo accesso o l'hai dimenticata, usa \"Ricevi un link\"." };
    }
    const landing = data.next ? next : (await sessionView()).landing;
    return { ok: true, next: landing, message: "Sei dentro." };
  });

export const setMyPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; confirm: string }) => z.object({ password: z.string().max(200), confirm: z.string().max(200) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const problem = passwordProblem(data.password, data.confirm);
    if (problem) return { ok: false, message: problem };
    const sb = serverSupabase();
    if (!sb) return { ok: false, message: "L'accesso non è ancora configurato su questo server." };
    const { data: me, error: meError } = await sb.auth.getUser();
    if (meError || !me.user) return { ok: false, message: "Sessione scaduta: entra di nuovo con il link via e-mail." };
    const { error } = await sb.auth.updateUser({ password: data.password, data: { scd_password_set: true } });
    if (error) {
      if (/different from the old/i.test(error.message)) return { ok: false, message: "È uguale alla password attuale: scegline una diversa." };
      if (/weak|pwned|leaked/i.test(error.message)) return { ok: false, message: "Password troppo facile da indovinare: scegline una più lunga o meno comune." };
      if (/reauthenticat/i.test(error.message)) return { ok: false, message: "Per sicurezza entra di nuovo con il link via e-mail, poi cambia la password." };
      return { ok: false, message: "Salvataggio non riuscito, riprova tra un minuto." };
    }
    return { ok: true, message: "Password salvata. Da ora entri con e-mail e password." };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: boolean }> => {
  const sb = serverSupabase();
  if (!sb) return { ok: true };
  await sb.auth.signOut({ scope: "local" });
  return { ok: true };
});
