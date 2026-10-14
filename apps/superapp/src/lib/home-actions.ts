/**
 * Quick actions of the home (UD-116, Direzione 14/10/2026): at most six big buttons, different for each kind of
 * person, linking only to routes that exist (checked in home-actions.test.ts against src/routeTree.gen.ts).
 *
 * Where the Direzione's wish has no page of its own yet, the closest existing page is used and the gap is written
 * next to the entry (`closest`), so nobody mistakes it for a finished feature.
 */
import { isStaffSession } from "./session";

export type HomeAudience = "visitatore" | "famiglia" | "staff";

export type ActionIcon =
  | "trial"
  | "ticket"
  | "map"
  | "card"
  | "install"
  | "mail"
  | "callup"
  | "bus"
  | "calendar"
  | "euro"
  | "docs"
  | "team"
  | "check"
  | "sheet"
  | "pitch"
  | "tasks"
  | "megaphone";

export interface QuickAction {
  id: string;
  label: string;
  /** One short line under the label. */
  hint: string;
  to: string;
  search?: Record<string, string>;
  hash?: string;
  icon: ActionIcon;
  /** Set when the wished page does not exist yet and this is the closest existing one. */
  closest?: string;
}

export const MAX_QUICK_ACTIONS = 6;

export const AUDIENCE_LABEL: Readonly<Record<HomeAudience, string>> = {
  visitatore: "Per chi ci scopre",
  famiglia: "Per la tua famiglia",
  staff: "Per lo staff",
};

/**
 * Who the home is talking to. Staff positions win (a mister who is also a parent works from the home); families and
 * athletes get the family set; anyone else (signed out, or signed in without a role yet) the visitor set.
 */
export function audienceFor(
  roles: readonly string[],
  signedIn: boolean,
): HomeAudience {
  if (!signedIn) return "visitatore";
  const set = new Set(roles);
  if (isStaffSession(set)) return "staff";
  if (set.has("famiglia") || set.has("atleta")) return "famiglia";
  return "visitatore";
}

const VISITOR: readonly QuickAction[] = [
  {
    id: "prova",
    label: "Prova gratuita e iscrizioni",
    hint: "Scegli categoria e annata",
    to: "/entra",
    icon: "trial",
  },
  {
    id: "partita",
    label: "Prossima partita e biglietti",
    hint: "Le gare in casa e l'ingresso",
    to: "/calendario",
    search: { vista: "prossime", luogo: "casa" },
    icon: "ticket",
    closest:
      "Biglietteria pubblica: no dedicated page; prices and entrance are on /impianti, games on /calendario.",
  },
  {
    id: "dove",
    label: "Dove siamo",
    hint: "Campi di Colico e Dervio",
    to: "/impianti",
    icon: "map",
  },
  {
    id: "card",
    label: "Card 2026/27",
    hint: "Tesserato, Sostenitore, Partner",
    to: "/card",
    icon: "card",
  },
  {
    id: "installa",
    label: "Installa l'app",
    hint: "Avvisi e calendario sul telefono",
    to: "/installa",
    icon: "install",
  },
  {
    id: "segreteria",
    label: "Scrivi alla segreteria",
    hint: "Vera e la segreteria ti rispondono",
    to: "/contatti",
    icon: "mail",
  },
];

const FAMILY: readonly QuickAction[] = [
  {
    id: "convocazioni",
    label: "Convocazioni",
    hint: "Prendi visione",
    to: "/famiglia",
    hash: "fam-convocazioni",
    icon: "callup",
  },
  {
    id: "pulmino",
    label: "Pulmino",
    hint: "Chiedi un posto per le trasferte",
    to: "/famiglia",
    hash: "fam-pulmino",
    icon: "bus",
  },
  {
    id: "calendario-figlio",
    label: "Calendario di mio figlio",
    hint: "Gare della sua squadra",
    to: "/calendario",
    icon: "calendar",
  },
  {
    id: "quote",
    label: "Quote e pagamenti",
    hint: "Cosa è pagato e cosa manca",
    to: "/famiglia",
    hash: "fam-quote",
    icon: "euro",
  },
  {
    id: "documenti",
    label: "Documenti",
    hint: "Moduli e regolamenti",
    to: "/documenti",
    icon: "docs",
  },
  {
    id: "segreteria",
    label: "Scrivi alla segreteria",
    hint: "Vera e la segreteria ti rispondono",
    to: "/contatti",
    icon: "mail",
  },
];

const STAFF: readonly QuickAction[] = [
  {
    id: "squadre",
    label: "Le mie squadre",
    hint: "Gare, rosa e settimana",
    to: "/gestionale/mister",
    icon: "team",
  },
  {
    id: "presenze",
    label: "Presenze",
    hint: "La settimana della squadra",
    to: "/gestionale/mister",
    hash: "mis-settimana",
    icon: "check",
    closest:
      "Training attendance has no page yet (gestionale: 'Presenze agli allenamenti' pending); opens the team week.",
  },
  {
    id: "distinta",
    label: "Distinta",
    hint: "Prepara la prossima gara",
    to: "/gestionale/mister",
    hash: "mis-distinta",
    icon: "sheet",
  },
  {
    id: "campo",
    label: "Richiesta campo",
    hint: "Prenota un campo o uno spogliatoio",
    to: "/gestionale/impianti/nuova",
    icon: "pitch",
  },
  {
    id: "compiti",
    label: "Compiti di oggi",
    hint: "Le voci da decidere",
    to: "/gestionale/coda",
    icon: "tasks",
    closest:
      "No personal task list yet: the shared work queue (office) is the closest page.",
  },
  {
    id: "comunicazioni",
    label: "Comunicazioni",
    hint: "Messaggi e posta del club",
    to: "/gestionale/posta",
    icon: "megaphone",
  },
];

const BY_AUDIENCE: Readonly<Record<HomeAudience, readonly QuickAction[]>> = {
  visitatore: VISITOR,
  famiglia: FAMILY,
  staff: STAFF,
};

/**
 * The buttons of an audience. Families with children in exactly one team open that team's calendar directly; with
 * more teams (or none known) the calendar opens on the coming games.
 */
export function quickActions(
  audience: HomeAudience,
  opts: { childGroups?: readonly string[] } = {},
): QuickAction[] {
  const groups = [...new Set(opts.childGroups ?? [])];
  return BY_AUDIENCE[audience].slice(0, MAX_QUICK_ACTIONS).map((a) => {
    if (a.id !== "calendario-figlio") return { ...a };
    return groups.length === 1
      ? { ...a, search: { annata: groups[0]! } }
      : { ...a, search: { vista: "prossime" } };
  });
}

/** Every route the quick actions can open (for the route-existence test). */
export function quickActionRoutes(): string[] {
  return [
    ...new Set(Object.values(BY_AUDIENCE).flatMap((l) => l.map((a) => a.to))),
  ];
}
