import { Check, Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  hasInstallPrompt,
  installMode,
  isStandalone,
  promptInstall,
  startInstallCapture,
  subscribeInstall,
  wasInstalledNow,
  type InstallMode,
} from "@/lib/install-prompt";

/**
 * The real "Installa l'app" control (Francesco 15/10/2026): one tap where the browser allows it (Chrome, Edge, Samsung
 * Internet on Android and desktop), the exact steps on iPhone/iPad, and "already installed" when opened as the app.
 * Rendered only after mount: the server cannot know the device.
 */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    startInstallCapture();
    const read = () =>
      setMode(
        wasInstalledNow()
          ? "installed"
          : installMode({ userAgent: navigator.userAgent, standalone: isStandalone(), hasPrompt: hasInstallPrompt() }),
      );
    read();
    return subscribeInstall(read);
  }, []);

  if (mode === null) return null;

  if (mode === "installed") {
    return (
      <p className="m-0 inline-flex items-center gap-2 rounded-[12px] bg-emerald-50 px-4 py-3 text-[15px] font-semibold text-emerald-800" data-testid="install-done">
        <Check className="size-5" aria-hidden="true" /> L'app è installata sul tuo telefono.
      </p>
    );
  }

  if (mode === "one-tap") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await promptInstall();
            setBusy(false);
            if (r === "dismissed") setDismissed(true);
          }}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[var(--scd-yellow)] px-6 text-[17px] font-bold text-[#062a52] shadow-sm disabled:opacity-60"
          data-testid="install-one-tap"
        >
          <Download className="size-5" aria-hidden="true" /> Installa l'app
        </button>
        {dismissed ? (
          <p className="m-0 text-[13.5px] text-muted-foreground" aria-live="polite">
            Nessun problema: puoi installarla quando vuoi dal menu ⋮ del browser, voce “Installa app”.
          </p>
        ) : null}
      </div>
    );
  }

  if (mode === "ios-open-safari") {
    return (
      <p className="m-0 rounded-[12px] border border-border bg-white px-4 py-3 text-[15px] leading-relaxed" data-testid="install-ios-safari">
        Su iPhone l'app si installa da <b>Safari</b>: copia il link qui sotto, aprilo con Safari e segui i passi.
      </p>
    );
  }

  if (mode === "ios-steps") {
    return (
      <ol
        className={`m-0 grid list-none gap-2 p-0 text-[15.5px] leading-relaxed ${compact ? "" : "rounded-[14px] border border-border bg-white p-4"}`}
        data-testid="install-ios-steps"
      >
        <li className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--scd-blue)] text-[14px] font-bold text-white">1</span>
          <span>
            Tocca <Share className="inline size-4 align-[-2px]" aria-label="Condividi" /> <b>Condividi</b> in basso
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--scd-blue)] text-[14px] font-bold text-white">2</span>
          <span>
            Scegli <SquarePlus className="inline size-4 align-[-2px]" aria-hidden="true" /> <b>Aggiungi alla schermata Home</b>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--scd-blue)] text-[14px] font-bold text-white">3</span>
          <span>
            Tocca <b>Aggiungi</b>: l'icona con lo stemma è tra le tue app
          </span>
        </li>
      </ol>
    );
  }

  return (
    <p className="m-0 rounded-[12px] border border-border bg-white px-4 py-3 text-[15px] leading-relaxed" data-testid="install-menu-steps">
      Apri il menu <b>⋮</b> del browser e tocca <b>Installa app</b> (o “Aggiungi a schermata Home”).
    </p>
  );
}
