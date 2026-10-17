/**
 * «La nostra storia in 6 epoche» on /vetta-legnone: interactive timeline approved by Francesco (DG) on 17/10/2026.
 * Phone: the six stops scroll horizontally with scroll-snap; desktop: they sit on one line. Tapping a stop expands
 * its epoch in the panel below (one open at a time, disclosure buttons with aria-expanded). Arrow keys, Home and End
 * move between stops; motion (smooth scroll, colour transition) only when the user has not asked for reduced motion.
 * Content and sources: src/lib/vetta-legnone.ts (VETTA_EPOCHS, VETTA_MILESTONES, vettaHistoryCta).
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Flag } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { SectionHead } from "@/components/vetta-legnone/VettaSections";
import { VETTA_EPOCHS, VETTA_HISTORY_NOTE, VETTA_HISTORY_STATUS, VETTA_MILESTONES, vettaHistoryCta } from "@/lib/vetta-legnone";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HistoryEpochs() {
  const [openId, setOpenId] = useState<string>(VETTA_EPOCHS[0]?.id ?? "");
  const stops = useRef<Array<HTMLButtonElement | null>>([]);
  const cta = vettaHistoryCta();
  const total = VETTA_EPOCHS.length;

  function focusStop(i: number) {
    const el = stops.current[i];
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest", inline: "center" });
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? total - 1 : null;
    if (next === null) return;
    e.preventDefault();
    focusStop(Math.max(0, Math.min(total - 1, next)));
  }

  return (
    <section aria-labelledby="vl-storia" className="mx-auto max-w-6xl px-4 py-8 lg:py-12" data-testid="vetta-epochs">
      <SectionHead id="vl-storia" kicker="La nostra storia" title="La nostra storia in 6 epoche">
        {VETTA_HISTORY_NOTE}
      </SectionHead>
      <p
        className="-mt-1 mb-4 inline-flex rounded-full bg-[#e3f4ff] px-3 py-1 font-display text-[12.5px] font-bold uppercase tracking-[0.06em] text-[#034a96]"
        role="note"
        data-testid="vetta-history-status"
      >
        {VETTA_HISTORY_STATUS}
      </p>

      <p id="vl-storia-help" className="sr-only">
        Tocca un'epoca per aprirla. Con le frecce passi da un'epoca all'altra.
      </p>
      <div className="relative">
        <span aria-hidden="true" className="absolute inset-x-2 top-[34px] h-[3px] rounded-full bg-[linear-gradient(90deg,#0457af,#1b95d3,#ffd84a)]" />
        <ol
          className="relative m-0 -mx-4 flex list-none snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 pt-1 motion-safe:scroll-smooth [scrollbar-width:thin] lg:mx-0 lg:grid lg:snap-none lg:grid-cols-6 lg:overflow-visible lg:px-0"
          aria-describedby="vl-storia-help"
          data-testid="vetta-timeline"
        >
          {VETTA_EPOCHS.map((e, i) => {
            const open = e.id === openId;
            return (
              <li key={e.id} className="w-[68%] shrink-0 snap-center sm:w-[40%] lg:w-auto">
                <button
                  ref={(el) => {
                    stops.current[i] = el;
                  }}
                  type="button"
                  aria-expanded={open}
                  aria-controls={`vl-epoca-${e.id}`}
                  onClick={() => setOpenId(e.id)}
                  onKeyDown={(ev) => onKey(ev, i)}
                  className={`scd-focus group flex h-full w-full flex-col items-start gap-1 rounded-2xl p-3 text-left motion-safe:transition-colors ${
                    open ? "scd-band text-white shadow-[var(--scd-card-shadow)]" : "border border-[var(--scd-line)] bg-white text-[var(--scd-navy)] hover:bg-[#f2f9ff]"
                  }`}
                  data-epoch={e.id}
                >
                  <span className="flex w-full items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-bold ${
                        open ? "scd-gold" : "bg-[var(--scd-page)] text-[var(--scd-navy)]"
                      }`}
                    >
                      {i === total - 1 ? <Flag className="size-3.5" /> : i + 1}
                    </span>
                    <span className={`font-display text-[20px] font-bold leading-none ${open ? "text-[#ffd84a]" : "text-[var(--scd-blue)]"}`}>{e.years}</span>
                  </span>
                  <span className="font-display text-[15.5px] font-bold leading-tight">{e.title}</span>
                  <span className="sr-only">
                    {", epoca "}
                    {i + 1} di {total}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {VETTA_EPOCHS.map((e, i) => (
        <div
          key={e.id}
          id={`vl-epoca-${e.id}`}
          role="region"
          aria-label={`Epoca ${i + 1} di ${total}: ${e.years}, ${e.title}`}
          hidden={e.id !== openId}
          className="mt-3 rounded-2xl border border-[var(--scd-line)] bg-white p-4 shadow-[var(--scd-card-shadow)] lg:p-6"
          data-testid="vetta-epoch-panel"
        >
          <p className="m-0 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--scd-sub)]">
            {i + 1}/{total} · {e.years}
          </p>
          <h3 className="m-0 mt-0.5 font-display text-[24px] font-bold leading-tight text-[var(--scd-navy)] lg:text-[28px]">{e.title}</h3>
          <p className="m-0 mt-1.5 max-w-3xl text-[15.5px] leading-snug text-[var(--scd-ink)]">{e.story}</p>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0 md:grid-cols-3">
            {e.highlights.map((h) => (
              <li key={h.result} className="flex flex-col gap-1 rounded-xl bg-[var(--scd-page)] p-3">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-[15px] font-bold text-[var(--scd-blue)]">{h.when}</span>
                  <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[var(--scd-sub)]">{h.category}</span>
                </span>
                <span className="text-[14.5px] font-semibold leading-snug text-[var(--scd-navy)]">{h.result}</span>
                <span className="text-[11.5px] leading-snug text-[var(--scd-sub)]">Fonte: {h.source}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-6" data-testid="vetta-milestones">
        <h3 className="m-0 flex items-center gap-2 font-display text-[20px] font-bold text-[var(--scd-navy)] lg:text-[24px]">
          <Flag className="size-5 text-[var(--scd-blue)]" aria-hidden="true" />
          Le nostre tappe
        </h3>
        <ol className="m-0 -mx-4 mt-2 flex list-none snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {VETTA_MILESTONES.map((m) => (
            <li key={m.id} className="w-[72%] shrink-0 snap-start rounded-2xl border border-[var(--scd-line)] bg-white p-3.5 sm:w-[44%] lg:w-auto">
              <p className="m-0 font-display text-[14px] font-bold text-[var(--scd-blue)]">{m.when}</p>
              <p className="m-0 mt-0.5 font-display text-[17px] font-bold leading-tight text-[var(--scd-navy)]">{m.title}</p>
              <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--scd-ink)]">{m.detail}</p>
              <p className="m-0 mt-1.5 text-[11.5px] leading-snug text-[var(--scd-sub)]">Fonte: {m.source}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="scd-band mt-6 flex flex-col gap-3 rounded-2xl p-5 text-white sm:flex-row sm:items-center sm:justify-between lg:p-6" data-testid="vetta-history-cta">
        <p className="m-0 font-display text-[22px] font-bold leading-tight lg:text-[26px]">
          <span className="text-[#ffd84a]">2026/27 →</span> {cta.line}
        </p>
        <div className="flex flex-col sm:items-end">
          <Link
            to={cta.to}
            className="scd-gold scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] px-4 font-display text-[16px] font-bold"
            aria-describedby="vl-storia-cta-hint"
          >
            {cta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <p id="vl-storia-cta-hint" className="m-0 mt-1.5 text-[12.5px] leading-snug text-[#dbe5f7]">
            {cta.hint}
          </p>
        </div>
      </div>
    </section>
  );
}
