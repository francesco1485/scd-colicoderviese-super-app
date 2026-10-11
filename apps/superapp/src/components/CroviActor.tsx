import { useEffect, useRef, useState } from "react";

import {
  CAMEO_SEQUENCE,
  CROVI_FRAME_RATIO,
  CROVI_POSES,
  croviFrame,
  poseAt,
  type CroviPose,
  type PoseStep,
} from "@/lib/crovi-cameo";

/**
 * Crovi in movement: the four photographed poses are stacked and switched with a small hop,
 * while the whole figure breathes and sways. With "reduce motion" he stays still on the first pose.
 */
export function CroviActor({
  sequence = CAMEO_SEQUENCE,
  loop = false,
  size = 440,
  className = "",
  label = "Crovi saluta",
}: {
  sequence?: ReadonlyArray<PoseStep>;
  loop?: boolean;
  size?: 440 | 900;
  /** Sizing classes: give the figure a height (e.g. h-[180px]); the width follows the frame ratio. */
  className?: string;
  label?: string;
}) {
  const [pose, setPose] = useState<CroviPose>(sequence[0]?.pose ?? "wave");
  const last = useRef(pose);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduce = false;
    }
    if (reduce) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const next = poseAt(performance.now() - start, sequence, loop);
      if (next !== last.current) {
        last.current = next;
        setPose(next);
        // restart the little hop without remounting the images (no flicker)
        const el = stage.current;
        if (el) {
          el.classList.remove("crovi-beat");
          void el.offsetWidth;
          el.classList.add("crovi-beat");
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [sequence, loop]);

  return (
    <div
      role="img"
      aria-label={label}
      className={`crovi-actor relative select-none ${className}`}
      style={{ aspectRatio: `${CROVI_FRAME_RATIO}` }}
    >
      <div ref={stage} className="absolute inset-0">
        {CROVI_POSES.map((p) => (
          <img
            key={p}
            src={croviFrame(p, size)}
            alt=""
            draggable={false}
            decoding="async"
            className={`absolute inset-0 size-full object-contain object-bottom transition-opacity duration-100 ${p === pose ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>
    </div>
  );
}
