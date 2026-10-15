/**
 * "Guarda cosa succede a Colico" — story rings + full-screen story viewer of the public home (Francesco 15/10/2026:
 * "poco wow, poco vivo"; "fammi vedere cosa fa Colico"). Real material only (lib/home-stories.ts). The viewer works
 * like the social stories people know: progress bars, auto-advance (images 6 s, videos for their length), tap left /
 * right or arrow keys to move, Esc or ✕ to close, pause while pressed. Videos are muted and load only when opened.
 * Reduced motion: no auto-advance, the user moves by hand.
 */
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  STORY_IMAGE_SECONDS,
  homeStories,
  type HomeStory,
} from "@/lib/home-stories";

const WRAP = "mx-auto w-full max-w-[1280px] px-4 lg:px-8";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function StoryViewer({
  stories,
  start,
  onClose,
}: {
  stories: readonly HomeStory[];
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useMemo(prefersReducedMotion, []);
  const story = stories[i];

  const next = useCallback(() => {
    setProgress(0);
    if (i + 1 >= stories.length) onClose();
    else setI(i + 1);
  }, [i, stories.length, onClose]);
  const prev = useCallback(() => {
    setProgress(0);
    setI((n) => Math.max(0, n - 1));
  }, []);

  // Focus, Esc and arrows; the page behind does not scroll.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const root = dialogRef.current;
        const items = root
          ? Array.from(root.querySelectorAll<HTMLElement>("button, a[href]"))
          : [];
        const first = items[0];
        const last = items[items.length - 1];
        if (first && last) {
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (!root?.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      } else if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      before?.focus?.();
    };
  }, [next, prev, onClose]);

  // Image stories: timed progress. Video stories: progress follows the clip.
  useEffect(() => {
    if (!story || story.media.kind !== "image" || reduced || paused) return;
    const step = 100;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(1, p + step / (STORY_IMAGE_SECONDS * 1000)));
    }, step);
    return () => window.clearInterval(id);
  }, [story, reduced, paused]);

  // Advance from an effect when an image story is complete (no side effects inside state updaters).
  useEffect(() => {
    if (story?.media.kind === "image" && progress >= 1) next();
  }, [progress, story, next]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (paused || reduced) v.pause();
    else v.play().catch(() => undefined);
  }, [i, paused, reduced]);

  if (!story) return null;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Storia ${i + 1} di ${stories.length}: ${story.title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90"
      data-testid="story-viewer"
    >
      <div className="relative flex h-full max-h-[860px] w-full max-w-[480px] flex-col overflow-hidden bg-[#061a3d] text-white sm:h-[92vh] sm:rounded-[20px]">
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
          {stories.map((s, n) => (
            <span
              key={s.id}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <span
                className="block h-full bg-white"
                style={{
                  width: `${n < i ? 100 : n === i ? Math.round(progress * 100) : 0}%`,
                }}
              />
            </span>
          ))}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Chiudi le storie"
          className="scd-focus absolute right-2 top-[calc(env(safe-area-inset-top,0px)+20px)] z-30 grid size-11 place-items-center rounded-full bg-black/30"
        >
          <X className="size-6" aria-hidden="true" />
        </button>

        <div
          className="relative flex-1"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {story.media.kind === "video" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.media.src}
              poster={story.media.poster}
              muted
              playsInline
              autoPlay={!reduced}
              preload="auto"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              onEnded={() => !reduced && next()}
              className="absolute inset-0 size-full object-contain"
            />
          ) : (
            <img
              key={story.id}
              src={story.media.src}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(transparent,rgb(6_26_61/0.95))]"
          />
          <button
            type="button"
            onClick={prev}
            aria-label="Storia precedente"
            className="scd-focus absolute inset-y-0 left-0 z-10 w-1/3"
          >
            <ChevronLeft
              className="ml-1 size-7 opacity-60"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Storia successiva"
            className="scd-focus absolute inset-y-0 right-0 z-10 flex w-1/3 items-center justify-end"
          >
            <ChevronRight
              className="mr-1 size-7 opacity-60"
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="relative z-20 grid gap-2 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-3">
          <p className="m-0 font-uv text-[28px] uppercase leading-[0.95]">
            {story.title}
          </p>
          <p className="m-0 text-[14.5px] leading-snug text-white/85">
            {story.text}
          </p>
          <Link
            to={story.href as never}
            onClick={onClose}
            className="scd-focus mt-1 inline-flex h-12 items-center justify-center rounded-[12px] bg-[#ffd600] px-6 text-[16px] font-bold text-[#0b1e3a]"
          >
            {story.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HomeStories({ day }: { day: string }) {
  const stories = useMemo(() => homeStories(day), [day]);
  const [open, setOpen] = useState<number | null>(null);
  if (stories.length === 0) return null;
  return (
    <section
      aria-labelledby="stories-t"
      className={`${WRAP} pt-5 lg:pt-8`}
      data-testid="home-stories"
    >
      <h2
        id="stories-t"
        className="m-0 pb-3 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] lg:text-[30px]"
      >
        Guarda cosa succede a Colico
      </h2>
      <ul className="m-0 -mx-4 flex list-none gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {stories.map((s, n) => (
          <li key={s.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpen(n)}
              className="scd-focus group grid w-[84px] justify-items-center gap-1.5 rounded-[12px] text-center lg:w-[104px]"
              aria-label={`Apri la storia: ${s.title}`}
            >
              <span className="scd-ring block size-[76px] rounded-full p-[3px] transition-transform duration-200 group-hover:scale-110 lg:size-[92px]">
                <img
                  src={s.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`size-full rounded-full border-[3px] border-[#eef3f9] ${s.thumbFit === "contain" ? "bg-white object-contain p-2.5" : "bg-[#0b2a5b] object-cover"}`}
                />
              </span>
              <span className="line-clamp-1 text-[12px] font-semibold text-[#0b2a5b]">
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <StoryViewer
          stories={stories}
          start={open}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
