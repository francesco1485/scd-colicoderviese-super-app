import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_POSITIONS,
  OFFICE_POSITIONS,
  POSITION_GROUPS,
  POSITION_LABEL,
  accountCounts,
  auditSummary,
  canEditAccount,
  filterAccounts,
  grantablePositions,
  grantableRoles,
  lastSeen,
  type Account,
} from "./access-admin";
import { R138_POSITIONS } from "./session";

const acc = (o: Partial<Account>): Account => ({
  userId: crypto.randomUUID(),
  email: "x@example.it",
  role: "FAMILY",
  positions: [],
  teams: [],
  active: true,
  lastSignInAt: null,
  createdAt: "2026-10-11T10:00:00Z",
  persons: [],
  ...o,
});

describe("access admin", () => {
  it("keeps assignable positions equal to the database list (r65, extended in r76, r87, r136 and r138)", () => {
    const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261016_r138_position_catalog.sql", import.meta.url)), "utf8");
    const m = /assignable text\[\] := array\[([^\]]+)\]/.exec(sql);
    expect(m).not.toBeNull();
    const fromSql = (m?.[1] ?? "").match(/'([a-z-]+)'/g)?.map((s) => s.slice(1, -1)) ?? [];
    expect([...fromSql].sort()).toEqual([...ASSIGNABLE_POSITIONS].sort());
  });

  it("r136 recreates the r87 guard unchanged except for the 'nutrizionista' position", () => {
    const body = (file: string) => {
      const sql = readFileSync(fileURLToPath(new URL(`../../../../supabase/migrations/${file}`, import.meta.url)), "utf8");
      const m = /create or replace function public\.scd_access_admin_guard\([\s\S]*?\n\$\$;/.exec(sql);
      return (m?.[0] ?? "").replace(",'nutrizionista'", "");
    };
    expect(body("20261016_r136_infermeria_nutrizione.sql")).not.toBe("");
    expect(body("20261016_r136_infermeria_nutrizione.sql")).toBe(body("20261012_r87_auto_moderation.sql"));
  });

  it("r138 recreates the r136 guard unchanged except for the four r138 positions (assignable and office_pos)", () => {
    const guard = (file: string) => {
      const sql = readFileSync(fileURLToPath(new URL(`../../../../supabase/migrations/${file}`, import.meta.url)), "utf8");
      return /create or replace function public\.scd_access_admin_guard\([\s\S]*?\n\$\$;/.exec(sql)?.[0] ?? "";
    };
    const r138 = guard("20261016_r138_position_catalog.sql");
    expect(r138).not.toBe("");
    const four = ",\n    'direttore-sportivo-agonistica','direttore-sportivo-generale','responsabile-safeguarding','fisioterapista'";
    expect(r138.split(four).length - 1).toBe(2);
    expect(r138.replaceAll(four, "")).toBe(guard("20261016_r136_infermeria_nutrizione.sql"));
    // Review R2: office_pos (Direzione only) mirrors OFFICE_POSITIONS.
    const office = (/office_pos text\[\] := array\[([^\]]+)\]/.exec(r138)?.[1] ?? "").match(/'([a-z-]+)'/g)?.map((x) => x.slice(1, -1)) ?? [];
    expect([...office].sort()).toEqual([...OFFICE_POSITIONS].sort());
  });

  it("labels and groups every assignable position exactly once", () => {
    for (const p of ASSIGNABLE_POSITIONS) expect(POSITION_LABEL[p], p).toBeTruthy();
    const grouped = POSITION_GROUPS.flatMap((g) => g.ids);
    expect([...grouped].sort()).toEqual([...ASSIGNABLE_POSITIONS].sort());
  });

  it("lets Direzione edit everyone but itself and Segreteria only non-office accounts", () => {
    expect(canEditAccount("DIRECTION", "SECRETARIAT", false)).toBe(true);
    expect(canEditAccount("DIRECTION", "DIRECTION", true)).toBe(false);
    expect(canEditAccount("SECRETARIAT", "MANAGER", false)).toBe(true);
    expect(canEditAccount("SECRETARIAT", "DIRECTION", false)).toBe(false);
    expect(canEditAccount("MANAGER", "FAMILY", false)).toBe(false);
    expect(canEditAccount(null, "FAMILY", false)).toBe(false);
  });

  it("offers office roles and positions only to Direzione", () => {
    expect(grantableRoles("DIRECTION")).toContain("DIRECTION");
    expect(grantableRoles("SECRETARIAT")).not.toContain("SECRETARIAT");
    expect(grantablePositions("SECRETARIAT")).toContain("autista");
    expect(grantablePositions("SECRETARIAT")).not.toContain("presidente");
    expect(grantablePositions("MISTER")).toEqual([]);
  });

  it("offers the r138 positions only when r138 is live, and only to the Direzione (UD-161, review R1/R2)", () => {
    for (const p of R138_POSITIONS) {
      expect(grantablePositions("DIRECTION"), p).not.toContain(p);
      expect(grantablePositions("DIRECTION", true), p).toContain(p);
      expect(grantablePositions("SECRETARIAT", true), p).not.toContain(p);
      expect(POSITION_LABEL[p], p).toBeTruthy();
    }
  });

  it("filters by text, role and status", () => {
    const list = [
      acc({ email: "mario@x.it", role: "MISTER", lastSignInAt: "2026-10-11T10:00:00Z", persons: [{ id: "1", name: "Mario Rossi", kind: "staff", link: "AUTO_VERIFIED" }] }),
      acc({ email: "luca@x.it", role: "SECRETARIAT" }),
      acc({ email: "anna@x.it", active: false }),
      acc({ email: "autista@x.it", role: "MANAGER", positions: ["autista"] }),
    ];
    expect(filterAccounts(list, { q: "rossi" }).map((a) => a.email)).toEqual(["mario@x.it"]);
    expect(filterAccounts(list, { q: "pulmini" }).map((a) => a.email)).toEqual(["autista@x.it"]);
    expect(filterAccounts(list, { role: "ufficio" }).map((a) => a.email)).toEqual(["luca@x.it"]);
    expect(filterAccounts(list, { status: "sospesi" }).map((a) => a.email)).toEqual(["anna@x.it"]);
    expect(filterAccounts(list, { status: "mai-entrati" }).length).toBe(2);
    expect(accountCounts(list)).toEqual({ total: 4, active: 3, suspended: 1, signedIn: 1, office: 1, withExtraAreas: 1 });
  });

  it("summarises audit entries in Italian", () => {
    expect(auditSummary("SET_ACCESS", { before: { role: "MANAGER", positions: [], active: true }, after: { role: "MANAGER", positions: ["autista"], active: false } })).toBe("aree: Autista (pulmini) · sospeso");
    expect(auditSummary("GRANT_PERSON", { role: "STAFF", positions: ["responsabile-magazzino"] })).toBe("ruolo Staff · aree: Magazzino");
    expect(lastSeen(null)).toBe("mai entrato");
  });
});
