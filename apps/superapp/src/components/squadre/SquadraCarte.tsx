/**
 * Carte della rosa (DG 15/10/2026 09:18): a deck of flip cards for a team. Front = club-style card with the role in
 * shirt-number type (no photos, no faces), back = role description, team and "In rosa 2026/27". Staff cards for
 * mister, preparatori and dirigenti come from the staff roster. Presentational only: the route passes what the
 * existing server functions returned, and the pure rules live in lib/squadra-carte.ts.
 */
import { Link } from "@tanstack/react-router";
import { Lock, RotateCw, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { rosterCountLabel, type RosterPlayer } from "@/lib/public-roster";
import {
  CARDS_SEASON,
  deckMode,
  flipHint,
  isBaseTeam,
  playerCards,
  roleCounts,
  staffCards,
  teamShortName,
  type DeckTeam,
  type PlayerCard,
  type StaffCard,
} from "@/lib/squadra-carte";
import type { StaffPerson } from "@/lib/staff-roster";
import { publicTeamCrest } from "@/lib/team-crest";

export interface CarteTeam extends DeckTeam {
  color: string;
}

export interface CarteProps {
  teams: readonly CarteTeam[];
  /** Selected team id, null when the calendar has no team at all. */
  team: string | null;
  roster: { authorized: boolean; count: number; players: readonly RosterPlayer[] } | null;
  staff: { authorized: boolean; asOf: string | null; people: readonly StaffPerson[] };
}

const NAVY = "#0b2a5b";

export function SquadraCarte({ teams, team, roster, staff }: CarteProps) {
  const current = teams.find((t) => t.id === team) ?? null;
  return (
    <main data-screen="squadra-carte" className="min-h-dvh bg-[#eef3f9] pb-28 font-text text-[#0b1e3a] lg:pb-14">
      <header className="relative overflow-hidden bg-[#0b2a5b] text-white">
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-25 [background:repeating-linear-gradient(115deg,#1556c4_0_14px,transparent_14px_46px)]"
        />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-[#ffd600]" />
        <div className="relative mx-auto flex max-w-[1200px] items-center gap-3 px-4 pb-6 pt-5 sm:gap-4 sm:px-6 sm:pb-8 sm:pt-7">
          <img
            src={publicTeamCrest()}
            alt="Stemma ufficiale S.C.D. ColicoDerviese"
            width={55}
            height={72}
            className="h-[58px] w-auto shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)] sm:h-[76px]"
          />
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#ffd600]">
              ColicoDerviese · Stagione {CARDS_SEASON}
            </p>
            <h1 className="m-0 mt-1 font-uv text-[34px] uppercase leading-[0.95] sm:text-[48px]">Carte della rosa</h1>
            <p className="m-0 mt-1.5 text-[14px] leading-snug text-white/85 sm:text-[15px]">
              Tocca una carta per girarla. Calciatori della Prima Squadra e staff di ogni annata.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <TeamSwitcher teams={teams} current={current?.id ?? null} />
        {current ? (
          <Deck key={current.id} team={current} roster={roster} staff={staff} />
        ) : (
          <EmptyState title="Nessuna squadra nel calendario">
            Le squadre arrivano dal calendario SCD della stagione: appena ci sono, compaiono qui.
          </EmptyState>
        )}
        <p className="m-0 mt-6 flex items-start gap-2 rounded-[14px] bg-white px-3 py-3 text-[13px] leading-[1.4] text-[#22385c] shadow-[0_1px_4px_rgb(11_42_91/0.06)]">
          <ShieldCheck className="size-[18px] shrink-0 text-[#1556c4]" aria-hidden="true" />
          Rosa dalle liste ufficiali della stagione, staff dall'elenco dirigenti e ruoli del club. Dei minorenni compare
          solo il nome con l'iniziale del cognome; nell'attività di base solo il numero degli iscritti. Niente foto.
        </p>
        <p className="m-0 mt-3 text-[13px]">
          <Link to="/squadre" className="scd-focus font-bold text-[#1556c4] underline underline-offset-4">
            Torna a tutte le squadre
          </Link>
        </p>
      </div>
    </main>
  );
}

function TeamSwitcher({ teams, current }: { teams: readonly CarteTeam[]; current: string | null }) {
  const list = useRef<HTMLUListElement>(null);
  // Keep the selected team visible in the horizontal strip (phones), without moving the page.
  useEffect(() => {
    const ul = list.current;
    const on = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ul || !on) return;
    const left = on.offsetLeft - (ul.clientWidth - on.offsetWidth) / 2;
    ul.scrollLeft = Math.max(0, left);
  }, [current]);
  if (teams.length === 0) return null;
  return (
    <nav aria-label="Scegli la squadra" className="relative z-10 -mt-4">
      <ul ref={list} className="relative m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2 pt-0.5 [scrollbar-width:thin]" data-testid="carte-switcher">
        {teams.map((t) => {
          const on = t.id === current;
          return (
            <li key={t.id} className="shrink-0">
              <Link
                to="/squadre/carte"
                search={{ squadra: t.id }}
                aria-current={on ? "page" : undefined}
                className={`scd-focus inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-bold shadow-[0_2px_8px_rgb(11_42_91/0.12)] ${
                  on ? "bg-[#ffd600] text-[#0b1e3a]" : "bg-white text-[#0b2a5b] hover:bg-[#e3eefb]"
                }`}
              >
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: t.color }} />
                {teamShortName(t.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Deck({ team, roster, staff }: { team: CarteTeam; roster: CarteProps["roster"]; staff: CarteProps["staff"] }) {
  const mode = deckMode(team.id, roster?.authorized === true);
  const name = teamShortName(team.label);
  const base = isBaseTeam(team.id);
  const players = mode === "players" && roster ? playerCards(roster.players) : [];
  const staffList = staff.authorized ? staffCards(staff.people, team) : [];
  const counts = roleCounts(players);

  if (mode === "unauthorized" && !staff.authorized)
    return (
      <EmptyState title="Carte riservate ai tesserati" icon="lock">
        Rosa e staff si vedono con un account collegato a un tesserato attivo della ColicoDerviese. Se pensi di averne
        diritto, scrivi alla segreteria.
      </EmptyState>
    );

  return (
    <div className="mt-4 grid gap-7" data-testid="carte-deck" data-team={team.id}>
      <section aria-labelledby="carte-rosa-t">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="carte-rosa-t" className="m-0 font-uv text-[26px] uppercase leading-none text-[#0b2a5b] sm:text-[30px]">
            {name}
          </h2>
          {mode !== "unauthorized" && roster && (
            <p className="m-0 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3e5272]">
              <Users className="size-4" aria-hidden="true" />
              {rosterCountLabel(roster.count, base)}
              {counts.length > 0 && (
                <span className="text-[#5a6b85]">
                  {" · "}
                  {counts.map((c) => `${c.count} ${c.role}`).join(" · ")}
                </span>
              )}
            </p>
          )}
        </div>
        {mode === "unauthorized" ? (
          <EmptyState title="Rosa riservata ai tesserati" icon="lock" compact>
            La rosa si vede con un account collegato a un tesserato attivo.
          </EmptyState>
        ) : mode === "players" ? (
          players.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" data-testid="carte-players">
              {players.map((c) => (
                <li key={c.id}>
                  <FlipCard front={<PlayerFront card={c} team={name} />} back={<PlayerBack card={c} team={name} />} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Rosa non ancora disponibile" compact>
              La rosa arriva dalle liste ufficiali della stagione: appena c'è, qui compaiono le carte.
            </EmptyState>
          )
        ) : (
          <CountTile count={roster?.count ?? 0} base={base} team={name} />
        )}
      </section>

      <section aria-labelledby="carte-staff-t">
        <h2 id="carte-staff-t" className="m-0 mb-3 font-uv text-[22px] uppercase leading-none text-[#0b2a5b] sm:text-[26px]">
          Staff {name}
        </h2>
        {!staff.authorized ? (
          <EmptyState title="Staff riservato ai tesserati" icon="lock" compact>
            Lo staff si vede con un account collegato a un tesserato attivo.
          </EmptyState>
        ) : staffList.length > 0 ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" data-testid="carte-staff">
            {staffList.map((c) => (
              <li key={c.id}>
                <FlipCard front={<StaffFront card={c} team={name} />} back={<StaffBack card={c} team={name} />} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Staff non ancora inserito" compact>
            Lo staff di questa squadra arriva dall'elenco dirigenti e ruoli del club: non è ancora indicato.
          </EmptyState>
        )}
        {staff.authorized && staff.asOf && staffList.length > 0 && (
          <p className="m-0 mt-2 text-[12px] text-[#5a6b85]">Elenco staff aggiornato al {staff.asOf.split("-").reverse().join("/")}.</p>
        )}
      </section>
    </div>
  );
}

/**
 * One card. A real <button> (Enter and Space flip it), aria-pressed carries the state, the hidden face is
 * aria-hidden. With prefers-reduced-motion the card swaps faces at once without rotating.
 */
export function FlipCard({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={flipped}
      onClick={() => setFlipped((f) => !f)}
      data-flipped={flipped ? "true" : "false"}
      className="scd-focus group relative block aspect-[5/7] w-full cursor-pointer rounded-[18px] border-0 bg-transparent p-0 text-left [perspective:1200px] focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#1556c4]"
    >
      <span
        className={`relative block size-full transition-transform duration-[650ms] ease-[cubic-bezier(.2,.75,.25,1)] [transform-style:preserve-3d] motion-reduce:transition-none ${
          flipped ? "[transform:rotateY(180deg)] motion-reduce:[transform:none]" : ""
        }`}
      >
        <span
          aria-hidden={flipped}
          className={`absolute inset-0 block overflow-hidden rounded-[18px] shadow-[0_6px_18px_-6px_rgb(11_42_91/0.45)] [backface-visibility:hidden] ${
            flipped ? "motion-reduce:invisible" : ""
          }`}
        >
          {front}
        </span>
        <span
          aria-hidden={!flipped}
          className={`absolute inset-0 block overflow-hidden rounded-[18px] shadow-[0_6px_18px_-6px_rgb(11_42_91/0.45)] [backface-visibility:hidden] [transform:rotateY(180deg)] motion-reduce:[transform:none] ${
            flipped ? "" : "motion-reduce:invisible"
          }`}
        >
          {back}
        </span>
      </span>
      <span className="sr-only">{flipHint(flipped)}</span>
    </button>
  );
}

function CardTop({ team, dark }: { team: string; dark: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2 px-3 pt-2.5">
      <img src={publicTeamCrest()} alt="" width={55} height={72} className="h-6 w-auto shrink-0 object-contain" />
      <span
        className={`min-w-0 truncate text-[9.5px] font-bold uppercase tracking-[0.08em] ${dark ? "text-[#ffd600]" : "text-[#0b2a5b]"}`}
      >
        {team}
      </span>
    </span>
  );
}

function FlipIcon({ light }: { light: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full ${light ? "bg-[#e3eefb] text-[#0b2a5b]" : "bg-white/15 text-white"}`}
    >
      <RotateCw className="size-3.5" />
    </span>
  );
}

function PlayerFront({ card, team }: { card: PlayerCard; team: string }) {
  return (
    <span className="relative flex size-full flex-col bg-[#0b2a5b] text-white">
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,#1556c4_0_10px,transparent_10px_26px)]"
      />
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[#ffd600]" />
      <span className="relative">
        <CardTop team={team} dark />
      </span>
      <span className="relative grid flex-1 place-items-center">
        <span className="grid justify-items-center">
          <span
            className="font-uv text-[clamp(84px,24vw,120px)] uppercase leading-[0.85] text-[#ffd600] [paint-order:stroke] [-webkit-text-stroke:3px_#0b2a5b] [text-shadow:0_4px_0_rgb(0_0_0/0.25)]"
            aria-hidden="true"
          >
            {card.code}
          </span>
          <span className="mt-1 rounded-full bg-[#0b2a5b]/80 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#cfe0ff]">
            {card.roleLabel}
          </span>
        </span>
      </span>
      <span className="relative block bg-white py-2.5 pl-3 pr-10 text-[#0b2a5b]">
        <span className="line-clamp-2 block font-uv text-[19px] uppercase leading-[1] sm:text-[20px]">{card.name}</span>
        <FlipIcon light />
      </span>
    </span>
  );
}

function PlayerBack({ card, team }: { card: PlayerCard; team: string }) {
  return (
    <span className="relative flex size-full flex-col bg-[#1556c4] text-white">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[#ffd600]" />
      <span className="flex items-center gap-2 px-3.5 pt-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ffd600] font-uv text-[22px] leading-none text-[#0b2a5b]">
          {card.code}
        </span>
        <span className="min-w-0 text-[12px] font-bold uppercase tracking-[0.1em]">{card.roleLabel}</span>
      </span>
      <span className="mt-2.5 block px-3.5 text-[13px] leading-[1.35] text-white/95">{card.description}</span>
      <span className="flex-1" />
      <span className="mx-3.5 block border-t border-white/25 pt-2 text-[12px] leading-snug">
        <span className="block text-white/75">Squadra</span>
        <span className="block font-bold">{team}</span>
      </span>
      <span className="mx-3.5 mb-3 mt-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#ffd600] px-2 py-0.5 text-[11px] font-bold text-[#0b1e3a]">In rosa {CARDS_SEASON}</span>
      </span>
      <span className="block truncate bg-[#0b2a5b] px-3.5 py-2 font-uv text-[15px] uppercase leading-none">{card.name}</span>
    </span>
  );
}

function StaffFront({ card, team }: { card: StaffCard; team: string }) {
  return (
    <span className="relative flex size-full flex-col bg-[#ffd600] text-[#0b2a5b]">
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-20 [background:repeating-linear-gradient(135deg,#0b2a5b_0_2px,transparent_2px_14px)]"
      />
      <span className="relative">
        <CardTop team={team} dark={false} />
      </span>
      <span className="relative grid flex-1 place-items-center">
        <span className="grid justify-items-center">
          <span aria-hidden="true" className="font-uv text-[clamp(44px,13vw,62px)] uppercase leading-[0.9] text-[#0b2a5b]">
            {card.code}
          </span>
          <span className="mt-1.5 rounded-full bg-[#0b2a5b] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#ffd600]">
            {card.group}
          </span>
        </span>
      </span>
      <span className="relative block py-2.5 pl-3 pr-10 text-white" style={{ background: NAVY }}>
        <span className="line-clamp-2 block font-uv text-[19px] uppercase leading-[1] sm:text-[20px]">{card.name}</span>
        <FlipIcon light={false} />
      </span>
    </span>
  );
}

function StaffBack({ card, team }: { card: StaffCard; team: string }) {
  return (
    <span className="relative flex size-full flex-col bg-[#0b2a5b] text-white">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[#ffd600]" />
      <span className="px-3.5 pt-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#ffd600]">{card.group}</span>
      <span className="mt-1.5 block px-3.5 font-uv text-[20px] uppercase leading-[1.02]">{card.role}</span>
      <span className="flex-1" />
      <span className="mx-3.5 block border-t border-white/25 pt-2 text-[12px] leading-snug">
        <span className="block text-white/75">Squadra</span>
        <span className="block font-bold">{team}</span>
      </span>
      <span className="mx-3.5 mb-3 mt-2 block">
        <span className="rounded-full bg-[#ffd600] px-2 py-0.5 text-[11px] font-bold text-[#0b1e3a]">Staff {CARDS_SEASON}</span>
      </span>
      <span className="block truncate bg-[#1556c4] px-3.5 py-2 font-uv text-[15px] uppercase leading-none">{card.name}</span>
    </span>
  );
}

function CountTile({ count, base, team }: { count: number; base: boolean; team: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[18px] bg-[#0b2a5b] p-4 text-white shadow-[0_6px_18px_-6px_rgb(11_42_91/0.45)] sm:max-w-[560px]" data-testid="carte-count">
      <span className="grid min-w-[84px] place-items-center rounded-[14px] bg-[#ffd600] px-3 py-2 font-uv text-[48px] leading-none text-[#0b2a5b]">
        {count > 0 ? count : "–"}
      </span>
      <span className="min-w-0">
        <span className="block font-uv text-[20px] uppercase leading-none">{rosterCountLabel(count, base)}</span>
        <span className="mt-1.5 block text-[13.5px] leading-snug text-white/85">
          {base
            ? `${team}: nell'attività di base i bambini giocano per imparare, niente nomi né carte. Qui trovi lo staff che li segue.`
            : `La rosa di ${team} non è nelle liste pubbliche: qui trovi lo staff.`}
        </span>
      </span>
    </div>
  );
}

function EmptyState({
  title,
  children,
  icon,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  icon?: "lock";
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-[18px] bg-white text-[#22385c] shadow-[0_2px_10px_rgb(11_42_91/0.08)] ${compact ? "p-3.5" : "mt-4 p-5"}`}
    >
      {icon === "lock" && (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ffd600] text-[#0b1e3a]">
          <Lock className="size-4" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-[#0b2a5b]">{title}</span>
        <span className="mt-0.5 block text-[14px] leading-snug">{children}</span>
      </span>
    </div>
  );
}
