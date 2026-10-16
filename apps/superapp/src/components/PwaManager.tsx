/// <reference types="vite-plugin-pwa/client" />
import { useEffect, useState } from "react";

import { startInstallCapture } from "@/lib/install-prompt";

/** Unico punto di registrazione del service worker, con guardie preview/dev. */
function refusedContext() {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(h)) return true;
  if (/(^|\.)beta\.lovable\.dev$/.test(h)) return true;
  // Staging/review hosts: always the latest deploy, never an offline copy.
  if (h.endsWith(".onrender.com") || h === "localhost" || h === "127.0.0.1") return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSw() {
  const regs = await navigator.serviceWorker.getRegistrations();
  const ours = regs.filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith("/sw.js"));
  await Promise.all(ours.map((r) => r.unregister()));
  let cleared = 0;
  try {
    const keys = await caches.keys();
    const old = keys.filter((k) => k === "scd-pages" || k.startsWith("workbox-precache"));
    await Promise.all(old.map((k) => caches.delete(k)));
    cleared = old.length;
  } catch {
    /* Cache API unavailable: nothing to clear */
  }
  // The page was served by the old offline copy: reload once to get the live version.
  if (ours.length > 0 || cleared > 0) {
    try {
      if (sessionStorage.getItem("scd-sw-cleared") !== "1") {
        sessionStorage.setItem("scd-sw-cleared", "1");
        window.location.reload();
      }
    } catch {
      /* storage blocked: skip the reload rather than risk a loop */
    }
  }
}

export function PwaManager() {
  const [update, setUpdate] = useState<null | ((reload?: boolean) => Promise<void>)>(null);

  useEffect(() => {
    // Keep the browser's install dialog for the "Installa l'app" button (it fires once, early).
    startInstallCapture();
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
