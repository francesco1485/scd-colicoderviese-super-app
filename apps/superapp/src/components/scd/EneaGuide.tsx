import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CastBadge } from "@/components/scd/SkyJolly";
import { CAST_PERSONAS } from "@/lib/cast-personas";
import {
  ENEA_ROTATE_MS,
  eneaDismissKey,
  eneaLines,
  eneaStartIndex,
  nextEneaIndex,
  type EneaContext,
  type EneaLine,
} from "@/lib/enea-guide";

/**
 * Enea, the master guide of sponsorship, tournaments and events (UD-149): one concrete reason and one action at a
 * time, rotating every ENEA_ROTATE_MS. Rotation pauses on hover and keyboard focus, never starts with
 * prefers-reduced-motion (then «Avanti» changes line on request), and the guide can be closed for the browser
 * session. Artwork: Enea's approved cast badge only (CastBadge; no portrait until the Direzione approves one).
 * Lines come from lib/enea-guide.ts (published data only).
 */
export function EneaGuide({ ctx, day, className = "" }: { ctx: EneaContext; day: string; className?: string }) {
  const lines = eneaLines(ctx, day);
  const [index, setIndex] = useState(() => eneaStartIndex(day, lines.length));
  const [closed, setClosed] = useState(false);
  const [still, setStill] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(eneaDismissKey(ctx)) === "1") setClosed(true);
    } catch {
      /* storage blocked: the guide simply stays */
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, [ctx]);

  const rolling = !still && !paused && !hold && !closed && lines.length > 1;
  useEffect(() => {
    if (!rolling) return;
    const t = window.setInterval(() => {
      setAnnounce(false);
      setIndex((i) => nextEneaIndex(i, lines.length));
    }, ENEA_ROTATE_MS);
    return () => window.clearInterval(t);
  }, [rolling, lines.length]);

  if (closed || lines.length === 0) return null;
  const line: EneaLine = lines[index % lines.length]!;
  const enea = CAST_PERSONAS["mentore-tornei"];

  const close = () => {
    setClosed(true);
    try {
      window.sessionStorage.setItem(eneaDismissKey(ctx), "1");
    } catch {
      /* not remembered: closes for this page view */
    }
  };

  return (
    <aside
      ref={box}
      aria-label={`${enea.label}, ${enea.role}`}
      className={`scd-band relative isolate overflow-hidden rounded-[16px] p-4 text-white shadow-[0_14px_30px_-18px_rgb(11_42_91/0.9)] sm:p-5 ${className}`}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null)) setHold(false);
      }}
      data-testid={`enea-guide-${ctx}`}
      data-line={line.id}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[5px] bg-[#ffd600]" />
      <span aria-hidden="true" className="absolute -right-10 -top-12 -z-10 size-40 rounded-full bg-[radial-gradient(circle,rgb(24_152_216/0.45),transparent_70%)]" />
      <div className="flex items-start gap-3">
        <CastBadge id="mentore-tornei" initial="E" size={48} className="ring-[#ffd600]" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#ffd600]">
            {enea.label} · {enea.role}
          </p>
          <p className="m-0 mt-1 text-[16px] font-semibold leading-snug sm:text-[17px]" aria-live={announce ? "polite" : "off"} data-testid="enea-reason">
            {line.reason}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="scd-focus -mr-1 -mt-1 inline-flex size-11 flex-none items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={`Chiudi i consigli di ${enea.label}`}
          data-testid="enea-close"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-[60px] max-sm:pl-0">
        <Link
          to={line.action.to}
          {...(line.action.hash ? { hash: line.action.hash } : {})}
          {...(line.action.search ? { search: line.action.search as never } : {})}
          className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[12px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a] hover:brightness-95"
          data-testid="enea-action"
        >
          {line.action.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {lines.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                setAnnounce(true);
                setIndex((i) => nextEneaIndex(i, lines.length));
              }}
              className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-[12px] px-3 text-[14.5px] font-semibold text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)] hover:bg-white/10"
              data-testid="enea-next"
            >
              Avanti
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
            {!still && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="scd-focus inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
                aria-label={paused ? "Riprendi i consigli a rotazione" : "Ferma i consigli a rotazione"}
                aria-pressed={paused}
                data-testid="enea-pause"
              >
                {paused ? <Play className="size-5" aria-hidden="true" /> : <Pause className="size-5" aria-hidden="true" />}
              </button>
            )}
            <span className="ml-auto flex gap-1.5" aria-hidden="true">
              {lines.map((l, i) => (
                <i key={l.id} className={`block h-1.5 rounded-full ${i === index % lines.length ? "w-5 bg-[#ffd600]" : "w-1.5 bg-white/40"}`} />
              ))}
            </span>
            <span className="sr-only">
              Consiglio {(index % lines.length) + 1} di {lines.length}
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
