/**
 * Official team crests of the RC1 package (public/media/scd). The master's logo file wins; otherwise the RC1
 * rule on the label (public-snapshots.logoKeysFor). No other crest is ever drawn: null means "use the club crest".
 */
import juniores from "@/assets/scd/SCD_JUNIORES_2008_2009.png.asset.json";
import piccoli from "@/assets/scd/SCD_PICCOLI_2020_2021.png.asset.json";
import prima from "@/assets/scd/SCD_PRIMA_SQUADRA.png.asset.json";
import primi from "@/assets/scd/SCD_PRIMI_2018_2019.png.asset.json";
import pulcini from "@/assets/scd/SCD_PULCINI_2016_2017.png.asset.json";
import u12 from "@/assets/scd/SCD_U12_2015.png.asset.json";
import u13 from "@/assets/scd/SCD_U13_2014.png.asset.json";
import u15 from "@/assets/scd/SCD_U15_2012_2013.png.asset.json";
import u16 from "@/assets/scd/SCD_U16_2011.png.asset.json";

import { logoKeysFor } from "./public-snapshots";

export const TEAM_LOGOS: Readonly<Record<string, string>> = {
  JUNIORES: juniores.url,
  PICCOLI: piccoli.url,
  PRIMA: prima.url,
  PRIMI: primi.url,
  PULCINI: pulcini.url,
  U12: u12.url,
  U13: u13.url,
  U15: u15.url,
  U16: u16.url,
};

export function teamCrest(t: {
  logo: string | null;
  label: string;
}): string | null {
  if (t.logo && /^SCD_[A-Z0-9_]+\.png$/.test(t.logo))
    return `/media/scd/${t.logo}`;
  const key = logoKeysFor(t.label)[0];
  return key ? (TEAM_LOGOS[key] ?? null) : null;
}
