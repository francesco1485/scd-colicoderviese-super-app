import { useServerFn } from "@tanstack/react-start";
import { Navigation, RotateCw } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { DRIVER_ACK_TEXT, PING_INTERVAL_MS, isSessionOpen, liveErrorText, pingFromFix, shouldSendPing, type DriverRun } from "@/lib/transport-live";
import { pingLive, startLiveRun, stopLiveRun, type DriverPanel } from "@/lib/transport-live.functions";

const btnMain = "scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-5 text-[16px] font-bold text-[#062a52] disabled:opacity-50";
const btnStop = "scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#9a1d14] px-5 text-[16px] font-bold text-white disabled:opacity-50";
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface FixLike {
  coords: { latitude: number; longitude: number; accuracy: number; speed: number | null; heading: number | null };
  timestamp: number;
}

/** False when this document was loaded with Permissions-Policy geolocation=() (e.g. reached by in-app navigation). */
function documentAllowsGeolocation(): boolean {
  const d = document as unknown as { permissionsPolicy?: { allowsFeature?: (f: string) => boolean }; featurePolicy?: { allowsFeature?: (f: string) => boolean } };
  const policy = d.permissionsPolicy ?? d.featurePolicy;
  try {
    return typeof policy?.allowsFeature === "function" ? policy.allowsFeature("geolocation") : true;
  } catch {
    return true;
  }
}

interface Active {
  sessionId: string;
  runId: string;
}

/**
 * "Pulmino in diretta" — driver panel on /pulmini (r110). Shown only to a signed-in account linked to the driver
 * assigned to today's run; "Funzione in preparazione" until r110 is applied. While sharing: watchPosition, one point
 * every 15 s, Screen Wake Lock when the browser allows it, and a permanent "Posizione condivisa" banner.
 */
export function TransportLiveDriverPanel({ panel }: { panel: DriverPanel }) {
  if (panel.state === "not-active" || panel.state === "unavailable") {
    return (
      <div className="mb-[18px]">
      <Card id="pul-diretta" title="Pulmino in diretta" sub="La posizione del pulmino per le famiglie, dal telefono dell'autista volontario." aside={<Chip tone="mute">in preparazione</Chip>}>
        <p className="m-0 px-4 pb-4 text-[15px] leading-snug sm:px-[18px]" data-testid="live-driver-inactive">
          Funzione in preparazione: serve l'OK della Direzione (informativa e conferma degli autisti). Nessuna posizione viene condivisa.
        </p>
      </Card>
      </div>
    );
  }
  if (panel.state !== "open") return null;
  return <DriverRuns panel={panel} />;
}

function DriverRuns({ panel }: { panel: DriverPanel }) {
  const start = useServerFn(startLiveRun);
  const stop = useServerFn(stopLiveRun);
  const ping = useServerFn(pingLive);
  const ackId = useId();
  const [acknowledged, setAcknowledged] = useState(panel.acknowledged);
  const [ackChecked, setAckChecked] = useState(false);
  const [arrival, setArrival] = useState<string>(panel.arrivals[0]?.key ?? "");
  const [active, setActive] = useState<Active | null>(() => {
    const r = panel.runs.find((x) => x.session && isSessionOpen(x.session));
    return r?.session ? { sessionId: r.session.id, runId: r.runId } : null;
  });
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [wakeNote, setWakeNote] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [lastSent, setLastSent] = useState<number | null>(null);

  const fixRef = useRef<FixLike | null>(null);
  const lastSentRef = useRef<number | null>(null);
  const sendingRef = useRef(false);

  const endLocal = useCallback((message: string | null) => {
    setSharing(false);
    setActive(null);
    if (message) setNote(message);
  }, []);

  const sendLatest = useCallback(async (sessionId: string) => {
    const fix = fixRef.current;
    if (!fix || sendingRef.current || !shouldSendPing(lastSentRef.current, Date.now(), PING_INTERVAL_MS - 500)) return;
    sendingRef.current = true;
    try {
      const res = await ping({ data: pingFromFix(sessionId, fix) });
      if (res.ok) {
        lastSentRef.current = Date.now();
        setLastSent(lastSentRef.current);
        setGpsNote(null);
      } else if (res.code === "expired" || res.code === "closed" || res.code === "not_found" || res.code === "NOT_ACTIVE") {
        endLocal(liveErrorText(res.code));
      } else if (res.code !== "BUSY" && res.code !== "too_soon") {
        setGpsNote(res.message);
      }
    } catch {
      setGpsNote("Rete assente: la posizione riparte appena torna il segnale.");
    } finally {
      sendingRef.current = false;
    }
  }, [ping, endLocal]);

  // Position watch + 15 s sender while sharing.
  useEffect(() => {
    if (!sharing || !active) return;
    if (!("geolocation" in navigator)) {
      setGpsNote("Questo telefono non dà la posizione al browser.");
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const first = fixRef.current === null;
        fixRef.current = pos;
        if (first) void sendLatest(active.sessionId);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsNote("Permesso posizione negato: abilitalo per questo sito nelle impostazioni del browser.");
          if (!documentAllowsGeolocation()) setNeedsReload(true);
        } else {
          setGpsNote("Segnale GPS debole: continuo a provare.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    const timer = window.setInterval(() => void sendLatest(active.sessionId), PING_INTERVAL_MS);
    return () => {
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(timer);
      fixRef.current = null;
    };
  }, [sharing, active, sendLatest]);

  // Screen Wake Lock while sharing (re-acquired when the page is visible again; rejection handled).
  useEffect(() => {
    if (!sharing) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    const acquire = async () => {
      if (!nav.wakeLock || document.visibilityState !== "visible") {
        if (!nav.wakeLock) setWakeNote("Tieni lo schermo acceso: questo browser non lo fa da solo.");
        return;
      }
      try {
        const s = await nav.wakeLock.request("screen");
        if (cancelled) void s.release().catch(() => undefined);
        else {
          sentinel = s;
          setWakeNote(null);
        }
      } catch {
        setWakeNote("Tieni lo schermo acceso: il telefono non ha concesso di lasciarlo acceso.");
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [sharing]);

  const begin = async (run: DriverRun) => {
    setNote(null);
    setGpsNote(null);
    if (!documentAllowsGeolocation()) {
      setNeedsReload(true);
      return;
    }
    if (!("geolocation" in navigator)) {
      setNote("Questo telefono non dà la posizione al browser.");
      return;
    }
    setBusy(true);
    try {
      const res = await start({ data: { runId: run.runId, acknowledged: acknowledged || ackChecked, arrival: (arrival || null) as "COLICO" | "DERVIO" | null } });
      if (!res.ok || !res.sessionId) {
        setNote(res.message);
        if (res.code === "ack_required") setAcknowledged(false);
        return;
      }
      setAcknowledged(true);
      setActive({ sessionId: res.sessionId, runId: run.runId });
      lastSentRef.current = null;
      setLastSent(null);
      setSharing(true);
      setNote(res.message);
    } catch {
      setNote(liveErrorText(null));
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const res = await stop({ data: { sessionId: active.sessionId } });
      if (res.ok) endLocal(res.message);
      else setNote(res.message);
    } catch {
      setNote(liveErrorText(null));
    } finally {
      setBusy(false);
    }
  };

  const activeRun = active ? panel.runs.find((r) => r.runId === active.runId) ?? null : null;
  const canStart = acknowledged || ackChecked;

  return (
    <>
      {active && (
        <div role="status" aria-live="polite" data-testid="live-banner"
          className={`sticky top-2 z-30 mb-[18px] flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] px-4 py-3 text-white shadow-[0_10px_30px_-12px_rgb(6_42_82/0.6)] ${sharing ? "bg-[#0f7a28]" : "bg-[#8a5300]"}`}>
          <span className="relative flex size-3 flex-none" aria-hidden="true">
            {sharing && <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />}
            <span className="relative inline-flex size-3 rounded-full bg-white" />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug">
            {sharing ? "Posizione condivisa" : "Condivisione in pausa su questo telefono"}
            <span className="block text-[13px] font-semibold opacity-90">
              {activeRun ? `${activeRun.title} · partenza ${activeRun.departure}` : "Corsa in diretta"}
              {sharing && lastSent ? ` · ultimo invio ${new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Rome" }).format(lastSent)}` : ""}
            </span>
          </span>
          {!sharing && activeRun && (
            <button type="button" className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-white px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50" disabled={busy} onClick={() => void begin(activeRun)}>
              Riprendi
            </button>
          )}
          <button type="button" className="scd-focus inline-flex h-11 items-center rounded-[10px] border-2 border-white px-4 text-[15px] font-bold text-white disabled:opacity-50" disabled={busy} onClick={() => void end()} data-testid="live-banner-stop">
            Termina corsa
          </button>
        </div>
      )}
      <div className="mb-[18px]">
      <Card id="pul-diretta" title="Pulmino in diretta" sub="Solo per l'autista assegnato: le famiglie dei ragazzi confermati vedono stato, ultimo aggiornamento, distanza e arrivo stimato. Nessuna mappa." aside={<Chip tone={sharing ? "ok" : "info"}>{sharing ? "in diretta" : "autista"}</Chip>}>
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]" data-testid="live-driver">
          {needsReload && (
            <div className="rounded-[10px] border border-[var(--in-line)] bg-[var(--in-warn-bg)] p-3 text-[14.5px]" role="alert">
              <p className="m-0">Per usare la posizione questa pagina va aperta di nuovo.</p>
              <button type="button" className={`${btnGhost} mt-2`} onClick={() => window.location.reload()}>
                <RotateCw className="size-4" aria-hidden="true" />Ricarica la pagina
              </button>
            </div>
          )}
          {panel.runs.length === 0 ? (
            <p className="m-0 text-[15px] text-[var(--in-sub)]">Oggi non hai corse assegnate.</p>
          ) : (
            <>
              {!acknowledged && (
                <div className="rounded-[10px] border border-[var(--in-line)] bg-[var(--in-info-bg)] p-3" role="group" aria-labelledby={ackId}>
                  <p id={ackId} className="m-0 text-[14px] font-bold">Prima della prima corsa</p>
                  <ul className="m-0 mt-1 list-disc pl-5 text-[14px] leading-snug">
                    {DRIVER_ACK_TEXT.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  <label className="mt-2 flex min-h-11 items-center gap-2 text-[15px] font-semibold">
                    <input type="checkbox" className="size-5" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} data-testid="live-ack" />
                    Ho letto e accetto di condividere la posizione durante le mie corse
                  </label>
                </div>
              )}
              {panel.arrivals.length > 0 && !active && (
                <label className="flex flex-col gap-1 text-[14px] font-semibold">
                  Arrivo previsto
                  <select className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]" value={arrival} onChange={(e) => setArrival(e.target.value)}>
                    {panel.arrivals.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                </label>
              )}
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {panel.runs.map((r) => {
                  const live = active?.runId === r.runId;
                  return (
                    <li key={r.runId} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--in-line)] bg-white p-3">
                      <Navigation className="size-5 flex-none text-[var(--in-info)]" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <b className="block text-[16px] leading-snug">{r.title}</b>
                        <span className="block text-[14px] text-[var(--in-sub)]">
                          Partenza {r.departure}{r.returnEstimate ? ` · rientro previsto ${r.returnEstimate}` : ""}{r.destination ? ` · ${r.destination}` : ""}
                        </span>
                      </span>
                      {live ? (
                        <button type="button" className={`${btnStop} w-full sm:w-auto`} disabled={busy} onClick={() => void end()} data-testid="live-stop">Termina corsa</button>
                      ) : (
                        <button type="button" className={`${btnMain} w-full sm:w-auto`} disabled={busy || !canStart || Boolean(active)} onClick={() => void begin(r)} data-testid="live-start">Inizia corsa</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {(note || gpsNote || wakeNote) && (
            <div role="status" aria-live="polite" className="flex flex-col gap-1 text-[14px] text-[var(--in-sub)]">
              {note && <p className="m-0">{note}</p>}
              {gpsNote && <p className="m-0 font-semibold text-[var(--in-warn)]">{gpsNote}</p>}
              {wakeNote && <p className="m-0">{wakeNote}</p>}
            </div>
          )}
        </div>
      </Card>
      </div>
    </>
  );
}
