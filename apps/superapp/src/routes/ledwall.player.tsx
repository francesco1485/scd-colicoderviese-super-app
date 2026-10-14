import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { romeDay } from "@/lib/public-window";
import { LED_MASTER } from "@/lib/sponsor-spots";
import { ledOnAir, spotVideoFile } from "@/lib/spot-schedule";
import { useVideoFormat } from "@/lib/use-spot-clock";

/**
 * LED wall player (UD-119: "tutto è gestito dal vivo attraverso l'app, che alimenta anche il LED wall").
 * Opened full screen on the PC connected to the LED controller: a black page with the 1920x164 board canvas scaled
 * to the window width, the master spots one after another in the order of the Rome day, in loop. No header, footer,
 * chat or banner (staticData.bare), noindex. Never shows a spot with MODIFICHE_RICHIESTE (spotsForLedwall).
 * The spot on air comes from the Rome clock (lib/spot-schedule.ts): the same spot as the home and the gestionale
 * regia at the same moment; a reload restarts at the right second; a video that fails to load never stops the loop
 * (the clock moves on after 20 s). Two video elements alternate so the next spot is already loaded.
 * MP4 (H.264) or its WebM (VP9) twin, whichever the PC's browser plays.
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
  const format = useVideoFormat();
  const [now, setNow] = useState(0);
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const refs = useMemo(() => [a, b] as const, []);
  const [active, setActive] = useState<0 | 1>(0);
  const lastIndex = useRef<string>("");

  useWakeLock();

  // The clock drives the rotation (4 ticks a second: the swap lands within 250 ms of the slot change).
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const air = useMemo(() => ledOnAir(now || Date.parse(`${serverDay}T12:00:00Z`)), [now, serverDay]);
  const n = air.order.length;
  const slotKey = `${air.day}#${air.index}`;
  const sources: [string | undefined, string | undefined] = [undefined, undefined];
  if (air.current) {
    sources[active] = spotVideoFile(air.current.master, format);
    sources[active === 0 ? 1 : 0] = air.next ? spotVideoFile(air.next.master, format) : undefined;
  }

  // Slot change: the preloaded element becomes the active one.
  useEffect(() => {
    if (!now) return;
    if (lastIndex.current && lastIndex.current !== slotKey) setActive((x) => (x === 0 ? 1 : 0));
    lastIndex.current = slotKey;
  }, [slotKey, now]);

  // Keep the active element playing at the clock position (re-seek only when it drifts more than a second).
  useEffect(() => {
    if (!now || !air.current) return;
    const v = refs[active].current;
    if (!v) return;
    v.muted = true;
    const target = air.elapsedMs / 1000;
    if (v.readyState >= 1 && Math.abs(v.currentTime - target) > 1) {
      try {
        v.currentTime = target;
      } catch {
        /* not seekable yet */
      }
    }
    if (v.paused) v.play().catch(() => undefined);
    const other = refs[active === 0 ? 1 : 0].current;
    if (other && !other.paused) {
      other.pause();
      other.currentTime = 0;
    }
  }, [now, active, air.current, air.elapsedMs, refs]);

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
        data-spot={air.current?.slug ?? ""}
        data-spots={n}
      >
        {n > 0 &&
          ([0, 1] as const).map((slot) => (
            <video
              key={slot}
              ref={refs[slot]}
              src={sources[slot]}
              muted
              playsInline
              autoPlay={slot === active}
              loop={n === 1}
              preload="auto"
              width={LED_MASTER.width}
              height={LED_MASTER.height}
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
