/**
 * Accessible horizontal carousel for the public home (Eurobet-style card rows).
 * - native scroll with scroll-snap: swipe on phones, trackpad/shift-wheel on desktop;
 * - previous/next buttons with aria-labels, disabled at the ends;
 * - ArrowLeft/ArrowRight move focus between cards when a card link has focus;
 * - smooth scrolling only when the visitor has not asked for reduced motion.
 * Cards per view are set by the caller through `itemClass` (e.g. 1.2 on phones, 4 on desktop).
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function Carousel({
  title,
  titleId,
  label,
  more,
  children,
  itemClass,
  tone = "light",
}: {
  title: ReactNode;
  titleId: string;
  /** Accessible name of the card list, e.g. "Notizie in primo piano". */
  label: string;
  /** Optional link shown next to the title. */
  more?: ReactNode;
  children: ReactNode;
  /** Width of one card (Tailwind basis classes). */
  itemClass: string;
  tone?: "light" | "dark";
}) {
  const trackId = useId();
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(":scope > li");
    const step = first ? first.offsetWidth + 16 : el.clientWidth * 0.8;
    const perView = Math.max(1, Math.floor((el.clientWidth + 16) / step));
    el.scrollBy({
      left: dir * step * perView,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const li = (e.target as HTMLElement).closest("li");
    if (!li || li.parentElement !== track.current) return;
    const next = (
      e.key === "ArrowRight" ? li.nextElementSibling : li.previousElementSibling
    ) as HTMLElement | null;
    const target = next?.querySelector<HTMLElement>("a, button");
    if (!target) return;
    e.preventDefault();
    target.focus({ preventScroll: true });
    next!.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  };

  const btn =
    tone === "dark"
      ? "border-white/30 text-white hover:bg-white/10 disabled:opacity-35"
      : "border-[#cfdcec] bg-white text-[#0b2a5b] hover:bg-[#eef3f9] disabled:opacity-40";

  return (
    <section aria-labelledby={titleId} aria-roledescription="carousel">
      <div className="flex items-end justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-baseline gap-4">
          <h2
            id={titleId}
            className={`m-0 font-uv text-[24px] uppercase leading-none tracking-[0.01em] sm:text-[26px] lg:text-[30px] ${tone === "dark" ? "text-white" : "text-[#0b2a5b]"}`}
          >
            {title}
          </h2>
          {more}
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-controls={trackId}
            aria-label="Schede precedenti"
            className={`scd-focus grid size-11 place-items-center rounded-full border transition-colors duration-150 disabled:cursor-default ${btn}`}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-controls={trackId}
            aria-label="Schede successive"
            className={`scd-focus grid size-11 place-items-center rounded-full border transition-colors duration-150 disabled:cursor-default ${btn}`}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        id={trackId}
        aria-label={label}
        onKeyDown={onKey}
        className="-mx-4 m-0 flex list-none snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 pt-0.5 [scrollbar-width:none] motion-safe:scroll-smooth sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <li
            key={i}
            aria-roledescription="slide"
            aria-label={`${i + 1} di ${items.length}`}
            className={`flex shrink-0 snap-start ${itemClass}`}
          >
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}
