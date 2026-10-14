import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { stepIndex } from "@/lib/ledwall-rotation";
import { romeDay } from "@/lib/public-window";
import { LED_MASTER, spotsForLedwall, spotsInDayOrder } from "@/lib/sponsor-spots";

/**
 * LED wall player (UD-119: "tutto è gestito dal vivo attraverso l'app, che alimenta anche il LED wall").
 * Opened full screen on the PC connected to the LED controller: a black page with the 1920x164 board canvas scaled
 * to the window width, the master spots one after another in the order of the Rome day, in loop. No header, footer,
 * chat or banner (staticData.bare), noindex. Never shows a spot with MODIFICHE_RICHIESTE (spotsForLedwall).
 * Two video elements alternate so the next spot is already loaded when the current one ends.
 * Screen kept awake with the Wake Lock API when the browser allows it (silently ignored otherwise).
 * Double click or the F key toggles full screen.
 */
export const Route = createFileRoute("/ledwall/player")({
  staticData: { bare: true },
  loader: () => ({ day: romeDay(Date.now()) }),
  head: () => ({
    meta: [
      { title: "LED wall · S.C.D. ColicoDerviese" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Player del LED wall del campo della S.C.D. ColicoDerviese." },
    ],
  }),
  component: LedwallPlayer,
});

type WakeLockLike = { release: () => Promise<void>; addEventListener?: (t: string, f: () => void) => void };

function useWakeLock() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockLike> } }).wakeLock;
    if (!wl) return;
    let lock: WakeLockLike | null = null;
    let stopped = false;
    const acquire = () => {
      if (stopped || document.visibilityState !== "visible") return;
      wl.request("screen")
        .then((l) => {
          if (stopped) void l.release().catch(() => undefined);
          else lock = l;
        })
        .catch(() => undefined);
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVis);
      if (lock) void lock.release().catch(() => undefined);
    };
  }, []);
}

function toggleFullscreen() {
  if (typeof document === "undefined") return;
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

function LedwallPlayer() {
  const { day: serverDay } = Route.useLoaderData();
  const [day, setDay] = useState(serverDay);
  const order = useMemo(() => spotsInDayOrder(spotsForLedwall(), day), [day]);
  const n = order.length;
  const [cur, setCur] = useState(0);
  const [active, setActive] = useState<0 | 1>(0);
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const refs = [a, b] as const;

  useWakeLock();

  // A new Rome day reorders the rotation (checked every minute).
  useEffect(() => {
    const t = window.setInterval(() => {
      const d = romeDay(Date.now());
      setDay((old) => (old === d ? old : d));
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    setCur(0);
  }, [day]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The active element plays the current spot; the other one holds the next spot, loaded and paused at the start.
  const src = (slot: 0 | 1) => {
    if (n === 0) return undefined;
    const i = slot === active ? cur : stepIndex(cur, 1, n);
    return order[Math.min(i, n - 1)]?.master;
  };

  useEffect(() => {
    const v = refs[active].current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => undefined);
    const other = refs[active === 0 ? 1 : 0].current;
    if (other) {
      other.pause();
      other.currentTime = 0;
    }
  }, [active, cur, n]);

  const onEnded = useCallback(
    (slot: 0 | 1) => {
      if (slot !== active) return;
      if (n <= 1) {
        const v = refs[slot].current;
        if (v) {
          v.currentTime = 0;
          v.play().catch(() => undefined);
        }
        return;
      }
      setActive(slot === 0 ? 1 : 0);
      setCur((c) => stepIndex(c, 1, n));
    },
    [active, n],
  );

  return (
    <main
      className="fixed inset-0 cursor-none overflow-hidden bg-black"
      data-screen="ledwall-player"
      onDoubleClick={toggleFullscreen}
      aria-label="Player del LED wall"
    >
      <h1 className="sr-only">LED wall della S.C.D. ColicoDerviese</h1>
      <div
        className="relative w-full overflow-hidden bg-black"
        style={{ aspectRatio: `${LED_MASTER.width} / ${LED_MASTER.height}` }}
        data-testid="ledwall-canvas"
        data-spot={n > 0 ? order[Math.min(cur, n - 1)]?.slug : ""}
      >
        {n > 0 &&
          ([0, 1] as const).map((slot) => (
            <video
              key={slot}
              ref={refs[slot]}
              src={src(slot)}
              muted
              playsInline
              autoPlay={slot === active}
              preload="auto"
              width={LED_MASTER.width}
              height={LED_MASTER.height}
              onEnded={() => onEnded(slot)}
              className="absolute inset-0 block size-full object-fill"
              style={{ opacity: slot === active ? 1 : 0 }}
              aria-hidden={slot !== active}
              data-testid={slot === active ? "ledwall-active" : "ledwall-next"}
            />
          ))}
      </div>
    </main>
  );
}
