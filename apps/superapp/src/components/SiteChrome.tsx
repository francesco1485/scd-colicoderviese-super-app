import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck, CalendarDays, Circle, Ellipsis, House, Lock, Menu, Newspaper, Shirt, ShieldCheck, UserRound, UsersRound, X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { ACCESS_SCREEN_IDS, WORK_AREA_IDS, findArea } from "@/lib/areas";
import { openCookiePrefs } from "./CookieConsent";
import { AccessMenu, openAccessMenu } from "./scd/AccessMenu";

/** Nome ufficiale della società (sigla S.C.D., non invertire le lettere). */
export const CLUB_NAME = "S.C.D. ColicoDerviese";

type NavItem = { to: string; label: string };

/** Navigazione desktop della barra pubblica (tavola Accesso-aree, VR-022). Le altre pagine restano nel menu completo. */
const desktopNav: readonly NavItem[] = [
  { to: "/allenamenti", label: "Squadre" },
  { to: "/calendario", label: "Calendario" },
  { to: "/eventi", label: "Eventi" },
  { to: "/grow", label: "Sponsor" },
  { to: "/contatti", label: "Contatti" },
];

/** Link a piè di pagina: tutte le pagine pubbliche principali. */
const footerNav: readonly NavItem[] = [
  { to: "/calendario", label: "Calendario" },
  { to: "/allenamenti", label: "Allenamenti" },
  { to: "/comunicazioni", label: "Comunicazioni" },
  { to: "/eventi", label: "Eventi" },
  { to: "/core", label: "Area club" },
  { to: "/grow", label: "Sponsor" },
  { to: "/contatti", label: "Contatti" },
];

/** Menu completo (drawer mobile e voce "Altro"), raggruppato per app. */
const menuGroups: readonly { title: string; app: string; items: readonly NavItem[] }[] = [
  {
    title: "Il Club",
    app: "ONE",
    items: [
      { to: "/", label: "Home" },
      { to: "/calendario", label: "Calendario gare" },
      { to: "/allenamenti", label: "Allenamenti" },
      { to: "/comunicazioni", label: "Comunicazioni" },
      { to: "/eventi", label: "Eventi" },
      { to: "/eventi/christmas-lario-cup", label: "Christmas Lario Cup" },
      { to: "/community", label: "Tifosi" },
      { to: "/entra", label: "Gioca con noi" },
      { to: "/societa", label: "Società avversarie" },
      { to: "/shop", label: "Shop & membership" },
      { to: "/contatti", label: "Contatti" },
    ],
  },
  {
    title: "Area club",
    app: "CORE",
    items: [
      { to: "/core", label: "Area club · panoramica" },
      { to: "/core/impianti-calendari", label: "Impianti e calendari" },
      { to: "/core/atleta", label: "Area atleta (anteprima)" },
      { to: "/core/famiglia", label: "Area famiglia (anteprima)" },
      { to: "/core/staff", label: "Area staff (anteprima)" },
      { to: "/aree", label: "Il tuo ingresso (tutte le aree)" },
    ],
  },
  {
    title: "Sponsor & Partner",
    app: "GROW",
    items: [
      { to: "/grow", label: "Sponsor & Partner" },
      { to: "/sponsor", label: "Diventa sponsor" },
      { to: "/fornitori", label: "Fornitori" },
    ],
  },
];

const footerLinks: readonly NavItem[] = [
  { to: "/societa", label: "Società avversarie" },
  { to: "/shop", label: "Shop & membership" },
  { to: "/fornitori", label: "Fornitori" },
  { to: "/safeguarding", label: "Safeguarding" },
];

/**
 * Schermate costruite sulle tavole: hanno la propria testata (stemma + wordmark/titolo), quindi su
 * smartphone la barra superiore generica non viene mostrata. Su desktop resta la navigazione completa.
 */
// Gated work areas render their access screen without a session: same board header.
const ACCESS_SCREEN_PATHS = [...ACCESS_SCREEN_IDS, ...WORK_AREA_IDS].map((id) => findArea(id)?.path).filter((p): p is string => !!p);
const BOARD_ROUTES = ["/", "/calendario", "/allenamenti", "/comunicazioni", "/core", "/core/atleta", "/core/famiglia", "/core/staff", "/core/impianti-calendari", "/grow", ...ACCESS_SCREEN_PATHS];
export const isBoardRoute = (p: string) => BOARD_ROUTES.includes(p.replace(/\/$/, "") || "/");

const isActive = (pathname: string, to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));

/** Apre il menu completo da qualunque punto (voce "Altro", ingranaggio Staff, pulsante menu). */
export const openMenu = () => window.dispatchEvent(new CustomEvent("scd:menu"));

export function ClubCrestOfficial({ size = 34, className = "" }: { size?: number; className?: string }) {
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
        <Link to="/" className="scd-focus flex min-w-0 items-center gap-2.5 rounded-md lg:gap-3" aria-label={`${CLUB_NAME}, vai alla Home`}>
          <ClubCrestOfficial size={46} className="lg:hidden" />
          <ClubCrestOfficial size={54} className="hidden lg:block" />
          <span className="font-title text-[21px] font-black leading-[0.95] lg:text-[26px]">COLICO<br />DERVIESE</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-[22px] lg:flex" aria-label="Principale">
          {desktopNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              aria-current={isActive(pathname, n.to) ? "page" : undefined}
              className={`scd-focus relative rounded-md px-1 py-2 text-[16px] font-semibold transition-colors duration-150 ${isActive(pathname, n.to) ? "text-white after:absolute after:inset-x-1 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-[var(--out-yellow)]" : "text-[#e6f3fc] hover:text-white"}`}
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
            aria-controls="sa-menu"
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
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onOpen = () => setOpen((o) => !o);
    window.addEventListener("scd:menu", onOpen);
    return () => window.removeEventListener("scd:menu", onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <button aria-label="Chiudi menu" className="fixed inset-0 z-[60] cursor-default bg-[#01224f]/60" onClick={() => setOpen(false)} />
      <nav
        id="sa-menu"
        aria-label="Menu completo"
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[85dvh] overflow-y-auto rounded-t-[20px] bg-white px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 text-[var(--scd-ink)] shadow-[0_-12px_40px_rgb(1_34_79/0.35)] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-[64px] lg:w-[400px] lg:rounded-2xl"
      >
        <div className="flex items-center justify-between pb-1">
          <span className="flex items-center gap-2"><ClubCrestOfficial size={30} /><b className="text-[15px]">Menu</b></span>
          <button aria-label="Chiudi menu" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-lg"><X className="size-5" /></button>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); openAccessMenu(); }}
          className="scd-action mb-1 w-full justify-between"
        >
          <span className="inline-flex items-center gap-2"><Lock className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />Accesso aree</span>
          <span className="text-[13px] font-medium">un link per area</span>
        </button>
        {menuGroups.map((g) => (
          <div key={g.app} className="border-b border-[var(--scd-line)] py-2 last:border-0">
            <p className="flex items-center gap-2 px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--scd-blue)]">
              {g.title} <span className="rounded bg-[var(--scd-yellow)] px-1.5 py-0.5 text-[0.6rem] tracking-wider text-[var(--scd-ink)]">{g.app}</span>
            </p>
            <div className="grid grid-cols-2 gap-x-2">
              {g.items.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={`rounded-lg px-2 py-2.5 text-[15px] font-medium ${isActive(pathname, n.to) ? "font-bold text-[var(--scd-blue)]" : ""}`}>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <Link to="/safeguarding" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 px-2 py-2 text-sm font-semibold text-[var(--scd-blue)]">
          <ShieldCheck className="size-4" /> Safeguarding · segnalazioni riservate
        </Link>
      </nav>
    </>
  );
}

type TabDef = { label: string; icon: LucideIcon; to?: string; search?: Record<string, string>; menu?: true; match: (p: string) => boolean; tone?: "yellow" };

const PUBLIC_TABS: TabDef[] = [
  { label: "Home", icon: House, to: "/", match: (p) => p === "/" },
  { label: "Calendario", icon: CalendarDays, to: "/calendario", match: (p) => p.startsWith("/calendario") },
  { label: "Squadre", icon: UsersRound, to: "/allenamenti", match: (p) => p.startsWith("/allenamenti") },
  { label: "Eventi", icon: CalendarCheck, to: "/eventi", match: (p) => p.startsWith("/eventi") || p.startsWith("/community") },
  { label: "Profilo", icon: UserRound, to: "/core/atleta", match: (p) => p.startsWith("/core/atleta") || p.startsWith("/core/famiglia") || p.startsWith("/aree") },
];
const STAFF_TABS: TabDef[] = [
  { label: "Dashboard", icon: House, to: "/core/staff", match: (p) => p.startsWith("/core/staff") || p === "/core" || p === "/core/" },
  { label: "Squadre", icon: UsersRound, to: "/core/impianti-calendari", search: { sezione: "squadra" }, match: (p) => p.startsWith("/core/impianti-calendari") },
  { label: "Atleti", icon: Shirt, to: "/core/atleta", match: (p) => p.startsWith("/core/atleta") },
  { label: "Comunicazioni", icon: Newspaper, to: "/comunicazioni", match: (p) => p.startsWith("/comunicazioni") },
  { label: "Altro", icon: Ellipsis, menu: true, match: () => false },
];
const COMMS_TABS: TabDef[] = [
  { label: "Home", icon: House, to: "/", match: (p) => p === "/" },
  { label: "Calendario", icon: CalendarDays, to: "/calendario", match: (p) => p.startsWith("/calendario") },
  { label: "Comunicazioni", icon: Circle, to: "/comunicazioni", match: (p) => p.startsWith("/comunicazioni"), tone: "yellow" },
  { label: "Squadre", icon: UsersRound, to: "/allenamenti", match: (p) => p.startsWith("/allenamenti") },
  { label: "Altro", icon: Ellipsis, menu: true, match: () => false },
];

export function tabsFor(pathname: string): TabDef[] {
  if (pathname.startsWith("/comunicazioni")) return COMMS_TABS;
  if (pathname === "/core" || pathname === "/core/" || pathname.startsWith("/core/staff") || pathname.startsWith("/core/impianti-calendari")) return STAFF_TABS;
  return PUBLIC_TABS;
}

/** Barra inferiore (smartphone/tablet): blu notte della tavola, voce attiva gialla. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = tabsFor(pathname);
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
              <t.icon className="size-[25px]" strokeWidth={active ? 2.4 : 1.8} fill={active && t.icon === House ? "currentColor" : "none"} aria-hidden="true" />
              <span className={`text-[11.5px] leading-none ${active ? "font-bold" : "font-medium"}`}>{t.label}</span>
            </>
          );
          const cls = `relative flex flex-col items-center justify-center gap-[5px] ${color} ${active ? "before:absolute before:inset-x-[22%] before:top-0 before:h-1 before:rounded-b before:bg-[var(--uv-gold)]" : ""}`;
          return t.menu
            ? <button key={t.label} type="button" onClick={openMenu} className={cls} aria-label="Altro: menu completo">{inner}</button>
            : <Link key={t.label} to={t.to!} search={t.search as never} aria-current={active ? "page" : undefined} className={cls}>{inner}</Link>;
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
          <p className="font-brand text-xl leading-none"><span className="text-[#ffd600]">COLICO</span>DERVIESE</p>
        </div>
        <p className="opacity-75">{CLUB_NAME} · Colico (LC) · Alto Lago di Como · PEC calciocolicoderviese@pec.it</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Link a piè di pagina">
          {[...footerNav, ...footerLinks].map((n) => (
            <Link key={n.to + n.label} to={n.to} className="opacity-80 hover:opacity-100">{n.label}</Link>
          ))}
        </nav>
        <button type="button" onClick={openCookiePrefs} className="self-start text-sm underline opacity-80 hover:opacity-100">Preferenze cookie</button>
        <p className="text-xs opacity-60">
          © {new Date().getFullYear()} {CLUB_NAME} — Super App ufficiale · anteprima locale.
        </p>
      </div>
    </footer>
  );
}
