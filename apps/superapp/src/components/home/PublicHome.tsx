/**
 * Signed-out public home on board VR-009 (UD-133, then UD-134 Francesco 15/10/2026 09:18).
 *
 * Order: urgent notices (R20 alerts, only when there are) → the one club communication chosen by the Direzione →
 * HomeBoard (lake hero, tiles, the club's most important next game with its countdown, trainings and the event of the
 * day) → "Mondo Colico" vetrina → all the games of the week (HomeMatchday) → weekend results (only with a real source;
 * "Vittoria" and confetti only on a ColicoDerviese win) → footer ("Chi sei?" removed, UD-152). Partners scroll in the fixed SponsorBand on every
 * page; the LED spot, the partner of the month and partner news live on /sponsor (PartnerBand). No stories.
 * Palette: navy #0b2a5b, blue #1556c4, light #eef3f9, white; yellow #ffd600 for changes and the main CTA.
 * Real assets only (public/media); no minor is named.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { KitTexture } from "@/components/scd/kit-texture";
import type { ClubNotice } from "@/lib/club-notice";
import type { PublicFeed } from "@/lib/club.types";
import { weekendResults } from "@/lib/home-results";
import { urgentNotices } from "@/lib/home-today";
import {
  PUBLIC_WORLDS,
  WORLD_HINT,
  WORLD_LABEL,
  WORLD_STORAGE_KEY,
  isVetrinaWorld,
  type VetrinaSlot,
  type VetrinaWorld,
} from "@/lib/vetrina";

import { HomeBoard } from "@/components/home/HomeBoard";
import { HomeMatchday } from "@/components/home/HomeMatchday";
import {
  ClubNoticeCard,
  UrgentNotices,
  WeekendResults,
} from "@/components/home/HomePractical";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";

type PublicCalendar = Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;

const WRAP = "mx-auto w-full max-w-[1200px] px-4 lg:px-8";

/* ------------------------------------------------------------- vetrina */

/** Visual of a vetrina slot: real poster/flyer/board, a small cast portrait, or an original typographic panel. */
function SlotVisual({ slot, compact = false }: { slot: VetrinaSlot; compact?: boolean }) {
  const v = slot.visual;
  if (v.kind === "portrait")
    return (
      <span className="relative flex size-full items-center justify-center overflow-hidden bg-[radial-gradient(120%_120%_at_85%_15%,#1556c4_0%,#0b2a5b_62%)]">
        <KitTexture motif="mountains-lake" overlay />
        <img
          src={v.src}
          alt={v.alt}
          width={112}
          height={112}
          loading="lazy"
          decoding="async"
          className={`relative rounded-full bg-white object-cover shadow-[0_8px_22px_-8px_rgb(0_0_0/0.55)] ring-4 ring-white/90 ${compact ? "size-[72px]" : "size-[96px] lg:size-[112px]"}`}
        />
      </span>
    );
  if (v.kind === "type")
    return (
      <span className="relative block size-full overflow-hidden bg-[radial-gradient(120%_120%_at_90%_10%,#1556c4_0%,#0b2a5b_58%)]">
        <span
          aria-hidden="true"
          className={`absolute font-uv leading-none text-[#ffd600] ${compact ? `-bottom-2 right-2 ${v.big.length > 3 ? "text-[44px]" : "text-[60px]"}` : `-bottom-5 right-3 ${v.big.length > 3 ? "text-[96px]" : "text-[130px]"}`}`}
        >
          {v.big}
        </span>
        <span className={`absolute font-uv uppercase leading-[0.95] text-white ${compact ? "left-2.5 top-2.5 max-w-[85%] text-[15px]" : "left-4 top-4 max-w-[62%] text-[21px]"}`}>
          {v.small}
        </span>
      </span>
    );
  return (
    <img
      src={v.src}
      alt={v.alt}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: v.position }}
      className={`size-full ${v.fit === "contain" ? "bg-white object-contain p-2" : "object-cover"}`}
    />
  );
}

function SlotCard({ slot }: { slot: VetrinaSlot }) {
  const members = slot.audience === "members";
  return (
    <Link
      to={slot.href as never}
      {...(slot.hash ? { hash: slot.hash } : {})}
      {...(slot.search ? { search: slot.search as never } : {})}
      className="scd-focus scd-lift group flex h-full w-full flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] hover:shadow-[0_1px_2px_rgb(11_42_91/0.08),0_14px_30px_-12px_rgb(11_42_91/0.35)]"
      data-slot={slot.id}
      data-kind={slot.kind}
      data-audience={slot.audience}
    >
      <span className="relative block aspect-[274/160] w-full overflow-hidden border-b border-[#e6edf6]">
        <span className="scd-zoom block size-full">
          <SlotVisual slot={slot} />
        </span>
        {slot.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-[#ffd600] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
            {slot.badge}
          </span>
        )}
        {members && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b2a5b] shadow-sm">
            <Lock className="size-3" aria-hidden="true" />
            Per i tesserati
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">
          {slot.kicker}
        </span>
        <span className="text-[18px] font-bold leading-tight text-[#0b1e3a]">
          {slot.title}
        </span>
        <span className="text-[14px] leading-snug text-[#4a5d7a]">
          {slot.text}
        </span>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[14px] font-semibold text-[#1556c4]">
          {slot.cta}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </span>
    </Link>
  );
}

/**
 * "In evidenza" row card of the public home (reference template, Francesco 15/10/2026 10:05): picture on the left,
 * title, one line and a real button on the right, all cards the same height.
 */
function SlotRow({ slot }: { slot: VetrinaSlot }) {
  const members = slot.audience === "members";
  return (
    <Link
      to={slot.href as never}
      {...(slot.hash ? { hash: slot.hash } : {})}
      {...(slot.search ? { search: slot.search as never } : {})}
      className="scd-focus group grid h-full w-full grid-cols-[minmax(0,40%)_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-[#dbe4f0] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06)] transition-shadow duration-150 hover:shadow-[0_10px_24px_-12px_rgb(11_42_91/0.35)]"
      data-slot={slot.id}
      data-kind={slot.kind}
      data-audience={slot.audience}
    >
      <span className="relative block min-h-[150px] overflow-hidden">
        <SlotVisual slot={slot} compact />
        {slot.badge && (
          <span className="absolute left-2 top-2 rounded-[5px] bg-[#ffd600] px-1.5 py-[3px] text-[10px] font-extrabold uppercase leading-none tracking-[0.05em] text-[#0b1e3a]">
            {slot.badge}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-1 p-3.5">
        <span className="text-[16.5px] font-bold leading-tight text-[#0b1e3a]">
          {slot.title}
        </span>
        <span className="line-clamp-2 text-[13px] leading-snug text-[#4a5d7a]">
          {members ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[#0b2a5b]">
              <Lock className="size-3" aria-hidden="true" />
              Per i tesserati ·{" "}
            </span>
          ) : null}
          {slot.text}
        </span>
        <span className="mt-auto inline-flex h-10 w-fit items-center rounded-[9px] bg-[#1556c4] px-4 text-[14px] font-bold text-white transition-[filter] duration-150 group-hover:brightness-110">
          {slot.cta}
        </span>
      </span>
    </Link>
  );
}

function readWorld(): VetrinaWorld {
  try {
    const v = window.localStorage.getItem(WORLD_STORAGE_KEY);
    return isVetrinaWorld(v) && v !== "soci" ? v : "tutti";
  } catch {
    return "tutti";
  }
}

function saveWorld(w: VetrinaWorld) {
  try {
    window.localStorage.setItem(WORLD_STORAGE_KEY, w);
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

/** "Il tuo mondo": the visitor picks a world (no age, no profile, no tracking; stored on this device only). */
function WorldChips({
  value,
  onChange,
}: {
  value: VetrinaWorld;
  onChange: (w: VetrinaWorld) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 pb-3 sm:flex-row sm:items-center sm:gap-3">
      <span
        id="mondo-l"
        className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#5a6b85]"
      >
        Il tuo mondo
      </span>
      <div
        role="radiogroup"
        aria-labelledby="mondo-l"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        data-testid="world-chips"
      >
        {PUBLIC_WORLDS.map((w) => {
          const on = w === value;
          return (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={on}
              title={WORLD_HINT[w]}
              onClick={() => onChange(w)}
              data-world={w}
              className={`scd-focus inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[14px] font-semibold transition-colors duration-150 ${on ? "border-[#0b2a5b] bg-[#0b2a5b] text-white" : "border-[#c9d7ea] bg-white text-[#0b2a5b] hover:border-[#1556c4]"}`}
            >
              {WORLD_LABEL[w]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * La vetrina (UD-110) with its palinsesto: one rotating showcase right after the games of the week. The picks of the
 * day for every world come from the server (getVetrina, Rome day); the visitor's world is chosen with the chips
 * (public home) or fixed (member home: "soci"). Phones swipe a single row, desktop sees every slot in a grid.
 */
export function Vetrina({
  worlds,
  fixedWorld,
  embedded = false,
  rows = false,
}: {
  worlds: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** Member home: the world comes from the session, no chips. */
  fixedWorld?: VetrinaWorld;
  /** Inside another layout column (member home): no page gutter. */
  embedded?: boolean;
  /** Public home: "In evidenza", horizontal row cards, no world chips (reference template, 15/10/2026 10:05). */
  rows?: boolean;
}) {
  const [world, setWorld] = useState<VetrinaWorld>(fixedWorld ?? "tutti");
  useEffect(() => {
    if (!fixedWorld) setWorld(readWorld());
  }, [fixedWorld]);
  const choose = (w: VetrinaWorld) => {
    setWorld(w);
    saveWorld(w);
  };
  const slots = worlds[world] ?? [];
  const any = Object.values(worlds).some((l) => l.length > 0);
  if (!any) return null;
  return (
    <section
      aria-labelledby="vetrina-t"
      className={embedded ? "min-w-0" : `${WRAP} pt-6 lg:pt-10`}
      data-testid="vetrina"
      data-world={world}
    >
      <div className="flex items-end justify-between gap-3 pb-3">
        <div className="grid gap-1">
          {!rows && (
            <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#1556c4]">
              Oggi nel club · cambia ogni giorno
            </span>
          )}
          <h2
            id="vetrina-t"
            className="m-0 text-[20px] font-extrabold leading-tight text-[#0b1e3a] lg:text-[24px]"
          >
            {fixedWorld ? "In vetrina" : rows ? "In evidenza" : "Mondo Colico"}
          </h2>
        </div>
        <Link
          to="/eventi"
          className="scd-focus inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          Tutti gli eventi
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {!fixedWorld && !rows && <WorldChips value={world} onChange={choose} />}
      <ul
        className={`-mx-4 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden ${embedded ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
        data-variant={rows ? "rows" : "cards"}
        aria-label={`Contenuti in vetrina oggi: ${WORLD_LABEL[world]}`}
        aria-live="polite"
      >
        {slots.map((s) => (
          <li
            key={s.id}
            className={`flex shrink-0 snap-start lg:basis-auto ${rows ? "basis-[88%] sm:basis-[calc((100%-12px)/2)]" : "basis-[80%] sm:basis-[calc((100%-12px)/2)]"}`}
          >
            {rows ? <SlotRow slot={s} /> : <SlotCard slot={s} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- page */

export function PublicHome({
  calendar,
  feed = null,
  notice = null,
  vetrina,
  nowMs,
  today,
}: {
  calendar: PublicCalendar;
  /** Vetrina picks of the day (getVetrina): "Mondo Colico" of the board (VR-009), back on the home since 15/10. */
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** R20 public feed (alerts and weekend results); null when R20 did not answer in time. */
  feed?: PublicFeed | null;
  /** The one club communication of the day (getClubNotice), or null. */
  notice?: ClubNotice | null;
  nowMs: number;
  today: string;
}) {
  const alerts = useMemo(
    () => urgentNotices(feed?.items ?? [], nowMs, false),
    [feed, nowMs],
  );
  const results = useMemo(() => weekendResults(feed, today), [feed, today]);
  // Board order (VR-009 screen 1) made logical (Francesco 15/10/2026 07:04 "fuori ogni logica"): every block once.
  // urgent → communication → hero, tiles, the club's most important next game with its countdown, trainings + event
  // → "Mondo Colico" vetrina → all the games of the week → results (only with a source, confetti only on a win) →
  // footer. No stories and no partner band since UD-134 (15/10 09:18): partners scroll in the fixed sponsor bar, the
  // LED spot and partner news live on /sponsor. The join banner and
  // the second credential strip are gone: "Entra" is in the header and in the bottom bar, the credentials in the footer.
  return (
    <main
      data-screen="home"
      data-variant="public"
      className="min-h-dvh bg-[#eef3f9] pb-6 font-sans text-[#0b1e3a]"
    >
      <h1 className="sr-only">
        S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio
      </h1>
      <UrgentNotices items={alerts} />
      <ClubNoticeCard notice={notice} />
      <HomeBoard calendar={calendar} nowMs={nowMs} today={today} />
      {vetrina && <Vetrina worlds={vetrina} rows />}
      <div
        className={`${WRAP} pt-5 lg:pt-8`}
        data-testid="home-matchday-layout"
      >
        <HomeMatchday calendar={calendar} nowMs={nowMs} today={today} limit={4} />
      </div>
      <WeekendResults rows={results} />
    </main>
  );
}
