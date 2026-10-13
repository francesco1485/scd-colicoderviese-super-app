import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClubCredentials } from "@/components/scd/Logos";

import { CLUB_CREDENTIALS, CREDENTIALS_SENTENCE } from "./club-credentials";

const SRC = resolve(__dirname, "..");

describe("club credentials (Direzione 13/10/2026 15:55)", () => {
  it("are three distinct credentials in order of importance with the official wording", () => {
    expect(CLUB_CREDENTIALS.map((c) => c.id)).toEqual(["figc-sgs-3-livello", "lnd", "insieme-al-monza"]);
    expect(CLUB_CREDENTIALS.map((c) => c.short)).toEqual(["3° livello SGS", "LND Lombardia", "Affiliata AC Monza"]);
    expect(CLUB_CREDENTIALS[0]!.title).toBe("Club Giovanile di 3° livello");
    expect(CLUB_CREDENTIALS[0]!.issuer).toBe("FIGC Settore Giovanile e Scolastico");
    expect(CLUB_CREDENTIALS[1]!.title).toBe("Iscritta FIGC");
    expect(CLUB_CREDENTIALS[2]!.title).toBe("Affiliata AC Monza");
  });

  it("never names Élite as an SGS level and never affiliates the club to FIGC/LND", () => {
    const text = JSON.stringify(CLUB_CREDENTIALS) + CREDENTIALS_SENTENCE;
    expect(text).not.toMatch(/[ÉE]lite/i);
    for (const c of CLUB_CREDENTIALS.slice(0, 2)) expect(`${c.title} ${c.short} ${c.alt}`).not.toMatch(/affiliat/i);
  });

  it("each mark carries its own caption in every variant", () => {
    for (const v of ["bar", "plaque", "list"] as const) {
      const html = renderToStaticMarkup(<ClubCredentials variant={v} />);
      for (const c of CLUB_CREDENTIALS) {
        expect(html, `${v} ${c.id}`).toContain(c.art.src);
        expect(html, `${v} ${c.id}`).toContain(v === "list" ? c.title : c.short);
      }
    }
  });

  it("no generic 'società affiliata' label in front of all marks on the home or in the footer", () => {
    for (const f of ["components/home/PublicHome.tsx", "components/SiteChrome.tsx", "components/home/HomeSections.tsx"]) {
      const src = readFileSync(resolve(SRC, f), "utf8");
      expect(src, f).not.toMatch(/Società\s*(<br[^>]*\/>)?\s*affiliata/i);
      expect(src, f).not.toMatch(/iscritto LND|Club FIGC SGS di 3°/);
    }
  });
});
