/**
 * First-access guided tour (UD-172). Opens once per device and role when a signed-in portal mounts <GuideTourAuto>,
 * or on demand from /guida («Rivedi il tour»). Never blocks the page: a bottom sheet on phones, a side card on desktop, no
 * backdrop. «Salta» is always visible; Esc and a tap outside close it; Tab stays inside the open card; with
 * prefers-reduced-motion the cards swap instantly (motion-safe classes only). Texts come from lib/guide-content.ts.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ROLE_LABEL, TOUR_END, tourCardsFor, type GuideRole } from "@/lib/guide-content";
import { TOUR_OPEN_EVENT, markTourSeen, requestFirstTour, roleFromTourEvent, takePendingTour } from "@/lib/guide-tour";

export function GuideTour({ role, onClose }: { role: GuideRole; onClose: () => void }) {
  const cards = tourCardsFor(role);
  const total = cards.length + 1;
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isEnd = step >= cards.length;
  const card = isEnd ? null : cards[step]!;

  const close = useCallback(() => {
    markTourSeen(role);
    onClose();
  }, [role, onClose]);

  // Focus the card on open and give it back on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !ref.current || !ref.current.contains(document.activeElement)) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])")];
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [close]);

  const btn =
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd600]";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-testid="guide-tour"
      data-role={role}
      className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl border border-[#0b1e3a]/15 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#0b1e3a] shadow-[0_-12px_40px_rgb(2_20_51/0.25)] outline-none motion-safe:animate-in motion-safe:slide-in-from-bottom-4 lg:inset-x-auto lg:bottom-20 lg:right-6 lg:w-[400px] lg:rounded-3xl lg:pb-5 lg:shadow-[0_16px_48px_rgb(2_20_51/0.28)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--scd-blue)]">
          <BookOpen className="size-4" aria-hidden="true" /> Guida · {ROLE_LABEL[role]}
        </p>
        <button type="button" onClick={close} className={`${btn} -mr-2 h-10 px-3 text-[14px] text-[#33405a] hover:bg-[#eef3fb]`} data-testid="guide-tour-skip">
          Salta <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div key={step} className="mt-3 min-h-[128px] motion-safe:animate-in motion-safe:fade-in">
        <h2 id={titleId} className="m-0 text-[21px] font-bold leading-tight">
          {card ? card.title : TOUR_END.title}
          {card?.status === "in-arrivo" && (
            <span className="ml-2 inline-block rounded-full bg-[#fff4b8] px-2 py-0.5 align-middle text-[12px] font-bold text-[#5a4600]">in arrivo</span>
          )}
        </h2>
        <p className="m-0 mt-2 text-[16px] leading-relaxed text-[#33405a]">{card ? card.body : TOUR_END.body}</p>
        {card?.action && card.status === "live" && (
          <Link to={card.action.to as never} onClick={close} className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--scd-blue)] underline">
            {card.action.label}
          </Link>
        )}
        {isEnd && (
          <Link to={"/guida" as never} search={{ ruolo: role } as never} onClick={close} className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--scd-blue)] underline">
            Apri la Guida
          </Link>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <ol className="m-0 flex list-none gap-1.5 p-0" aria-label={`Scheda ${step + 1} di ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <li key={i} aria-hidden="true" className={`h-2 rounded-full ${i === step ? "w-6 bg-[var(--scd-blue)]" : "w-2 bg-[#c9d5ea]"}`} />
          ))}
        </ol>
        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={`${btn} border border-[#c9d5ea] bg-white`}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Indietro
            </button>
          )}
          {isEnd ? (
            <button type="button" onClick={close} className={`${btn} bg-[#ffd600] text-[#0b1e3a]`} data-testid="guide-tour-done">
              Fatto
            </button>
          ) : (
            <button type="button" onClick={() => setStep((s) => s + 1)} className={`${btn} bg-[var(--scd-blue)] text-white`} data-testid="guide-tour-next">
              Avanti <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Mounted once in the root document. It never opens by URL: pages ask for it with <GuideTourAuto> in their signed-in
 * branch (first access), and /guida with requestTour («Rivedi il tour»).
 */
export function GuideTourHost() {
  const [role, setRole] = useState<GuideRole | null>(null);

  useEffect(() => {
    const first = takePendingTour();
    if (first) setRole(first);
    const onOpen = (e: Event) => {
      const r = roleFromTourEvent(e);
      takePendingTour();
      if (r) setRole(r);
    };
    window.addEventListener(TOUR_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, onOpen);
  }, []);

  const onClose = useCallback(() => setRole(null), []);
  if (!role) return null;
  return <GuideTour key={role} role={role} onClose={onClose} />;
}

/** First-access trigger: mount ONLY where the visitor is signed in with that role (or on a public page). */
export function GuideTourAuto({ role }: { role: GuideRole }) {
  useEffect(() => {
    requestFirstTour(role);
  }, [role]);
  return null;
}
