/**
 * Identity elevator of the Super App (UD-054): one login for every area, on the existing
 * Supabase SCD project. E-mail + password (Direzione 2026-10-13) with "Ricordami", or the
 * e-mail magic link / 6-digit e-mail code (first access and forgotten password, auth-otp.ts); session in httpOnly cookies, roles read on the server from `scd_my_context()` (migration r35) and turned into
 * registry positions by src/lib/session.ts. Nothing here creates roles or memberships.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

import { PASSWORD_MAX, PASSWORD_PAGE, hasAppPassword, passwordProblem } from "./auth-remember";
import { mapAuthError, tokenHashInputSchema, verifyOtpInputSchema, type AuthErrorKind, type TokenHashInput, type VerifyOtpInput } from "./auth-otp";
import { landingFor, safeNext, sessionBadge, sessionRolesFrom, type Membership } from "./session";
import { PROFILE_PAGE, isSocialUser, profileComplete } from "./signup";
import { configuredSiteUrl } from "./http-policy";
import { createRateLimiter } from "./access-requests";
import { parseLoginIdentifier } from "./login-identifier";
import { clientIp } from "./request-ip.server";
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
  /** Seconds the provider asks to wait before another request (rate limit), else null. */
  retryAfter: number | null;
  /** True when the provider refused because of its rate limit: the form keeps the button locked. */
  rateLimited: boolean;
}

export const requestMagicLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; next?: string | undefined; remember?: boolean | undefined }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(120), next: z.string().max(200).optional(), remember: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<MagicLinkOutcome> => {
    const sb = serverSupabase();
    if (!sb) return { sent: false, message: "L'accesso non è ancora configurato su questo server.", retryAfter: null, rateLimited: false };
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
    const neutral =
      "Se questa e-mail è abilitata, entro un minuto ricevi un messaggio con un link e un codice di 6 cifre. Puoi aprire il link da questo stesso dispositivo oppure scrivere il codice qui sotto. Se non arriva, controlla lo spam.";
    if (error) {
      const mapped = mapAuthError(error, "send");
      if (mapped.kind === "not_found") return { sent: true, message: neutral, retryAfter: null, rateLimited: false };
      if (mapped.kind === "rate_limit") return { sent: false, message: mapped.message, retryAfter: mapped.retryAfter, rateLimited: true };
      return { sent: false, message: mapped.message, retryAfter: null, rateLimited: false };
    }
    return { sent: true, message: neutral, retryAfter: null, rateLimited: false };
  });


/**
 * "Password dimenticata" (UD-120, Direzione 14/10/2026: no codes): one e-mail with the "Scegli la password" button
 * (Supabase recovery, template with token_hash -> /accedi/conferma -> password page). Same answer for every address.
 */
const allowReset = createRateLimiter(5, 10 * 60 * 1000);

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => z.object({ email: z.string().trim().toLowerCase().email().max(120) }).parse(d))
  .handler(async ({ data }): Promise<MagicLinkOutcome> => {
    const neutral =
      'Se questa e-mail è registrata, entro un minuto ti arriva un messaggio con il pulsante "Scegli la password". Toccalo una volta, scegli la password e poi entri sempre con e-mail o telefono e password. Se non arriva, controlla lo spam.';
    if (!allowReset(clientIp())) return { sent: false, message: "Hai già chiesto diverse e-mail: riprova tra dieci minuti.", retryAfter: 600, rateLimited: true };
    const sb = serverSupabase();
    if (!sb) return { sent: false, message: "L'accesso non è ancora configurato su questo server.", retryAfter: null, rateLimited: false };
    const origin = configuredSiteUrl(process.env) ?? getRequestUrl().origin;
    const { error } = await sb.auth.resetPasswordForEmail(data.email, { redirectTo: `${origin}/accedi/conferma` });
    if (error && (error.status === 429 || /rate limit|too many/i.test(error.message))) {
      return { sent: false, message: "Troppe richieste: riprova tra qualche minuto.", retryAfter: 60, rateLimited: true };
    }
    return { sent: true, message: neutral, retryAfter: 60, rateLimited: false };
  });

export interface ConfirmOutcome {
  ok: boolean;
  next: string;
  message: string;
  /** Why it failed, so the page can offer the right next step (e.g. a new code). */
  kind?: AuthErrorKind | undefined;
  retryAfter?: number | null | undefined;
}

/**
 * Common tail of every e-mail sign-in (link, code, token hash): the session cookies are already set by the client;
 * pick the landing and, on a first access without password, invite the person to choose one.
 */
async function landAfterEmailSignIn(
  user: { user_metadata?: unknown; app_metadata?: unknown } | null | undefined,
  asked: string | undefined,
  next: string,
): Promise<ConfirmOutcome> {
  const landing = asked ? next : (await sessionView()).landing;
  // Google / Apple / Facebook accounts have no password: ask once for phone, birth date and consent (UD-117).
  if (isSocialUser(user?.app_metadata)) {
    if (!profileComplete(user?.user_metadata)) {
      return { ok: true, next: `${PROFILE_PAGE}?next=${encodeURIComponent(landing)}`, message: "Sei dentro." };
    }
    return { ok: true, next: landing, message: "Sei dentro." };
  }
  if (!hasAppPassword(user?.user_metadata)) {
    return { ok: true, next: `${PASSWORD_PAGE}?benvenuto=1&next=${encodeURIComponent(landing)}`, message: "Sei dentro." };
  }
  return { ok: true, next: landing, message: "Sei dentro." };
}

export const confirmMagicLink = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; next?: string | undefined; remember?: boolean | undefined }) =>
    z.object({ code: z.string().min(8).max(400), next: z.string().max(200).optional(), remember: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<ConfirmOutcome> => {
    const remember = data.remember !== false;
    const sb = serverSupabase({ remember });
    const next = safeNext(data.next);
    if (!sb) return { ok: false, next, message: "L'accesso non è ancora configurato su questo server." };
    setRememberPreference(remember);
    const { data: exchanged, error } = await sb.auth.exchangeCodeForSession(data.code);
    if (error) {
      const mapped = mapAuthError(error, "send");
      return { ok: false, next, message: mapped.kind === "rate_limit" ? mapped.message : "Link scaduto o già usato: chiedi di nuovo la e-mail «Scegli la password» da Entra.", kind: mapped.kind === "rate_limit" ? "rate_limit" : "otp_invalid", retryAfter: mapped.retryAfter };
    }
    return landAfterEmailSignIn(exchanged.user, data.next, next);
  });

/**
 * Sign-in with the 6-digit code of the e-mail (Supabase `verifyOtp` type "email"). Same cookies/session handling as
 * the link: works even when a mail scanner already consumed the link, and from a different device.
 */
export const verifyEmailCode = createServerFn({ method: "POST" })
  .inputValidator((d: VerifyOtpInput) => verifyOtpInputSchema.parse(d))
  .handler(async ({ data }): Promise<ConfirmOutcome> => {
    const remember = data.remember !== false;
    const sb = serverSupabase({ remember });
    const next = safeNext(data.next);
    if (!sb) return { ok: false, next, message: "L'accesso non è ancora configurato su questo server." };
    setRememberPreference(remember);
    const { data: verified, error } = await sb.auth.verifyOtp({ email: data.email, token: data.token, type: "email" });
    if (error || !verified.session) {
      const mapped = error ? mapAuthError(error, "verify") : mapAuthError({}, "verify");
      return { ok: false, next, message: mapped.message, kind: mapped.kind, retryAfter: mapped.retryAfter };
    }
    return landAfterEmailSignIn(verified.user, data.next, next);
  });

/**
 * Scanner-safe template link (`/accedi/conferma?token_hash=…&type=email`, docs/auth/magic-link-template.md): the page
 * calls this only after the person taps "Entra", so a mail scanner fetching the URL never consumes the token.
 */
export const confirmTokenHash = createServerFn({ method: "POST" })
  .inputValidator((d: TokenHashInput) => tokenHashInputSchema.parse(d))
  .handler(async ({ data }): Promise<ConfirmOutcome> => {
    const remember = data.remember !== false;
    const sb = serverSupabase({ remember });
    const next = safeNext(data.next);
    if (!sb) return { ok: false, next, message: "L'accesso non è ancora configurato su questo server." };
    setRememberPreference(remember);
    const { data: verified, error } = await sb.auth.verifyOtp({ token_hash: data.tokenHash, type: data.type });
    if (error || !verified.session) {
      const mapped = error ? mapAuthError(error, "send") : mapAuthError({}, "send");
      return { ok: false, next, message: mapped.kind === "rate_limit" ? mapped.message : "Link scaduto o già usato: chiedi di nuovo la e-mail «Scegli la password» da Entra.", kind: mapped.kind === "rate_limit" ? "rate_limit" : "otp_invalid", retryAfter: mapped.retryAfter };
    }
    // "Scegli la password" e-mail (registration of an account that already existed, or forgotten password).
    if (data.type === "recovery") {
      const landing = data.next ? next : (await sessionView()).landing;
      return { ok: true, next: `${PASSWORD_PAGE}?benvenuto=1&next=${encodeURIComponent(landing)}`, message: "Sei dentro: scegli la password." };
    }
    return landAfterEmailSignIn(verified.user, data.next, next);
  });

export interface PasswordOutcome {
  ok: boolean;
  /** Where to go after a successful sign-in. */
  next: string;
  /** Plain Italian for the form; never the raw provider error. */
  message: string;
  /** Failure kind: "invalid_credentials" makes the form promote the e-mail link/code path. */
  kind?: AuthErrorKind | undefined;
}

const allowPasswordAttempt = createRateLimiter(10, 10 * 60 * 1000);

export const signInWithPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string; password: string; remember: boolean; next?: string | undefined }) =>
    z
      .object({
        identifier: z.string().trim().max(120),
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
    const wrong = "E-mail (o telefono) o password non corretti. Riprova o usa \"Password dimenticata\".";
    if (!allowPasswordAttempt(clientIp())) return { ok: false, next, message: "Troppi tentativi: riprova tra dieci minuti.", kind: "rate_limit" };
    const id = parseLoginIdentifier(data.identifier);
    if (id.kind === "invalid") return { ok: false, next, message: "Scrivi l'e-mail o il numero di telefono usati nella registrazione." };
    let email = id.kind === "email" ? id.email : null;
    if (id.kind === "phone") {
      // r105: the database returns the e-mail only when this phone AND this password belong to one single account.
      const { data: found, error: lookupError } = await sb.rpc("scd_login_email", { p_phone: id.phone, p_password: data.password });
      if (lookupError || typeof found !== "string" || !found) return { ok: false, next, message: wrong, kind: "invalid_credentials" };
      email = found;
    }
    if (!email) return { ok: false, next, message: wrong, kind: "invalid_credentials" };
    setRememberPreference(data.remember);
    const { error } = await sb.auth.signInWithPassword({ email, password: data.password });
    if (error) {
      // Same answer for unknown e-mail and wrong password (no account enumeration).
      const mapped = mapAuthError(error, "password");
      return { ok: false, next, message: mapped.message, kind: mapped.kind };
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
    if (meError || !me.user) return { ok: false, message: "Sessione scaduta: chiedi di nuovo la e-mail «Scegli la password» da Entra." };
    const { error } = await sb.auth.updateUser({ password: data.password, data: { scd_password_set: true } });
    if (error) {
      if (/different from the old/i.test(error.message)) return { ok: false, message: "È uguale alla password attuale: scegline una diversa." };
      if (/weak|pwned|leaked/i.test(error.message)) return { ok: false, message: "Password troppo facile da indovinare: scegline una più lunga o meno comune." };
      if (/reauthenticat/i.test(error.message)) return { ok: false, message: "Per sicurezza chiedi di nuovo la e-mail «Scegli la password» da Entra e cambiala da lì." };
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
