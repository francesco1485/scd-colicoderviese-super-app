/**
 * Phone notifications in the browser (r67). Pure helpers: what this device can do and what to tell the person.
 * The push worker (/push-sw.js) is separate from the offline worker (/sw.js): it only shows notifications and never
 * caches pages, so it is safe on staging too.
 */

export const PUSH_SW_URL = "/push-sw.js";
export const PUSH_SW_SCOPE = "/push/";

export type PushSupport =
  /** Browser cannot receive push at all. */
  | "unsupported"
  /** iPhone/iPad: works only after "Aggiungi alla schermata Home" (iOS 16.4+). */
  | "ios-install"
  | "ready";

export interface DeviceInfo {
  userAgent: string;
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
}

export function isIos(ua: string): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua));
}

export function pushSupport(d: DeviceInfo): PushSupport {
  if (isIos(d.userAgent) && !d.standalone) return "ios-install";
  if (!d.hasServiceWorker || !d.hasPushManager || !d.hasNotification) return "unsupported";
  return "ready";
}

/** VAPID public key (base64url) to the bytes PushManager.subscribe expects. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** ArrayBuffer key from PushSubscription.getKey to base64url (what the server stores). */
export function bufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] as number);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PushState = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "working" | "error";

export const PUSH_COPY: Readonly<Record<PushState, { title: string; text: string }>> = {
  checking: { title: "Notifiche", text: "Controllo questo telefono…" },
  unsupported: { title: "Notifiche non disponibili", text: "Questo browser non riceve notifiche. Le convocazioni restano qui sotto: apri l'app per vederle." },
  "ios-install": {
    title: "Ricevi le convocazioni sul telefono",
    text: "Su iPhone: tocca Condividi, poi \"Aggiungi alla schermata Home\". Apri l'app dall'icona e torna qui per attivare le notifiche.",
  },
  denied: { title: "Notifiche bloccate", text: "Le hai bloccate per questo sito. Riattivale dalle impostazioni del browser, poi ricarica la pagina." },
  off: { title: "Ricevi le convocazioni sul telefono", text: "Ti avvisiamo appena il mister ti convoca. Niente pubblicità, solo convocazioni." },
  on: { title: "Notifiche attive", text: "Questo telefono riceve un avviso per ogni nuova convocazione." },
  working: { title: "Notifiche", text: "Un momento…" },
  error: { title: "Notifiche non attivate", text: "Qualcosa non ha funzionato. Riprova tra poco." },
};

/** Text added to the mister's confirmation after a send. */
export function deliveryNote(d: { devices: number; callups: number } | null): string {
  if (!d) return "";
  if (d.devices === 0) return " Nessuna famiglia ha ancora attivato le notifiche: vedranno la convocazione aprendo l'app.";
  return ` Avviso inviato sul telefono per ${d.callups} ${d.callups === 1 ? "convocato" : "convocati"}.`;
}
