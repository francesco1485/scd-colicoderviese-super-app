/**
 * Confetti burst over the weekend results, only when the S.C.D. ColicoDerviese won (UD-134, Francesco 15/10/2026
 * 09:18: "coriandoli se si vince"). It fires once, when the results come into view, and once per browser session for
 * the same wins (no confetti at every visit). Decorative only (aria-hidden, no pointer events); with "reduce motion"
 * nothing is drawn. Club palette: navy, blue, light blue, yellow.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { confettiPieces } from "@/lib/home-results";

const COLORS = ["#ffd600", "#1556c4", "#7fb2ff", "#0b2a5b"] as const;
const PIECES = confettiPieces(48);
const SEEN_KEY = "scd.confetti.vittorie.v1";
/** Longest piece: fall duration + the largest delay, then the overlay is removed. */
const LIFETIME_MS = 2600;

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function WinConfetti({ winIds }: { winIds: readonly string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [burst, setBurst] = useState(false);
  const key = winIds.join("|");

  useEffect(() => {
    const el = ref.current;
    if (!el || !key || reducedMotion()) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === key) return;
    } catch {
      /* storage off: celebrate once per page load */
    }
    const fire = () => {
      setBurst(true);
      try {
        sessionStorage.setItem(SEEN_KEY, key);
      } catch {
        /* ignore */
      }
    };
    if (typeof IntersectionObserver !== "function") {
      fire();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fire();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [key]);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(false), LIFETIME_MS);
    return () => window.clearTimeout(t);
  }, [burst]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-testid="win-confetti"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {burst &&
        PIECES.map((p, i) => (
          <span
            key={i}
            className="scd-confetti absolute top-0 block h-[12px] w-[7px] rounded-[2px]"
            style={
              {
                left: `${p.x}%`,
                background: COLORS[p.color],
                animationDelay: `${p.delay}ms`,
                "--spin": `${p.spin}deg`,
                "--drift": `${p.drift}px`,
              } as CSSProperties
            }
          />
        ))}
    </span>
  );
}
