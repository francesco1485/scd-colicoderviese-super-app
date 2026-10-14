import { describe, expect, it } from "vitest";

import {
  EMPTY_DECLARATION,
  accessPaths,
  childrenProblem,
  enabledProviders,
  isSocialUser,
  normalizeDeclaration,
  profileComplete,
  signupMetadata,
  supportMailto,
  validateSignup,
  type SignupInput,
} from "./signup";

const TODAY = "2026-10-14";
const ok: SignupInput = {
  firstName: "Mario",
  lastName: "Bianchi",
  birthDate: "1980-05-02",
  email: "mario@example.org",
  phone: "333 1234567",
  password: "Campo2026",
  confirm: "Campo2026",
  consent: true,
  declaration: EMPTY_DECLARATION,
};

describe("validateSignup", () => {
  it("accepts a complete registration", () => {
    expect(validateSignup(ok, TODAY)).toEqual({});
  });
  it("requires the phone", () => {
    expect(validateSignup({ ...ok, phone: "" }, TODAY).phone).toMatch(
      /telefono/i,
    );
  });
  it("checks password rules and the confirmation", () => {
    expect(
      validateSignup({ ...ok, password: "corta1", confirm: "corta1" }, TODAY)
        .password,
    ).toMatch(/almeno/);
    expect(
      validateSignup(
        { ...ok, password: "solalettere", confirm: "solalettere" },
        TODAY,
      ).password,
    ).toMatch(/numero/);
    const e = validateSignup({ ...ok, confirm: "Campo2027" }, TODAY);
    expect(e.confirm).toMatch(/coincidono/);
    expect(e.password).toBeUndefined();
  });
  it("sends under-14s to a parent", () => {
    expect(
      validateSignup({ ...ok, birthDate: "2014-01-01" }, TODAY).birthDate,
    ).toMatch(/genitore/);
  });
  it("asks a parent for at least one child", () => {
    const d = { kinds: ["GENITORE" as const], children: [], note: "" };
    expect(validateSignup({ ...ok, declaration: d }, TODAY).children).toMatch(
      /almeno un figlio/,
    );
  });
});

describe("childrenProblem", () => {
  const parent = (
    children: { firstName: string; lastName: string; birthYear: string }[],
  ) => ({ kinds: ["GENITORE" as const], children, note: "" });
  it("is silent for non parents", () => {
    expect(childrenProblem(EMPTY_DECLARATION, TODAY)).toBeNull();
  });
  it("wants name and surname, a sensible year", () => {
    expect(
      childrenProblem(
        parent([{ firstName: "Luca", lastName: "", birthYear: "" }]),
        TODAY,
      ),
    ).toMatch(/nome e cognome/);
    expect(
      childrenProblem(
        parent([{ firstName: "Luca", lastName: "Bianchi", birthYear: "1950" }]),
        TODAY,
      ),
    ).toMatch(/Anno/);
    expect(
      childrenProblem(
        parent([{ firstName: "Luca", lastName: "Bianchi", birthYear: "2014" }]),
        TODAY,
      ),
    ).toBeNull();
    expect(
      childrenProblem(
        parent([
          { firstName: "Luca", lastName: "Bianchi", birthYear: "" },
          { firstName: "", lastName: "", birthYear: "" },
        ]),
        TODAY,
      ),
    ).toBeNull();
  });
});

describe("normalizeDeclaration", () => {
  it("defaults to fan, drops unknown kinds and children of non parents", () => {
    expect(normalizeDeclaration(EMPTY_DECLARATION).kinds).toEqual(["TIFOSO"]);
    const n = normalizeDeclaration({
      kinds: ["DIRIGENTE", "HACKER" as never, "DIRIGENTE"],
      children: [{ firstName: "A", lastName: "B", birthYear: "" }],
      note: "  Under   15 ",
    });
    expect(n).toEqual({ kinds: ["DIRIGENTE"], children: [], note: "Under 15" });
  });
  it("keeps catalogue order and trims children, max five", () => {
    const kids = Array.from({ length: 7 }, (_, i) => ({
      firstName: ` Kid${i} `,
      lastName: "Rossi",
      birthYear: "2015",
    }));
    const n = normalizeDeclaration({
      kinds: ["DIRIGENTE", "GENITORE"],
      children: kids,
      note: "",
    });
    expect(n.kinds).toEqual(["GENITORE", "DIRIGENTE"]);
    expect(n.children).toHaveLength(5);
    expect(n.children[0]).toEqual({
      firstName: "Kid0",
      lastName: "Rossi",
      birthYear: "2015",
    });
  });
});

describe("accessPaths", () => {
  it("always starts in the open area", () => {
    expect(accessPaths(EMPTY_DECLARATION)).toEqual(["OPEN_AREA"]);
  });
  it("adds the automatic check for parents and athletes, the review for officials", () => {
    expect(
      accessPaths({ kinds: ["GENITORE", "DIRIGENTE"], children: [], note: "" }),
    ).toEqual(["OPEN_AREA", "AUTO_CHECK", "ROLE_REVIEW"]);
    expect(
      accessPaths({ kinds: ["SOCIO", "VOLONTARIO"], children: [], note: "" }),
    ).toEqual(["OPEN_AREA"]);
  });
});

describe("providers and social accounts", () => {
  it("shows only providers really enabled", () => {
    expect(
      enabledProviders({
        external: { google: true, apple: false, facebook: true, github: true },
      }),
    ).toEqual(["google", "facebook"]);
    expect(enabledProviders(null)).toEqual([]);
    expect(enabledProviders({ external: "x" })).toEqual([]);
  });
  it("recognizes social logins and missing profile data", () => {
    expect(isSocialUser({ provider: "google" })).toBe(true);
    expect(isSocialUser({ provider: "email" })).toBe(false);
    expect(isSocialUser(undefined)).toBe(false);
    expect(
      profileComplete({
        phone: "333",
        birth_date: "1980-01-01",
        scd_profile_consent: true,
      }),
    ).toBe(true);
    expect(
      profileComplete({
        phone: "",
        birth_date: "1980-01-01",
        scd_profile_consent: true,
      }),
    ).toBe(false);
  });
});

describe("signupMetadata and support", () => {
  it("stores clean profile data, the declaration and the password flag, nothing else", () => {
    const m = signupMetadata(ok, {
      kinds: ["GENITORE"],
      children: [{ firstName: "Luca", lastName: "Bianchi", birthYear: "2015" }],
      note: "",
    });
    expect(Object.keys(m).sort()).toEqual([
      "birth_date",
      "first_name",
      "last_name",
      "phone",
      "scd_declared",
      "scd_password_set",
    ]);
    expect(m["phone"]).toBe("333 1234567");
  });
  it("prefills the help mail", () => {
    const u = supportMailto("Pagina Accedi");
    expect(u.startsWith("mailto:sportclubcolico@gmail.com?subject=")).toBe(
      true,
    );
    expect(decodeURIComponent(u)).toContain("Dove: Pagina Accedi");
  });
});
