/**
 * Identity elevator of the Super App (UD-054): one login for every area, on the existing
 * Supabase SCD project. E-mail magic link only (no passwords to keep), session in httpOnly
 * cookies, roles read on the server from `scd_my_context()` (migration r35) and turned into
 * registry positions by src/lib/session.ts. Nothing here creates roles or memberships.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

import { landingFor, safeNext, sessionBadge, sessionRolesFrom, type Membership } from "./session";
import { serverSupabase } from "./supabase.server";

export interface SessionView {
  /** False when the server has no Supabase keys: the login page explains it. */
  configured: boolean;
  user: { email: string } | null;
  /** Registry positions of the session (empty when logged in without membership). */
  roles: string[];
  /** Where this person lands when no `next` is asked (session.ts landingFor). */
  landing: string;
  badge: string | null;
  memberships: Array<{ organizationId: string; organization: string; role: string }>;
}

const ANON: SessionView = { configured: false, user: null, roles: [], landing: "/aree", badge: null, memberships: [] };

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
  .inputValidator((d: { email: string; next?: string | undefined }) => z.object({ email: z.string().trim().toLowerCase().email().max(120), next: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }): Promise<MagicLinkOutcome> => {
    const sb = serverSupabase();
    if (!sb) return { sent: false, message: "L'accesso non è ancora configurato su questo server." };
    const origin = getRequestUrl().origin;
    // Only carry a destination when one was asked; otherwise the confirm step lands by role (session.ts landingFor).
    const redirect = data.next ? `${origin}/accedi/conferma?next=${encodeURIComponent(safeNext(data.next))}` : `${origin}/accedi/conferma`;
    const { error } = await sb.auth.signInWithOtp({
      email: data.email,
      options: { emailRedirectTo: redirect, shouldCreateUser: false },
    });
    if (error) {
      const notFound = /signups not allowed|user not found|otp_disabled/i.test(error.message);
      return {
        sent: false,
        message: notFound ? "Questa e-mail non è ancora attiva: chiedi l'accesso dal pulsante qui sotto." : "Invio non riuscito, riprova tra un minuto.",
      };
    }
    return { sent: true, message: "Ti abbiamo mandato un link: aprilo da questo telefono o computer per entrare." };
  });

export const confirmMagicLink = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; next?: string | undefined }) => z.object({ code: z.string().min(8).max(400), next: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; next: string; message: string }> => {
    const sb = serverSupabase();
    const next = safeNext(data.next);
    if (!sb) return { ok: false, next, message: "L'accesso non è ancora configurato su questo server." };
    const { error } = await sb.auth.exchangeCodeForSession(data.code);
    if (error) return { ok: false, next, message: "Link scaduto o già usato: richiedine uno nuovo." };
    const landing = data.next ? next : (await sessionView()).landing;
    return { ok: true, next: landing, message: "Sei dentro." };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: boolean }> => {
  const sb = serverSupabase();
  if (!sb) return { ok: true };
  await sb.auth.signOut({ scope: "local" });
  return { ok: true };
});
