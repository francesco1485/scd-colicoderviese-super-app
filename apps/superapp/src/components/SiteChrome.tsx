import { Link, useRouterState } from "@tanstack/react-router";
import { BUILD_STAMP } from "@/lib/build-stamp";
import {
  CalendarDays,
  Circle,
  Ellipsis,
  Facebook,
  Handshake,
  House,
  Instagram,
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
import { LINK_GROUPS, SOCIAL_LINKS } from "@/lib/public-home";
import { useSession } from "@/lib/use-session";
import { openCookiePrefs } from "./CookieConsent";
import { AccessMenu, loginSearch, openAccessMenu } from "./scd/AccessMenu";
import { CREDENTIALS_SENTENCE } from "@/lib/club-credentials";
import { ClubCredentials } from "./scd/Logos";

/** Nome ufficiale della società (sigla S.C.D., non invertire le lettere). */
export const CLUB_NAME = "S.C.D. ColicoDerviese";

type NavItem = { to: string; label: string };

/**
 * Navigazione desktop della barra pubblica (tavola Accesso-aree, VR-022). Le altre pagine restano nel menu completo.
 * UD-100 (Direzione 13/10/2026): le squadre sono dentro. Chi non ha fatto l'accesso vede notizie e partner al posto
 * di "Squadre"; dopo l'accesso torna la voce Squadre.
 */
const desktopNavPublic: readonly NavItem[] = [
  { to: "/comunicazioni", label: "Notizie" },
  { to: "/eventi", label: "Eventi" },
  { to: "/calendario", label: "Calendario" },
  { to: "/sponsor", label: "Partner" },
  { to: "/contatti", label: "Contatti" },
];
const desktopNavMember: readonly NavItem[] = [
  { to: "/squadre", label: "Squadre" },
  { to: "/calendario", label: "Calendario" },
  { to: "/eventi", label: "Eventi" },
  { to: "/sponsor", label: "Sponsor" },
  { to: "/contatti", label: "Contatti" },
];
export const desktopNavFor = (signedIn: boolean): readonly NavItem[] =>
  signedIn ? desktopNavMember : desktopNavPublic;

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
    title: "Area club",
    app: "CORE",
    items: [
      { to: "/la-mia-scd", label: "La mia SCD" },
      { to: "/squadre", label: "Le squadre" },
      { to: "/allenamenti", label: "Allenamenti" },
      { to: "/fantacalcio", label: "Fantacalcio SCD" },
      { to: "/top11", label: "Top 11 della settimana" },
      { to: "/rassegna-stampa", label: "Dicono di noi" },
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

/**
 * Schermate costruite sulle tavole: hanno la propria testata (stemma + wordmark/titolo), quindi su
 * smartphone la barra superiore generica non viene mostrata. Su desktop resta la navigazione completa.
 */
// Gated work areas render their access screen without a session: same board header.
const ACCESS_SCREEN_PATHS = [...ACCESS_SCREEN_IDS, ...WORK_AREA_IDS]
  .map((id) => findArea(id)?.path)
  .filter((p): p is string => !!p);
// The home is not a board route any more (UD-100): it sits under the compact site header on every width.
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
  const { session } = useSession();
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
          <ClubCrestOfficial size={40} className="lg:hidden" />
          <ClubCrestOfficial size={54} className="hidden lg:block" />
          {/* 18px below 380px so crest + wordmark + access + menu fit a 360px phone without overlapping. */}
          <span className="whitespace-nowrap font-title text-[18px] font-black leading-none min-[380px]:text-[20px] lg:text-[24px]" data-testid="header-wordmark">
            COLICO<span className="text-[#ffd600]">DERVIESE</span>
          </span>
        </Link>
        <nav
          className="ml-4 hidden items-center gap-[22px] lg:flex"
          aria-label="Principale"
        >
          {desktopNavFor(!!session?.user).map((n) => (
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
        {/* Riconoscimenti e affiliazioni in testata da 1400 px in su (Direzione 13/10/2026 15:31): piccola placca bianca.
            Non sulla home, che le mostra già più grandi nella fascia sotto la striscia rapida. */}
        {pathname !== "/" && (
          <div className="ml-auto hidden h-[48px] shrink-0 items-center rounded-[10px] bg-white px-1 shadow-[inset_0_-2px_0_#d4ab55] min-[1400px]:flex" aria-label="Riconoscimenti e affiliazioni del club" role="group">
            <ClubCredentials variant="plaque" />
          </div>
        )}
        <div className={`ml-auto flex shrink-0 items-center gap-2 lg:gap-3 ${pathname !== "/" ? "min-[1400px]:ml-0" : ""}`}>
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
/** Anonymous visitors: teams are inside (UD-100), the public tab is the partner offer. */
const PARTNER_TAB: TabDef = {
  label: "Partner",
  icon: Handshake,
  to: "/sponsor",
  match: (p) => p.startsWith("/sponsor") || p.startsWith("/fornitori"),
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
 * Public bar, five tabs. Anonymous: Home · Calendario · [Entra] · Partner · Aree (teams are inside,
 * UD-100). Signed in without author role: Home · Calendario · [La mia] · Squadre · Aree. Author:
 * Home · Calendario · [Crea] · Squadre · La mia.
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
  return [
    HOME_TAB,
    CALENDAR_TAB,
    CENTER_TABS[center],
    center === "entra" ? PARTNER_TAB : TEAMS_TAB,
    last,
  ];
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
  if (pathname.startsWith("/comunicazioni"))
    return center === "entra"
      ? COMMS_TABS.map((t) => (t.to === "/squadre" ? PARTNER_TAB : t))
      : COMMS_TABS;
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

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook } as const;

export function SiteFooter() {
  return (
    <footer className="mt-10" data-testid="site-footer">
      <div className="bg-[#0b2a5b] px-4 pb-20 pt-10 text-white lg:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/"
              className="scd-focus flex items-center gap-3 rounded-md"
              aria-label={`${CLUB_NAME}, vai alla Home`}
            >
              <ClubCrestOfficial size={48} />
              <span className="whitespace-nowrap font-title text-[24px] font-black leading-none">
                COLICO<span className="text-[#ffd600]">DERVIESE</span>
              </span>
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
                      className="scd-focus grid size-11 place-items-center rounded-full border border-white/25 text-white transition-colors duration-150 hover:bg-white/10"
                    >
                      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.8fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-1.5 text-[14px] leading-snug text-white/85">
              <h2 className="m-0 pb-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#ffd600]">
                La società
              </h2>
              <p className="m-0 font-semibold text-white">{CLUB_NAME}</p>
              <p className="m-0">Matricola FIGC {CLUB_PROFILE.figcMatricola}</p>
              <p className="m-0">{CLUB_PROFILE.contacts.address}</p>
              <p className="m-0">
                <a
                  href={`mailto:${CLUB_PROFILE.contacts.email}`}
                  className="scd-focus inline-flex min-h-11 select-text items-center underline decoration-white/30 underline-offset-4 hover:decoration-white"
                >
                  {CLUB_PROFILE.contacts.email}
                </a>
              </p>
              <p className="m-0">
                PEC <span className="select-text">{CLUB_PROFILE.contacts.pec}</span>
              </p>
            </div>

            <nav aria-label="Link a piè di pagina" className="grid content-start gap-1" data-testid="footer-links">
              <h2 className="m-0 pb-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#ffd600]">
                Tutto sul club
              </h2>
              {/* UD-110: the former home accordions "Tutto sul club" live here, on every page. */}
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                {LINK_GROUPS.map((g) => (
                  <div key={g.id} className="grid content-start gap-0">
                    <h3 className="m-0 text-[13px] font-bold text-white">{g.title}</h3>
                    <ul className="m-0 grid list-none p-0">
                      {g.items.map((n) => (
                        <li key={n.label}>
                          <Link
                            to={n.to as never}
                            search={n.search as never}
                            {...(n.hash ? { hash: n.hash } : {})}
                            className="scd-focus inline-flex min-h-11 min-w-11 items-center text-[14px] gap-1.5 text-white/85 hover:text-white"
                          >
                            {n.label}
                            {n.reserved && <Lock className="size-3.5 text-white/60" aria-label="area riservata" />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>

            <div className="grid content-start gap-2.5 md:col-span-2 lg:col-span-1">
              <h2 className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#ffd600]">
                Riconoscimenti e affiliazioni
              </h2>
              <div className="rounded-[14px] bg-white px-3.5 py-3">
                <ClubCredentials variant="list" />
              </div>
              <p className="m-0 text-[13px] leading-snug text-white/75">
                {CREDENTIALS_SENTENCE}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/15 pt-5 text-[12.5px] text-white/70 lg:flex-row lg:items-center lg:justify-between">
            <span className="flex flex-wrap gap-x-5">
              <a
                href="/privacy"
                className="scd-focus inline-flex min-h-11 min-w-11 items-center underline decoration-white/30 underline-offset-4 hover:text-white"
              >
                Privacy
              </a>
              <button
                type="button"
                onClick={openCookiePrefs}
                className="scd-focus inline-flex min-h-11 items-center underline decoration-white/30 underline-offset-4 hover:text-white"
              >
                Preferenze cookie
              </button>
              <Link
                to="/safeguarding"
                className="scd-focus inline-flex min-h-11 items-center underline decoration-white/30 underline-offset-4 hover:text-white"
              >
                Segnalazioni riservate
              </Link>
              <a
                href="/elimina-account"
                className="scd-focus inline-flex min-h-11 items-center underline decoration-white/30 underline-offset-4 hover:text-white"
              >
                Elimina account
              </a>
            </span>
            <span>
              Super App ufficiale della {CLUB_NAME} · versione del {BUILD_STAMP}
            </span>
          </div>
          <p className="m-0 -mt-4 text-[12px] leading-snug text-white/60">
            © {new Date().getFullYear()} Francesco Coppola · ideato e creato da
            Francesco Coppola, concesso in uso gratuito alla {CLUB_NAME}.
            Stemma, loghi e marchi appartengono ai rispettivi titolari.
          </p>
        </div>
      </div>
    </footer>
  );
}
