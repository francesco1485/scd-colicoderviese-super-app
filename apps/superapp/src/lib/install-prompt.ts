/**
 * One-tap install of the web app (Francesco 15/10/2026: "non la fa nemmeno scaricare ma solo utilizzare il link").
 * Chrome/Edge/Samsung Internet fire `beforeinstallprompt` once, early, when the app is installable: we keep that
 * event so a button can open the real install dialog later. Safari (iPhone/iPad) has no such event: the person must
 * use Share → "Aggiungi alla schermata Home", so we show the steps instead.
 *
 * The listener is attached by {@link startInstallCapture}, called from PwaManager (mounted once in the root), so the
 * event is not lost before the /installa page or the home card are rendered.
 */
import { isIos } from "./push";

/** Subset of the non-standard BeforeInstallPromptEvent we use. */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export type InstallMode =
  /** Already opened as an installed app (standalone): nothing to do. */
  | "installed"
  /** The browser gave us its install dialog: one tap. */
  | "one-tap"
  /** iPhone/iPad in Safari: show Share → Add to Home Screen. */
  | "ios-steps"
  /** iPhone/iPad in another browser (Chrome, Firefox, in-app WhatsApp/Instagram): open in Safari first. */
  | "ios-open-safari"
  /** Android or desktop without the dialog (yet): show the browser menu steps. */
  | "menu-steps";

export interface InstallEnv {
  userAgent: string;
  standalone: boolean;
  hasPrompt: boolean;
}

/** In-app browsers and non-Safari iOS browsers cannot add a web app to the Home Screen reliably. */
export function isIosSafari(ua: string): boolean {
  if (!isIos(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|WhatsApp|Line\//.test(ua)) return false;
  return /Safari\//.test(ua);
}

/** What to offer on this device. Pure, tested. */
export function installMode(env: InstallEnv): InstallMode {
  if (env.standalone) return "installed";
  if (env.hasPrompt) return "one-tap";
  if (isIos(env.userAgent)) return isIosSafari(env.userAgent) ? "ios-steps" : "ios-open-safari";
  return "menu-steps";
}

type Listener = () => void;

let deferred: InstallPromptEvent | null = null;
let installedNow = false;
let started = false;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

/** Attach the global listeners once (browser only). Safe to call many times. */
export function startInstallCapture(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    // Keep the browser's own mini-infobar out of the way: our button opens the same dialog.
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

export function subscribeInstall(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function hasInstallPrompt(): boolean {
  return deferred !== null;
}

export function wasInstalledNow(): boolean {
  return installedNow;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true;
}

/** Opens the browser's install dialog. Returns the outcome, or "unavailable" when there is no dialog to open. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = deferred;
  if (!ev) return "unavailable";
  // The event can be used only once.
  deferred = null;
  emit();
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    if (choice.outcome === "accepted") installedNow = true;
    emit();
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}
