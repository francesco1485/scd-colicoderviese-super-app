/**
 * Services and initiatives reserved to members (UD-048, UD-049) and the pulmini
 * service rules communicated by the club (UD-051). Source: config/scd-member-services.v1.json.
 * Prices appear only when the Direzione communicated them; otherwise "chiedi a…".
 */
import raw from "../../../../config/scd-member-services.v1.json";

export interface MemberService {
  id: string;
  area: string;
  title: string;
  text: string;
  price: string | null;
  priceStatus: string;
  contactRole: string;
  memberOnly: boolean;
  status: "ACTIVE" | "PLANNED";
}

export interface PulminiServiceRules {
  source: string;
  vehiclesInService: number;
  trainingAnnate: string[];
  trainingNotServed: string[];
  evaluatedCaseByCase: string[];
  modes: string[];
  awayTrips: string;
  requestFlow: string;
  pickupRules: string[];
}

interface Registry {
  effectiveAt: string;
  services: MemberService[];
  pulminiService: PulminiServiceRules;
}

const REG = raw as unknown as Registry;

export const MEMBER_SERVICES_AS_OF: string = REG.effectiveAt;
export const PULMINI_SERVICE: PulminiServiceRules = REG.pulminiService;

/** Active services first, then planned; optional area filter. */
export function memberServices(area?: string): MemberService[] {
  return REG.services
    .filter((s) => !area || s.area === area)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1));
}

/** Price line as shown in the app: never an invented number. */
export function priceLine(s: MemberService): string {
  if (s.price) return s.price;
  if (s.priceStatus === "FREE") return "incluso nel tesseramento";
  return `costi: chiedi al ${s.contactRole.toLowerCase()}`;
}

/**
 * Is the weekday training service provided for the people on this pitch text?
 * "yes" when a served annata is named, "no" when only non-served categories are, "unknown" otherwise.
 */
export function trainingServiceFor(pitchText: string): "yes" | "no" | "unknown" {
  const t = pitchText.toLowerCase();
  if (!t.trim() || t.trim() === "—") return "unknown";
  const years = [...t.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)].map((m) => m[1]!);
  const spans = [...t.matchAll(/(?<!\d)(20\d{2})\s*[/-]\s*(\d{2})(?!\d)/g)].map((m) => `20${m[2]}`);
  const all = new Set([...years, ...spans]);
  if ([...all].some((y) => PULMINI_SERVICE.trainingAnnate.includes(y))) return "yes";
  const notServed = /juniores|u19|under\s*16|u16|under\s*18|u18/.test(t);
  if (notServed) return "no";
  if ([...all].some((y) => PULMINI_SERVICE.evaluatedCaseByCase.includes(y))) return "unknown";
  return "unknown";
}
