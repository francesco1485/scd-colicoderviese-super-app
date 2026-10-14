import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { useRomeNow } from "@/components/scd/interior-ui";
import { SNAPSHOT_BANNER } from "@/lib/public-snapshots";
import { EMPTY_MESSAGE, fieldMatches, findSessions, type TrainingSlot } from "@/lib/public-snapshots";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { defaultDay, isFree, minutesOf, pitchZones, slotStates, weekdayKey, type PitchZone, type SlotState } from "@/lib/training-view";
import { peopleOnPitch, type StaffPerson } from "@/lib/staff-roster";
import { getStaffEmails, getStaffRoster } from "@/lib/staff-roster.functions";
import { getSession } from "@/lib/auth.functions";
import { getMyTrainingKids } from "@/lib/roster.functions";
import { PeoplePins } from "@/components/scd/PeoplePins";
import planimetria from "@/assets/scd/planimetria_colico.webp.asset.json";
import { VanPlan2D } from "@/components/scd/VanPlan2D";
import { getPulminiVans } from "@/lib/pulmini-vans.functions";
import { getTransportBoard } from "@/lib/transport.functions";
import { fleetFromBoard } from "@/lib/van-plan";

/*
 * Training board, members only (UD-100, Direzione 13/10/2026: "Le squadre sono dentro non fuori"). The loader asks
 * the server for the session first: anonymous visitors are sent to sign in and come back here (same annata).
 * The page is private and no-store (src/lib/http-policy.ts MEMBERS_ONLY_PREFIXES) and out of robots/sitemap.
 * Annata crests stay internal anyway; the group name is written as text.
 */

export const Route = createFileRoute("/allenamenti")({
  validateSearch: (s: Record<string, unknown>): { annata?: string | undefined } => {
    const v = s["annata"];
    return typeof v === "string" || typeof v === "number" ? { annata: String(v).slice(0, 40) } : {};
  },
  loader: async ({ location }) => {
    const session = await getSession();
    if (!session.user) throw redirect({ to: "/accedi", search: { next: location.href } });
    // Vans in 2D: getPulminiVans answers only to the Pulmini work area (staff); everyone else gets null and nothing.
    const [roster, emails, training, vans, family] = await Promise.all([getStaffRoster(), getStaffEmails(), getTrainingQuadro(), getPulminiVans(), getMyTrainingKids()]);
    const transport = vans ? await getTransportBoard() : null;
    return { ...training.quadro, people: roster.people, emails, vans, board: transport?.board ?? null, kids: family.kids };
  },
  head: () => ({
    meta: [
      { title: "Allenamenti lun-ven — S.C.D. ColicoDerviese" },
      { name: "description", content: "Area soci: allenamenti SCD dal lunedì al venerdì al centro sportivo di Colico." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Allenamenti,
});

const ROOMS = ["SP1", "SP2", "SP3", "SP4"] as const;
const SHORT: Record<string, string> = { "LUNEDÌ": "Lun", "MARTEDÌ": "Mar", "MERCOLEDÌ": "Mer", "GIOVEDÌ": "Gio", "VENERDÌ": "Ven" };
const nice = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

function Allenamenti() {
  const { days, slots, rotations, note, people, emails, vans, board, kids } = Route.useLoaderData();
  const fleet = useMemo(() => fleetFromBoard(board), [board]);
  const now = useRomeNow();
  const [day, setDay] = useState(days[0] ?? "");
  const chosen = useRef(false);
  const [week, setWeek] = useState<"A" | "B">("A");
  // Clock-dependent UI ("oggi", in corso) only after hydration, so server and client HTML match.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = search.annata ?? "";
  const setQ = (v: string) => navigate({ search: v.trim() ? { annata: v } : {}, replace: true, resetScroll: false });
  const query = q.trim();
  // One child in the family and no search yet: open straight on that child's week (one tap less for parents).
  const autoKid = useRef(false);
  useEffect(() => {
    const only = kids.length === 1 ? kids[0]!.key : null;
    if (autoKid.current || search.annata !== undefined || !only) return;
    autoKid.current = true;
    navigate({ search: { annata: only }, replace: true, resetScroll: false });
  }, [kids, search.annata, navigate]);

  // Open on today's training day (Rome time) unless the visitor already picked one.
  useEffect(() => {
    if (hydrated && !chosen.current) setDay(defaultDay(days, now.date));
  }, [days, now.date, hydrated]);
  const pick = (d: string) => {
    chosen.current = true;
    setDay(d);
  };
  const todayKey = hydrated ? weekdayKey(now.date) : null;
  const isToday = todayKey !== null && day === todayKey;

  const daySlots = useMemo(
    () => slots.filter((s) => s.day === day && (!query || fieldMatches(s.fields.C1, query) || fieldMatches(s.fields.C2, query))).sort((a, b) => a.start - b.start),
    [slots, day, query],
  );
  const states = slotStates(daySlots, isToday, hydrated ? minutesOf(now.time) : Number.NaN);
  const sessions = query ? findSessions(slots, query) : [];

  return (
    <main className="uv-page min-h-dvh pb-12 text-white" data-screen="allenamenti">
      <header className="mx-auto max-w-[1200px] px-4 pt-3 lg:px-6 lg:pt-6" data-testid="allenamenti-header">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <h1 className="font-uv text-[32px] uppercase leading-[0.9] lg:text-[64px]">Allenamenti</h1>
          <p className="text-[13px] font-bold text-[var(--uv-gold)] lg:text-[14px]">Centro sportivo Colico · lun–ven</p>
        </div>
        <p className="mt-1.5 hidden max-w-[60ch] text-[15px] leading-[1.4] text-[#cfe0ff] lg:block">Chi si allena, su quale campo e in che spogliatoio. Tocca un giorno o cerca la tua annata.</p>
        <p role="note" className="mt-2 inline-block rounded-full bg-[#fff3c4] px-2.5 py-[3px] text-[11.5px] font-bold text-[#7a5200]">
          {SNAPSHOT_BANNER}
        </p>
      </header>

      <div className="sticky top-0 z-30 mt-2 bg-[var(--uv-night)]/95 px-4 py-3 backdrop-blur lg:top-[var(--pub-header-h)] lg:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2">
          <div className="grid w-full grid-cols-5 gap-1.5 sm:flex sm:w-auto" role="group" aria-label="Giorno">
            {days.map((d) => {
              const on = day === d;
              const today = d === todayKey;
              return (
                <button
                  key={d}
                  onClick={() => pick(d)}
                  aria-pressed={on}
                  aria-label={`${nice(d)}${today ? ", oggi" : ""}`}
                  className={`relative h-[46px] rounded-[12px] px-3 font-uv text-[19px] uppercase tracking-[0.04em] sm:min-w-[64px] ${on ? "bg-[var(--uv-gold)] text-[var(--uv-night)] shadow-[0_3px_0_#b38f00]" : "bg-white/10 text-white"}`}
                >
                  {SHORT[d] ?? d.slice(0, 3)}
                  {today && (
                    <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[10px] font-extrabold normal-case tracking-normal ${on ? "bg-[var(--uv-night)] text-[var(--uv-gold)]" : "bg-[var(--uv-gold)] text-[var(--uv-night)]"}`}>
                      oggi
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <label className="relative flex min-w-0 flex-1 items-center sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 size-4 text-[#9db6dc]" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca annata (es. 2015, U15)"
              aria-label="Cerca annata"
              className="h-[46px] w-full min-w-0 rounded-[12px] border border-white/15 bg-white/10 pl-9 pr-10 text-[15px] text-white placeholder:text-[#9db6dc] focus:outline-none focus:ring-2 focus:ring-[var(--uv-gold)]"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Cancella ricerca" className="absolute right-1 grid size-10 place-items-center rounded-full text-[#cfe0ff]">
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      {kids.length > 0 && (
        <nav aria-label="I tuoi ragazzi" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 px-4 pt-4 lg:px-6" data-testid="allenamenti-kids">
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--uv-gold)]">I tuoi ragazzi</span>
          {kids.map((k) =>
            k.key ? (
              <button
                key={`${k.firstName}-${k.key}`}
                type="button"
                onClick={() => setQ(query === k.key ? "" : (k.key ?? ""))}
                aria-pressed={query === k.key}
                className={`h-[40px] rounded-full px-4 text-[14.5px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--uv-gold)] ${query === k.key ? "bg-[var(--uv-gold)] text-[var(--uv-night)]" : "bg-white/10 text-white"}`}
              >
                {k.firstName} · {k.key}
              </button>
            ) : (
              <span key={`${k.firstName}-none`} className="rounded-full border border-white/20 px-4 py-2 text-[14px] text-[#cfe0ff]">
                {k.firstName}: la sua annata non è scritta nel quadro, chiedi al mister
              </span>
            ),
          )}
        </nav>
      )}

      {query && (
        <section aria-label="Settimana dell'annata" className="mx-auto max-w-[1200px] px-4 pt-5 lg:px-6">
          <h2 className="font-uv text-[26px] uppercase leading-none">La settimana di “{query}”</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
            {days.map((d) => {
              const list = sessions.filter((x) => x.day === d).sort((a, b) => a.start - b.start);
              return (
                <button key={d} onClick={() => pick(d)} className={`rounded-[14px] p-3 text-left ${day === d ? "bg-white text-[var(--scd-ink)]" : "bg-white/10"}`}>
                  <p className="font-uv text-[17px] uppercase">{nice(d)}</p>
                  {list.length === 0 ? (
                    <p className="mt-1 text-[13.5px] opacity-75">Nessun allenamento</p>
                  ) : (
                    list.map((x) => (
                      <div key={x.timeLabel + x.field} className="mt-1.5 flex items-center gap-2">
                        <span className="text-[14px]">
                          <b>{x.timeLabel}</b> · Campo {x.field.slice(1)}
                        </span>
                      </div>
                    ))
                  )}
                </button>
              );
            })}
          </div>
          {sessions.length === 0 && <p className="mt-2 text-[14px] text-[#cfe0ff]">Nessuna annata o categoria corrispondente nel quadro.</p>}
        </section>
      )}

      <section className="mx-auto grid max-w-[1200px] gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-uv text-[30px] uppercase leading-none">
              {nice(day)}
              {isToday && <span className="ml-2 align-middle text-[15px] font-bold normal-case text-[var(--uv-gold)] [font-family:inherit]">oggi</span>}
            </h2>
            <div className="flex rounded-[10px] bg-white/10 p-1" role="group" aria-label="Settimana delle zone">
              {(["A", "B"] as const).map((w) => (
                <button key={w} onClick={() => setWeek(w)} aria-pressed={week === w} className={`h-9 rounded-[8px] px-3 text-[13.5px] font-bold ${week === w ? "bg-white text-[var(--uv-night)]" : "text-[#cfe0ff]"}`}>
                  Settimana {w}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-[13px] text-[#a9bfe3]">Le zone cambiano tra settimana A e B: la data d'inizio della settimana A non è ancora verificata.</p>

          {slots.length === 0 ? (
            <p className="mt-4 text-[#cfe0ff]">{EMPTY_MESSAGE}</p>
          ) : daySlots.length === 0 ? (
            <p className="mt-4 text-[#cfe0ff]">Nessuna fascia per questa ricerca.</p>
          ) : (
            <ol className="m-0 mt-4 grid list-none gap-4 p-0">
              {daySlots.map((s, i) => (
                <SlotCard key={s.timeLabel + s.start} slot={s} state={states[i] ?? "later"} zones1={pitchZones(rotations, day, week, s.start, "C1")} zones2={pitchZones(rotations, day, week, s.start, "C2")} people={peopleOnPitch(people, [s.fields.C1, s.fields.C2])} emails={emails} />
              ))}
            </ol>
          )}

          {vans && (
            <section className="mt-6 overflow-hidden rounded-[18px] bg-white p-4 text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]" aria-labelledby="all-pulmini" data-testid="allenamenti-pulmini">
              <h2 id="all-pulmini" className="font-uv text-[26px] uppercase leading-none text-[var(--in-ink)]">Pulmini di {nice(day)}</h2>
              <p className="mb-3 mt-1 text-[14px] leading-snug text-[var(--in-sub)]">Riservato al personale dei trasporti. Chi siede dove e, nel giro, chi sale e chi scende a ogni fermata.</p>
              <VanPlan2D plan={vans} fleet={fleet} day={day} today={now.date} />
              <Link to="/pulmini" hash="pul-pianta" className="mt-3 inline-flex min-h-[44px] items-center text-[14.5px] font-bold text-[var(--in-info)] underline">
                Apri l'area Pulmini
              </Link>
            </section>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <figure className="m-0 overflow-hidden rounded-[18px] bg-white text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]">
            <img src={planimetria.url} alt="Planimetria fotografica del centro sportivo di Colico" loading="lazy" className="w-full" />
            <figcaption className="p-4">
              <b className="font-uv text-[22px] uppercase leading-none">Il centro di Colico</b>
              <p className="mt-1 text-[13.5px] text-[var(--scd-sub)]">
                Foto di riferimento: Campo 1 è il campo grande, Campo 2 quello piccolo, SP1–SP4 sono gli spogliatoi. {note || "Confini delle zone non certificati sulla planimetria."}
              </p>
              <Link to="/impianti" className="mt-3 inline-flex min-h-[44px] items-center rounded-[12px] bg-[var(--uv-royal)] px-4 font-uv text-[17px] uppercase tracking-[0.04em] text-white">
                Mappa dei campi
              </Link>
            </figcaption>
          </figure>
          <div className="rounded-[18px] bg-white/10 p-4">
            <b className="font-uv text-[20px] uppercase">Legenda</b>
            <ul className="m-0 mt-2 grid list-none gap-2 p-0 text-[14px] text-[#dbe7ff]">
              <li className="flex items-center gap-2">
                <span className="rounded-full bg-[#22c55e] px-2 text-[12px] font-extrabold text-[#052e16]">IN CORSO</span> la fascia di adesso
              </li>
              <li className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--uv-gold)] px-2 text-[12px] font-extrabold text-[var(--uv-night)]">PROSSIMA</span> la prossima di oggi
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-4 w-6 rounded-[4px] border border-dashed border-white/60" /> zona, campo o spogliatoio libero
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block size-4 rounded-full bg-[#eef4ff] ring-2 ring-[#0457af]" /> omino: dirigente o mister presente; toccalo per i riferimenti
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

const STATE_CHIP: Record<SlotState, { text: string; cls: string } | null> = {
  live: { text: "In corso", cls: "bg-[#22c55e] text-[#052e16]" },
  next: { text: "Prossima", cls: "bg-[var(--uv-gold)] text-[var(--uv-night)]" },
  done: { text: "Finita", cls: "bg-white/15 text-[#cfe0ff]" },
  later: null,
};

function SlotCard({ slot, state, zones1, zones2, people, emails }: { slot: TrainingSlot; state: SlotState; zones1: PitchZone[] | null; zones2: PitchZone[] | null; people: StaffPerson[]; emails: Record<string, string> }) {
  const [from, to] = slot.timeLabel.split(/[–-]/);
  const chip = STATE_CHIP[state];
  return (
    <li
      className={`overflow-hidden rounded-[18px] bg-white text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)] ${state === "live" ? "ring-4 ring-[#22c55e]" : state === "next" ? "ring-4 ring-[var(--uv-gold)]" : ""} ${state === "done" ? "opacity-70" : ""}`}
      data-state={state}
    >
      <div className="flex items-center gap-3 bg-[var(--uv-night)] px-4 py-2.5 text-white">
        <span className="font-uv text-[28px] leading-none tabular-nums">{from}</span>
        <span className="text-[14px] text-[#9db6dc]">fino alle {to}</span>
        {chip && <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[12px] font-extrabold uppercase ${chip.cls}`}>{chip.text}</span>}
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-[3fr_2fr]">
        <Pitch name="Campo 1" text={slot.fields.C1} zones={zones1} />
        <Pitch name="Campo 2" text={slot.fields.C2} zones={zones2} small />
      </div>
      {people.length > 0 && (
        <div className="border-t border-[var(--scd-line)] px-3 pb-3">
          <PeoplePins people={people} emails={emails} label="Dirigenti e mister in campo" />
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5 border-t border-[var(--scd-line)] bg-[#f5f9ff] p-3" aria-label="Spogliatoi">
        {ROOMS.map((r) => {
          const who = slot.rooms[r];
          const free = isFree(who);
          return (
            <div key={r} className={`flex min-w-0 flex-col items-center gap-1 rounded-[10px] px-1 py-1.5 text-center ${free ? "border border-dashed border-[#b9cfe6]" : "bg-white shadow-[0_2px_6px_rgb(0_20_60/0.08)]"}`}>
              <span className="text-[11px] font-extrabold text-[var(--scd-sub)]">{r}</span>
              <span className="w-full break-words text-[11.5px] font-semibold leading-tight">{free ? "libero" : who}</span>
            </div>
          );
        })}
      </div>
    </li>
  );
}

/** Pitch seen from above: green stripes, white lines; zones split it in halves or thirds. */
function Pitch({ name, text, zones, small = false }: { name: string; text: string; zones: PitchZone[] | null; small?: boolean }) {
  const free = isFree(text) && !(zones ?? []).some((z) => z.label);
  return (
    <figure className="m-0 min-w-0">
      <figcaption className="mb-1 flex items-center justify-between text-[12px] font-extrabold uppercase tracking-[0.06em] text-[var(--scd-sub)]">
        <span>{name}</span>
        {zones && <span className="font-semibold normal-case tracking-normal">{zones.length} zone</span>}
      </figcaption>
      <div
        className={`relative grid overflow-hidden rounded-[12px] border-[3px] border-white shadow-[0_0_0_1px_#cfe0d2] ${small ? "min-h-[118px]" : "min-h-[132px]"} ${free ? "bg-[#dfe7df]" : ""}`}
        style={free ? undefined : { background: "repeating-linear-gradient(90deg,#2f9e4f 0 24px,#38ad59 24px 48px)" }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/60" />
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[44px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
        {zones ? (
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${zones.length}, minmax(0,1fr))` }}>
            {zones.map((z, i) => (
              <div key={z.key} className={`flex min-w-0 flex-col items-center justify-center gap-1 p-1.5 text-center ${i > 0 ? "border-l-2 border-dashed border-white/80" : ""}`}>
                <span className="rounded-full bg-white/85 px-1.5 text-[10.5px] font-extrabold text-[#14532d]">{z.key}</span>
                {z.label ? (
                  <>
                    <span className="w-full break-words rounded-[6px] bg-white/90 px-1 py-0.5 text-[11.5px] font-bold leading-tight">{z.label}</span>
                  </>
                ) : (
                  <span className="text-[11.5px] font-bold text-white/90">libera</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            {free ? (
              <span className="text-[14px] font-bold text-[#3f5d4a]">Nessun allenamento</span>
            ) : (
              <>
                <span className="max-w-full whitespace-pre-line break-words rounded-[8px] bg-white/90 px-2 py-1 text-[13.5px] font-bold leading-tight">{text}</span>
              </>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
