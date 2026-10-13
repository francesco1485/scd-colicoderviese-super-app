import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DELETED_ITEMS,
  DELETION_EMAIL,
  DELETION_MESSAGE,
  KEPT_ITEMS,
  asDeletionOutcome,
  deletionMailto,
  isDelivered,
  validatePublicDeletion,
} from "./account-deletion";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("account deletion request (Play account-deletion policy, Apple 5.1.1(v))", () => {
  it("says what is deleted and what the law keeps", () => {
    const deleted = DELETED_ITEMS.map((i) => `${i.title} ${i.text}`)
      .join(" ")
      .toLowerCase();
    for (const w of ["account", "segui", "post", "fantacalcio", "avatar"])
      expect(deleted).toContain(w);
    const kept = KEPT_ITEMS.map((i) => i.title)
      .join(" ")
      .toLowerCase();
    for (const w of ["tesseramento figc", "contabili", "consensi"])
      expect(kept).toContain(w);
    expect(DELETION_EMAIL).toBe("sportclubcolico@gmail.com");
  });

  it("validates the public form before anything is sent", () => {
    expect(
      validatePublicDeletion({
        name: "Mario Rossi",
        email: "mario@example.it",
        note: "",
        confirm: true,
      }),
    ).toEqual({});
    const bad = validatePublicDeletion({
      name: "M",
      email: "nope",
      note: "x".repeat(301),
      confirm: false,
    });
    expect(Object.keys(bad).sort()).toEqual([
      "confirm",
      "email",
      "name",
      "note",
    ]);
  });

  it("maps database answers to known outcomes only", () => {
    expect(asDeletionOutcome("RECEIVED")).toBe("RECEIVED");
    expect(asDeletionOutcome("ALREADY")).toBe("ALREADY");
    expect(asDeletionOutcome("DROP TABLE")).toBe("ERROR");
    expect(asDeletionOutcome(null)).toBe("ERROR");
    expect(isDelivered("RECEIVED") && isDelivered("ALREADY")).toBe(true);
    expect(isDelivered("ERROR") || isDelivered("BUSY")).toBe(false);
    expect(DELETION_MESSAGE.ERROR).toContain(DELETION_EMAIL);
  });

  it("builds a ready e-mail for the fallback", () => {
    const m = deletionMailto({
      name: "Mario Rossi",
      email: "mario@example.it",
    });
    expect(m.startsWith("mailto:sportclubcolico@gmail.com?subject=")).toBe(
      true,
    );
    expect(decodeURIComponent(m)).toContain(
      "E-mail dell'account: mario@example.it",
    );
  });

  it("reuses the existing Secretariat queue and never deletes from the client", () => {
    const sql = read(
      "../../../../supabase/migrations/20261013_r96_account_deletion_request.sql",
    );
    expect(sql).not.toMatch(/create table/i);
    expect(sql).toMatch(/insert into public\.scd_proposals/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    const fn = read("./account-deletion.functions.ts");
    expect(fn).toContain('rpc("scd_account_deletion_request"');
    expect(fn).not.toMatch(/\.delete\(|deleteUser|admin\./);
  });

  it("is linked from the footer, the privacy notice and La mia SCD", () => {
    expect(read("../components/SiteChrome.tsx")).toContain(
      'href="/elimina-account"',
    );
    expect(read("../routes/privacy.tsx")).toContain('href="/elimina-account"');
    expect(read("../routes/la-mia-scd.tsx")).toContain("<DeleteAccountCard");
  });
});
