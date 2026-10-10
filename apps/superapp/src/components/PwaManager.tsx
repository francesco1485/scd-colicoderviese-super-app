/// <reference types="vite-plugin-pwa/client" />
import { useEffect, useState } from "react";

/** Unico punto di registrazione del service worker, con guardie preview/dev. */
function refusedContext() {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(h)) return true;
  if (/(^|\.)beta\.lovable\.dev$/.test(h)) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSw() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
}

export function PwaManager() {
  const [update, setUpdate] = useState<null | ((reload?: boolean) => Promise<void>)>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (refusedContext()) {
      void unregisterAppSw();
      return;
    }
    let cancelled = false;
    import("virtual:pwa-register").then(({ registerSW }) => {
      if (cancelled) return;
      const updateSW = registerSW({
        onNeedRefresh: () => setUpdate(() => updateSW),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;
  return (
    <div role="alert" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl surface-deep p-4 shadow-premium">
      <p className="flex-1 text-sm">Nuova versione dell'app disponibile.</p>
      <button onClick={() => update(true)} className="surface-sun rounded-lg px-3 py-2 text-xs font-bold uppercase">Aggiorna</button>
      <button onClick={() => setUpdate(null)} className="text-xs opacity-75">Dopo</button>
    </div>
  );
}
