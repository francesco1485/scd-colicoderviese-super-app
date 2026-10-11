/** Counts-only snapshot of the private masters (config/scd-roster-aggregates.snapshot.json). No personal data. */
import raw from "../../../../config/scd-roster-aggregates.snapshot.json";

export interface TesseratiAggregates {
  source: string;
  asOf: string;
  records: number;
  byStatus: Record<string, number>;
  minors: number;
  adults: number;
  byGroup: Record<string, number>;
  figcPractice: Record<string, number>;
  signature: Record<string, number>;
  medicalCertificate: { status: string; note: string };
  fees: { status: string; note: string };
  secretariatQueue: Record<string, number>;
  controlRoom: Record<string, number>;
}

export interface PulminiDemand {
  source: string;
  asOf: string;
  users: number;
  byStatus: Record<string, number>;
  byMode: Record<string, number>;
  byGroup: Record<string, number>;
  byLine: Record<string, number>;
  weekdayConfirmation: { status: string; note: string };
  plannedRuns: number;
  fleet: { vehiclesInMaster: number; vehiclesInService: number; seatsConfirmed: boolean; driversActive: number; driversRegistered: number };
  lines: string[];
  stopsRegistered: number;
}

const R = raw as unknown as { tesserati: TesseratiAggregates; pulminiDemand: PulminiDemand };
export const TESSERATI: TesseratiAggregates = R.tesserati;
export const PULMINI_DEMAND: PulminiDemand = R.pulminiDemand;

/** Entries sorted by count, descending. */
export function sortedCounts(m: Record<string, number>): Array<[string, number]> {
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

/** "11/10/2026" from ISO. */
export function itDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
