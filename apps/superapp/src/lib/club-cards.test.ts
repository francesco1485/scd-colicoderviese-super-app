import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CLUB_CARDS,
  CLUB_CARD_IDS,
  activationText,
  clubCard,
  clubCardPath,
  clubCardUrl,
  codeRangeText,
  isClubCardId,
  itDate,
  licenseView,
  supporterPriceRows,
  ticketingText,
  validateClubCards,
  type ClubCardsConfig,
} from "./club-cards";
import { cacheControlFor, isPublicPath } from "./http-policy";
import { TICKETING } from "./match-extras";

const clone = (): ClubCardsConfig => JSON.parse(JSON.stringify(CLUB_CARDS)) as ClubCardsConfig;

describe("club cards 2026/27 (Direzione 13/10/2026, policy V1.2 / V1.4)", () => {
  it("has exactly the three tiers of the card policy, in order", () => {
    expect(CLUB_CARD_IDS).toEqual(["tesserato", "sostenitore", "partner"]);
    expect(isClubCardId("sostenitore")).toBe(true);
    expect(isClubCardId("tifoso")).toBe(false);
    expect(() => clubCard("x" as never)).toThrow();
  });

  it("passes its own invariants", () => {
    expect(validateClubCards()).toEqual([]);
  });

  it("keeps the deposit out of the wallet: 25 € = 20 € credit + 5 € deposit; Partner free, gift credit, no deposit", () => {
    expect(clubCard("tesserato").activation).toEqual({ total: 25, credit: 20, deposit: 5 });
    expect(clubCard("sostenitore").activation).toEqual({ total: 25, credit: 20, deposit: 5 });
    expect(clubCard("partner").activation).toEqual({ total: 0, credit: 20, deposit: 0, creditIsGift: true });
    expect(activationText(clubCard("tesserato"))).toBe("25 € = 20 € di credito + 5 € di cauzione");
    expect(activationText(clubCard("partner"))).toContain("senza cauzione");
  });

  it("uses the confirmed ticketing rule (tesserato + 2 familiari), not the older +1 of the brief", () => {
    const t = ticketingText(clubCard("tesserato"));
    expect(t).toContain(TICKETING.membersShort);
    expect(t).toContain("2 familiari");
    expect(clubCard("tesserato").benefits.join(" ")).toContain("con 2 familiari");
    expect(ticketingText(clubCard("partner"))).toMatch(/Nessun vantaggio/);
  });

  it("joins supporter prices to the official tariffs and never exceeds them", () => {
    const rows = supporterPriceRows(clubCard("sostenitore"));
    expect(rows.map((r) => [r.intero, r.ridotto, r.fullIntero, r.fullRidotto])).toEqual([
      [8, 4, 10, 5],
      [5, 3, 7, 4],
      [5, 3, 7, 4],
    ]);
    expect(supporterPriceRows(clubCard("tesserato"))).toEqual([]);
    const bad = clone();
    bad.tiers[1]!.supporterPrices![0]!.intero = 99;
    expect(validateClubCards(bad).join()).toMatch(/above the full price/);
  });

  it("keeps the Sostenitore and Partner code ranges separate and never derives a code from personal data", () => {
    expect(codeRangeText(clubCard("sostenitore"))).toBe("020974201001 – 020974201200");
    expect(codeRangeText(clubCard("partner"))).toBe("020974201201 – 020974201400");
    expect(codeRangeText(clubCard("tesserato"))).toBeNull();
    const bad = clone();
    bad.tiers[2]!.codeRange!.from = 150;
    expect(validateClubCards(bad).join()).toMatch(/overlap/);
    const raw = readFileSync(fileURLToPath(new URL("../../../../config/scd-club-cards.v1.json", import.meta.url)), "utf8");
    expect(raw).not.toMatch(/codice fiscale normalizzato|primi 9 caratteri/i);
  });

  it("does not invent an expiry date", () => {
    expect(CLUB_CARDS.validity.endDate).toBeNull();
    expect(CLUB_CARDS.validity.endDateStatus).toBe("DA_CONFERMARE");
    const bad = clone();
    bad.validity.endDateStatus = "CONFIRMED";
    expect(validateClubCards(bad).join()).toMatch(/DA_CONFERMARE/);
  });

  it("builds one public web link per card", () => {
    expect(clubCardPath("partner")).toBe("/card/partner");
    expect(clubCardUrl("https://app.colicoderviese.it/", "sostenitore")).toBe("https://app.colicoderviese.it/card/sostenitore");
    for (const id of CLUB_CARD_IDS) {
      expect(isPublicPath(clubCardPath(id))).toBe(true);
      expect(cacheControlFor(clubCardPath(id))).toBe("public, max-age=0, must-revalidate");
    }
    expect(isPublicPath("/card")).toBe(true);
  });

  it("keeps SQUBY as the wallet, with the enrollment form not published on the card pages", () => {
    expect(CLUB_CARDS.squby.role).toBe("WALLET_AUTHORITY");
    expect(CLUB_CARDS.squby.enrollmentPublic).toBe(false);
    const bad = clone();
    bad.squby.adminUrl = "https://example.com/admin";
    expect(validateClubCards(bad).join()).toMatch(/live\.squby\.it/);
    for (const f of ["../routes/card.index.tsx", "../routes/card.$tipo.tsx", "../components/scd/ClubCards.tsx"]) {
      const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), "utf8");
      expect(src, f).not.toContain("enrollmentUrl");
      expect(src, f).not.toContain("squby.it");
    }
  });

  it("reports the SQUBY licence headroom", () => {
    const v = licenseView();
    expect(v).toMatchObject({ used: 1, max: 100, free: 99, expires: "2027-09-30", pilotFits: true });
    expect(itDate(v.expires)).toBe("30/09/2027");
    const full = clone();
    full.squby.license.participantsUsed = 97;
    expect(licenseView(full).pilotFits).toBe(false);
  });
});
