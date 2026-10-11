import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/scd/interior-ui";
import {
  PUSH_COPY,
  PUSH_SW_SCOPE,
  PUSH_SW_URL,
  bufferToBase64Url,
  pushSupport,
  urlBase64ToUint8Array,
  type PushState,
} from "@/lib/push";
import { getPushConfig, removePushSubscription, savePushSubscription } from "@/lib/push.functions";

async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
  if (existing && (existing.active ?? existing.waiting ?? existing.installing)?.scriptURL.endsWith(PUSH_SW_URL)) return existing;
  const reg = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
  if (reg.active) return reg;
  await new Promise<void>((resolve) => {
    const sw = reg.installing ?? reg.waiting;
    if (!sw) return resolve();
    sw.addEventListener("statechange", () => sw.state === "activated" && resolve());
    setTimeout(resolve, 5000);
  });
  return reg;
}

/** "Ricevi le convocazioni sul telefono": one card, one button. */
export function PushCard() {
  const [state, setState] = useState<PushState>("checking");
  const [key, setKey] = useState<string | null>(null);
  const loadConfig = useServerFn(getPushConfig);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);

  useEffect(() => {
    let alive = true;
    (async () => {
      const support = pushSupport({
        userAgent: navigator.userAgent,
        standalone: window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
        hasServiceWorker: "serviceWorker" in navigator,
        hasPushManager: "PushManager" in window,
        hasNotification: "Notification" in window,
      });
      if (support !== "ready") return alive && setState(support);
      if (Notification.permission === "denied") return alive && setState("denied");
      try {
        const cfg = await loadConfig();
        if (!alive) return;
        setKey(cfg.publicKey);
        if (!cfg.publicKey) return setState("unsupported");
        const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadConfig]);

  async function turnOn() {
    if (!key) return;
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await pushRegistration();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) as BufferSource }));
      const r = await save({ data: { endpoint: sub.endpoint, p256dh: bufferToBase64Url(sub.getKey("p256dh")), auth: bufferToBase64Url(sub.getKey("auth")), userAgent: navigator.userAgent.slice(0, 200) } });
      setState(r.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  async function turnOff() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("error");
    }
  }

  const copy = PUSH_COPY[state];
  const busy = state === "checking" || state === "working";
  return (
    <Card id="fam-notifiche" className={state === "on" ? "" : "border-[var(--in-info)]"}>
      <div className="flex items-start gap-3 px-4 py-4 sm:px-[18px]" data-testid="push-card" data-state={state}>
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${state === "on" ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-info-bg)] text-[var(--in-info)]"}`} aria-hidden="true">
          {state === "ios-install" ? <Share className="size-5" /> : state === "denied" || state === "unsupported" ? <BellOff className="size-5" /> : <Bell className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[17px] font-bold leading-tight">{copy.title}</h2>
          <p className="m-0 mt-1 text-[14.5px] leading-snug text-[var(--in-sub)]" role={state === "error" ? "alert" : undefined}>{copy.text}</p>
          {(state === "off" || state === "error") && key && (
            <button type="button" onClick={turnOn} disabled={busy} className="scd-focus mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50" data-testid="push-on">
              <Bell className="size-4" aria-hidden="true" />
              Attiva le notifiche
            </button>
          )}
          {state === "on" && (
            <button type="button" onClick={turnOff} className="scd-focus mt-2 h-10 text-[14px] font-semibold text-[var(--in-sub)] underline" data-testid="push-off">
              Disattiva su questo telefono
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
