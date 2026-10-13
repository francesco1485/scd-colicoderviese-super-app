/**
 * E-mail code sign-in helpers (Direzione 2026-10-13, Supabase auth logs 13/10 17:10–17:25).
 *
 * Testers could not log in: repeated link requests hit the built-in mailer rate limit (429), links opened twice or
 * pre-fetched by mail scanners were already consumed (403 "One-time token not found"), and people who never chose a
 * password tried the password form. This module is pure (client- and server-safe): it turns provider errors into plain
 * Italian, validates the 6-digit code and drives the client-side cooldown of the "send" button. No network, no secrets.
 */
import { z } from "zod";

/** Digits in the e-mail code (Supabase Auth → Email OTP length, project default). */
export const OTP_LENGTH = 6;

/** Seconds the "send" button stays disabled after a request, so people cannot burn the mailer rate limit. */
export const SEND_COOLDOWN_SECONDS = 60;

export const OTP_INVALID_MESSAGE = "Codice non valido o scaduto: chiedine uno nuovo";
export const LINK_USED_MESSAGE = "Questo link è già stato usato o è scaduto. Succede anche quando il programma di posta lo apre da solo per controllarlo: nessun problema, chiedi un nuovo codice.";
export const MAIL_DOWN_MESSAGE = "Il servizio di invio mail non risponde: avvisa la segreteria";
export const INVALID_CREDENTIALS_MESSAGE = "E-mail o password non corretti. Se non hai mai impostato una password, usa il link o il codice via email.";

/** The subset of a Supabase AuthError this module reads (AuthApiError carries `status` and `code`). */
export interface ProviderError {
  message?: string | undefined;
  status?: number | undefined;
  code?: string | undefined;
}

export type AuthErrorKind = "rate_limit" | "mail_down" | "otp_invalid" | "invalid_credentials" | "not_found" | "not_confirmed" | "other";

export interface MappedAuthError {
  kind: AuthErrorKind;
  /** Seconds the provider asks to wait, when it says so ("you can only request this after 42 seconds"). */
  retryAfter: number | null;
  /** Plain Italian for the form; never the raw provider text. */
  message: string;
}

const RATE_CODES = new Set(["over_email_send_rate_limit", "over_request_rate_limit", "over_sms_send_rate_limit"]);
const OTP_CODES = new Set(["otp_expired", "otp_disabled_for_user", "bad_code_verifier", "flow_state_expired", "flow_state_not_found"]);

/** Seconds from "For security purposes, you can only request this after 42 seconds." (null when absent). */
export function retryAfterSeconds(message: string | undefined): number | null {
  if (!message) return null;
  const m = /after\s+(\d{1,4})\s*(?:s\b|sec|second)/i.exec(message);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function rateLimitMessage(retryAfter: number | null): string {
  const wait = retryAfter ? `${retryAfter} ${retryAfter === 1 ? "secondo" : "secondi"}` : "qualche minuto";
  return `Troppe richieste in poco tempo: aspetta ${wait} e riprova una sola volta`;
}

/**
 * Maps a Supabase auth error to a kind and a plain Italian message.
 * `context` picks the fallback wording: sending a code, verifying it, or signing in with password.
 */
export function mapAuthError(error: ProviderError, context: "send" | "verify" | "password"): MappedAuthError {
  const message = error.message ?? "";
  const code = (error.code ?? "").toLowerCase();
  const retryAfter = retryAfterSeconds(message);
  if (error.status === 429 || RATE_CODES.has(code) || /rate limit|too many requests|only request this after/i.test(message)) {
    return { kind: "rate_limit", retryAfter, message: rateLimitMessage(retryAfter) };
  }
  // SMTP down or misconfigured (auth logs: "Error sending magic link email", 500 unexpected_failure).
  if (context === "send" && (code === "unexpected_failure" || (error.status !== undefined && error.status >= 500) || /error sending|smtp/i.test(message))) {
    return { kind: "mail_down", retryAfter: null, message: MAIL_DOWN_MESSAGE };
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return { kind: "invalid_credentials", retryAfter: null, message: INVALID_CREDENTIALS_MESSAGE };
  }
  if (code === "email_not_confirmed" || /not confirmed/i.test(message)) {
    return { kind: "not_confirmed", retryAfter: null, message: "Questo indirizzo non è ancora confermato: entra con il link o il codice via email." };
  }
  if (code === "user_not_found" || code === "signup_disabled" || code === "otp_disabled" || /signups not allowed|user not found|otp_disabled/i.test(message)) {
    return { kind: "not_found", retryAfter: null, message: OTP_INVALID_MESSAGE };
  }
  if (context !== "password" && (OTP_CODES.has(code) || error.status === 403 || /expired|invalid|one-time token not found|token not found/i.test(message))) {
    return { kind: "otp_invalid", retryAfter: null, message: context === "verify" ? OTP_INVALID_MESSAGE : LINK_USED_MESSAGE };
  }
  const fallback =
    context === "send" ? "Invio non riuscito, riprova tra un minuto." : context === "verify" ? OTP_INVALID_MESSAGE : "Accesso non riuscito, riprova tra un minuto.";
  return { kind: "other", retryAfter: null, message: fallback };
}

/** Keeps only digits and cuts to OTP_LENGTH: works for typing, pasting "123 456" or "Codice: 123456". */
export function normalizeOtpInput(raw: string): string {
  return raw.replace(/\D+/g, "").slice(0, OTP_LENGTH);
}

export const otpCodeSchema = z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), "Il codice è di 6 cifre");

/** Input of the verify server function: e-mail + exactly 6 digits (spaces tolerated, nothing else). */
export const verifyOtpInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  token: z
    .string()
    .max(20)
    .transform((t) => t.replace(/\s+/g, ""))
    .pipe(otpCodeSchema),
  next: z.string().max(200).optional(),
  remember: z.boolean().optional(),
});
export type VerifyOtpInput = z.input<typeof verifyOtpInputSchema>;

/** Input of the confirm-by-click path for a scanner-safe template link (`?token_hash=…&type=email`). */
export const tokenHashInputSchema = z.object({
  tokenHash: z.string().regex(/^[A-Za-z0-9_-]{16,200}$/),
  type: z.enum(["email", "magiclink"]).default("email"),
  next: z.string().max(200).optional(),
  remember: z.boolean().optional(),
});
export type TokenHashInput = z.input<typeof tokenHashInputSchema>;

/**
 * Cooldown of the "send" button. `until` is an epoch-ms deadline; the server may ask for a longer wait (retryAfter),
 * never a shorter one than the client cooldown.
 */
export function cooldownUntil(now: number, retryAfter: number | null = null, base: number = SEND_COOLDOWN_SECONDS): number {
  const seconds = Math.max(base, retryAfter ?? 0);
  return now + seconds * 1000;
}

/** Whole seconds left before the button is usable again (0 when free). */
export function secondsLeft(until: number | null, now: number): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** Label of the send button for the current countdown. */
export function sendButtonLabel(left: number, busy: boolean, idle: string): string {
  if (busy) return "Invio…";
  if (left > 0) return `Riprova tra ${left} s`;
  return idle;
}
