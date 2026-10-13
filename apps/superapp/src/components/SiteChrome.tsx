import { Link, useRouterState } from "@tanstack/react-router";
import { BUILD_STAMP } from "@/lib/build-stamp";
import {
  CalendarDays,
  Circle,
  Ellipsis,
  House,
  Lock,
  LogIn,
  Menu,
  Newspaper,
  Plus,
  Shirt,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { centerTabFor, type CenterTab } from "@/lib/access-nav";
import { ACCESS_SCREEN_IDS, WORK_AREA_IDS, findArea } from "@/lib/areas";
import { CLUB_PROFILE } from "@/lib/club-profile";
import { useSession } from "@/lib/use-session";
import { openCookiePrefs } from "./CookieConsent";
import { AccessMenu, loginSearch, openAccessMenu } from "./scd/AccessMenu";

/** Nome ufficiale della società (sigla S.C.D., non invertire le lettere). */
export const CLUB_NAME = "S.C.D. ColicoDerviese";

type NavItem = { to: string; label: string };

/** Navigazione desktop della barra pubblica (tavola Accesso-aree, VR-022). Le altre pagine restano nel menu completo. */
const desktopNav: readonly NavItem[] = [
  { to: "/squadre", label: "Squadre" },
  { to: "/calendario", label: "Calendario" },
  { to: "/eventi", label: "Eventi" },
  { to: "/sponsor", label: "Sponsor" },
  { to: "/contatti", label: "Contatti" },
];

/** Link a piè di pagina: tutte le pagine pubbliche principali. */
const footerNav: readonly NavItem[] = [
  { to: "/societa", label: "Chi siamo" },
  { to: "/squadre", label: "Squadre" },
  { to: "/calendario", label: "Calendario" },
  { to: "/impianti", label: "Mappa campi" },
  { to: "/allenamenti", label: "Allenamenti" },
  { to: "/comunicazioni", label: "Comunicazioni" },
  { to: "/eventi", label: "Eventi" },
  { to: "/aree", label: "Area club" },
  { to: "/sponsor", label: "Sponsor" },
  { to: "/contatti", label: "Contatti" },
];

/** Menu completo (drawer mobile e voce "Altro"), raggruppato per app. */
const menuGroups: readonly {
  title: string;
  app: string;
  items: readonly NavItem[];
}[] = [
  {
    title: "Il Club",
    app: "ONE",
    items: [
      { to: "/", label: "Home" },
      { to: "/societa", label: "Chi siamo" },
      { to: "/squadre", label: "Squadre" },
      { to: "/calendario", label: "Calendario gare" },
      { to: "/impianti", label: "Mappa campi" },
      { to: "/allenamenti", label: "Allenamenti" },
      { to: "/comunicazioni", label: "Comunicazioni" },
      { to: "/eventi", label: "Eventi" },
      { to: "/eventi/christmas-lario-cup", label: "Christmas Lario Cup" },
      { to: "/community", label: "Tifosi" },
      { to: "/entra", label: "Gioca con noi" },
      { to: "/contatti", label: "Contatti" },
    ],
  },
  {
    title: "Area club",
    app: "CORE",
    items: [
      { to: "/la-mia-scd", label: "La mia SCD" },
      { to: "/fantacalcio", label: "Fantacalcio SCD" },
      { to: "/top11", label: "Top 11 della settimana" },
      { to: "/rassegna", label: "Dicono di noi" },
      { to: "/aree", label: "Il tuo ingresso (tutte le aree)" },
    ],
  },
  {
    title: "Sponsor & Partner",
    app: "GROW",
    items: [
      { to: "/sponsor", label: "Sponsor & Partner" },
      { to: "/fornitori", label: "Fornitori" },
    ],
  },
];

const footerLinks: readonly NavItem[] = [
  { to: "/installa", label: "Installa l'app" },
  { to: "/guida", label: "Come funziona l'app" },
  { to: "/fornitori", label: "Fornitori" },
  { to: "/safeguarding", label: "Safeguarding" },
];

/**
 * Schermate costruite sulle tavole: hanno la propria testata (stemma + wordmark/titolo), quindi su
 * smartphone la barra superiore generica non viene mostrata. Su desktop resta la navigazione completa.
 */
// Gated work areas render their access screen without a session: same board header.
const ACCESS_SCREEN_PATHS = [...ACCESS_SCREEN_IDS, ...WORK_AREA_IDS]
  .map((id) => findArea(id)?.path)
  .filter((p): p is string => !!p);
const BOARD_ROUTES = [
  "/",
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

const isActive = (pathname: string, to: string) =>
  to === "/"
    ? pathname === "/"
    : pathname === to || pathname.startsWith(`${to}/`);

/** Apre il menu completo da qualunque punto (voce "Altro", ingranaggio Staff, pulsante menu). */
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

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const board = isBoardRoute(pathname);
  return (
    <header
      className={`scd-pub sticky top-0 z-40 h-[var(--pub-header-h)] border-b border-[var(--out-line)] bg-[var(--out-night)] font-text text-white ${board ? "hidden lg:block" : ""}`}
      data-site-header
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:gap-7 lg:px-10">
        <Link
          to="/"
          className="scd-focus flex min-w-0 items-center gap-2.5 rounded-md lg:gap-3"
          aria-label={`${CLUB_NAME}, vai alla Home`}
        >
          <ClubCrestOfficial size={46} className="lg:hidden" />
          <ClubCrestOfficial size={54} className="hidden lg:block" />
          <span className="whitespace-nowrap font-title text-[20px] font-black leading-none lg:text-[24px]">
            COLICO<span className="text-[#ffd600]">DERVIESE</span>
          </span>
        </Link>
        <nav
          className="ml-4 hidden items-center gap-[22px] lg:flex"
          aria-label="Principale"
        >
          {desktopNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              aria-current={isActive(pathname, n.to) ? "page" : undefined}
              className={`scd-focus relative inline-flex min-h-11 items-center rounded-md px-1 text-[16px] font-semibold transition-colors duration-150 ${isActive(pathname, n.to) ? "text-white after:absolute after:inset-x-1 after:bottom-0.5 after:h-[3px] after:rounded-full after:bg-[var(--out-yellow)]" : "text-[#e6f3fc] hover:text-white"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <AccessMenu />
          <button
            className="scd-focus flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-white/25 text-white transition-colors duration-150 hover:bg-white/10"
            aria-label="Apri menu completo"
            onClick={openMenu}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

/** Menu completo, aperto dall'evento "scd:menu". */
export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();
  const signedIn = !!session?.user;
  useEffect(() => setOpen(false), [pathname]);
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
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[85dvh] overflow-y-auto rounded-t-[20px] bg-white px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 text-[var(--scd-ink)] shadow-[0_-12px_40px_rgb(1_34_79/0.35)] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-[64px] lg:w-[400px] lg:rounded-2xl"
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
        {menuGroups.map((g) => (
          <div
            key={g.app}
            className="border-b border-[var(--scd-line)] py-2 last:border-0"
          >
            <p className="flex items-center gap-2 px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--scd-blue)]">
              {g.title}{" "}
              <span className="rounded bg-[var(--scd-yellow)] px-1.5 py-0.5 text-[0.6rem] tracking-wider text-[var(--scd-ink)]">
                {g.app}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-x-2">
              {g.items.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center rounded-lg px-2 py-2 text-[15px] font-medium ${isActive(pathname, n.to) ? "font-bold text-[var(--scd-blue)]" : ""}`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
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
  /** Opens the full menu ("Altro") or the access menu ("Aree") instead of navigating. */
  menu?: "full" | "access";
  match: (p: string) => boolean;
  /** Raised yellow circle in the centre of the bar. */
  tone?: "yellow";
  ariaLabel?: string;
};

const MINE_MATCH = (p: string) =>
  p.startsWith("/la-mia-scd") ||
  p.startsWith("/famiglia") ||
  p.startsWith("/core/atleta") ||
  p.startsWith("/core/famiglia");

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
const TEAMS_TAB: TabDef = {
  label: "Squadre",
  icon: UsersRound,
  to: "/squadre",
  match: (p) => p.startsWith("/squadre") || p.startsWith("/allenamenti"),
};
const AREAS_TAB: TabDef = {
  label: "Aree",
  icon: Lock,
  menu: "access",
  match: (p) => p.startsWith("/aree"),
  ariaLabel: "Aree: entra o apri le tue aree",
};

/** Raised centre tab of the public bar: who you are decides what it offers (src/lib/access-nav.ts). */
const CENTER_TABS: Readonly<Record<CenterTab, TabDef>> = {
  entra: {
    label: "Entra",
    icon: LogIn,
    to: "/accedi",
    match: (p) => p.startsWith("/accedi") || p.startsWith("/registrati"),
    tone: "yellow",
    ariaLabel: "Entra: accedi o registrati",
  },
  mine: {
    label: "La mia",
    icon: UserRound,
    to: "/la-mia-scd",
    match: MINE_MATCH,
    tone: "yellow",
    ariaLabel: "La mia SCD: la tua area",
  },
  crea: {
    label: "Crea",
    icon: Plus,
    to: "/crea",
    match: (p) => p.startsWith("/crea"),
    tone: "yellow",
    ariaLabel: "Crea: nuovo post",
  },
};

/**
 * Public bar, five tabs. Anonymous: Home · Calendario · [Entra] · Squadre · Aree. Signed in
 * without author role: Home · Calendario · [La mia] · Squadre · Aree. Author: Home · Calendario ·
 * [Crea] · Squadre · La mia.
 */
export function publicTabsFor(center: CenterTab): TabDef[] {
  const last: TabDef =
    center === "crea"
      ? {
          label: "La mia",
          icon: UserRound,
          to: "/la-mia-scd",
          match: (p) => MINE_MATCH(p) || p.startsWith("/aree"),
        }
      : AREAS_TAB;
  return [HOME_TAB, CALENDAR_TAB, CENTER_TABS[center], TEAMS_TAB, last];
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
const COMMS_TABS: TabDef[] = [
  { label: "Home", icon: House, to: "/", match: (p) => p === "/" },
  {
    label: "Calendario",
    icon: CalendarDays,
    to: "/calendario",
    match: (p) => p.startsWith("/calendario"),
  },
  {
    label: "Comunicazioni",
    icon: Circle,
    to: "/comunicazioni",
    match: (p) => p.startsWith("/comunicazioni"),
    tone: "yellow",
  },
  {
    label: "Squadre",
    icon: UsersRound,
    to: "/squadre",
    match: (p) => p.startsWith("/squadre") || p.startsWith("/allenamenti"),
  },
  { label: "Altro", icon: Ellipsis, menu: "full", match: () => false },
];

export function tabsFor(
  pathname: string,
  center: CenterTab = "entra",
): TabDef[] {
  if (pathname.startsWith("/comunicazioni")) return COMMS_TABS;
  if (
    pathname === "/core" ||
    pathname === "/core/" ||
    pathname.startsWith("/core/staff") ||
    pathname.startsWith("/core/impianti-calendari")
  )
    return STAFF_TABS;
  return publicTabsFor(center);
}

/** Barra inferiore (smartphone/tablet): blu notte della tavola, voce attiva gialla. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();
  const tabs = tabsFor(pathname, centerTabFor(session));
  return (
    <nav
      aria-label="Navigazione Super App"
      className="fixed inset-x-0 bottom-0 z-40 bg-[var(--uv-night)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid h-[62px] max-w-xl grid-cols-5">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const color = active ? "text-[var(--uv-gold)]" : "text-[#b9cdf0]";
          const inner = (
            <>
              <t.icon
                className="size-[25px]"
                strokeWidth={active ? 2.4 : 1.8}
                fill={active && t.icon === House ? "currentColor" : "none"}
                aria-hidden="true"
              />
              <span
                className={`text-[11.5px] leading-none ${active ? "font-bold" : "font-medium"}`}
              >
                {t.label}
              </span>
            </>
          );
          if (t.tone === "yellow" && t.to) {
            // Tab centrale della tavola: cerchio giallo rialzato (Entra / La mia / Crea).
            return (
              <Link
                key={t.label}
                to={t.to}
                search={
                  (t.to === "/accedi"
                    ? loginSearch(pathname)
                    : t.search) as never
                }
                aria-label={t.ariaLabel ?? t.label}
                aria-current={active ? "page" : undefined}
                className="scd-focus flex flex-col items-center justify-start"
                data-testid="tab-center"
              >
                <span className="-mt-5 grid size-[56px] place-items-center rounded-full border-4 border-[var(--uv-night)] bg-[var(--uv-gold)] text-[#0b1e3a] shadow-[0_6px_16px_rgb(11_42_91/0.35)]">
                  <t.icon
                    className="size-7"
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 text-[11.5px] font-bold leading-none text-[var(--uv-gold)]">
                  {t.label}
                </span>
              </Link>
            );
          }
          const cls = `relative flex flex-col items-center justify-center gap-[5px] ${color} ${active ? "before:absolute before:inset-x-[22%] before:top-0 before:h-1 before:rounded-b before:bg-[var(--uv-gold)]" : ""}`;
          return t.menu ? (
            <button
              key={t.label}
              type="button"
              onClick={t.menu === "access" ? openAccessMenu : openMenu}
              className={cls}
              aria-label={t.ariaLabel ?? "Altro: menu completo"}
            >
              {inner}
            </button>
          ) : (
            <Link
              key={t.label}
              to={t.to!}
              search={t.search as never}
              aria-current={active ? "page" : undefined}
              className={cls}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="surface-deep mt-10 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm">
        <div className="flex items-center gap-3">
          <ClubCrestOfficial size={44} />
          <p className="font-brand text-xl leading-none">
            <span className="text-[#ffd600]">COLICO</span>DERVIESE
          </p>
        </div>
        <p className="opacity-90">
          {CLUB_NAME} · {CLUB_PROFILE.contacts.address} · Alto Lago di Como
          <br />
          <span className="select-text">{CLUB_PROFILE.contacts.email}</span> ·
          PEC <span className="select-text">{CLUB_PROFILE.contacts.pec}</span>
        </p>
        <nav
          className="flex flex-wrap gap-x-5"
          aria-label="Link a piè di pagina"
        >
          {[...footerNav, ...footerLinks].map((n) => (
            <Link
              key={n.to + n.label}
              to={n.to}
              className="scd-focus inline-flex min-h-11 min-w-11 items-center justify-center opacity-90 hover:opacity-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <span className="flex flex-wrap gap-x-5">
          <a
            href="/privacy"
            className="scd-focus inline-flex min-h-11 items-center text-sm underline opacity-90 hover:opacity-100"
          >
            Privacy
          </a>
          <button
            type="button"
            onClick={openCookiePrefs}
            className="scd-focus inline-flex min-h-11 items-center text-sm underline opacity-90 hover:opacity-100"
          >
            Preferenze cookie
          </button>
        </span>
        <p className="text-xs opacity-90">
          Super App ufficiale della {CLUB_NAME} · versione del {BUILD_STAMP}.
        </p>
        <p className="text-xs opacity-90">
          © {new Date().getFullYear()} Francesco Coppola · ideato e creato da
          Francesco Coppola, concesso in uso gratuito alla {CLUB_NAME}. Stemma,
          loghi e marchi appartengono ai rispettivi titolari.
        </p>
      </div>
    </footer>
  );
}
