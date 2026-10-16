/**
 * "Copertura spot LED" of the GROW hub (/grow): every season sponsor of src/lib/sponsors.ts next to its LED spot of
 * src/lib/sponsor-spots.ts, when one exists. Francesco 14/10/2026: only the seven spots of 02_V4_SPONSOR_VALIDATI are
 * ready; the other sponsors still need theirs. Pure data, SSR safe, tested in spot-coverage.test.ts.
 *
 * Rules:
 * - the sponsor list and the spot list are read as they are (no second register, no invented spot or status);
 * - a sponsor whose name is not verified is never named: neutral label + "nome da confermare";
 * - "senza spot" is a fact of the repo today, not a judgement: the spot may exist on Drive and not be transcoded yet.
 */
import { SPONSOR_SPOTS, SPOT_STATUS_LABEL, type SponsorSpot, type SpotStatus } from "./sponsor-spots";
import { SPONSORS, type Sponsor } from "./sponsors";

export interface CoverageRow {
  slug: string;
  /** Name only when verified; otherwise null (the UI shows a neutral label). */
  name: string | null;
  nameToConfirm: boolean;
  logoSrc: string;
  spot: { status: SpotStatus; statusLabel: string; reviewPath: string } | null;
}

export interface CoverageSummary {
  sponsors: number;
  withSpot: number;
  withoutSpot: number;
  namesToConfirm: number;
  byStatus: Readonly<Record<SpotStatus, number>>;
  /** Spots whose sponsor is not in sponsors.ts (should stay empty: buildSpots leaves them out). */
  orphanSpots: readonly string[];
}

export const NEUTRAL_SPONSOR_LABEL = "Sponsor della ColicoDerviese";

/** Label of a row: the verified name or the neutral label. */
export function coverageLabel(row: Pick<CoverageRow, "name">): string {
  return row.name ?? NEUTRAL_SPONSOR_LABEL;
}

/** One row per sponsor, in the order of sponsors.ts. */
export function spotCoverage(list: readonly Sponsor[] = SPONSORS, spots: readonly SponsorSpot[] = SPONSOR_SPOTS): CoverageRow[] {
  return list.map((s) => {
    const spot = spots.find((x) => x.slug === s.slug);
    const verified = Boolean(s.name) && s.nameVerified;
    return {
      slug: s.slug,
      name: verified ? s.name : null,
      nameToConfirm: !verified,
      logoSrc: s.src,
      spot: spot ? { status: spot.status, statusLabel: SPOT_STATUS_LABEL[spot.status], reviewPath: `/spot/${spot.slug}` } : null,
    };
  });
}

/** Counts for the hub tiles. Every number is calculated from the two files above. */
export function coverageSummary(list: readonly Sponsor[] = SPONSORS, spots: readonly SponsorSpot[] = SPONSOR_SPOTS): CoverageSummary {
  const rows = spotCoverage(list, spots);
  const byStatus: Record<SpotStatus, number> = { DA_APPROVARE: 0, MODIFICHE_RICHIESTE: 0, APPROVATO: 0, IN_ONDA: 0 };
  for (const r of rows) if (r.spot) byStatus[r.spot.status] += 1;
  const withSpot = rows.filter((r) => r.spot).length;
  return {
    sponsors: rows.length,
    withSpot,
    withoutSpot: rows.length - withSpot,
    namesToConfirm: rows.filter((r) => r.nameToConfirm).length,
    byStatus,
    orphanSpots: spots.filter((x) => !list.some((s) => s.slug === x.slug)).map((x) => x.slug),
  };
}

/** Rows split for the two lists of the hub: spot ready first, then the sponsors still without one. */
export function coverageGroups(rows: readonly CoverageRow[] = spotCoverage()): { ready: CoverageRow[]; missing: CoverageRow[] } {
  return { ready: rows.filter((r) => r.spot), missing: rows.filter((r) => !r.spot) };
}
