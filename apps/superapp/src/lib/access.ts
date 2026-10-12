/**
 * Access screen content (board Accesso-area, VR-022), resolved from the area
 * registry (config/superapp-areas.v1.json) and the role landings
 * (src/lib/satellites.ts). Pure data: no login, no roles granted, no session.
 * Every line shown comes from those two files or is rendered as "to define".
 */
import { ACCESS_MENU, ACCESS_SCREEN_IDS, WORK_AREA_IDS, canSeeArea, findArea, labelIndex, type AreaIcon, type FlatArea } from "./areas";
import { R20_LOGIN_LIVE, SATELLITES, type Satellite } from "./satellites";
import { isStaffSession } from "./session";

/** Sub-areas that are not in the access menu or rail: label and icon only. */
const SUB_AREA_COPY: Readonly<Record<string, { label: string; icon: AreaIcon }>> = {
  mister: { label: "Mister", icon: "users" },
  organigramma: { label: "Organigramma e 3° livello SGS", icon: "users" },
  "club-house": { label: "Club House", icon: "home" },
  biglietteria: { label: "Biglietteria", icon: "file" },
  "magazzino-cassa": { label: "Magazzino · cassa", icon: "box" },
  acquisti: { label: "Acquisti", icon: "file" },
  persone: { label: "Persone", icon: "users" },
  certificati: { label: "Certificati medici", icon: "file" },
  compensi: { label: "Compensi e stipendi", icon: "coin" },
  quote: { label: "Quote e Fondo", icon: "coin" },
  coda: { label: "Coda di lavoro", icon: "file" },
  scadenzario: { label: "Fornitori e scadenze", icon: "coin" },
  cervellone: { label: "Cervellone", icon: "file" },
};

/** Plain Italian for the role ids used in the registry. */
const ROLE_LABEL: Readonly<Record<string, string>> = {
  "responsabile-trasporti": "responsabile trasporti",
  autista: "autisti",
  direzione: "Direzione",
  dirigenza: "Dirigenza",
  famiglia: "genitori e tutori registrati",
  partner: "aziende partner",
  "responsabile-club-house": "responsabile Club House",
  "addetto-biglietteria": "addetti biglietteria",
  "responsabile-magazzino": "responsabile magazzino",
  "responsabile-campi": "responsabile campi",
  mister: "mister",
  "dirigente-annata": "dirigenti di annata",
  segreteria: "Segreteria",
  tesoreria: "Tesoreria",
  presidente: "Presidente",
  "direttore-generale": "Direttore generale",
};

/** Registry notes written in technical English, shown in Italian. */
const NOTE_IT: Readonly<Record<string, string>> = {
  "tariff source to confirm": "fonte delle tariffe da confermare",
  "(to load)": "(da caricare)",
  "(to connect)": "(da collegare)",
  "(to choose)": "(da scegliere)",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role.replace(/-/g, " ");
}

export function localizeNote(text: string): string {
  let out = NOTE_IT[text] ?? text;
  for (const [en, it] of Object.entries(NOTE_IT)) out = out.replace(en, it);
  return out;
}

export interface AccessScreen {
  id: string;
  path: string;
  label: string;
  blurb: string;
  icon: AreaIcon;
  /** Parent area, for sub-areas such as /tesoreria/club-house. */
  parent: { id: string; label: string; path: string } | null;
  /** What is inside: registry features or flow, otherwise the role landing copy. Empty when not defined yet. */
  inside: readonly string[];
  insideFrom: "registry" | "landing" | "none";
  /** Data sources: registry first, then the role landing. Empty when not defined yet. */
  sources: readonly string[];
  /** Who can enter, from the registry roles. Empty means "ruoli da definire". */
  roles: readonly string[];
  blocker: string | null;
  /** Primary yellow action: the role landing that hosts the honest login state, or the gateway. */
  enter: { href: string; via: "landing" | "gateway" };
  /** Whether personal login works today (R20). False: the landing explains the activation state. */
  loginLive: boolean;
}

function labelFor(area: FlatArea): { label: string; icon: AreaIcon } {
  const menu = ACCESS_MENU.flatMap((g) => g.entries).find((e) => e.id === area.id);
  if (menu) return { label: menu.label, icon: menu.icon };
  const sub = SUB_AREA_COPY[area.id];
  if (sub) return sub;
  return { label: labelIndex().get(area.id) ?? area.id, icon: "grid" };
}

/** Role landing of the area itself, else of its nearest ancestor. */
function landingFor(area: FlatArea): Satellite | undefined {
  let cur: FlatArea | undefined = area;
  while (cur) {
    const id: string = cur.id;
    const s = SATELLITES.find((x) => x.areaId === id);
    if (s) return s;
    cur = cur.parentId ? findArea(cur.parentId) : undefined;
  }
  return undefined;
}

export function accessScreen(id: string): AccessScreen {
  if (!ACCESS_SCREEN_IDS.includes(id) && !WORK_AREA_IDS.includes(id)) throw new Error(`Area "${id}" has no access screen`);
  const area = findArea(id);
  if (!area) throw new Error(`Unknown area "${id}"`);
  const { label, icon } = labelFor(area);
  const parentArea = area.parentId ? findArea(area.parentId) : undefined;
  const parent = parentArea ? { id: parentArea.id, label: labelFor(parentArea).label, path: parentArea.path } : null;
  const menuBlurb = ACCESS_MENU.flatMap((g) => g.entries).find((e) => e.id === id)?.blurb;
  const own = SATELLITES.find((s) => s.areaId === id);
  const landing = landingFor(area);

  let inside: readonly string[] = [];
  let insideFrom: AccessScreen["insideFrom"] = "none";
  if (area.features?.length) {
    inside = area.features.map(localizeNote);
    insideFrom = "registry";
  } else if (area.flow?.length) {
    inside = [`Percorso: ${area.flow.join(" → ")}`];
    insideFrom = "registry";
  } else if (own) {
    inside = own.inside;
    insideFrom = "landing";
  }

  const sources = area.sources?.length ? area.sources.map(localizeNote) : own ? [own.source] : [];

  return {
    id,
    path: area.path,
    label,
    blurb: menuBlurb ?? own?.promise ?? (parent ? `Sottoarea di ${parent.label}.` : ""),
    icon,
    parent,
    inside,
    insideFrom,
    sources,
    roles: (area.roles ?? []).map(roleLabel),
    blocker: area.blocker ? localizeNote(area.blocker) : null,
    enter: landing ? { href: `/aree/${landing.slug}`, via: "landing" } : { href: "/aree", via: "gateway" },
    loginLive: R20_LOGIN_LIVE,
  };
}

export interface WorkAreaGateInput {
  /** Staging-only preview (stagingPreviewEnabled, src/lib/impianti-access.ts), decided on the server. */
  preview: boolean;
  /**
   * Positions of a session verified on the server (Supabase SCD, src/lib/auth.functions.ts →
   * src/lib/session.ts), or null when there is none. The client-side token is never trusted.
   */
  sessionRoles: ReadonlySet<string> | null;
}

export interface WorkAreaGate {
  view: "page" | "access";
  /** True when the page is shown only because of the staging preview (banner required). */
  preview: boolean;
}

/**
 * Gate of a work area: the page for a verified session with an allowed position (registry
 * roles, Direzione sees all; areas whose roles are still "to define" open only to staff
 * positions), otherwise the area's access screen. The staging preview opens the page with a
 * banner. Grants nothing: it only picks what to render.
 */
export function workAreaView(id: string, { preview, sessionRoles }: WorkAreaGateInput): WorkAreaGate {
  if (!WORK_AREA_IDS.includes(id)) throw new Error(`Area "${id}" is not a work area`);
  const area = findArea(id)!;
  const staffOnly = !area.roles || area.roles.length === 0;
  const allowed = sessionRoles !== null && sessionRoles.size > 0 && canSeeArea(area, sessionRoles) && (!staffOnly || isStaffSession(sessionRoles));
  if (allowed) return { view: "page", preview: false };
  if (preview) return { view: "page", preview: true };
  return { view: "access", preview: false };
}

/** "responsabile trasporti, autisti, Direzione" or the honest fallback. */
export function whoEnters(screen: Pick<AccessScreen, "roles">): string {
  return screen.roles.length ? screen.roles.join(", ") : "ruoli da definire";
}
