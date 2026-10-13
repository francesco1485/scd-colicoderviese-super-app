/**
 * Public hall ("piano terra") building blocks: hero band of the outside palette and the
 * "trova subito" door grid shared by the Home and Chi siamo. Outside palette only:
 * night #062a52, crest blue, light blue, yellow reserved to actions, white.
 */
import { Link } from "@tanstack/react-router";
import { CalendarDays, CalendarCheck, Handshake, Info, Mail, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { KitTexture, type KitMotif } from "./kit-texture";

/**
 * Hall hero (Chi siamo, Squadre): kit 2026/27 texture band (KitTexture) in place of the plain gradient with the
 * template ring. Compact on phone and tablet (Direzione 13/10/2026 14:55): smaller title, paragraph at most two
 * lines below 1024 px, 44 px actions; the bottom padding stays larger than the -mt-6 of the card that follows.
 */
export function HallHero({ kicker, title, children, actions, motif = "monogram" }: { kicker: string; title: ReactNode; children?: ReactNode; actions?: ReactNode; motif?: KitMotif }) {
  return (
    <section className="scd-pub relative isolate overflow-hidden bg-[linear-gradient(160deg,#062a52_0%,#0860a8_70%,#1898d8_130%)] text-white" data-hero="hall">
      {/* Overlay: the hall keeps its own darker night-to-sky gradient, so the light-blue title words stay above 3:1. */}
      <KitTexture motif={motif} overlay />
      <div className="relative mx-auto max-w-[1200px] px-4 pb-8 pt-4 sm:px-6 sm:pt-5 lg:pb-14 lg:pt-12">
        <p className="m-0 text-[14px] font-semibold text-[var(--out-text-soft)] sm:text-[15px]">{kicker}</p>
        <h1 className="m-0 mt-0.5 font-title text-[clamp(32px,9vw,40px)] font-black uppercase leading-[0.92] sm:mt-1 sm:text-[42px] lg:text-[64px]">{title}</h1>
        {children && <div className="m-0 mt-2 line-clamp-2 max-w-[62ch] text-[15px] leading-snug text-[#e6f3fc] lg:mt-3 lg:line-clamp-none lg:text-[16px]">{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2 lg:mt-5 lg:gap-3 max-lg:[&>a]:h-11 max-lg:[&>a]:px-4 max-lg:[&>a]:text-[15px]">{actions}</div>}
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
