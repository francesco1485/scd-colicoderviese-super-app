/**
 * Thin "Prossimo appuntamento" strip under the header of the public pages (study 15/10/2026, block A action 1,
 * reference 16): "Prossima gara tra 2g 4h · ColicoDerviese Prima – ARS Rovagnate", or "In campo ora" when a game is
 * being played. Not on the home (its card has the full countdown) nor on /calendario (its own live pulse). Data from
 * the shared club-pulse query; the time left ticks every minute on the device, from the server's clock.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { compactLeft } from "@/lib/club-pulse";
import { crestFor } from "@/lib/crests";
import { useClubPulse } from "@/lib/use-club-pulse";

const HIDDEN_ON = new Set(["/", "/calendario"]);

export function NextUpBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { pulse, pending } = useClubPulse();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (HIDDEN_ON.has(pathname)) return null;
  // While the answer is on its way the room is reserved, so the strip never pushes the content down later;
  // with no game in the week (or no answer) nothing is drawn.
  if (pending || now === null)
    return <div aria-hidden="true" className="h-11" data-testid="next-up-bar-slot" />;
  if (!pulse || (pulse.live === 0 && !pulse.next)) return null;
  const live = pulse.live > 0;
  const n = pulse.next;
  // Device clock corrected by the server's: the strip never shows a time the server would not.
  const skew = pulse.serverNow - (pulse.receivedAt ?? pulse.serverNow);
  const left = n ? compactLeft(n.startMs - (now + skew)) : "";
  const pair = n
    ? n.homeAway === "FUORI"
      ? `${crestFor(n.opponent).label} – ColicoDerviese ${n.category}`
      : `ColicoDerviese ${n.category} – ${crestFor(n.opponent).label}`
    : "";
  return (
    <Link
      to="/calendario"
      {...(n && !live ? { search: { annata: n.group } as never } : {})}
      data-testid="next-up-bar"
      data-live={live || undefined}
      className={`scd-focus flex min-h-11 items-center justify-center gap-2 px-4 text-[13.5px] font-semibold ${live ? "bg-[#e11d2e] text-white" : "bg-[#0b2a5b] text-white"}`}
    >
      {live ? (
        <>
          <span aria-hidden="true" className="scd-live-dot size-2 rounded-full bg-white" />
          <span>
            In campo ora: {pulse.live === 1 ? "una gara" : `${pulse.live} gare`} della ColicoDerviese
          </span>
        </>
      ) : (
        <>
          <span className="shrink-0 rounded-[4px] bg-[#ffd600] px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#0b1e3a]">
            tra {left}
          </span>
          <span className="truncate">
            <span className="sr-only">Prossima gara: </span>
            {pair}
          </span>
        </>
      )}
      <ChevronRight className="size-4 shrink-0 opacity-80" aria-hidden="true" />
    </Link>
  );
}
