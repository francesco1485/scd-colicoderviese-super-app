/** UD-116: ONE club communication chosen by the Direzione, always with an expiry, empty by default. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { noticeVisible, pickClubNotice, type ClubNotice } from "./club-notice";
import { CLUB_NOTICES } from "./club-notice.server";

const n = (o: Partial<ClubNotice>): ClubNotice => ({
  id: "n",
  title: "Campo di Dervio chiuso",
  text: "Lavori al manto: le gare vanno a Colico.",
  tone: "urgente",
  audience: "tutti",
  decidedBy: "Direzione",
  decidedOn: "2026-10-14",
  showFrom: "2026-10-15",
  showUntil: "2026-10-17",
  ...o,
});

describe("club communication (UD-116)", () => {
  it("is empty by default: nothing is published without a Direzione entry", () => {
    expect(CLUB_NOTICES).toEqual([]);
    expect(pickClubNotice(CLUB_NOTICES, "2026-10-15", true)).toBeNull();
  });

  it("appears from showFrom and disappears after showUntil (Rome days, inclusive)", () => {
    const x = n({});
    expect(noticeVisible(x, "2026-10-14", false)).toBe(false);
    expect(noticeVisible(x, "2026-10-15", false)).toBe(true);
    expect(noticeVisible(x, "2026-10-17", false)).toBe(true);
    expect(noticeVisible(x, "2026-10-18", false)).toBe(false);
  });

  it("fails closed: no expiry, an invalid or inverted window, or empty text hide it", () => {
    expect(noticeVisible(n({ showUntil: "" }), "2026-10-16", false)).toBe(
      false,
    );
    expect(
      noticeVisible(
        n({ showUntil: undefined as unknown as string }),
        "2026-10-16",
        false,
      ),
    ).toBe(false);
    expect(
      noticeVisible(n({ showUntil: "2026-02-30" }), "2026-10-16", false),
    ).toBe(false);
    expect(
      noticeVisible(n({ showFrom: "2026-10-18" }), "2026-10-17", false),
    ).toBe(false);
    expect(noticeVisible(n({ title: "  " }), "2026-10-16", false)).toBe(false);
  });

  it("shows a members-only communication only to signed-in people, and the first valid entry wins", () => {
    const soci = n({ id: "soci", audience: "soci" });
    expect(noticeVisible(soci, "2026-10-16", false)).toBe(false);
    expect(noticeVisible(soci, "2026-10-16", true)).toBe(true);
    const list = [
      n({ id: "old", showFrom: "2026-10-01", showUntil: "2026-10-05" }),
      soci,
      n({ id: "all" }),
    ];
    expect(pickClubNotice(list, "2026-10-16", false)?.id).toBe("all");
    expect(pickClubNotice(list, "2026-10-16", true)?.id).toBe("soci");
  });

  it("keeps the list on the server: no client file imports club-notice.server", () => {
    const src = (f: string) =>
      readFileSync(resolve(__dirname, "..", f), "utf8");
    for (const f of [
      "routes/index.tsx",
      "components/home/PublicHome.tsx",
      "components/home/MemberHome.tsx",
      "components/home/HomePractical.tsx",
    ])
      expect(src(f), f).not.toMatch(/club-notice\.server/);
    expect(src("lib/club-notice.functions.ts")).toMatch(
      /await import\("\.\/club-notice\.server"\)/,
    );
  });
});
