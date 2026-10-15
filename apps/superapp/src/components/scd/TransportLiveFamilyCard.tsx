import { useServerFn } from "@tanstack/react-start";
import { Bus } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { FAMILY_REFRESH_MS, LIVE_STATE_LABEL, agoLabel, distanceLabel, etaLabel, type LiveState } from "@/lib/transport-live";
import { getFamilyLive, type FamilyLive } from "@/lib/transport-live.functions";

const TONE: Readonly<Record<LiveState, ChipTone>> = { NON_PARTITO: "mute", IN_VIAGGIO: "ok", CONCLUSO: "info" };

/**
 * "Dov'è il pulmino" (r110) in the family area: today's runs where a person of the caller's circle has a confirmed seat.
 * Status, last update, distance and arrival "stima"; refreshed every 20 s while the page is visible. No names, no map,
 * no coordinates. Nothing for anonymous users; "Funzione in preparazione" until r110 is applied.
 */
export function TransportLiveFamilyCard({ initial }: { initial: FamilyLive }) {
  const load = useServerFn(getFamilyLive);
  const [live, setLive] = useState(initial);
  const [now, setNow] = useState(() => Date.parse(initial.checkedAt) || 0);

  useEffect(() => {
    if (live.state !== "open") return;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await load();
        if (!stopped) setLive(next);
      } catch {
        /* keep the last answer; the next tick retries */
      }
    };
    const timer = window.setInterval(() => void tick(), FAMILY_REFRESH_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    setNow(Date.now());
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live.state, load]);

  if (live.state === "signed-out" || live.state === "unavailable") return null;
  if (live.state === "not-active") {
    return (
      <Card id="fam-diretta" title="Dov'è il pulmino" sub="Nel giorno della trasferta, se il posto è confermato." aside={<Chip tone="mute">in preparazione</Chip>}>
        <p className="m-0 px-4 pb-4 text-[15px] leading-snug sm:px-[18px]" data-testid="fam-live-inactive">
          Funzione in preparazione: quando la Direzione la attiva, qui vedi se il pulmino è partito, quanto manca e l'arrivo stimato.
        </p>
      </Card>
    );
  }
  if (live.items.length === 0) return null;
  return (
    <Card id="fam-diretta" title="Dov'è il pulmino" sub="Corse di oggi con un posto confermato per la tua famiglia. Distanza in linea d'aria, arrivo stimato: possono cambiare con il traffico.">
      <ul className="m-0 list-none p-0" data-testid="fam-live">
        {live.items.map((r) => (
          <li key={r.runId} className="flex flex-wrap items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
            <Bus className="mt-0.5 size-5 flex-none text-[var(--in-info)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[16px] leading-snug">{r.title}</b>
                <Chip tone={TONE[r.state]}>{LIVE_STATE_LABEL[r.state]}</Chip>
              </div>
              <p className="m-0 text-[14px] text-[var(--in-sub)]">Partenza {r.departure}{r.targetLabel ? ` · arrivo a ${r.targetLabel}` : ""}</p>
              {r.state === "IN_VIAGGIO" && (
                <dl className="m-0 mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[15px] sm:grid-cols-3">
                  <div><dt className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--in-sub)]">Ultimo aggiornamento</dt><dd className="m-0 font-semibold tabular-nums">{agoLabel(r.lastUpdate, now)}</dd></div>
                  <div><dt className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--in-sub)]">Distanza</dt><dd className="m-0 font-semibold tabular-nums">{r.distanceKm === null ? "non disponibile" : distanceLabel(r.distanceKm)}</dd></div>
                  <div><dt className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--in-sub)]">Arrivo</dt><dd className="m-0 font-semibold tabular-nums">{r.etaMinutes === null || r.distanceKm === null ? "non disponibile" : etaLabel({ distanceKm: r.distanceKm, minutes: r.etaMinutes, arriving: r.arriving, label: "stima" })}</dd></div>
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
