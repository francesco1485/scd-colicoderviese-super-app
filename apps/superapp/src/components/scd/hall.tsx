/**
 * Public hall ("piano terra") building blocks: hero band of the outside palette and the
 * "trova subito" door grid shared by the Home and Chi siamo. Outside palette only:
 * night #062a52, crest blue, light blue, yellow reserved to actions, white.
 */
import { Link } from "@tanstack/react-router";
import { CalendarDays, CalendarCheck, Handshake, Info, Mail, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function HallHero({ kicker, title, children, actions }: { kicker: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="scd-pub relative overflow-hidden bg-[linear-gradient(160deg,#062a52_0%,#0860a8_70%,#1898d8_130%)] text-white">
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-[320px] rounded-full border-[28px] border-white/[0.06]" />
      <div className="relative mx-auto max-w-[1200px] px-4 pb-12 pt-7 sm:px-6 lg:pb-14 lg:pt-12">
        <p className="m-0 text-[15px] font-semibold text-[var(--out-text-soft)]">{kicker}</p>
        <h1 className="m-0 mt-1 font-title text-[46px] font-black uppercase leading-[0.92] sm:text-[64px]">{title}</h1>
        {children && <div className="m-0 mt-3 max-w-[62ch] text-[16px] leading-snug text-[#e6f3fc]">{children}</div>}
        {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}

type Door = { to: string; label: string; sub: string; icon: LucideIcon; hash?: string };

/**
 * The hall doors, in the order a visitor looks for them. Public pages only: teams are inside (UD-100, Direzione
 * 13/10/2026), so the public door is the partner offer instead of the teams.
 */
export const HALL_DOORS: readonly Door[] = [
  { to: "/societa", label: "Chi siamo", sub: "Colico e Dervio, un solo club", icon: Info },
  { to: "/sponsor", label: "Partner", sub: "Il territorio che ci sostiene", icon: Handshake },
  { to: "/calendario", label: "Calendario", sub: "Gare e risultati ufficiali", icon: CalendarDays },
  { to: "/impianti", label: "Mappa campi", sub: "Dove si gioca, da dove si entra", icon: MapPin },
  { to: "/eventi", label: "Eventi", sub: "Tornei e serate", icon: CalendarCheck },
  { to: "/contatti", label: "Contatti", sub: "Mail, PEC e indirizzo", icon: Mail },
];

/** Door grid of the hall. `exclude` hides the page the visitor is already on. */
export function HallDoors({ exclude, title = "Trova subito", className = "", compact = false }: { exclude?: string; title?: string; className?: string; compact?: boolean }) {
  const doors = HALL_DOORS.filter((d) => d.to !== exclude);
  return (
    <nav aria-label={title} className={className} data-testid="hall-doors">
      <h2 className="m-0 mb-3 font-title text-[26px] font-black uppercase leading-none text-white">{title}</h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {doors.map((d) => (
          <li key={d.to}>
            <Link
              to={d.to}
              className={`scd-focus group flex h-full ${compact ? "min-h-[64px] flex-row items-center sm:min-h-[92px] sm:flex-col sm:items-start" : "min-h-[92px] flex-col"} justify-between gap-2 rounded-[14px] border border-white/15 bg-white/[0.07] p-3 text-white transition-colors duration-150 hover:border-[var(--out-yellow)] hover:bg-white/[0.12]`}
            >
              <d.icon className="size-6 text-[var(--out-sky)] transition-colors duration-150 group-hover:text-[var(--out-yellow)]" strokeWidth={2} aria-hidden="true" />
              <span className={compact ? "min-w-0 flex-1 sm:flex-none" : undefined}>
                <span className="block font-title text-[21px] font-extrabold uppercase leading-none">{d.label}</span>
                <span className={`mt-1 text-[13px] leading-tight text-[var(--out-text-soft)] ${compact ? "hidden sm:block" : "block"}`}>{d.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
