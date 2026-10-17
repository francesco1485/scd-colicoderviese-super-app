/**
 * Official result sources for the public hall (calendar, match cards, team pages, /classifiche).
 *
 * Rule (UD-182, Francesco DG 17/10/2026 12:33 «ok classifiche LND»): we publish only the official LND data, with
 * source and link. Standings and results are copied from gare.lnd.it (src/lib/lnd-standings.ts, snapshot
 * src/data/classifiche-lnd-snapshot.json) and always shown with the badge «Ufficiale LND», the fetch date and the link;
 * the app never computes, types or estimates a score or a standing of its own. Attività di base: no standings (SGS).
 * Supersedes the rule «l'app non pubblica punteggi propri» (2026-10-11).
 *
 * Every link is labelled:
 * - "official": federation (LND / CR Lombardia) pages and the federation app;
 * - "secondary": useful but not official (shown under "Altre fonti (non ufficiali)").
 *
 * Championships and groups of the four competitive teams were verified on gare.lnd.it on 2026-10-17.
 */

import { LND_COMPETITIONS, LND_TEAM_LABEL, competitionUrl } from "./lnd-standings";

/** The publication rule shown and asserted in the app. */
export const PUBLICATION_RULE = "Pubblichiamo solo i dati ufficiali LND, con fonte e link.";

export type LinkAuthority = "official" | "secondary";

export interface ResultLink {
  id: string;
  label: string;
  /** Short line under the label. */
  detail: string;
  url: string;
  authority: LinkAuthority;
  /** Calendar group id (calendario snapshot `groups`) the link is specific to, if any. */
  group?: string;
}

export const RESULTS_VERIFIED_ON = "2026-10-17";

/** Championship links come from the one LND registry (LND_COMPETITIONS): no second list. */
const CHAMPIONSHIP_LINKS: ResultLink[] = LND_COMPETITIONS.filter((c) => c.kind === "CAMPIONATO").map((c) => ({
  id: `lnd-${c.id}`,
  label: `${LND_TEAM_LABEL[c.team] ?? c.team} · ${c.label} ${c.groupLabel.replace("Girone", "girone")}`,
  detail: "Risultati e classifica su gare.lnd.it",
  url: competitionUrl(c),
  authority: "official" as const,
  group: c.team,
}));

export const RESULT_LINKS: readonly ResultLink[] = [
  ...CHAMPIONSHIP_LINKS,
  {
    id: "crl-comunicati",
    label: "CR Lombardia · comunicati ufficiali",
    detail: "Omologazioni, giudice sportivo, variazioni gara",
    url: "https://www.crlombardia.it/comunicati",
    authority: "official",
  },
  {
    id: "app-play-lnd",
    label: "App Play LND",
    detail: "App ufficiale della LND (App Store)",
    url: "https://apps.apple.com/it/app/playlnd/id1532851976",
    authority: "official",
  },
  {
    id: "tuttocampo",
    label: "Tuttocampo",
    detail: "Portale non ufficiale",
    url: "https://www.tuttocampo.it/",
    authority: "secondary",
  },
];

export const OFFICIAL_RESULT_LINKS = RESULT_LINKS.filter((l) => l.authority === "official");
export const SECONDARY_RESULT_LINKS = RESULT_LINKS.filter((l) => l.authority === "secondary");

/** The official results page of one calendar group, when it is verified. */
export function resultLinkFor(group: string | undefined | null): ResultLink | null {
  if (!group) return null;
  return OFFICIAL_RESULT_LINKS.find((l) => l.group === group) ?? null;
}

/**
 * Championship of a team, VERIFIED on gare.lnd.it on {@link RESULTS_VERIFIED_ON}.
 * Teams not listed show their category only: nothing is inferred.
 */
export const VERIFIED_CHAMPIONSHIPS: Readonly<Record<string, { name: string; group: string }>> = Object.fromEntries(
  LND_COMPETITIONS.filter((c) => c.kind === "CAMPIONATO").map((c) => [c.team, { name: c.label, group: c.groupLabel }]),
);
