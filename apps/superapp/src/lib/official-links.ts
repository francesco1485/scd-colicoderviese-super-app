/**
 * Official result sources for the public hall (calendar, match cards, team pages).
 *
 * The app does not publish standings or scores of its own: it points to the
 * federation sources that do. Every link is labelled:
 * - "official": federation (LND / CR Lombardia) pages and the federation app;
 * - "secondary": useful but not official (shown under "Altre fonti (non ufficiali)").
 *
 * Championship and group of the Prima Squadra and the Juniores were verified on
 * gare.lnd.it on 2026-10-11. Other teams carry their category only.
 */

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

export const RESULTS_VERIFIED_ON = "2026-10-11";

export const RESULT_LINKS: readonly ResultLink[] = [
  {
    id: "lnd-promozione-d",
    label: "Prima Squadra · Promozione girone D",
    detail: "Risultati e classifica su gare.lnd.it",
    url: "https://gare.lnd.it/competizione/lombardia?campionato=PR&girone=D",
    authority: "official",
    group: "prima",
  },
  {
    id: "lnd-juniores-elite-c",
    label: "Juniores · Regionale U19 Élite girone C",
    detail: "Risultati e classifica su gare.lnd.it",
    url: "https://gare.lnd.it/competizione/lombardia?campionato=RI&girone=C",
    authority: "official",
    group: "u19",
  },
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
export const VERIFIED_CHAMPIONSHIPS: Readonly<Record<string, { name: string; group: string }>> = {
  prima: { name: "Promozione Lombardia", group: "Girone D" },
  u19: { name: "Regionale U19 Élite", group: "Girone C" },
};
