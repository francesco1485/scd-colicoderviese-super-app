import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueCase } from "@/lib/board-data";
import { sponsorLabel } from "@/lib/sponsors";
import { isUnseen, parseSeen, type Story, type StorySlide } from "@/lib/stories";
import { countdown, startMs } from "@/lib/universe";

const SEEN_KEY = "scd-stories-seen";
const SLIDE_MS = 6000;

const dayLong = (d: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00Z`));
const dayShort = (d: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));

function readSeen(): Record<string, string> {
  try {
    return parseSeen(localStorage.getItem(SEEN_KEY));
  } catch {
    return {};
  }
}
function writeSeen(v: Record<string, string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(v));
  } catch {
    /* storage bloccato: vale per questa visita */
  }
}

function Avatar({ story, size }: { story: Story; size: number }) {
  if (story.kind === "club") return <ClubCrestOfficial size={Math.round(size * 0.78)} />;
  const t = story.team!;
  return (
    <span aria-hidden="true" className="grid size-full place-items-center rounded-full font-uv text-white" style={{ background: t.color, fontSize: Math.round(size * 0.3) }}>
      {t.code}
    </span>
  );
}

/** Riga delle storie: un cerchio per il club e uno per ogni squadra che gioca nei prossimi 7 giorni. */
export function StoriesRow({ stories, nowMs }: { stories: readonly Story[]; nowMs: number }) {
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => setSeen(readSeen()), []);
  const markSeen = useCallback((s: Story) => {
    setSeen((prev) => {
      const next = { ...prev, [s.id]: s.signature };
      writeSeen(next);
      return next;
    });
  }, []);
  if (!stories.length) return null;
  return (
    <section aria-label="Storie della settimana" data-testid="home-stories" className="mx-auto max-w-[1200px]">
      <ul className="scd-scroll-x m-0 flex list-none gap-3 overflow-x-auto px-4 pb-2 pt-3 lg:px-6">
        {stories.map((s, i) => {
          const fresh = isUnseen(s, seen);
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="scd-focus group flex w-[76px] flex-col items-center gap-1.5 rounded-[14px] text-white"
                aria-label={`Storia ${s.kind === "club" ? "della società" : s.label}${s.live ? ", in campo adesso" : ""}${fresh ? ", nuova" : ""}`}
              >
                <span
                  className={`relative grid size-[68px] place-items-center rounded-full p-[3px] transition-transform duration-150 group-active:scale-95 ${fresh ? "bg-[conic-gradient(from_200deg,#ffd21f,#ffffff,#2f8dff,#ffd21f)]" : "bg-white/25"}`}
                >
                  <span className="grid size-full place-items-center overflow-hidden rounded-full border-[3px] border-[var(--uv-night)] bg-white">
                    <Avatar story={s} size={56} />
                  </span>
                  {s.live && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[5px] bg-[var(--scd-red,#d6202c)] px-1.5 text-[10.5px] font-extrabold uppercase leading-[16px] tracking-wide text-white">
                      Live
                    </span>
                  )}
                </span>
                <span className={`max-w-full truncate text-[12.5px] ${fresh ? "font-bold" : "font-medium text-white/80"}`}>{s.kind === "club" ? "La settimana" : s.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && stories[open] && (
        <StoryViewer
          stories={stories}
          index={open}
          nowMs={nowMs}
          onIndex={(i) => setOpen(i)}
          onSeen={markSeen}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function StoryViewer({ stories, index, nowMs, onIndex, onSeen, onClose }: {
  stories: readonly Story[]; index: number; nowMs: number;
  onIndex: (i: number) => void; onSeen: (s: Story) => void; onClose: () => void;
}) {
  const story = stories[index]!;
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setReduced(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    return () => {
      document.body.style.overflow = prevOverflow;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);
  useEffect(() => {
    setSlide(0);
    setElapsed(0);
  }, [index]);

  // The slide index resets in an effect after the story changes: clamp so the first render of a shorter story is safe.
  const at = Math.min(slide, story.slides.length - 1);

  const next = useCallback(() => {
    setElapsed(0);
    if (at + 1 < story.slides.length) setSlide(at + 1);
    else {
      onSeen(story);
      if (index + 1 < stories.length) onIndex(index + 1);
      else onClose();
    }
  }, [at, story, index, stories.length, onIndex, onSeen, onClose]);
  const prev = useCallback(() => {
    setElapsed(0);
    if (at > 0) setSlide(at - 1);
    else if (index > 0) onIndex(index - 1);
  }, [at, index, onIndex]);

  // Avanzamento automatico; fermo con "riduci movimento", in pausa tenendo premuto.
  useEffect(() => {
    if (reduced || paused) return;
    const t = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(t);
  }, [reduced, paused, slide, index]);
  useEffect(() => {
    if (elapsed >= SLIDE_MS) next();
  }, [elapsed, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const current = story.slides[at]!;
  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-[rgb(1_12_35/0.92)] sm:items-center" role="dialog" aria-modal="true" aria-label={`Storia ${story.label}`} data-testid="story-viewer">
      <div
        className="relative flex w-full max-w-[440px] flex-col overflow-hidden bg-[linear-gradient(170deg,#0a3d91_0%,#021f4f_62%,#01122f_100%)] text-white sm:h-[min(820px,92dvh)] sm:rounded-[22px] sm:shadow-[0_30px_80px_rgb(0_0_0/0.55)]"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <div aria-hidden="true" className="scd-kit-stripes pointer-events-none absolute inset-0 opacity-40" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/3 size-[340px] rounded-full blur-3xl" style={{ background: story.kind === "team" ? story.team!.color : "#1556c4", opacity: 0.55 }} />
        <div className="relative flex gap-1 px-3 pt-[max(12px,env(safe-area-inset-top))]" aria-hidden="true">
          {story.slides.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full bg-white" style={{ width: i < at ? "100%" : i > at ? "0%" : reduced ? "100%" : `${Math.min(100, (elapsed / SLIDE_MS) * 100)}%` }} />
            </span>
          ))}
        </div>
        <header className="relative flex items-center gap-2.5 px-3 py-2.5">
          <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-white"><Avatar story={story} size={36} /></span>
          <b className="min-w-0 flex-1 truncate text-[15px]">{story.kind === "club" ? "S.C.D. ColicoDerviese" : story.team!.label}</b>
          <button ref={closeRef} type="button" onClick={onClose} className="scd-focus grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Chiudi la storia">
            <X className="size-6" aria-hidden="true" />
          </button>
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col justify-center px-6 pb-8" aria-live="polite">
          <div key={current.id} className="motion-safe:animate-[scd-story-in_320ms_ease-out]">
            <Slide slide={current} nowMs={nowMs} onNavigate={onClose} />
          </div>
        </div>
        <button type="button" onClick={prev} className="absolute bottom-0 left-0 top-24 w-1/3 focus-visible:outline-none" aria-label="Indietro">
          <ChevronLeft className="sr-only" aria-hidden="true" />
        </button>
        <button type="button" onClick={next} className="absolute bottom-0 right-0 top-24 w-1/3 focus-visible:outline-none" aria-label="Avanti">
          <ChevronRight className="sr-only" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Slide({ slide, nowMs, onNavigate }: { slide: StorySlide; nowMs: number; onNavigate: () => void }) {
  if (slide.kind === "week") {
    return (
      <div className="grid gap-4">
        <p className="m-0 font-uv text-[17px] uppercase tracking-[0.08em] text-[var(--uv-gold)]">Questa settimana</p>
        <p className="m-0 font-uv text-[120px] leading-[0.8] text-white [text-shadow:0_6px_0_rgb(0_0_0/0.25)]">{slide.games}<span className="block text-[34px]">{slide.games === 1 ? "gara" : "gare"}</span></p>
        <div className="flex gap-3 text-[16px]">
          <span className="rounded-full bg-white/12 px-3 py-1.5"><b>{slide.home}</b> in casa</span>
          <span className="rounded-full bg-white/12 px-3 py-1.5"><b>{slide.away}</b> in trasferta</span>
        </div>
        <p className="m-0 text-[15px] text-white/75">Dal {dayShort(slide.firstDay)} al {dayShort(slide.lastDay)}, dal calendario ufficiale della società.</p>
      </div>
    );
  }
  if (slide.kind === "match") {
    const i = slide.item;
    const s = startMs(i);
    const left = s !== null ? countdown(s, nowMs) : null;
    return (
      <div className="grid gap-4">
        <p className="m-0 font-uv text-[17px] uppercase tracking-[0.08em] text-[var(--uv-gold)]">{i.groupLabel.split("·")[0]}</p>
        <h3 className="m-0 font-uv text-[40px] uppercase leading-[0.95] [text-wrap:balance]">{i.title}</h3>
        <p className="m-0 flex items-center gap-2 text-[18px] font-bold capitalize"><CalendarDays className="size-5 shrink-0" aria-hidden="true" />{dayLong(i.date)}{i.time ? `, ore ${i.time}` : ""}</p>
        {i.venue && <p className="m-0 flex items-start gap-2 text-[16px] text-white/85"><MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />{venueCase(i.venue)}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {i.homeAway && <span className={`rounded-[6px] px-2.5 py-1 text-[13px] font-extrabold uppercase tracking-wide ${i.homeAway === "CASA" ? "bg-[var(--uv-gold)] text-[var(--uv-night)]" : "border-2 border-white/70"}`}>{i.homeAway === "CASA" ? "In casa" : "Trasferta"}</span>}
          {left && <span className="text-[15px] text-white/85">Calcio d'inizio tra <b className="tabular-nums">{left}</b></span>}
          {!i.certain && <span className="rounded-[6px] bg-white/12 px-2 py-1 text-[12.5px]">Orario o campo da confermare</span>}
        </div>
      </div>
    );
  }
  if (slide.kind === "sponsor") {
    return (
      <div className="grid justify-items-center gap-5 text-center">
        <p className="m-0 font-uv text-[17px] uppercase tracking-[0.08em] text-[var(--uv-gold)]">Sponsor del giorno</p>
        <div className="grid h-[150px] w-full max-w-[300px] place-items-center rounded-[18px] bg-white p-5">
          <img src={slide.sponsor.src} alt={sponsorLabel(slide.sponsor)} className="max-h-full max-w-full object-contain" />
        </div>
        <p className="m-0 text-[22px] font-bold">{sponsorLabel(slide.sponsor)}</p>
        <p className="m-0 max-w-[30ch] text-[15px] text-white/80">Grazie: con il tuo sostegno giocano tutte le squadre della ColicoDerviese.</p>
      </div>
    );
  }
  if (slide.kind === "event") {
    return (
      <div className="grid gap-4">
        <img src={slide.image} alt="" className="aspect-[4/3] w-full rounded-[16px] object-cover object-top" />
        <p className="m-0 font-uv text-[17px] uppercase tracking-[0.08em] text-[var(--uv-gold)]">{slide.when}</p>
        <h3 className="m-0 font-uv text-[38px] uppercase leading-[0.92]">{slide.title}</h3>
        <p className="m-0 text-[16px] text-white/85">{slide.text}</p>
        <Link to={slide.href as never} onClick={onNavigate} className="scd-action relative z-10 h-12 justify-self-start rounded-full px-5 text-[16px] font-bold">Scopri di più</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <p className="m-0 text-[20px] font-bold">{slide.text}</p>
      <a href={slide.href} onClick={onNavigate} className="scd-action relative z-10 h-12 justify-self-start rounded-full px-5 text-[16px] font-bold">{slide.label}</a>
    </div>
  );
}
