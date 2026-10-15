/**
 * Site menu and its search (UD-116, Direzione 14/10/2026: the link index leaves the footer and lives in the menu).
 * The app groups (ONE / CORE / GROW) plus "Tutto sul club" with every page of the site index (LINK_GROUPS) not
 * already listed. Reserved areas carry a lock: their page shows the access screen to visitors. Routes are checked
 * against src/routeTree.gen.ts in public-home.test.ts.
 */
import { LINK_GROUPS, type PublicLink } from "./public-home";

export interface MenuItem extends PublicLink {
  label: string;
  reserved?: boolean;
  /** Other names of the same page (labels of the site index merged into it), used by the search. */
  keywords?: string;
}

export interface MenuGroup {
  id: string;
  title: string;
  /** App of the ecosystem the group belongs to (internal id, never shown to the public: cleanup 15/10/2026). */
  app: "ONE" | "CORE" | "GROW" | "INFO";
  items: readonly MenuItem[];
}

/** Full menu (drawer and "Altro"), grouped by app. */
export const MENU_GROUPS: readonly MenuGroup[] = [
  {
    id: "club",
    title: "Il Club",
    app: "ONE",
    items: [
      { to: "/", label: "Home" },
      { to: "/societa", label: "Chi siamo" },
      { to: "/calendario", label: "Calendario gare" },
      { to: "/impianti", label: "Mappa campi" },
      { to: "/comunicazioni", label: "Comunicazioni" },
      { to: "/eventi", label: "Eventi" },
      { to: "/tornei", label: "Tornei" },
      { to: "/eventi/christmas-lario-cup", label: "Christmas Lario Cup" },
      { to: "/community", label: "Tifosi" },
      { to: "/entra", label: "Gioca con noi" },
      { to: "/contatti", label: "Contatti" },
    ],
  },
  {
    id: "area",
    title: "Area club",
    app: "CORE",
    items: [
      { to: "/la-mia-scd", label: "La mia SCD", reserved: true },
      { to: "/squadre", label: "Le squadre", reserved: true },
      { to: "/allenamenti", label: "Allenamenti", reserved: true },
      { to: "/fantacalcio", label: "Fantacalcio SCD", publicMenu: false },
      { to: "/top11", label: "Top 11 della settimana", publicMenu: false },
      { to: "/rassegna-stampa", label: "Dicono di noi", publicMenu: false },
      { to: "/aree", label: "Il tuo ingresso (tutte le aree)", reserved: true },
    ],
  },
  {
    id: "grow",
    title: "Sponsor & Partner",
    app: "GROW",
    items: [
      { to: "/sponsor", label: "Sponsor & Partner" },
      { to: "/fornitori", label: "Fornitori" },
    ],
  },
];

const linkKey = (l: PublicLink) =>
  `${l.to}#${l.hash ?? ""}?${new URLSearchParams(l.search ?? {}).toString()}`;

/** Empty placeholder pages stay out of the public menu (publicMenu: false here or in LINK_GROUPS); routes alive. */
export const isHiddenFromMenu = (l: PublicLink): boolean => l.publicMenu === false;

/**
 * The menu sections: the app groups, then "Tutto sul club" with every page of the site index (LINK_GROUPS) that the
 * app groups do not already list. Every LINK_GROUPS page is therefore reachable from the menu (tested), except the
 * placeholders marked publicMenu: false.
 */
export function menuSections(): MenuGroup[] {
  const groups = MENU_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !isHiddenFromMenu(i)).map((i) => ({ ...i })),
  }));
  const byKey = new Map<string, MenuItem>(
    groups.flatMap((g) => g.items.map((i) => [linkKey(i), i] as const)),
  );
  const extra: MenuItem[] = [];
  for (const item of LINK_GROUPS.flatMap((g) => g.items)) {
    if (isHiddenFromMenu(item)) continue;
    const k = linkKey(item);
    const hit = byKey.get(k);
    if (hit) {
      // Same page under another name: keep one entry, make the other name searchable.
      if (hit.label !== item.label)
        hit.keywords = [hit.keywords, item.label].filter(Boolean).join(" ");
      continue;
    }
    const copy = { ...item };
    byKey.set(k, copy);
    extra.push(copy);
  }
  return [
    ...groups,
    { id: "indice", title: "Tutto sul club", app: "INFO", items: extra },
  ];
}

const fold = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Search of the menu: every word of the query must appear in the label, its other names or its group title. */
export function searchMenu(
  query: string,
  sections: readonly MenuGroup[] = menuSections(),
): MenuItem[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: MenuItem[] = [];
  const seen = new Set<string>();
  for (const g of sections) {
    for (const i of g.items) {
      const hay = fold(`${i.label} ${i.keywords ?? ""} ${g.title}`);
      if (!words.every((w) => hay.includes(w))) continue;
      const k = linkKey(i);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(i);
    }
  }
  return out;
}
