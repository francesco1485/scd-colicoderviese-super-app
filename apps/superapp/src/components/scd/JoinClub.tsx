/**
 * "Entra nel club" for visitors (Francesco 16/10/2026 23:08 «non voglio pagine vuote», 23:16–23:17 on what an account
 * gives): instead of an almost empty lock, a signed-out visitor of a members' page sees what the account opens and the
 * two real actions, Registrati and Entra (existing /registrati and /accedi; the auth pages are not touched here).
 *
 * It describes and routes only: no data, no names, no calendar. METAL navy band, polished gold action, sole band for
 * families (navy text, navy button: never gold on yellow).
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bus,
  CalendarDays,
  Dumbbell,
  FileText,
  Gamepad2,
  type LucideIcon,
  MessagesSquare,
  Shirt,
  Trophy,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";

export interface JoinPerk {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** What every account opens (Francesco 23:16). */
export const JOIN_PERKS_ALL: readonly JoinPerk[] = [
  { icon: CalendarDays, title: "Calendario", text: "Gare di tutte le squadre, con le tue in cima." },
  { icon: Dumbbell, title: "Allenamenti", text: "Orari e campi della tua squadra, aggiornati dalla società." },
  { icon: UserRound, title: "Il tuo avatar", text: "Realistico, per il tuo profilo e le card del club." },
  { icon: BarChart3, title: "Statistiche e classifiche", text: "I numeri della stagione e le classifiche del club." },
  { icon: MessagesSquare, title: "Community", text: "Segui le squadre, le notizie e i post del club." },
  { icon: Trophy, title: "Fantacalcio", text: "Undici giocatori delle squadre agonistiche, punti a ogni gara." },
  { icon: Gamepad2, title: "Giochi", text: "Vota la Top 11 della settimana e gioca con il club." },
];

/** What a family account adds once the club recognises the family (Francesco 23:17). */
export const JOIN_PERKS_FAMILY: readonly JoinPerk[] = [
  { icon: Shirt, title: "La squadra di tuo figlio", text: "Gare, convocazioni e avvisi della sua squadra." },
  { icon: Bus, title: "Pulmino", text: "Chi guida e il posto in pulmino per le trasferte." },
  { icon: FileText, title: "Documenti", text: "Certificati e moduli della famiglia in un solo posto." },
];

export function JoinClubScreen({
  screen,
  kicker = "S.C.D. ColicoDerviese",
  title,
  intro,
  next,
  lead,
  children,
}: {
  /** data-screen of the page (kept for the page tests and analytics). */
  screen: string;
  kicker?: string;
  title: string;
  intro: ReactNode;
  /** Page to come back to after signing in. */
  next: string;
  /** Optional block shown first, right under the band (what already exists, e.g. the public team list). */
  lead?: ReactNode;
  /** Optional extra block under the perks. */
  children?: ReactNode;
}) {
  return (
    <main
      data-screen={screen}
      data-join="visitor"
      className="min-h-dvh bg-[#eef3f9] pb-28 font-text text-[#13254d] lg:pb-14"
    >
      <section aria-labelledby={`${screen}-join-t`} className="scd-band text-white">
        <div className="mx-auto grid max-w-[1200px] gap-5 px-4 pb-14 pt-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:pb-16 lg:pt-12">
          <div className="flex items-start gap-4">
            <ClubCrestOfficial size={72} className="hidden shrink-0 drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)] sm:block" />
            <div className="min-w-0">
              <p className="m-0 text-[12.5px] font-extrabold uppercase tracking-[0.14em] text-[#ffd84a]">{kicker}</p>
              <h1
                id={`${screen}-join-t`}
                className="m-0 mt-2 font-uv text-[36px] uppercase leading-[0.95] sm:text-[44px] lg:text-[56px]"
              >
                {title}
              </h1>
              <div className="mt-3 max-w-[60ch] text-[15.5px] leading-snug text-[#dbe5f7] lg:text-[17px]">{intro}</div>
            </div>
          </div>
          <JoinActions next={next} />
        </div>
      </section>

      {lead && <div className="relative mx-auto -mt-8 max-w-[1200px] px-4 sm:px-6">{lead}</div>}

      <div
        className={`mx-auto grid max-w-[1200px] gap-4 px-4 sm:px-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${lead ? "mt-4" : "-mt-8"}`}
      >
        <section
          aria-labelledby={`${screen}-perks-all`}
          className="relative rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)] sm:p-5"
          data-testid="join-perks-all"
        >
          <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#0457af]">Con il tuo account</p>
          <h2 id={`${screen}-perks-all`} className="m-0 mt-1 font-uv text-[26px] uppercase leading-none">
            Tutto il club in tasca
          </h2>
          <PerkList perks={JOIN_PERKS_ALL} iconCls="bg-[#e7f0fb] text-[#0457af]" />
        </section>
        <section
          aria-labelledby={`${screen}-perks-family`}
          className="scd-band-sole relative rounded-[20px] p-4 shadow-[0_2px_10px_rgb(11_42_91/0.12)] sm:p-5"
          data-testid="join-perks-family"
        >
          <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#034a96]">Per le famiglie</p>
          <h2 id={`${screen}-perks-family`} className="m-0 mt-1 font-uv text-[26px] uppercase leading-none">
            Le cose di tuo figlio
          </h2>
          <PerkList
            perks={JOIN_PERKS_FAMILY}
            iconCls="bg-white/70 text-[#13254d]"
            textCls="text-[#1c2c50]"
            cols="sm:grid-cols-2 lg:grid-cols-1"
          />
          <p className="m-0 mt-3 text-[13.5px] leading-snug text-[#1c2c50]">
            Si aprono quando la società riconosce la famiglia: stessa e-mail e nomi dei figli già registrati.
          </p>
          <Link
            to="/registrati"
            className="scd-navy-btn scd-focus mt-4 inline-flex h-12 items-center gap-2 rounded-[12px] px-5 text-[15.5px] font-bold"
          >
            Registra la famiglia
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </section>
      </div>

      {children && <div className="mx-auto mt-4 max-w-[1200px] px-4 sm:px-6">{children}</div>}

      <p className="mx-auto mt-4 max-w-[1200px] px-4 text-[13.5px] leading-snug text-[#3e5272] sm:px-6">
        Ragazzi sotto i 14 anni: si registra un genitore o tutore indicando il figlio. Mister, dirigenti e staff: la
        Direzione abilita il tuo ruolo dopo la registrazione.
      </p>
    </main>
  );
}

/** The two real actions: create the account, or come back in. */
export function JoinActions({ next, className = "" }: { next: string; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`} data-testid="join-actions">
      <Link
        to="/registrati"
        className="scd-gold scd-focus inline-flex h-12 min-w-[150px] flex-1 items-center justify-center gap-2 rounded-[12px] px-5 text-[16px] font-bold sm:flex-none"
        data-testid="join-signup"
      >
        Registrati
        <ArrowRight className="size-5" aria-hidden="true" />
      </Link>
      <Link
        to="/accedi"
        search={{ next }}
        className="scd-focus inline-flex h-12 min-w-[120px] flex-1 items-center justify-center rounded-[12px] border-2 border-white/80 px-5 text-[16px] font-bold text-white hover:bg-white/10 sm:flex-none"
        data-testid="join-signin"
      >
        Entra
      </Link>
    </div>
  );
}

function PerkList({
  perks,
  iconCls,
  textCls = "text-[#3e5272]",
  cols = "sm:grid-cols-2",
}: {
  perks: readonly JoinPerk[];
  iconCls: string;
  textCls?: string;
  cols?: string;
}) {
  return (
    <ul className={`m-0 mt-3 grid list-none gap-x-4 gap-y-3 p-0 ${cols}`}>
      {perks.map((p) => (
        <li key={p.title} className="flex items-start gap-3">
          <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${iconCls}`}>
            <p.icon className="size-5" />
          </span>
          <span className="min-w-0">
            <b className="block text-[15.5px] leading-tight">{p.title}</b>
            <span className={`block text-[13.5px] leading-snug ${textCls}`}>{p.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
