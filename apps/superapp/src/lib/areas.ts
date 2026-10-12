/**
 * Super App area registry (typed view of `config/superapp-areas.v1.json`).
 *
 * The JSON at the repository root is the single source: every area and
 * sub-area of the "app madre" with its own direct path. This module only
 * types it, flattens it, validates it and adds the presentation data the
 * approved boards need (access menu groups, interior rail groups, the route
 * each area lives on today). One login and one database stay behind every
 * path: nothing here grants access or changes roles.
 *
 * Visual source: Visual Master VR-022 (boards Accesso-aree, Quadro-settimanale).
 */
import registryJson from "../../../../config/superapp-areas.v1.json";

import { SATELLITES } from "./satellites";

export type AreaStatus = "design" | "planned" | "live";

export interface AreaNode {
  id: string;
  path: string;
  audience?: string;
  roles?: readonly string[];
  board?: string;
  sources?: readonly string[];
  status: AreaStatus;
  features?: readonly string[];
  used_by?: readonly string[];
  alias_of?: string;
  flows_to?: string;
  blocker?: string;
  /** Ordered steps of a workflow area (e.g. acquisti). */
  flow?: readonly string[];
  /**
   * Club positions (ABAC attribute) mapped onto the coarse roles of
   * SCD_SYSTEM_MANIFEST.json `identity_and_access.roles`. No new manifest roles.
   */
  role_map?: Readonly<Record<string, string>>;
  /** Plain note on how and when the access rule is enforced. */
  access_note?: string;
  children?: readonly AreaNode[];
}

/** Coarse roles of SCD_SYSTEM_MANIFEST.json (checked against the manifest in areas.test.ts). */
export const MANIFEST_ROLES: readonly string[] = ["USER_BASE", "FAMILY", "ATHLETE", "MISTER", "STAFF", "MANAGER", "SECRETARIAT", "REGISTRATION", "TOURNAMENTS", "DIRECTION", "ADMIN", "SYSTEM"];

export interface AreaRegistry {
  schema: string;
  status: string;
  updated: string;
  rules: readonly string[];
  areas: readonly AreaNode[];
}

/** A registry entry with its position in the tree. */
export interface FlatArea extends Omit<AreaNode, "children"> {
  parentId: string | null;
  depth: number;
}

export const AREA_REGISTRY = registryJson as unknown as AreaRegistry;

/** Every area and sub-area, parents before children. */
export function flattenAreas(nodes: readonly AreaNode[] = AREA_REGISTRY.areas, parentId: string | null = null, depth = 0): FlatArea[] {
  const out: FlatArea[] = [];
  for (const { children, ...node } of nodes) {
    out.push({ ...node, parentId, depth });
    if (children?.length) out.push(...flattenAreas(children, node.id, depth + 1));
  }
  return out;
}

export const ALL_AREAS: readonly FlatArea[] = flattenAreas();

export function findArea(id: string): FlatArea | undefined {
  return ALL_AREAS.find((a) => a.id === id);
}

export function findAreaByPath(path: string): FlatArea | undefined {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return ALL_AREAS.find((a) => a.path === clean);
}

/** Boards that the Visual Master keeps in the private canvas (open security items). */
export const PRIVATE_BOARDS: readonly string[] = ["Plancia-direzione.dc.html", "Tesoreria.dc.html"];

/**
 * Structural checks on the registry. Returns human-readable problems, empty when valid.
 * `boards`, when given, is the list of board files available in docs/design/visual-master.
 */
export function validateAreas(nodes: readonly AreaNode[] = AREA_REGISTRY.areas, boards?: readonly string[]): string[] {
  const flat = flattenAreas(nodes);
  const problems: string[] = [];
  const ids = new Map<string, number>();
  const paths = new Map<string, number>();
  for (const a of flat) {
    ids.set(a.id, (ids.get(a.id) ?? 0) + 1);
    paths.set(a.path, (paths.get(a.path) ?? 0) + 1);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id)) problems.push(`id "${a.id}" is not kebab-case`);
    if (!/^\/[a-z0-9:/-]*$/.test(a.path) || (a.path.length > 1 && a.path.endsWith("/"))) problems.push(`path "${a.path}" of "${a.id}" is not a clean absolute path`);
    if (!["design", "planned", "live"].includes(a.status)) problems.push(`status "${a.status}" of "${a.id}" is unknown`);
    if (a.parentId !== null && !flat.some((p) => p.id === a.parentId)) problems.push(`"${a.id}" has a missing parent "${a.parentId}"`);
    if (a.alias_of && !flat.some((p) => p.id === a.alias_of && !p.alias_of)) problems.push(`"${a.id}" is an alias of a missing area "${a.alias_of}"`);
    if (a.flows_to && !flat.some((p) => p.id === a.flows_to)) problems.push(`"${a.id}" flows to a missing area "${a.flows_to}"`);
    if (a.used_by) for (const u of a.used_by) if (!flat.some((p) => p.id === u)) problems.push(`"${a.id}" is used by a missing area "${u}"`);
    if (a.role_map) {
      for (const [pos, role] of Object.entries(a.role_map)) {
        if (!a.roles?.includes(pos)) problems.push(`"${a.id}" maps position "${pos}" that is not in its roles`);
        if (!MANIFEST_ROLES.includes(role)) problems.push(`"${a.id}" maps "${pos}" to "${role}", not a manifest role`);
      }
      for (const r of a.roles ?? []) if (!(r in a.role_map)) problems.push(`"${a.id}" has role "${r}" without a manifest mapping`);
    }
    if (boards && a.board && !boards.includes(a.board) && !PRIVATE_BOARDS.includes(a.board)) problems.push(`board "${a.board}" of "${a.id}" is not in the Visual Master`);
  }
  for (const [id, n] of ids) if (n > 1) problems.push(`id "${id}" is used ${n} times`);
  for (const [path, n] of paths) if (n > 1) problems.push(`path "${path}" is used ${n} times`);
  return problems;
}

/**
 * Where each area can be opened TODAY. Areas whose own direct path is not built
 * yet point to the page that already hosts that function: an explicit route
 * below, otherwise the role landing /aree/<slug> of the satellite mapped to the
 * area (src/lib/satellites.ts). Areas with no page at all are absent: the UI
 * shows them as "in arrivo" instead of a link that would end on a 404.
 * Every value is checked against the generated route tree in areas.test.ts.
 */
const EXPLICIT_HREF: Readonly<Record<string, string>> = {
  calendario: "/calendario",
  tornei: "/eventi",
  "christmas-lario-cup": "/eventi/christmas-lario-cup",
  sponsor: "/sponsor",
  gestionale: "/gestionale",
  quadro: "/quadro",
  mappa: "/gestionale/mappa",
  impianti: "/impianti",
  squadre: "/squadre",
  "impianti-campi": "/gestionale/impianti",
  "impianti-colico": "/gestionale/impianti/colico",
  "impianti-dervio": "/gestionale/impianti/dervio",
  "impianti-simulazione": "/gestionale/impianti/simulazione",
  "impianti-nuova": "/gestionale/impianti/nuova",
  "impianti-approvazioni": "/gestionale/impianti/approvazioni",
  "rotazione-campi": "/gestionale/impianti",
  "quadro-rotazione-campi": "/gestionale/impianti",
};

/**
 * Reserved areas whose canonical direct path answers ONLY with an access screen
 * (board Accesso-area): what is inside, who enters, one yellow "Entra" towards
 * the existing entry flow. Each id has a thin route at its own path
 * (src/routes/<path>.tsx) rendering src/components/scd/AccessScreen.tsx.
 * When the real page of an area is built the id moves to WORK_AREA_IDS.
 */
export const ACCESS_SCREEN_IDS: readonly string[] = [
  "famiglia",
  "direzione",
  "acquisti",
  "partner",
];

/**
 * Reserved areas whose canonical direct path is a real read-only work page
 * (release 2 item 6). The page stays behind the same gate: without a verified
 * session with an allowed role (or the staging-only preview, stagingPreviewEnabled in src/lib/impianti-access.ts)
 * the route still renders the area's access screen (src/lib/access.ts workAreaView).
 */
export const WORK_AREA_IDS: readonly string[] = [
  "pulmini",
  "segreteria",
  "crm",
  "magazzino",
  "tesoreria",
  "club-house",
  "biglietteria",
  "magazzino-cassa",
  "compensi",
  "infermeria",
  "mister",
  "organigramma",
  "persone",
  "accessi",
  "certificati",
];

/**
 * Registry paths that intentionally have neither a page nor an access screen
 * yet, with the backlog item that owns them (docs/RELEASE2_LOG.md). A prefix
 * covers the sub-paths too, so children added by the owning branch stay owned.
 */
export const DEFERRED_PATHS: Readonly<Record<string, string>> = {
  "/quadro": "item 4 · quadro settimanale",
  "/gestionale": "item 4 · gestionale",
  "/oggi": "item 5 · public today",
  "/partite": "item 5 · match live page",
  "/sky-club": "item 5 · Sky Club",
  "/foto": "item 5 · Foto",
  "/gioca": "item 7 · Gioca teaser",
};

/** Owner of a deferred path (exact match or parent prefix), or null. */
export function deferredOwner(path: string): string | null {
  // A path with a live page today is not deferred, even under an owned prefix.
  const area = findAreaByPath(path);
  if (area && CURRENT_HREF[area.id]) return null;
  for (const [prefix, owner] of Object.entries(DEFERRED_PATHS)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return owner;
  }
  return null;
}

/** True when the area's own path is only an access screen (no page yet). */
export function hasAccessScreen(id: string): boolean {
  return ACCESS_SCREEN_IDS.includes(id);
}

/** True when the area's own path is a real work page (kept behind the access gate). */
export function isWorkArea(id: string): boolean {
  return WORK_AREA_IDS.includes(id);
}

/** Areas served today by an existing page that already hosts the same function. */
const HOSTED_HREF: Readonly<Record<string, string>> = {
  iscrizioni: "/entra",
};

export const CURRENT_HREF: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const s of SATELLITES) if (s.areaId) out[s.areaId] = `/aree/${s.slug}`;
  for (const id of [...ACCESS_SCREEN_IDS, ...WORK_AREA_IDS]) {
    const area = findArea(id);
    if (area) out[id] = area.path;
  }
  return { ...out, ...HOSTED_HREF, ...EXPLICIT_HREF };
})();

export interface AreaLink {
  id: string;
  /** Canonical direct path from the registry (what the board prints). */
  path: string;
  /** Route to open today, or null when the area has no page yet. */
  href: string | null;
  /** True when the canonical direct path itself is the live route. */
  direct: boolean;
  /** True when that route is the area's access screen, not its full page yet. */
  access: boolean;
  /** True when that route is the area's real work page (behind the same access gate). */
  page: boolean;
}

export function areaLink(id: string): AreaLink {
  const area = findArea(id);
  if (!area) throw new Error(`Unknown area "${id}"`);
  const href = CURRENT_HREF[id] ?? null;
  const direct = href === area.path;
  return { id, path: area.path, href, direct, access: direct && hasAccessScreen(id), page: direct && isWorkArea(id) };
}

export type AreaIcon =
  | "calendar" | "trophy" | "plus" | "home" | "grid" | "table" | "bus" | "box"
  | "file" | "coin" | "users" | "gauge" | "star" | "handshake" | "map";

export interface MenuEntry {
  id: string;
  label: string;
  blurb: string;
  icon: AreaIcon;
  /** Reserved area (lock icon): one SCD account, the role decides what is visible. */
  reserved: boolean;
}

export interface MenuGroup {
  title: string;
  entries: readonly MenuEntry[];
}

/** "Accesso aree" menu, copy and order from board Accesso-aree (VR-022). */
export const ACCESS_MENU: readonly MenuGroup[] = [
  {
    title: "Per famiglie e tifosi",
    entries: [
      { id: "calendario", label: "Calendario annuale", blurb: "Partite di tutte le annate", icon: "calendar", reserved: false },
      { id: "tornei", label: "Tornei ed eventi", blurb: "Christmas Lario Cup e la stagione", icon: "trophy", reserved: false },
      { id: "infermeria", label: "Infermeria", blurb: "Servizi; prenoti con l'account", icon: "plus", reserved: true },
      { id: "famiglia", label: "Area famiglia", blurb: "Annata, avvisi, quote dei figli", icon: "home", reserved: true },
    ],
  },
  {
    title: "Per lo staff tecnico",
    entries: [
      { id: "gestionale", label: "Gestionale sportivo", blurb: "Squadre, partite, attività", icon: "grid", reserved: true },
      { id: "quadro", label: "Quadro settimanale", blurb: "Campi e spogliatoi", icon: "table", reserved: true },
      { id: "pulmini", label: "Pulmini", blurb: "Mezzi, autisti, corse", icon: "bus", reserved: true },
      { id: "magazzino", label: "Magazzino", blurb: "Kit, taglie, consegne", icon: "box", reserved: true },
    ],
  },
  {
    title: "Per l'ufficio",
    entries: [
      { id: "segreteria", label: "Segreteria", blurb: "Tesseramenti, distinte, scadenze", icon: "file", reserved: true },
      { id: "tesoreria", label: "Tesoreria", blurb: "Quote, fondo, cassa", icon: "coin", reserved: true },
      { id: "crm", label: "CRM contatti", blurb: "Sponsor, tornei, segreteria", icon: "users", reserved: true },
      { id: "direzione", label: "Direzione", blurb: "La società in un colpo d'occhio", icon: "gauge", reserved: true },
    ],
  },
  {
    title: "Per le aziende",
    entries: [
      { id: "sponsor", label: "Sponsor", blurb: "Diventa partner della SCD", icon: "star", reserved: false },
      { id: "partner", label: "Area partner", blurb: "La tua scheda e i materiali", icon: "handshake", reserved: true },
    ],
  },
];

/** Roles that see every interior area (board: Direzione has the whole club at a glance). */
export const ALL_AREAS_ROLES: readonly string[] = ["direzione"];

export interface RailItem {
  id: string;
  label: string;
  icon: AreaIcon;
}

export interface RailGroup {
  title: string;
  items: readonly RailItem[];
}

/** Interior blue rail, groups and order from boards Quadro-settimanale and Gestionale. */
export const INTERIOR_RAIL: readonly RailGroup[] = [
  {
    title: "Sport",
    items: [
      { id: "gestionale", label: "Gestionale sportivo", icon: "grid" },
      { id: "quadro", label: "Quadro settimanale", icon: "table" },
      { id: "calendario", label: "Calendario annuale", icon: "calendar" },
      { id: "impianti-campi", label: "Impianti e campi", icon: "grid" },
      { id: "mappa", label: "Mappa impianti", icon: "map" },
      { id: "pulmini", label: "Pulmini", icon: "bus" },
    ],
  },
  {
    title: "Ufficio",
    items: [
      { id: "segreteria", label: "Segreteria", icon: "file" },
      { id: "tesoreria", label: "Tesoreria", icon: "coin" },
      { id: "crm", label: "CRM contatti", icon: "users" },
      { id: "magazzino", label: "Magazzino", icon: "box" },
    ],
  },
  {
    title: "Società",
    items: [{ id: "direzione", label: "Direzione", icon: "gauge" }],
  },
];

/**
 * Areas without a `roles` list in the registry are open to every staff role;
 * areas with one are shown only to those roles (plus Direzione).
 * This filters navigation only: access control stays with R20 on the server.
 */
export function canSeeArea(area: Pick<AreaNode, "roles">, roles: ReadonlySet<string>): boolean {
  if (ALL_AREAS_ROLES.some((r) => roles.has(r))) return true;
  if (!area.roles || area.roles.length === 0) return true;
  return area.roles.some((r) => roles.has(r));
}

export function railFor(roles: ReadonlySet<string>, rail: readonly RailGroup[] = INTERIOR_RAIL): RailGroup[] {
  return rail
    .map((g) => ({ ...g, items: g.items.filter((it) => { const a = findArea(it.id); return a ? canSeeArea(a, roles) : false; }) }))
    .filter((g) => g.items.length > 0);
}

/** Labels for every area id that appears in a menu or rail (used by search). */
export function labelIndex(): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of ACCESS_MENU) for (const e of g.entries) m.set(e.id, e.label);
  for (const g of INTERIOR_RAIL) for (const it of g.items) if (!m.has(it.id)) m.set(it.id, it.label);
  return m;
}

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export interface SearchHit extends AreaLink {
  label: string;
}

/** Searches area names, ids and paths ("pulm", "/quadro", "tesoreria"). Accent and case insensitive. */
export function searchAreas(query: string, limit = 6): SearchHit[] {
  const q = normalize(query).replace(/^\//, "");
  if (q.length < 2) return [];
  const hits: { hit: SearchHit; score: number }[] = [];
  for (const [id, label] of labelIndex()) {
    const area = findArea(id);
    if (!area) continue;
    const name = normalize(label);
    const path = normalize(area.path).replace(/^\//, "");
    const score = name.startsWith(q) || path.startsWith(q) ? 0 : name.includes(q) || path.includes(q) || id.includes(q) ? 1 : -1;
    if (score >= 0) hits.push({ hit: { ...areaLink(id), label }, score });
  }
  return hits.sort((a, b) => a.score - b.score || a.hit.label.localeCompare(b.hit.label, "it")).slice(0, limit).map((h) => h.hit);
}

export interface StripItem {
  /** Count from a real source; null or undefined when the source does not say. */
  value: number | null | undefined;
  label: string;
}

/**
 * "In evidenza" strip value: unknown is never shown as zero (renders "—"),
 * and both zero and unknown are muted so only real numbers draw the eye.
 */
export function stripValue(value: number | null | undefined): { text: string; muted: boolean; known: boolean } {
  if (value === null || value === undefined || !Number.isFinite(value)) return { text: "—", muted: true, known: false };
  return { text: new Intl.NumberFormat("it-IT").format(value), muted: value === 0, known: true };
}

/** "Sabato 10 ottobre" in the club's time zone. */
export function formatClubDay(date: Date): string {
  const s = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
