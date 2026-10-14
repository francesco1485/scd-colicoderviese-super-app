import { describe, expect, it } from "vitest";

import { normalizePhone, parseLoginIdentifier } from "./login-identifier";

describe("normalizePhone", () => {
  it("reduces the common Italian spellings to national digits", () => {
    expect(normalizePhone("333 1234567")).toBe("3331234567");
    expect(normalizePhone("+39 333-123.4567")).toBe("3331234567");
    expect(normalizePhone("0039 3331234567")).toBe("3331234567");
    expect(normalizePhone("393331234567")).toBe("3331234567");
    expect(normalizePhone("0341 940123")).toBe("0341940123");
  });

  it("rejects text and implausible lengths", () => {
    expect(normalizePhone("ciao")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("33312345678901234")).toBeNull();
  });
});

describe("parseLoginIdentifier", () => {
  it("recognises an e-mail and lower-cases it", () => {
    expect(parseLoginIdentifier("  Mario.Rossi@Example.IT ")).toEqual({ kind: "email", email: "mario.rossi@example.it" });
  });

  it("recognises a phone", () => {
    expect(parseLoginIdentifier("+39 333 1234567")).toEqual({ kind: "phone", phone: "3331234567" });
  });

  it("refuses empty, broken e-mails and words", () => {
    expect(parseLoginIdentifier("")).toEqual({ kind: "invalid" });
    expect(parseLoginIdentifier("mario@")).toEqual({ kind: "invalid" });
    expect(parseLoginIdentifier("mario rossi")).toEqual({ kind: "invalid" });
  });
});
