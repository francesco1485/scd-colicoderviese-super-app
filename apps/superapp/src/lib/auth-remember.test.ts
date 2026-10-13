import { describe, expect, it } from "vitest";

import {
  PASSWORD_MAX,
  REMEMBER_COOKIE,
  hasAppPassword,
  passwordProblem,
  rememberFrom,
  sessionCookieOptions,
} from "./auth-remember";

describe("password sign-in and Ricordami (Direzione 2026-10-13)", () => {
  it("remembers the device unless the person explicitly said no", () => {
    expect(rememberFrom({})).toBe(true);
    expect(rememberFrom({ [REMEMBER_COOKIE]: "1" })).toBe(true);
    expect(rememberFrom({ [REMEMBER_COOKIE]: "0" })).toBe(false);
  });

  it("keeps long-lived session cookies only when Ricordami is on", () => {
    const expires = new Date("2027-10-13T00:00:00Z");
    const base = { path: "/", sameSite: "lax", maxAge: 34_560_000, expires };
    expect(sessionCookieOptions(base, true)).toEqual(base);
    const session = sessionCookieOptions(base, false);
    expect(session).toEqual({ path: "/", sameSite: "lax" });
    expect(base.maxAge).toBe(34_560_000); // input not mutated
  });

  it("never turns a sign-out deletion into a lasting cookie", () => {
    expect(sessionCookieOptions({ maxAge: 0 }, false)).toEqual({ maxAge: 0 });
    expect(sessionCookieOptions(undefined, false)).toEqual({});
  });

  it("asks for a reasonable password in plain Italian", () => {
    expect(passwordProblem("abc1")).toMatch(/almeno 8/);
    expect(passwordProblem("solamentelettere")).toMatch(/lettera e un numero/);
    expect(passwordProblem("12345678")).toMatch(/lettera e un numero/);
    expect(passwordProblem(" colico2026")).toMatch(/spazi/);
    expect(passwordProblem("a1".repeat(PASSWORD_MAX))).toMatch(/al massimo/);
    expect(passwordProblem("Colico2026", "Colico2027")).toMatch(
      /non coincidono/,
    );
    expect(passwordProblem("Colico2026", "Colico2026")).toBeNull();
    expect(passwordProblem("Derviò2026")).toBeNull();
  });

  it("reads the in-app password flag only when it is exactly true", () => {
    expect(hasAppPassword({ scd_password_set: true })).toBe(true);
    expect(hasAppPassword({ scd_password_set: "true" })).toBe(false);
    expect(hasAppPassword(null)).toBe(false);
    expect(hasAppPassword(undefined)).toBe(false);
  });
});
