import { describe, expect, it } from "vitest";

import {
  INVALID_CREDENTIALS_MESSAGE,
  LINK_USED_MESSAGE,
  MAIL_DOWN_MESSAGE,
  OTP_INVALID_MESSAGE,
  SEND_COOLDOWN_SECONDS,
  cooldownUntil,
  mapAuthError,
  normalizeOtpInput,
  rateLimitMessage,
  retryAfterSeconds,
  secondsLeft,
  sendButtonLabel,
  tokenHashInputSchema,
  verifyOtpInputSchema,
} from "./auth-otp";

describe("mapAuthError — rate limits", () => {
  it("parses N seconds from the provider message", () => {
    const m = mapAuthError({ status: 429, code: "over_email_send_rate_limit", message: "For security purposes, you can only request this after 42 seconds." }, "send");
    expect(m.kind).toBe("rate_limit");
    expect(m.retryAfter).toBe(42);
    expect(m.message).toBe("Troppe richieste in poco tempo: aspetta 42 secondi e riprova una sola volta");
  });

  it("falls back to 'qualche minuto' when no N is given", () => {
    const m = mapAuthError({ status: 429, message: "Email rate limit exceeded" }, "send");
    expect(m.kind).toBe("rate_limit");
    expect(m.retryAfter).toBeNull();
    expect(m.message).toBe("Troppe richieste in poco tempo: aspetta qualche minuto e riprova una sola volta");
  });

  it("recognises the error code alone, without HTTP status", () => {
    expect(mapAuthError({ code: "over_email_send_rate_limit" }, "send").kind).toBe("rate_limit");
    expect(mapAuthError({ code: "over_request_rate_limit" }, "verify").kind).toBe("rate_limit");
  });

  it("parses short and singular forms", () => {
    expect(retryAfterSeconds("you can only request this after 5s")).toBe(5);
    expect(retryAfterSeconds("you can only request this after 1 second")).toBe(1);
    expect(retryAfterSeconds("nothing here")).toBeNull();
    expect(retryAfterSeconds(undefined)).toBeNull();
    expect(rateLimitMessage(1)).toContain("aspetta 1 secondo e");
  });
});

describe("mapAuthError — SMTP failure", () => {
  it("maps unexpected_failure / 500 on send to the segreteria message", () => {
    expect(mapAuthError({ status: 500, code: "unexpected_failure", message: "Error sending magic link email" }, "send")).toEqual({
      kind: "mail_down",
      retryAfter: null,
      message: MAIL_DOWN_MESSAGE,
    });
    expect(mapAuthError({ status: 500, message: "gomail: 535 5.7.8 Username and Password not accepted" }, "send").message).toBe(MAIL_DOWN_MESSAGE);
    expect(mapAuthError({ code: "unexpected_failure" }, "send").kind).toBe("mail_down");
  });

  it("never exposes the raw provider text", () => {
    const raw = "gomail: 535 5.7.8 Username and Password not accepted";
    for (const context of ["send", "verify", "password"] as const) {
      expect(mapAuthError({ status: 500, message: raw }, context).message).not.toContain("535");
    }
  });
});

describe("mapAuthError — codes and passwords", () => {
  it("wrong or expired code → Italian invalid message", () => {
    expect(mapAuthError({ status: 403, code: "otp_expired", message: "Token has expired or is invalid" }, "verify").message).toBe(OTP_INVALID_MESSAGE);
    expect(mapAuthError({ status: 403, message: "Email link is invalid or has expired" }, "verify").kind).toBe("otp_invalid");
    expect(mapAuthError({}, "verify").message).toBe(OTP_INVALID_MESSAGE);
  });

  it("a consumed link in the confirm path explains the mail scanner case", () => {
    expect(mapAuthError({ status: 403, message: "One-time token not found" }, "send").message).toBe(LINK_USED_MESSAGE);
  });

  it("invalid credentials suggest the e-mail link or code", () => {
    const m = mapAuthError({ status: 400, code: "invalid_credentials", message: "Invalid login credentials" }, "password");
    expect(m.kind).toBe("invalid_credentials");
    expect(m.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(m.message).toContain("Se non hai ancora scelto una password");
    expect(mapAuthError({ message: "Invalid login credentials" }, "password").kind).toBe("invalid_credentials");
  });

  it("unknown address on send is not enumerated", () => {
    expect(mapAuthError({ code: "otp_disabled", message: "Signups not allowed for otp" }, "send").kind).toBe("not_found");
  });
});

describe("cooldown", () => {
  const t0 = 1_000_000;

  it("locks the send button for 60 seconds by default", () => {
    expect(SEND_COOLDOWN_SECONDS).toBe(60);
    const until = cooldownUntil(t0);
    expect(until).toBe(t0 + 60_000);
    expect(secondsLeft(until, t0)).toBe(60);
    expect(secondsLeft(until, t0 + 59_001)).toBe(1);
    expect(secondsLeft(until, t0 + 60_000)).toBe(0);
    expect(secondsLeft(until, t0 + 90_000)).toBe(0);
    expect(secondsLeft(null, t0)).toBe(0);
  });

  it("honours a longer provider wait, never a shorter one", () => {
    expect(cooldownUntil(t0, 120)).toBe(t0 + 120_000);
    expect(cooldownUntil(t0, 10)).toBe(t0 + 60_000);
    expect(cooldownUntil(t0, null)).toBe(t0 + 60_000);
  });

  it("shows a visible countdown on the button", () => {
    expect(sendButtonLabel(42, false, "Invia link e codice")).toBe("Riprova tra 42 s");
    expect(sendButtonLabel(0, false, "Invia link e codice")).toBe("Invia link e codice");
    expect(sendButtonLabel(10, true, "Invia link e codice")).toBe("Invio…");
  });
});

describe("code input and server validation", () => {
  it("normalises typed and pasted codes", () => {
    expect(normalizeOtpInput("123 456")).toBe("123456");
    expect(normalizeOtpInput(" 12-34 56 ")).toBe("123456");
    expect(normalizeOtpInput("Codice: 654321")).toBe("654321");
    expect(normalizeOtpInput("1234567")).toBe("123456");
    expect(normalizeOtpInput("abc")).toBe("");
  });

  it("accepts exactly 6 digits after stripping spaces", () => {
    expect(verifyOtpInputSchema.parse({ email: " Nome@Esempio.IT ", token: "123 456" })).toEqual({ email: "nome@esempio.it", token: "123456" });
    expect(verifyOtpInputSchema.parse({ email: "a@b.it", token: "\t987654\n" }).token).toBe("987654");
  });

  it("rejects anything else", () => {
    for (const token of ["12345", "1234567", "12345a", "12-3456", "", "123 45"]) {
      expect(verifyOtpInputSchema.safeParse({ email: "a@b.it", token }).success, token).toBe(false);
    }
    expect(verifyOtpInputSchema.safeParse({ email: "not-an-email", token: "123456" }).success).toBe(false);
  });

  it("validates the scanner-safe token hash", () => {
    expect(tokenHashInputSchema.parse({ tokenHash: "pkce_0123456789abcdef0123" }).type).toBe("email");
    expect(tokenHashInputSchema.safeParse({ tokenHash: "short" }).success).toBe(false);
    expect(tokenHashInputSchema.safeParse({ tokenHash: "pkce_0123456789abcdef<script>" }).success).toBe(false);
  });
});
