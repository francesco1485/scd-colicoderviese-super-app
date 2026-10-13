/**
 * Official SCD team crests (RC1 pack, /media/scd/SCD_*.png) resolved from the calendar master groups.
 * Only files that exist in the pack are returned: a group with no matching crest gets null, never a drawing.
 */
import { logoKeysFor, type PublicGroup } from "@/lib/public-snapshots";

const FILE_BY_KEY: Readonly<Record<string, string>> = {
  PRIMA: "SCD_PRIMA_SQUADRA.png",
  JUNIORES: "SCD_JUNIORES_2008_2009.png",
  U16: "SCD_U16_2011.png",
  U15: "SCD_U15_2012_2013.png",
  U13: "SCD_U13_2014.png",
  U12: "SCD_U12_2015.png",
  PULCINI: "SCD_PULCINI_2016_2017.png",
  PRIMI: "SCD_PRIMI_2018_2019.png",
  PICCOLI: "SCD_PICCOLI_2020_2021.png",
};

/** Crest URL for a calendar group: the master's own logo first, then the RC1 rule on its label. */
export function teamCrestSrc(
  g: Pick<PublicGroup, "id" | "label" | "logo"> | undefined,
): string | null {
  if (!g) return null;
  if (g.logo) return `/media/scd/${g.logo}`;
  const key = logoKeysFor(`${g.label} ${g.id}`)[0];
  const file = key ? FILE_BY_KEY[key] : undefined;
  return file ? `/media/scd/${file}` : null;
}
