import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BUILD_STAMP } from "@/lib/build-stamp";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Download,
  Ellipsis,
  Facebook,
  Handshake,
  HeartHandshake,
  House,
  Instagram,
  Lock,
  LogIn,
  MapPinned,
  Menu,
  MessagesSquare,
  Newspaper,
  Phone,
  Search,
  Shirt,
  ShieldCheck,
  TrafficCone,
  Trophy,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { sessionPositions, type ChromeSession } from "@/lib/access-nav";
import {
  ACCESS_SCREEN_IDS,
  WORK_AREA_IDS,
  areaLink,
  findArea,
  menuFor,
  type AreaLink,
  type MenuEntry,
} from "@/lib/areas";
import { CLUB_PROFILE } from "@/lib/club-profile";
import { SOCIAL_LINKS } from "@/lib/public-home";
import { menuSections, searchMenu, type MenuItem } from "@/lib/site-menu";
import { useSession } from "@/lib/use-session";
import { useClubPulse } from "@/lib/use-club-pulse";
import { openCookiePrefs } from "./CookieConsent";
import { AccessMenu, loginSearch, openAccessMenu } from "./scd/AccessMenu";
import { AREA_ICON } from "./scd/area-icons";
import { CLUB_CREDENTIALS, CREDENTIALS_SENTENCE, type CredentialId } from "@/lib/club-credentials";

/** Nome ufficiale della società (sigla S.C.D., non invertire le lettere). */
export const CLUB_NAME = "S.C.D. ColicoDerviese";

/**
 * Shell from Francesco's boards (approved 15/10/2026 14:40) with Eurobet as the desktop STRUCTURE reference only (top bar
 * with logo + search + account, persistent left sidebar, central content, right rail on the home; no gambling content).
 *
 * Phone (< 1024 px): navy header with the official crest and the two-line wordmark, the bell (club notices) and a small
 * menu icon ("Tutte le pagine"); white bottom bar with the five board items Home · Calendario · Squadre · Eventi ·
 * Profilo; the slim sponsor strip just above it.
 * Desktop (>= 1024 px): top bar (crest + wordmark, page search, Entra / Le tue aree), sticky navy sidebar with the club
 * sections and, for signed-in people, the work areas their positions open (src/lib/areas.ts menuFor, navigation only:
 * every area keeps its own server gate). Members-only pages (Squadre, Allenamenti) lead guests through the sign-in.
 */
export type SideItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Members-only page (http-policy MEMBERS_ONLY_PREFIXES): guests go through /accedi?next=… */
  members?: boolean;
  match?: (p: string) => boolean;
};

/** Public sections of the desktop sidebar, in the order agreed with Francesco (15/10/2026). */
export const SIDEBAR_SECTIONS: readonly SideItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/squadre", label: "Squadre", icon: UsersRound, members: true },
  { to: "/allenamenti", label: "Allenamenti", icon: TrafficCone, members: true },
  {
    to: "/eventi",
    label: "Eventi e tornei",
    icon: Trophy,
    match: (p) => p.startsWith("/eventi") || p.startsWith("/tornei"),
  },
  { to: "/comunicazioni", label: "News", icon: Newspaper },
  { to: "/community", label: "Comunità", icon: MessagesSquare },
  { to: "/sponsor", label: "Sponsor", icon: Handshake },
  { to: "/sostieni", label: "Sostieni", icon: HeartHandshake },
  { to: "/impianti", label: "Impianti", icon: MapPinned },
  { to: "/contatti", label: "Contatti", icon: Phone },
];

/** Where a section link goes for this visitor: members-only pages pass through the sign-in for guests. */
export function sectionTarget(
  item: Pick<SideItem, "to" | "members">,
  signedIn: boolean,
): { to: string; search?: { next: string } } {
  return item.members && !signedIn ? { to: "/accedi", search: { next: item.to } } : { to: item.to };
}

type WorkArea = { entry: MenuEntry; link: AreaLink & { href: string } };

/** Work areas of the signed-in person for the sidebar: reserved entries of the access menu their positions open. */
export function workAreasFor(session: ChromeSession): WorkArea[] {
  if (!session?.user) return [];
  return menuFor(sessionPositions(session))
    .flatMap((g) => g.entries)
    .filter((e) => e.reserved)
    .map((e) => ({ entry: e, link: areaLink(e.id) }))
    .filter((x): x is WorkArea => !!x.link.href);
}

const isActive = (pathname: string, to: string) =>
  to === "/"
    ? pathname === "/"
    : pathname === to || pathname.startsWith(`${to}/`);

/**
 * Schermate costruite sulle tavole: hanno la propria testata (stemma + titolo), quindi su smartphone la barra superiore
 * generica non viene mostrata. Su desktop restano barra superiore e barra laterale.
 */
// Gated work areas render their access screen without a session: same board header.
const ACCESS_SCREEN_PATHS = [...ACCESS_SCREEN_IDS, ...WORK_AREA_IDS]
  .map((id) => findArea(id)?.path)
  .filter((p): p is string => !!p);
// Entry pages of the reserved work areas (/direzione, /gestionale…): the «Le tue aree» bar stays there, to jump between areas.
const WORK_AREA_PATHS = WORK_AREA_IDS.map((id) => findArea(id)?.path).filter((p): p is string => !!p);
const isWorkAreaPath = (p: string) => WORK_AREA_PATHS.includes(p.replace(/\/$/, "") || "/");
const BOARD_ROUTES = [
  "/calendario",
  "/allenamenti",
  "/comunicazioni",
  "/core",
  "/core/atleta",
  "/core/famiglia",
  "/core/staff",
  "/core/impianti-calendari",
  "/grow",
  "/documenti",
  ...ACCESS_SCREEN_PATHS,
];
export const isBoardRoute = (p: string) =>
  BOARD_ROUTES.includes(p.replace(/\/$/, "") || "/");

/** Apre il menu completo da qualunque punto (voce "Altro", icona menu, "Tutte le pagine"). */
export const openMenu = () => window.dispatchEvent(new CustomEvent("scd:menu"));

export function ClubCrestOfficial({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // Stemma ufficiale (480×628): larghezza proporzionale all'altezza richiesta.
  return (
    <img
      src={crest.url}
      alt={`Stemma ufficiale ${CLUB_NAME}`}
      width={Math.round((size * 480) / 628)}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** Two-line wordmark of the boards: "S.C.D." small over "COLICODERVIESE" (COLICO yellow, DERVIESE white). */
function Wordmark() {
  return (
    <span className="grid min-w-0 leading-none" data-testid="header-wordmark">
      <span className="text-[11px] font-bold tracking-[0.2em] text-white/90 lg:text-[12px]">S.C.D.</span>
      <span className="whitespace-nowrap font-title text-[19px] font-black tracking-[0.01em] min-[380px]:text-[21px] lg:text-[26px]">
        <span className="text-[#ffd600]">COLICO</span>
        <span className="text-white">DERVIESE</span>
      </span>
    </span>
  );
}

/** Desktop page search of the top bar: the same index and search as the full menu (src/lib/site-menu.ts). */
function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => menuSections(), []);
  const results = useMemo(() => searchMenu(query, sections).slice(0, 8), [query, sections]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  useEffect(() => {
    setQuery("");
    setOpen(false);
  }, [pathname]);
  const show = open && query.trim().length > 0;
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-[300px] lg:block xl:max-w-[340px]"
      onSubmit={(e) => {
        e.preventDefault();
        const first = results[0];
        if (first)
          void navigate({
            to: first.to as never,
            search: first.search as never,
            ...(first.hash ? { hash: first.hash } : {}),
          });
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label htmlFor="sa-top-search" className="sr-only">
        Cerca squadra, gara, pagina
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#9fc3e6]" aria-hidden="true" />
      <input
        id="sa-top-search"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
          }
        }}
        placeholder="Cerca squadra, gara, pagina"
        autoComplete="off"
        enterKeyHint="search"
        className="scd-focus h-11 w-full rounded-full border border-white/15 bg-white/10 pl-11 pr-4 text-[15px] text-white placeholder:text-[#c4d6ee] transition-colors duration-150 hover:bg-white/15 focus:bg-white focus:text-[#0e1b33] focus:placeholder:text-[#4a5d7a]"
        data-testid="top-search"
      />
      {show && (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] z-[45] overflow-hidden rounded-[14px] bg-white py-1.5 text-[#0e1b33] shadow-[0_24px_50px_-18px_rgb(2_20_51/0.55)]"
          aria-live="polite"
          data-testid="top-search-results"
        >
          {results.length ? (
            <ul className="m-0 list-none p-0">
              {results.map((n) => (
                <li key={`${n.to}#${n.hash ?? ""}${n.label}`}>
                  <Link
                    to={n.to as never}
                    search={n.search as never}
                    {...(n.hash ? { hash: n.hash } : {})}
                    className="scd-focus flex min-h-11 items-center gap-2 px-4 text-[15px] font-semibold hover:bg-[#eef3f9]"
                  >
                    {n.label}
                    {n.reserved && <Lock className="size-3.5 shrink-0 text-[#4a5d7a]" aria-label="area riservata" />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 px-4 py-3 text-[14.5px] text-[#4a5d7a]">Nessuna pagina trovata. Prova con un'altra parola.</p>
          )}
        </div>
      )}
    </form>
  );
}

/**
 * Desktop top bar with every main section as a written label (Francesco 16/10/2026 14:46 «la home, partite e tutto
 * vanno nella barra in alto»; type sized for desktop, 15 px): the active one in yellow with a yellow underline.
 */
const TOP_TABS: readonly { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: "/", label: "Home", match: (p) => p === "/" },
  { to: "/calendario", label: "Partite", match: (p) => p.startsWith("/calendario") },
  { to: "/eventi", label: "Eventi e tornei", match: (p) => p.startsWith("/eventi") || p.startsWith("/tornei") },
  { to: "/shop", label: "Shop", match: (p) => p.startsWith("/shop") || p.startsWith("/kit") },
  { to: "/community", label: "Comunità", match: (p) => p.startsWith("/community") },
  { to: "/sponsor", label: "Sponsor", match: (p) => p.startsWith("/sponsor") },
];

function TopTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Sezioni principali" className="hidden h-full flex-1 items-stretch justify-center gap-0.5 lg:flex" data-testid="top-tabs">
      {TOP_TABS.map((t) => {
        const on = t.match(pathname);
        return (
          <Link
            key={t.to}
            to={t.to as never}
            aria-current={on ? "page" : undefined}
            className={`scd-focus relative flex items-center whitespace-nowrap rounded-[8px] px-2.5 font-display text-[15px] font-semibold transition-colors duration-150 xl:px-3.5 ${on ? "text-[#ffd23f]" : "text-[#dbe5f7] hover:bg-white/10 hover:text-white"}`}
          >
            {t.label}
            {on && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-[#ffd23f]" />}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The three official marks in the top bar (Francesco 16/10/2026 07:07 «mettili in alto sulla barra, scontornati e
 * piccoli, solo il Monza un po' più grande»): transparent cut-outs straight on the blue bar with a light halo, never on a
 * white plate (Francesco 16/10/2026 14:58-15:05: «non utilizzare più con sfondo bianco», «utilizzali sempre»). CR Lombardia
 * and AC Monza linked to their official sites. Monza is larger: affiliation with a Serie A club.
 */
const CREDENTIAL_LINK: Partial<Record<CredentialId, string>> = {
  lnd: "https://www.crlombardia.it/",
  "insieme-al-monza": "https://www.acmonza.com/en/insieme-monza-dettaglio/mission/",
};
const CREDENTIAL_H: Record<CredentialId, string> = {
  "figc-sgs-3-livello": "h-[15px] lg:h-[24px]",
  lnd: "h-[18px] lg:h-[28px]",
  "insieme-al-monza": "h-[23px] lg:h-[36px]",
};

function HeaderCredentials() {
  return (
    <ul
      className="m-0 flex shrink-0 list-none items-center gap-2 px-0.5 py-1 lg:gap-4 lg:px-1"
      aria-label="Riconoscimenti e affiliazioni della società"
      data-testid="header-credentials"
    >
      {CLUB_CREDENTIALS.map((c) => {
        const img = <img src={c.art.src} alt={c.alt} decoding="async" className={`${CREDENTIAL_H[c.id]} w-auto object-contain [filter:drop-shadow(0_0_1px_rgb(255_255_255/0.95))_drop-shadow(0_0_5px_rgb(255_255_255/0.55))]`} />;
        const href = CREDENTIAL_LINK[c.id];
        return (
          <li key={c.id} className="flex">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="scd-focus flex rounded-[4px]" aria-label={`${c.title}, ${c.issuer}: sito ufficiale (apre una nuova scheda)`}>
                {img}
              </a>
            ) : (
              img
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const board = isBoardRoute(pathname);
  return (
    <header
      className={`scd-pub sticky top-0 z-40 h-[var(--pub-header-h)] scd-metal-line scd-band font-text text-white shadow-[0_4px_14px_-6px_rgb(11_42_91/0.45)] ${board ? "hidden lg:block" : ""}`}
      data-site-header
    >
      <div className="flex h-full items-center gap-2 pl-3 pr-3 lg:gap-6 lg:pl-0 lg:pr-6">
        <Link
          to="/"
          className="scd-focus flex min-h-11 min-w-0 items-center gap-2 rounded-md lg:w-[240px] lg:shrink-0 lg:px-5"
          aria-label={`${CLUB_NAME}, vai alla Home`}
        >
          <ClubCrestOfficial size={40} className="drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)] lg:hidden" />
          <ClubCrestOfficial size={52} className="hidden drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)] lg:block" />
          <Wordmark />
        </Link>
        <HeaderSearch />
        <TopTabs />
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:gap-3">
          <HeaderCredentials />
          {/* Desktop account button; on phones the same menu opens from the Profilo tab and the access screens. */}
          <div className="hidden lg:block">
            <AccessMenu />
          </div>
          <Link
            to="/comunicazioni"
            aria-label="Avvisi e comunicazioni del club"
            className="scd-focus relative hidden size-11 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition-colors duration-150 hover:bg-white/20 lg:grid"
            data-testid="header-bell"
          >
            <Bell className="size-[22px]" strokeWidth={2} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="scd-focus grid size-11 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition-colors duration-150 hover:bg-white/20 lg:hidden"
            aria-label="Tutte le pagine: apri il menu completo"
            onClick={openMenu}
            data-testid="header-menu"
          >
            <Menu className="size-[22px]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * «Le tue aree» bar (Francesco DG 17/10/2026 19:09: «il dirigente deve vedere le barre a cui può accedere … barra in
 * alto che gli fa vedere le sue barre dove può premere ed entrare, al di là delle tre linette»). Phone and tablet: one
 * row of buttons under the top bar (below the lg breakpoint) with every reserved area the person's positions open (same list as the desktop
 * sidebar, which already shows them), led by a yellow «Le tue aree · N» button that opens the full menu. Navigation only: every area keeps its own gate.
 * Hidden when signed out, when the person has no reserved area, and on board screens with their own header that are
 * not a work area (calendario, allenamenti, core…); on a work area's entry page it stays, to switch area.
 */
export function MyAreasBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();
  const areas = workAreasFor(session);
  if (!areas.length || (isBoardRoute(pathname) && !isWorkAreaPath(pathname))) return null;
  return (
    <nav
      aria-label="Le tue aree"
      className="scd-pub border-b border-[#d7e3f2] bg-white font-text lg:hidden"
      data-testid="my-areas-bar"
    >
      <div className="flex scroll-pl-[9rem] items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={openAccessMenu}
          className="scd-focus sticky left-0 z-[1] inline-flex min-h-11 shrink-0 flex-col items-start justify-center rounded-[12px] bg-[#ffd600] px-3 text-left leading-none text-[#0b1e3a] shadow-[6px_0_10px_-4px_rgb(255_255_255)]"
          aria-label={`Le tue aree: ${areas.length}. Apri l'elenco completo`}
        >
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em]">Le tue aree</span>
          <span className="mt-0.5 text-[15px] font-extrabold">{areas.length} →</span>
        </button>
        {areas.map(({ entry, link }) => {
          const Icon = AREA_ICON[entry.icon];
          const active = isActive(pathname, link.path);
          return (
            <Link
              key={entry.id}
              to={link.href as never}
              aria-current={active ? "page" : undefined}
              className={`scd-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[14px] font-bold transition-colors duration-150 ${
                active ? "bg-[#ffd600] text-[#0b1e3a]" : "bg-[#0b2a5b] text-white hover:bg-[#123a78]"
              }`}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
              {entry.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Desktop left sidebar (Eurobet structure, SCD colours): sticky under the top bar, active section in yellow. */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();
  const signedIn = !!session?.user;
  const areas = workAreasFor(session);
  const row = (active: boolean) =>
    `scd-focus group relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors duration-150 ${
      active
        ? "scd-gold font-bold"
        : "font-semibold text-[#dbe7f7] hover:bg-white/10 hover:text-white"
    }`;
  return (
    <aside
      className="sticky top-[var(--pub-header-h)] hidden h-[calc(100dvh-var(--pub-header-h)-46px)] self-start overflow-y-auto overscroll-contain scd-band-v px-3 pb-6 pt-4 text-white [scrollbar-color:rgb(255_255_255/0.25)_transparent] [scrollbar-width:thin] lg:block"
      data-testid="side-nav"
    >
      <nav aria-label="Sezioni del club">
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {SIDEBAR_SECTIONS.map((s) => {
            const active = s.match ? s.match(pathname) : isActive(pathname, s.to);
            const target = sectionTarget(s, signedIn);
            return (
              <li key={s.to}>
                <Link
                  to={target.to as never}
                  search={target.search as never}
                  aria-current={active ? "page" : undefined}
                  className={row(active)}
                  data-side={s.to}
                >
                  <s.icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  {s.members && !signedIn && (
                    <Lock className="size-3.5 shrink-0 opacity-75" aria-label="per i soci, dopo l'accesso" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {areas.length > 0 && (
        <nav aria-label="Le tue aree di lavoro" className="mt-4 border-t border-white/12 pt-3" data-testid="side-work-areas">
          <p className="m-0 px-3 pb-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#ffd84a]">Le tue aree</p>
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {areas.map(({ entry, link }) => {
              const Icon = AREA_ICON[entry.icon];
              const active = isActive(pathname, link.path);
              return (
                <li key={entry.id}>
                  <Link
                    to={link.href as never}
                    aria-current={active ? "page" : undefined}
                    className={row(active)}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <div className="mt-4 grid gap-1 border-t border-white/12 pt-3">
        {!signedIn && (
          <Link
            to="/accedi"
            search={loginSearch(pathname) as never}
            className="scd-focus flex min-h-11 items-center justify-center gap-2 scd-gold rounded-full px-4 text-[15px] font-bold transition-[filter] duration-150"
          >
            <LogIn className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
            Entra o registrati
          </Link>
        )}
        <button
          type="button"
          onClick={openMenu}
          className="scd-focus flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-semibold text-[#dbe7f7] transition-colors duration-150 hover:bg-white/10 hover:text-white"
        >
          <Search className="size-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
          Tutte le pagine
        </button>
      </div>
    </aside>
  );
}

/** One page of the menu: reserved areas carry a lock (their page shows the access screen to visitors). */
function MenuLink({ item, active, onPick }: { item: MenuItem; active: boolean; onPick: () => void }) {
  return (
    <Link
      to={item.to as never}
      search={item.search as never}
      {...(item.hash ? { hash: item.hash } : {})}
      onClick={onPick}
      className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-2 text-[15px] font-medium ${active ? "font-bold text-[var(--scd-blue)]" : ""}`}
    >
      {item.label}
      {item.reserved && <Lock className="size-3.5 shrink-0 text-[#6a7a92]" aria-label="area riservata" />}
    </Link>
  );
}

/**
 * Menu completo, aperto dall'evento "scd:menu" (UD-116): le app, poi "Tutto sul club" con ogni pagina dell'indice del
 * sito (non più nel piè di pagina) e una ricerca per nome.
 */
export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();
  const signedIn = !!session?.user;
  const [query, setQuery] = useState("");
  const sections = useMemo(() => menuSections(), []);
  const results = useMemo(() => searchMenu(query, sections), [query, sections]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  useEffect(() => {
    const onOpen = () => setOpen((o) => !o);
    window.addEventListener("scd:menu", onOpen);
    return () => window.removeEventListener("scd:menu", onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <button
        aria-label="Chiudi menu"
        className="fixed inset-0 z-[60] cursor-default bg-[#01224f]/60"
        onClick={() => setOpen(false)}
      />
      <nav
        id="sa-menu"
        aria-label="Menu completo"
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[85dvh] overflow-y-auto rounded-t-[20px] bg-white px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 text-[var(--scd-ink)] shadow-[0_-12px_40px_rgb(1_34_79/0.35)] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-[calc(var(--pub-header-h)+8px)] lg:w-[400px] lg:rounded-2xl"
      >
        <div className="flex items-center justify-between pb-1">
          <span className="flex items-center gap-2">
            <ClubCrestOfficial size={30} />
            <b className="text-[15px]">Menu</b>
          </span>
          <button
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
            className="flex size-11 items-center justify-center rounded-lg"
          >
            <X className="size-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openAccessMenu();
          }}
          className="scd-action mb-1 w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            {signedIn ? (
              <Lock
                className="size-[18px]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            ) : (
              <LogIn
                className="size-[18px]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            )}
            {signedIn ? "Le tue aree" : "Entra o registrati"}
          </span>
          <span className="text-[13px] font-medium">
            {signedIn ? "un link per area" : "le aree riservate dopo l'accesso"}
          </span>
        </button>
        <div className="pb-1 pt-2">
          <label htmlFor="sa-menu-search" className="sr-only">
            Cerca una pagina
          </label>
          <span className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-[18px] text-[var(--scd-blue)]" aria-hidden="true" />
            <input
              id="sa-menu-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca una pagina (es. iscrizioni, kit, tornei)"
              autoComplete="off"
              enterKeyHint="search"
              className="scd-focus min-h-12 w-full rounded-[12px] border border-[var(--scd-line)] bg-[#f4f7fb] pl-10 pr-3 text-[15px] text-[var(--scd-ink)] placeholder:text-[#6a7a92]"
              data-testid="menu-search"
            />
          </span>
        </div>
        {query.trim() ? (
          <div className="py-2" data-testid="menu-results" aria-live="polite">
            {results.length ? (
              <div className="grid grid-cols-2 gap-x-2">
                {results.map((n) => (
                  <MenuLink key={`${n.to}#${n.hash ?? ""}${n.label}`} item={n} active={isActive(pathname, n.to)} onPick={() => setOpen(false)} />
                ))}
              </div>
            ) : (
              <p className="m-0 px-2 py-3 text-[14.5px] text-[#4a5d7a]">Nessuna pagina trovata. Prova con un'altra parola.</p>
            )}
          </div>
        ) : (
          sections.map((g) => (
            <div key={g.id} className="border-b border-[var(--scd-line)] py-2 last:border-0" data-testid={`menu-group-${g.id}`}>
              {/* Group title only: the ONE / CORE / GROW ids are internal, never shown to the public (cleanup 15/10/2026). */}
              <p className="px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--scd-blue)]">
                {g.title}
              </p>
              <div className="grid grid-cols-2 gap-x-2">
                {g.items.map((n) => (
                  <MenuLink key={`${n.to}#${n.hash ?? ""}${n.label}`} item={n} active={isActive(pathname, n.to)} onPick={() => setOpen(false)} />
                ))}
              </div>
            </div>
          ))
        )}
        <Link
          to="/safeguarding"
          onClick={() => setOpen(false)}
          className="mt-2 flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-semibold text-[var(--scd-blue)]"
        >
          <ShieldCheck className="size-4" /> Safeguarding · segnalazioni
          riservate
        </Link>
      </nav>
    </>
  );
}

type TabDef = {
  label: string;
  icon: LucideIcon;
  to?: string;
  search?: Record<string, string | undefined>;
  /** Opens the full menu ("Altro") instead of navigating. */
  menu?: "full";
  match: (p: string) => boolean;
  ariaLabel?: string;
  /** Members-only destination shown to a guest: small lock, the link passes through the sign-in. */
  locked?: boolean;
};

const MINE_MATCH = (p: string) =>
  p.startsWith("/la-mia-scd") ||
  p.startsWith("/famiglia") ||
  p.startsWith("/core/atleta") ||
  p.startsWith("/core/famiglia") ||
  p.startsWith("/aree");

const HOME_TAB: TabDef = {
  label: "Home",
  icon: House,
  to: "/",
  match: (p) => p === "/",
};
const CALENDAR_TAB: TabDef = {
  label: "Calendario",
  icon: CalendarDays,
  to: "/calendario",
  match: (p) => p.startsWith("/calendario"),
};
const EVENTS_TAB: TabDef = {
  label: "Eventi",
  icon: CalendarCheck,
  to: "/eventi",
  match: (p) => p.startsWith("/eventi") || p.startsWith("/tornei"),
};

/** Squadre: teams are inside (UD-100), so a guest reaches them through the sign-in (lock on the icon). */
function teamsTab(signedIn: boolean): TabDef {
  const t = sectionTarget({ to: "/squadre", members: true }, signedIn);
  return {
    label: "Squadre",
    icon: UsersRound,
    to: t.to,
    ...(t.search ? { search: t.search } : {}),
    locked: !signedIn,
    ...(signedIn ? {} : { ariaLabel: "Squadre: per i soci, entra per vederle" }),
    match: (p) => p.startsWith("/squadre") || p.startsWith("/allenamenti"),
  };
}

/** Profilo: the sign-in for guests, La mia SCD (the member area) when signed in. */
function profileTab(signedIn: boolean): TabDef {
  return signedIn
    ? { label: "Profilo", icon: UserRound, to: "/la-mia-scd", match: MINE_MATCH, ariaLabel: "Profilo: la tua area" }
    : {
        label: "Profilo",
        icon: UserRound,
        to: "/accedi",
        match: (p) => p.startsWith("/accedi") || p.startsWith("/registrati"),
        ariaLabel: "Profilo: entra o registrati",
      };
}

/** The five items of the boards' bottom bar, the same for everybody: Home · Calendario · Squadre · Eventi · Profilo. */
export function publicTabsFor(signedIn: boolean): TabDef[] {
  return [HOME_TAB, CALENDAR_TAB, teamsTab(signedIn), EVENTS_TAB, profileTab(signedIn)];
}

const STAFF_TABS: TabDef[] = [
  {
    label: "Dashboard",
    icon: House,
    to: "/core/staff",
    match: (p) =>
      p.startsWith("/core/staff") || p === "/core" || p === "/core/",
  },
  {
    label: "Squadre",
    icon: UsersRound,
    to: "/core/impianti-calendari",
    search: { sezione: "squadra" },
    match: (p) => p.startsWith("/core/impianti-calendari"),
  },
  {
    label: "Atleti",
    icon: Shirt,
    to: "/core/atleta",
    match: (p) => p.startsWith("/core/atleta"),
  },
  {
    label: "Comunicazioni",
    icon: Newspaper,
    to: "/comunicazioni",
    match: (p) => p.startsWith("/comunicazioni"),
  },
  { label: "Altro", icon: Ellipsis, menu: "full", match: () => false },
];

/** Comunicazioni board: Home · Calendario · Comunicazioni · Squadre · Altro (same white bar, no raised button). */
function commsTabs(signedIn: boolean): TabDef[] {
  return [
    HOME_TAB,
    CALENDAR_TAB,
    {
      label: "Comunicazioni",
      icon: Newspaper,
      to: "/comunicazioni",
      match: (p) => p.startsWith("/comunicazioni"),
    },
    teamsTab(signedIn),
    { label: "Altro", icon: Ellipsis, menu: "full", match: () => false },
  ];
}

export function tabsFor(pathname: string, signedIn = false): TabDef[] {
  if (pathname.startsWith("/comunicazioni")) return commsTabs(signedIn);
  if (
    pathname === "/core" ||
    pathname === "/core/" ||
    pathname.startsWith("/core/staff") ||
    pathname.startsWith("/core/impianti-calendari")
  )
    return STAFF_TABS;
  return publicTabsFor(signedIn);
}

/** Barra inferiore (smartphone/tablet) delle tavole: bianca, voce attiva blu con etichetta, bersagli da 44 px. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();
  const tabs = tabsFor(pathname, !!session?.user);
  // LIVE on the Calendario tab while a club game is being played (study 15/10, block A/C).
  const { pulse } = useClubPulse();
  const liveNow = (pulse?.live ?? 0) > 0;
  return (
    <nav
      aria-label="Navigazione Super App"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e3eaf4] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-6px_rgb(11_42_91/0.18)] lg:hidden"
      data-testid="bottom-nav"
    >
      <div className="mx-auto grid h-[60px] max-w-xl grid-cols-5">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const color = active ? "text-[#1556c4]" : "text-[#5f6f8a]";
          const liveTab = liveNow && t.to === "/calendario";
          const inner = (
            <>
              <span className="relative inline-flex">
                <t.icon
                  className="size-[25px]"
                  strokeWidth={active ? 2.3 : 1.7}
                  fill={active && t.icon === House ? "currentColor" : "none"}
                  aria-hidden="true"
                />
                {t.locked && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-1.5 grid size-[14px] place-items-center rounded-full bg-white"
                  >
                    <Lock className="size-[10px]" strokeWidth={2.6} />
                  </span>
                )}
                {liveTab && (
                  <span
                    className="absolute -right-3 -top-1.5 rounded-[4px] bg-[#e11d2e] px-1 py-[2px] text-[10px] font-extrabold uppercase leading-none tracking-[0.04em] text-white"
                    data-testid="tab-live"
                  >
                    Live<span className="sr-only">: gara in corso</span>
                  </span>
                )}
              </span>
              <span
                className={`text-[11.5px] leading-none ${active ? "font-extrabold" : "font-medium"}`}
              >
                {t.label}
              </span>
            </>
          );
          const cls = `scd-focus relative flex min-h-11 flex-col items-center justify-center gap-[5px] transition-colors duration-150 ${color}`;
          return t.menu ? (
            <button
              key={t.label}
              type="button"
              onClick={openMenu}
              className={cls}
              aria-label={t.ariaLabel ?? "Altro: menu completo"}
            >
              {inner}
            </button>
          ) : (
            <Link
              key={t.label}
              to={t.to!}
              search={(t.to === "/accedi" && !t.search ? loginSearch(pathname) : t.search) as never}
              aria-label={t.ariaLabel}
              aria-current={active ? "page" : undefined}
              className={cls}
              data-tab={t.label}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook } as const;

/**
 * Piè di pagina chiaro e sintetico (Francesco 16/10/2026 05:59: «devi togliere fondo pagina così blu, sintetizzare il
 * fondo pagina»; i tre loghi vanno in alto nella Home). Sempre ridotto come da UD-116, senza indice di pagine:
 * stemma e nome, contatti in una riga, app e social, una riga sui riconoscimenti, note legali.
 */
export function SiteFooter() {
  const legal =
    "scd-focus inline-flex min-h-11 items-center underline decoration-[#9fb2d0] underline-offset-4 hover:text-[#0b1e3a]";
  return (
    <footer className="mt-10 border-t border-[#e3eaf4] bg-white px-4 pb-6 pt-6 text-[#23406e] lg:px-8" data-testid="site-footer">
      <div className="mx-auto grid max-w-[1240px] gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="scd-focus shrink-0 rounded-md" aria-label={`${CLUB_NAME}, vai alla Home`}>
              <ClubCrestOfficial size={44} />
            </Link>
            <address className="min-w-0 text-[13.5px] not-italic leading-snug" data-testid="footer-contacts">
              <span className="block font-extrabold text-[#0b1e3a]">{CLUB_NAME}</span>
              <span className="block">{CLUB_PROFILE.contacts.address} · Matricola FIGC {CLUB_PROFILE.figcMatricola}</span>
              <span className="flex flex-wrap gap-x-3">
                <a
                  href={`mailto:${CLUB_PROFILE.contacts.email}`}
                  className="scd-focus inline-flex min-h-11 select-text items-center underline decoration-[#9fb2d0] underline-offset-4 hover:decoration-[#0b1e3a]"
                >
                  {CLUB_PROFILE.contacts.email}
                </a>
                <span className="inline-flex min-h-11 items-center">
                  PEC&nbsp;<span className="select-text">{CLUB_PROFILE.contacts.pec}</span>
                </span>
              </span>
            </address>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/installa"
              className="scd-focus inline-flex min-h-11 min-w-11 items-center text-[14px] gap-1.5 scd-gold rounded-[10px] px-4 font-extrabold transition-[filter] duration-150"
              data-testid="footer-install"
            >
              <Download className="size-4" aria-hidden="true" />
              Installa l'app
            </Link>
            <ul className="m-0 flex list-none gap-2 p-0" aria-label="Profili social ufficiali">
              {SOCIAL_LINKS.map((so) => {
                const Icon = SOCIAL_ICON[so.id];
                return (
                  <li key={so.id}>
                    <a
                      href={so.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${so.label} ${so.handle} (apre una nuova scheda)`}
                      className="scd-focus grid size-11 place-items-center rounded-full border border-[#dfe7f2] text-[#0b2a5b] transition-colors duration-150 hover:bg-[#eef3f9]"
                    >
                      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="m-0 text-[12.5px] leading-snug text-[#4a5d7a]" data-testid="footer-credits">{CREDENTIALS_SENTENCE}</p>
        <div className="flex flex-col gap-1 border-t border-[#eef2f8] pt-2 text-[12.5px] text-[#5a6b85] lg:flex-row lg:items-center lg:justify-between">
          <span className="flex flex-wrap gap-x-5">
            <a
              href="/privacy"
              className="scd-focus inline-flex min-h-11 min-w-11 items-center underline decoration-[#9fb2d0] underline-offset-4 hover:text-[#0b1e3a]"
            >
              Privacy
            </a>
            <button type="button" onClick={openCookiePrefs} className={legal}>
              Preferenze cookie
            </button>
            <Link to="/safeguarding" className={legal}>
              Segnalazioni riservate
            </Link>
            <a href="/elimina-account" className={legal}>
              Elimina account
            </a>
            <button type="button" onClick={openMenu} className={`${legal} gap-1`}>
              <Search className="size-3.5" aria-hidden="true" />
              Tutte le pagine
            </button>
          </span>
          {/* Build date and git hash are for the team: hidden data attribute, not public copy (cleanup 15/10/2026). */}
          <span data-build={BUILD_STAMP}>Super App ufficiale della {CLUB_NAME}</span>
        </div>
        {/* Authorship kept but discreet (Francesco 15/10/2026 06:51: "non visibile così ma molto riservato"). */}
        <details className="-mt-2 text-[11px] leading-snug text-[#8a98ad]">
          <summary className="scd-focus inline-flex min-h-11 cursor-pointer list-none items-center">
            © {new Date().getFullYear()} · Tutti i diritti riservati · Crediti
          </summary>
          <p className="m-0 pb-2">
            Ideata e realizzata da Francesco Coppola, concessa in uso gratuito alla {CLUB_NAME}. Stemma, loghi e marchi
            appartengono ai rispettivi titolari.
          </p>
        </details>
      </div>
    </footer>
  );
}
