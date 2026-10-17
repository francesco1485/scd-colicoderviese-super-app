import { useEffect, useState } from "react";

/**
 * Minute clock: server time on the first render (no hydration mismatch), then the device clock every minute.
 * While the tab is hidden the clock pauses (no timers in the background); it catches up as soon as the tab is visible.
 */
export function useMinuteClock(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    let id: number | undefined;
    const start = () => {
      if (id !== undefined) return;
      setNow(Date.now());
      id = window.setInterval(() => setNow(Date.now()), 60_000);
    };
    const stop = () => {
      if (id !== undefined) window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return now;
}
