/**
 * Direzione rule (13/10/2026): "No loghi squadra nostri, dati da me, restano interni per riconoscere nostre annate.
 * All'esterno resta ColicoDerviese."
 *
 * The annata crests (src/assets/scd/SCD_*.png.asset.json, public/media/scd/SCD_*.png and their renditions in
 * public/media/scd/annate/) are internal only. Public pages show our side with the official club crest
 * (publicTeamCrest() / ClubCrestOfficial) and "ColicoDerviese" plus the team label as text.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import clubCrest from "@/assets/brand/logo-scd.png.asset.json";

import { isPublicPath } from "./http-policy";
import { publicTeamCrest } from "./team-crest";

const APP = resolve(__dirname, "../..");

/** Public route files and the components they render our teams with. */
const PUBLIC_FILES = [
  "src/routes/index.tsx",
  "src/components/home/HomeSections.tsx",
  "src/components/home/PublicHome.tsx",
  "src/components/home/HomeLobby.tsx",
  "src/components/home/MemberHome.tsx",
  "src/components/scd/MembersOnly.tsx",
  "src/components/SiteChrome.tsx",
  "src/routes/calendario.tsx",
  "src/components/calendario/CalendarioLive.tsx",
  "src/routes/squadre.tsx",
  "src/routes/squadre_.$team.tsx",
  "src/routes/squadre_.carte.tsx",
  "src/components/squadre/SquadraCarte.tsx",
  "src/routes/allenamenti.tsx",
  "src/routes/comunicazioni.tsx",
  "src/components/universe/Feed.tsx",
  "src/components/scd/hall.tsx",
  "src/routes/societa.tsx",
] as const;

/** Every route file whose page is public (http-policy PUBLIC_PREFIXES), found from src/routes: new public pages are
 * covered without editing this list. */
const PUBLIC_ROUTE_FILES = readdirSync(resolve(APP, "src/routes"))
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"))
  .filter((f) => {
    const segs = f.replace(/\.tsx$/, "").split(".").filter((s) => s !== "index").map((s) => s.replace(/_$/, "")).filter(Boolean);
    return isPublicPath(`/${segs.join("/")}`);
  })
  .map((f) => `src/routes/${f}`);

const SCANNED = [...new Set([...PUBLIC_FILES, ...PUBLIC_ROUTE_FILES])].sort();

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

  it("scans every public route file", () => {
    expect(PUBLIC_ROUTE_FILES.length).toBeGreaterThan(10);
    expect(PUBLIC_ROUTE_FILES).toEqual(expect.arrayContaining(["src/routes/societa.tsx", "src/routes/calendario.tsx", "src/routes/eventi.index.tsx"]));
  });

  it.each(SCANNED)("%s shows no annata crest", (file) => {
    const src = readFileSync(resolve(APP, file), "utf8");
    const hits = FORBIDDEN.filter(({ re }) => re.test(src)).map(
      ({ label }) => label,
    );
    expect(hits, `${file}: ${hits.join("; ")}`).toEqual([]);
  });
});
