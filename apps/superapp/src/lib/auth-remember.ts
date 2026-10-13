/**
 * Password sign-in and "Ricordami" (Direzione request 2026-10-13): people must not need a new
 * e-mail link every time. Pure helpers only, so they are unit-tested without a server.
 *
 * - "Ricordami" ON (default): the Supabase session cookies keep their long lifetime and the
 *   refresh token keeps the person signed in on this device.
 * - "Ricordami" OFF: the same cookies become browser-session cookies (no Max-Age / Expires),
 *   so closing the browser or the app signs the person out.
 */

/** Device preference cookie; holds no personal data, only "1" or "0". */
export const REMEMBER_COOKIE = "scd_remember";

/** One year: how long the device remembers the "Ricordami" choice itself. */
export const REMEMBER_PREF_MAX_AGE = 60 * 60 * 24 * 365;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

/** Reads the device preference: anything but an explicit "0" means "remember me". */
export function rememberFrom(
  cookies: Readonly<Record<string, string | undefined>>,
): boolean {
  return cookies[REMEMBER_COOKIE] !== "0";
}

export interface CookieOptionsLike {
  maxAge?: number | undefined;
  expires?: Date | undefined;
  [key: string]: unknown;
}

/**
 * Cookie options for the Supabase session cookies. When the person did not ask to be
 * remembered, lifetime attributes are dropped so the browser deletes the cookies on close.
 * A deletion (maxAge 0) is always kept, otherwise sign-out would leave the session behind.
 */
export function sessionCookieOptions<T extends CookieOptionsLike>(
  options: T | undefined,
  remember: boolean,
): T | CookieOptionsLike {
  const o: CookieOptionsLike = { ...(options ?? {}) };
  if (remember) return o;
  if (o.maxAge === 0) return o;
  delete o.maxAge;
  delete o.expires;
  return o;
}

/** Plain-Italian reason why a new password is not acceptable, or null when it is fine. */
export function passwordProblem(
  password: string,
  confirm?: string,
): string | null {
  if (password.length < PASSWORD_MIN)
    return `La password deve avere almeno ${PASSWORD_MIN} caratteri.`;
  if (password.length > PASSWORD_MAX)
    return `La password può avere al massimo ${PASSWORD_MAX} caratteri.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password))
    return "Usa almeno una lettera e un numero.";
  if (/^\s|\s$/.test(password))
    return "Togli gli spazi all'inizio o alla fine.";
  if (confirm !== undefined && confirm !== password)
    return "Le due password non coincidono.";
  return null;
}

/** Where a person goes after the first sign-in by link when no password exists yet. */
export const PASSWORD_PAGE = "/accedi/password";

/** True when the account has already chosen a password in the app (user metadata flag). */
export function hasAppPassword(userMetadata: unknown): boolean {
  return (
    typeof userMetadata === "object" &&
    userMetadata !== null &&
    (userMetadata as Record<string, unknown>)["scd_password_set"] === true
  );
}
