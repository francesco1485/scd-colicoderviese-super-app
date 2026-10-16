/**
 * One access resolver (Francesco 16/10/2026 23:12–23:22: «le persone vedono solo le aree che vengono assegnate in
 * automatico […] e poi quelle che assegno io»). Pure rules shared by the server (access-resolver.server.ts), the
 * navigation and the tests. What a signed-in person sees is the union of four layers, never more:
 *
 *   a) BASE — every signed-in account, automatic: the public pages plus the member pages below, all backed by the base
 *      sections of the existing catalogue (config/scd-sections.v1.json: pubblico, profilo, tessera). No second registry.
 *   b) AUTO — from a VERIFIED identity only (scd_identity_links AUTO_VERIFIED / VERIFIED_BY_STAFF, read through
 *      scd_my_family which already filters on it): a parent sees the family area (own children only), an athlete
 *      their own team. The data inside stays scoped by the database functions (scd_my_family, scd_my_callups…).
 *   c) GRANTS — sections enabled by the Direzione per person (scd_person_grants via scd_can, role templates loaded by
 *      Presidente / DG). A grant opens the PAGE of its section only when that cannot show more than the grant:
 *      perimeter "tutta la società" (ALL), or a perimeter-scoped page whose content is either non-personal or
 *      filtered per caller by the database (PERIMETER_SCOPED_PAGES). Everything else stays closed (fail-closed).
 *   d) OLD RULES — positions (registry roles, Direzione sees all) keep working unchanged: the resolver only ADDS.
 *
 * Hard limits that no layer passes: hard-blocked sections (salute minori, safeguarding), Direzione-only sections,
 * base sections (nothing to grant), unknown sections. Every server data function keeps its own check: opening a page
 * never widens what its data functions return.
 */
import { ACCESS_MENU, INTERIOR_RAIL, WORK_AREA_IDS, findArea, type AreaIcon, type MenuEntry, type MenuGroup } from "./areas";
import type { WorkAreaGate } from "./access";
import { LEVELS, SECTIONS, findSection, levelCovers, type Level, type Perimeter } from "./person-grants";

/** Identity link states that count as verified (r56/r61 scd_my_person_ids uses the same two). */
export const VERIFIED_LINK_STATES = ["AUTO_VERIFIED", "VERIFIED_BY_STAFF"] as const;

/* ---------------------------------------------------------------- a) base */

export interface BasePage {
  id: string;
  label: string;
  /** Live route, or null while the page does not exist yet (never shown: no empty pages). */
  path: string | null;
  /** Base section of the catalogue that covers it. */
  section: "pubblico" | "profilo" | "tessera";
  /** Shown in the "Per te" navigation group (pages already in the main sidebar are not repeated). */
  nav: boolean;
}

/**
 * Member pages every signed-in account sees (Francesco: «calendario e allenamenti, avatar crea, statistiche calciatori,
 * classifiche e tutto quello che mondo sport calcio o mondo social e mondo esterno»). Statistics and standings come from
 * official sources only: until such a page exists its path is null and nothing is shown.
 */
export const BASE_PAGES: readonly BasePage[] = [
  { id: "calendario", label: "Calendario", path: "/calendario", section: "pubblico", nav: false },
  { id: "allenamenti", label: "Allenamenti e pulmini", path: "/allenamenti", section: "pubblico", nav: false },
  { id: "quadro", label: "Quadro settimanale", path: "/quadro", section: "pubblico", nav: true },
  { id: "squadre", label: "Squadre", path: "/squadre", section: "pubblico", nav: false },
  { id: "news", label: "News", path: "/comunicazioni", section: "pubblico", nav: false },
  { id: "community", label: "Comunità", path: "/community", section: "pubblico", nav: false },
  { id: "eventi", label: "Eventi e tornei", path: "/eventi", section: "pubblico", nav: false },
  { id: "la-mia-scd", label: "La mia SCD", path: "/la-mia-scd", section: "profilo", nav: true },
  { id: "crea-avatar", label: "Crea il tuo campione", path: "/la-mia-scd/campione", section: "profilo", nav: true },
  { id: "fantacalcio", label: "Fantacalcio", path: "/fantacalcio", section: "pubblico", nav: true },
  { id: "top11", label: "Top 11 della settimana", path: "/top11", section: "pubblico", nav: true },
  { id: "tessera", label: "La mia tessera", path: "/card", section: "tessera", nav: true },
  { id: "statistiche", label: "Statistiche e classifiche", path: null, section: "pubblico", nav: true },
  { id: "giochi", label: "Giochi", path: null, section: "pubblico", nav: true },
];

/**
 * Work areas that the base layer opens for every signed-in account (Francesco 16/10/2026 23:34: «il quadro degli
 * allenamenti settimanali» is base). Their only data is already member-level: /quadro reads getTrainingQuadro (any
 * signed-in member, quadro.functions.ts quadroAllowed) and the public calendar; write actions keep their own checks.
 * The pulmini service (times, meeting points, seats, riders as counts, no names) is base on /allenamenti through
 * getPulminiService; the Pulmini work area itself (drivers, contacts, seat plans) stays staff or grant ALL.
 */
export const BASE_WORK_AREAS: readonly string[] = ["quadro"];

/** Base pages for the navigation of a signed-in person: only live routes. */
export function basePagesFor(signedIn: boolean): BasePage[] {
  if (!signedIn) return [];
  return BASE_PAGES.filter((p) => p.path !== null && p.nav);
}

/* ---------------------------------------------------------------- b) auto from verified identity */

/** What scd_my_family returned for the caller (verified links only, by construction of r61). */
export interface FamilyRowFacts {
  relationship: string;
  teamCodes: readonly string[];
}

export interface IdentityFacts {
  /** At least one verified identity link (scd_my_family returned the SELF row). */
  verified: boolean;
  /** Children / family members in families where the caller is guardian. */
  childCount: number;
  /** Teams of those children (codes only, never names). */
  childTeamCodes: readonly string[];
  /** Own teams as an athlete. */
  selfTeamCodes: readonly string[];
}

export const NO_IDENTITY: IdentityFacts = { verified: false, childCount: 0, childTeamCodes: [], selfTeamCodes: [] };

export function identityFromFamily(rows: readonly FamilyRowFacts[] | null): IdentityFacts {
  if (!rows || rows.length === 0) return NO_IDENTITY;
  const self = rows.filter((r) => r.relationship === "SELF");
  if (self.length === 0) return NO_IDENTITY;
  const kids = rows.filter((r) => r.relationship !== "SELF");
  const uniq = (xs: readonly string[]) => [...new Set(xs.filter((x) => typeof x === "string" && x.length > 0))].sort();
  return {
    verified: true,
    childCount: kids.length,
    childTeamCodes: uniq(kids.flatMap((k) => k.teamCodes)),
    selfTeamCodes: uniq(self.flatMap((s) => s.teamCodes)),
  };
}

export interface AutoEntry {
  /** Registry area id the entry opens (famiglia, squadre). */
  id: "famiglia" | "squadre";
  label: string;
  blurb: string;
  icon: AreaIcon;
  /** How many things are inside for this person (children, teams): 0 = nothing to show. */
  items: number;
}

/** Automatic entries from the verified identity: «se è papà si vede anche quello e in automatico». */
export function autoEntries(identity: IdentityFacts): AutoEntry[] {
  if (!identity.verified) return [];
  const out: AutoEntry[] = [];
  if (identity.childCount > 0)
    out.push({
      id: "famiglia",
      label: "Area famiglia",
      blurb: "Convocazioni, pulmino, quote e documenti dei tuoi figli",
      icon: "home",
      items: identity.childCount,
    });
  const teams = [...new Set([...identity.selfTeamCodes, ...identity.childTeamCodes])];
  if (teams.length > 0)
    out.push({
      id: "squadre",
      label: teams.length === 1 ? "La mia squadra" : "Le mie squadre",
      blurb: "Gare, allenamenti e notizie della tua annata",
      icon: "users",
      items: teams.length,
    });
  return out;
}

/* ---------------------------------------------------------------- c) grants */

/** What the database answered for one section: highest level with any perimeter, and with perimeter ALL. */
export interface SectionProbe {
  level: Level | null;
  allLevel: Level | null;
}

export type GrantProbes = ReadonlyMap<string, SectionProbe>;

/**
 * Sections whose PAGE may open with a narrower perimeter (own teams / own site) because what the page shows is either
 * non-personal or filtered per caller by the database:
 * - mister: roster, call-ups and match sheets come from scd_my_team_roster / scd_my_callups (caller's teams only);
 * - quadro: weekly pitch and changing-room plan, non-personal (training times are already base for every member);
 * - mappa, impianti-campi: facility maps and pitch rotation, non-personal.
 * Any other section opens its page only with perimeter ALL until its data functions filter by the grant perimeter.
 * Only READ: a write or approve action never relies on a narrow page grant.
 */
export const PERIMETER_SCOPED_PAGES: readonly string[] = ["mister", "quadro", "mappa", "impianti-campi"];

function maxLevel(a: Level | null, b: Level | null): Level | null {
  if (!a) return b;
  if (!b) return a;
  return levelCovers(a, b) ? a : b;
}

/** Rows of r113 scd_my_section_access (own active grants, verified links only) → probes per section. */
export function probesFromRows(rows: ReadonlyArray<{ section_code: unknown; level: unknown; perimeter: unknown }>): Map<string, SectionProbe> {
  const out = new Map<string, SectionProbe>();
  for (const r of rows) {
    if (typeof r.section_code !== "string" || typeof r.level !== "string" || typeof r.perimeter !== "string") continue;
    if (!(LEVELS as readonly string[]).includes(r.level)) continue;
    const level = r.level as Level;
    const cur = out.get(r.section_code) ?? { level: null, allLevel: null };
    out.set(r.section_code, {
      level: maxLevel(cur.level, level),
      allLevel: (r.perimeter as Perimeter) === "ALL" ? maxLevel(cur.allLevel, level) : cur.allLevel,
    });
  }
  return out;
}

/** Section of the catalogue whose page is this work area (scd-sections.v1.json "area"), or null. */
export function sectionForArea(areaId: string): string | null {
  return SECTIONS.find((s) => s.area === areaId)?.code ?? null;
}

/** Whether a grant (as probed) opens the page of a section at the needed level. Fail-closed on anything unknown. */
export function grantOpens(sectionCode: string, need: Level, probe: SectionProbe | undefined | null): boolean {
  const s = findSection(sectionCode);
  if (!s || s.base || s.hardBlocked || s.directionOnly) return false;
  if (!s.levels.includes(need) && !s.levels.some((l) => levelCovers(l, need))) return false;
  if (!probe) return false;
  if (probe.allLevel && levelCovers(probe.allLevel, need)) return true;
  return need === "READ" && PERIMETER_SCOPED_PAGES.includes(sectionCode) && probe.level !== null && levelCovers(probe.level, need);
}

/* ---------------------------------------------------------------- the gate */

export interface ResolverFacts {
  /** A verified session with an active membership (public-access.ts isSignedInMember): opens BASE_WORK_AREAS. */
  signedIn: boolean;
  identity: IdentityFacts;
  /** Probes from the database, or null when the grants engine cannot answer (missing, error): grants open nothing. */
  probes: GrantProbes | null;
}

/** Registry areas outside WORK_AREA_IDS whose own gate also asks the resolver (impianti.functions.ts). */
export const OWN_GATE_AREAS: readonly string[] = ["impianti-campi"];

/**
 * Work-area gate = OLD rule OR grant. The old decision (positions / Direzione / staging preview) is kept as it is; a
 * grant can only turn an "access" (or preview-only) answer into a real page, and only with a verified identity.
 */
export function resolveWorkAreaGate(areaId: string, old: WorkAreaGate, facts: ResolverFacts): WorkAreaGate {
  if (old.view === "page" && !old.preview) return old;
  if (!WORK_AREA_IDS.includes(areaId) && !OWN_GATE_AREAS.includes(areaId)) return old;
  if (facts.signedIn && BASE_WORK_AREAS.includes(areaId)) return { view: "page", preview: false, via: "base" };
  const section = sectionForArea(areaId);
  if (!section || !facts.identity.verified || !facts.probes) return old;
  if (grantOpens(section, "READ", facts.probes.get(section))) return { view: "page", preview: false, via: "grant" };
  return old;
}

/* ---------------------------------------------------------------- navigation */

/** Areas a grant can put in the navigation: work areas with a catalogue section (one link each). */
export const GRANT_NAV_AREAS: readonly string[] = [
  ...WORK_AREA_IDS.filter((id) => sectionForArea(id) !== null && !BASE_WORK_AREAS.includes(id)),
  // Impianti e campi has its own gate (impianti.functions.ts) wired to the same grant.
  "impianti-campi",
];

/** Work areas opened by grants for this person (navigation only; each page keeps its server gate). */
export function grantAreasFor(facts: ResolverFacts): string[] {
  if (!facts.identity.verified || !facts.probes) return [];
  return GRANT_NAV_AREAS.filter((id) => grantOpens(sectionForArea(id)!, "READ", facts.probes!.get(sectionForArea(id)!)));
}

/** What the navigation adds for a signed-in person, on top of the position-based menu. */
export interface AccessNav {
  grantAreas: string[];
  auto: AutoEntry[];
}

export const EMPTY_NAV: AccessNav = { grantAreas: [], auto: [] };

export function accessNavFor(facts: ResolverFacts): AccessNav {
  return { grantAreas: grantAreasFor(facts), auto: autoEntries(facts.identity) };
}

/** Content of an entry for this person: items inside (null = not known) and whether they can create something there. */
export interface EntryContent {
  items: number | null;
  canCreate: boolean;
}

/**
 * No empty pages: an entry is hidden only when it is KNOWN to have nothing inside for this person and offers no create
 * action. Unknown content keeps the entry (the page then says "da confermare", never zero).
 */
export function hasSomething(content: EntryContent | undefined): boolean {
  if (!content) return true;
  if (content.canCreate) return true;
  return content.items === null || content.items > 0;
}

export function withContent<T extends { id: string }>(entries: readonly T[], contentOf: (id: string) => EntryContent | undefined): T[] {
  return entries.filter((e) => hasSomething(contentOf(e.id)));
}

const RAIL_LABEL = new Map(INTERIOR_RAIL.flatMap((g) => g.items.map((i) => [i.id, i] as const)));
const MENU_LABEL = new Map(ACCESS_MENU.flatMap((g) => g.entries.map((e) => [e.id, e] as const)));

const GRANT_AREA_COPY: Readonly<Record<string, { label: string; icon: AreaIcon }>> = {
  mister: { label: "Mister", icon: "users" },
  organigramma: { label: "Organigramma", icon: "users" },
  "club-house": { label: "Club House", icon: "home" },
  biglietteria: { label: "Biglietteria", icon: "file" },
  "magazzino-cassa": { label: "Magazzino · cassa", icon: "box" },
  persone: { label: "Persone", icon: "users" },
  certificati: { label: "Certificati medici", icon: "file" },
  compensi: { label: "Compensi", icon: "coin" },
  quote: { label: "Quote e Fondo", icon: "coin" },
  coda: { label: "Coda di lavoro", icon: "file" },
  scadenzario: { label: "Fornitori e scadenze", icon: "coin" },
  movimenti: { label: "Movimenti del conto", icon: "coin" },
  cervellone: { label: "Cervellone", icon: "file" },
  posta: { label: "Posta del club", icon: "file" },
  accessi: { label: "Accessi", icon: "users" },
  nutrizionista: { label: "Nutrizionista", icon: "star" },
};

/** Menu entry of an area opened by a grant. */
export function grantEntry(id: string): MenuEntry {
  const menu = MENU_LABEL.get(id);
  if (menu) return { ...menu, reserved: true };
  const rail = RAIL_LABEL.get(id);
  const copy = GRANT_AREA_COPY[id] ?? (rail ? { label: rail.label, icon: rail.icon } : { label: findArea(id)?.id ?? id, icon: "grid" as AreaIcon });
  return { id, label: copy.label, blurb: "Abilitata dalla Direzione", icon: copy.icon, reserved: true };
}

/**
 * The "Le tue aree" menu: the position-based groups (menuFor) plus one group for what the identity opens
 * automatically and one for what the Direzione enabled, without repeating an entry already shown.
 */
export function mergeNav(groups: readonly MenuGroup[], nav: AccessNav): MenuGroup[] {
  const seen = new Set(groups.flatMap((g) => g.entries.map((e) => e.id)));
  const auto: MenuEntry[] = withContent(nav.auto, (id) => {
    const a = nav.auto.find((x) => x.id === id);
    return a ? { items: a.items, canCreate: false } : undefined;
  })
    .filter((a) => !seen.has(a.id))
    .map((a) => ({ id: a.id, label: a.label, blurb: a.blurb, icon: a.icon, reserved: true }));
  for (const a of auto) seen.add(a.id);
  const granted = nav.grantAreas.filter((id) => !seen.has(id)).map(grantEntry);
  const out: MenuGroup[] = [...groups];
  if (auto.length) out.push({ title: "Per te e la tua famiglia", entries: auto });
  if (granted.length) out.push({ title: "Abilitate dalla Direzione", entries: granted });
  return out;
}
