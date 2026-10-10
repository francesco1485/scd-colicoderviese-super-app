import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Handshake, House, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";

/** Nome ufficiale della società (sigla S.C.D., non invertire le lettere). */
export const CLUB_NAME = "S.C.D. ColicoDerviese";

type NavItem = { to: string; label: string };

/** Navigazione desktop: le tre app (ONE, CORE, GROW) in un'unica barra. */
const desktopNav: readonly NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/calendario", label: "Calendario" },
  { to: "/allenamenti", label: "Allenamenti" },
  { to: "/eventi", label: "Eventi" },
  { to: "/core", label: "Area club" },
  { to: "/grow", label: "Sponsor" },
  { to: "/contatti", label: "Contatti" },
];

/** Menu completo (drawer mobile e voce "Altro" desktop), raggruppato per app. */
const menuGroups: readonly { title: string; app: string; items: readonly NavItem[] }[] = [
  {
    title: "Il Club",
    app: "ONE",
    items: [
      { to: "/", label: "Home" },
      { to: "/calendario", label: "Calendario gare" },
      { to: "/allenamenti", label: "Allenamenti" },
      { to: "/eventi", label: "Eventi" },
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
      { to: "/core/staff", label: "Staff (anteprima)" },
      { to: "/aree", label: "Aree riservate (accesso R20)" },
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

/** Barra inferiore mobile: 4 ingressi. Ogni voce è attiva anche sulle sue sotto-pagine. */
const bottomNav = [
  { to: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, match: (p: string) => p.startsWith("/calendario") || p.startsWith("/allenamenti") },
  { to: "/core", label: "Area club", icon: ShieldCheck, match: (p: string) => p.startsWith("/core") || p.startsWith("/aree") },
  { to: "/grow", label: "Sponsor", icon: Handshake, match: (p: string) => p.startsWith("/grow") || p.startsWith("/sponsor") || p.startsWith("/fornitori") },
] as const;

const isActive = (pathname: string, to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));

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
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="sticky top-0 z-40 h-[57px] border-b border-white/10 surface-deep">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${CLUB_NAME} · Super App, vai alla Home`}>
          <ClubCrestOfficial size={38} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[15px] font-bold tracking-wide">{CLUB_NAME}</span>
            <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-accent">Super App · 2026/27</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigazione principale">
          {desktopNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              aria-current={isActive(pathname, n.to) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive(pathname, n.to) ? "bg-white/10 text-accent" : "opacity-85 hover:bg-white/5 hover:opacity-100"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/20"
          aria-label={open ? "Chiudi menu" : "Apri menu completo"}
          aria-expanded={open}
          aria-controls="sa-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <>
          <button aria-label="Chiudi menu" className="fixed inset-0 top-[57px] z-30 cursor-default bg-lake-deep/60" onClick={() => setOpen(false)} />
          <nav
            id="sa-menu"
            aria-label="Menu completo"
            className="absolute inset-x-0 top-[57px] z-40 max-h-[calc(100dvh-57px)] overflow-y-auto border-t border-white/10 surface-deep px-4 pb-24 pt-3 shadow-premium lg:left-auto lg:right-4 lg:w-[380px] lg:rounded-b-2xl lg:pb-4"
          >
            {menuGroups.map((g) => (
              <div key={g.app} className="border-b border-white/10 py-2 last:border-0">
                <p className="flex items-center gap-2 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
                  {g.title} <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.6rem] tracking-wider text-primary-foreground">{g.app}</span>
                </p>
                <div className="grid grid-cols-2 gap-x-2">
                  {g.items.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className={`rounded-lg px-2 py-2.5 text-sm font-medium ${isActive(pathname, n.to) ? "text-accent" : "opacity-90"}`}
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/safeguarding" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 px-2 py-2 text-sm font-semibold text-accent">
              <ShieldCheck className="size-4" /> Safeguarding · segnalazioni riservate
            </Link>
          </nav>
        </>
      )}
    </header>
  );
}

/** Barra di navigazione inferiore (solo smartphone/tablet). */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Navigazione Super App"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-lake-deep pb-[env(safe-area-inset-bottom)] text-primary-foreground shadow-[0_-8px_24px_-12px_oklch(0.2_0.09_258/0.6)] lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-4">
        {bottomNav.map((n) => {
          const active = n.match(pathname);
          return (
            <Link
              key={n.to}
              to={n.to}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 text-[0.7rem] font-bold uppercase tracking-wide ${active ? "text-accent" : "text-primary-foreground/75"}`}
            >
              {active && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-accent" aria-hidden="true" />}
              <n.icon className="size-[22px]" aria-hidden="true" />
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="surface-deep mt-16 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm">
        <div className="flex items-center gap-3">
          <ClubCrestOfficial size={44} />
          <p className="font-display text-lg font-bold">{CLUB_NAME}</p>
        </div>
        <p className="opacity-75">Colico (LC) · Alto Lago di Como · PEC calciocolicoderviese@pec.it</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Link a piè di pagina">
          {[...desktopNav.slice(1), ...footerLinks].map((n) => (
            <Link key={n.to + n.label} to={n.to} className="opacity-80 hover:opacity-100">{n.label}</Link>
          ))}
        </nav>
        <p className="text-xs opacity-60">
          © {new Date().getFullYear()} {CLUB_NAME} — Super App ufficiale · anteprima locale.
        </p>
      </div>
    </footer>
  );
}
