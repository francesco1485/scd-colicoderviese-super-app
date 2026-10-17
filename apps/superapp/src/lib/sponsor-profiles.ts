/**
 * The small card that opens when a logo of the «Già con noi» wall on /sponsor is tapped (Francesco 17/10/2026 09:42:
 * «rendere appetibile il singolo sponsor»). Engine: SOLDI. Measured by: card opens per partner and presses on the
 * official link (Meta platform 22, once analytics consent exists).
 *
 * Only documented facts, never invented (UNKNOWN ≠ ZERO):
 * - name: lib/sponsors.ts, only when `nameVerified`; otherwise «Nome da confermare con la Direzione»;
 * - sector and town: not recorded anywhere in the repo yet → `null`, rendered «da confermare»;
 * - official website and social handle: lib/sponsor-spots.ts (`website`, `socialHandle`, null until verified);
 * - what the partner does with the club: a LED spot in rotation (lib/sponsor-spots.ts, `isShowable`) and the official
 *   kit supply (lib/kit-catalog.ts suppliers, same slug). The «Grazie a …» line exists only for those documented items.
 */
import { KITS, KIT_SEASON, SUPPLIERS } from "./kit-catalog";
import { SPONSOR_SPOTS, isShowable, type SponsorSpot } from "./sponsor-spots";
import { SPONSORS, type Sponsor } from "./sponsors";

export const PROFILE_UNKNOWN = "da confermare";
export const NAME_TO_CONFIRM = "Nome da confermare con la Direzione";

export interface SponsorProfile {
  slug: string;
  /** Official name, or null when not verified. */
  name: string | null;
  /** Sector and town: null until recorded with a source. */
  sector: string | null;
  town: string | null;
  /** Official https website, when documented. */
  website: string | null;
  /** Official social handle, when verified. */
  socialHandle: string | null;
  /** Documented support items, each completing «Grazie a [nome] per …». */
  support: readonly string[];
}

/** Optional sector/town per slug, filled only with a source (Drive dossier, official site). Empty today. */
export const SPONSOR_DETAILS: Readonly<Record<string, { sector?: string; town?: string; source: string }>> = {};

function supportOf(slug: string, spots: readonly SponsorSpot[], list: readonly Sponsor[]): string[] {
  const out: string[] = [];
  const spot = spots.find((s) => s.slug === slug);
  if (spot && isShowable(spot, list)) out.push("il suo spot sul LED wall a bordo campo a Colico");
  if (SUPPLIERS.some((s) => s.id === slug) && KITS.some((k) => k.supplier === slug)) out.push(`i kit ufficiali ${KIT_SEASON} degli atleti, che fornisce al club`);
  return out;
}

export function sponsorProfile(s: Sponsor, spots: readonly SponsorSpot[] = SPONSOR_SPOTS, list: readonly Sponsor[] = SPONSORS): SponsorProfile {
  const spot = spots.find((x) => x.slug === s.slug);
  const details = SPONSOR_DETAILS[s.slug];
  const website = spot?.website && /^https:\/\//.test(spot.website) ? spot.website : null;
  const name = s.name && s.nameVerified ? s.name : null;
  return {
    slug: s.slug,
    name,
    sector: details?.sector ?? null,
    town: details?.town ?? null,
    website,
    socialHandle: spot?.socialHandle ?? null,
    // No name, no thanks: a «Grazie a» line never goes to a partner whose name is not certain.
    support: name ? supportOf(s.slug, spots, list) : [],
  };
}

/** «Grazie a HDI … per il suo spot …», or null when nothing is documented. */
export function thanksLine(p: Pick<SponsorProfile, "name" | "support">): string | null {
  if (!p.name || p.support.length === 0) return null;
  const items = p.support.length > 1 ? `${p.support.slice(0, -1).join(", ")} e ${p.support[p.support.length - 1]}` : p.support[0];
  return `Grazie a ${p.name} per ${items}.`;
}

/** Website shown without protocol and trailing slash: «www.dellocapetroli.com». */
export const websiteLabel = (url: string) => url.replace(/^https:\/\//, "").replace(/\/$/, "");
