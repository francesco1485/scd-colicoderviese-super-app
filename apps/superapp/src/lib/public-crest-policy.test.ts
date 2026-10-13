/**
 * Direzione rule (13/10/2026): "No loghi squadra nostri, dati da me, restano interni per riconoscere nostre annate.
 * All'esterno resta ColicoDerviese."
 *
 * The annata crests (src/assets/scd/SCD_*.png.asset.json, public/media/scd/SCD_*.png and their renditions in
 * public/media/scd/annate/) are internal only. Public pages show our side with the official club crest
 * (publicTeamCrest() / ClubCrestOfficial) and "ColicoDerviese" plus the team label as text.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import clubCrest from "@/assets/brand/logo-scd.png.asset.json";

import { publicTeamCrest } from "./team-crest";

const APP = resolve(__dirname, "../..");

/** Public route files and the components they render our teams with. */
const PUBLIC_FILES = [
  "src/routes/index.tsx",
  "src/components/home/HomeSections.tsx",
  "src/components/home/PublicHome.tsx",
  "src/components/home/MemberHome.tsx",
  "src/components/scd/MembersOnly.tsx",
  "src/components/SiteChrome.tsx",
  "src/routes/calendario.tsx",
  "src/routes/squadre.tsx",
  "src/routes/squadre_.$team.tsx",
  "src/routes/allenamenti.tsx",
  "src/routes/comunicazioni.tsx",
  "src/components/universe/Feed.tsx",
] as const;

const FORBIDDEN: readonly { label: string; re: RegExp }[] = [
  {
    label: 'import of "@/assets/scd/SCD_*" annata crest',
    re: /@\/assets\/scd\/SCD_/,
  },
  {
    label: 'reference to "/media/scd/SCD_*" annata crest',
    re: /\/media\/scd\/SCD_/,
  },
  {
    label: 'reference to "/media/scd/annate/" crest rendition',
    re: /\/media\/scd\/annate\//,
  },
  { label: "call to the internal teamCrest()", re: /\bteamCrest\(/ },
  { label: "call to teamCrestSrc()", re: /\bteamCrestSrc\(/ },
  { label: "use of the internal TEAM_LOGOS map", re: /\bTEAM_LOGOS\b/ },
];

describe("public crest policy (Direzione 13/10/2026)", () => {
  it("publicTeamCrest() is the official club crest", () => {
    expect(publicTeamCrest()).toBe(clubCrest.url);
    expect(publicTeamCrest()).toBe("/media/brand/logo-scd.webp");
  });

  it.each(PUBLIC_FILES)("%s shows no annata crest", (file) => {
    const src = readFileSync(resolve(APP, file), "utf8");
    const hits = FORBIDDEN.filter(({ re }) => re.test(src)).map(
      ({ label }) => label,
    );
    expect(hits, `${file}: ${hits.join("; ")}`).toEqual([]);
  });
});
