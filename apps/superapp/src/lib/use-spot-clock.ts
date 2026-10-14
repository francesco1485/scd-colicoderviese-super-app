import { useEffect, useState } from "react";

import { chooseVideoFormat, type VideoFormat } from "./spot-schedule";

/**
 * Current time, refreshed every `tickMs` on the client. Starts from `initialMs` (server time from the loader, or 0)
 * so the first client render matches the server render; the clock takes over right after mount.
 */
export function useNow(tickMs = 1000, initialMs = 0, enabled = true): number {
  const [now, setNow] = useState(initialMs);
  useEffect(() => {
    setNow(Date.now());
    if (!enabled) return;
    const t = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(t);
  }, [tickMs, enabled]);
  return now;
}

/** Video format this browser plays ("mp4" during server render and the first client render). */
export function useVideoFormat(): VideoFormat {
  const [format, setFormat] = useState<VideoFormat>("mp4");
  useEffect(() => {
    if (typeof document === "undefined") return;
    setFormat(chooseVideoFormat(document.createElement("video")));
  }, []);
  return format;
}
