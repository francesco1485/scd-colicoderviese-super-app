import { Check, Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
 * The install card of /installa (Francesco 15/10/2026 18:52, board "installa-v2"): one tap where the browser allows it
 * (Chrome, Edge, Samsung Internet), the three illustrated steps on iPhone/iPad Safari, "open in Safari" inside other
 * iPhone browsers and in-app browsers, the browser menu otherwise, "already installed" when opened as the app.
 * Rendered after mount only: the server cannot know the device, so the server HTML shows the iPhone steps (the most
 * common case for families) and the card switches on the client.
 */
export function InstallButton() {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    startInstallCapture();
    const read = () =>
      setMode(
        wasInstalledNow()
          ? "installed"
          : installMode({
              userAgent: navigator.userAgent,
              standalone: isStandalone(),
              hasPrompt: hasInstallPrompt(),
              maxTouchPoints: navigator.maxTouchPoints,
            }),
      );
    read();
    return subscribeInstall(read);
  }, []);

  const shown: InstallMode = mode ?? "ios-steps";

  if (shown === "installed") {
    return (
      <Card badge="Fatto" title="L'app è installata">
        <p className="m-0 flex items-center gap-2 text-[15.5px] font-semibold text-emerald-800" data-testid="install-done">
          <Check className="size-5" aria-hidden="true" /> La trovi tra le app di questo dispositivo, con lo stemma.
        </p>
      </Card>
    );
  }

  if (dismissed) {
    return (
      <Card badge="Quando vuoi" title="Installa l'app">
        <p className="m-0 text-[15px] leading-relaxed" aria-live="polite" data-testid="install-dismissed">
          Nessun problema: puoi installarla quando vuoi dal menu <b>⋮</b> del browser, voce <b>Installa app</b>.
        </p>
      </Card>
    );
  }

  if (shown === "one-tap") {
    return (
      <Card badge="Un tocco" title="Installa l'app">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await promptInstall();
            setBusy(false);
            if (r === "dismissed") setDismissed(true);
          }}
          className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-[#0b2a5b] font-[family-name:var(--font-display)] text-[21px] font-extrabold uppercase tracking-[0.03em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          data-testid="install-one-tap"
        >
          <Download className="size-[22px] text-[var(--scd-yellow)]" aria-hidden="true" strokeWidth={2.4} /> Installa l'app
        </button>
        <p className="m-0 mt-2.5 text-center text-[13px] text-[#4a5d7e]">Gratis, senza store: l'icona con lo stemma compare tra le tue app.</p>
      </Card>
    );
  }

  if (shown === "ios-open-safari") {
    return (
      <Card badge="iPhone" title="Apri con Safari">
        <p className="m-0 text-[15px] leading-relaxed" data-testid="install-ios-safari">
          Su iPhone l'app si installa da <b>Safari</b>: copia l'indirizzo qui sotto, aprilo con Safari e segui i 3 tocchi.
        </p>
      </Card>
    );
  }

  if (shown === "menu-steps") {
    return (
      <Card badge="Android e computer" title="Installa dal menu">
        <p className="m-0 text-[15px] leading-relaxed" data-testid="install-menu-steps">
          Apri il menu <b>⋮</b> del browser e tocca <b>Installa app</b> (o “Aggiungi a schermata Home”).
        </p>
      </Card>
    );
  }

  return (
    <Card badge="iPhone · 30 secondi" title="Installa in 3 tocchi">
      <ol className="m-0 grid list-none grid-cols-3 gap-2.5 p-0" data-testid="install-ios-steps">
        <Step n={1} icon={<Share className="size-6" aria-hidden="true" strokeWidth={2.2} />} text="Tocca Condividi" />
        <Step n={2} icon={<SquarePlus className="size-6" aria-hidden="true" strokeWidth={2.2} />} text="Aggiungi a Home" />
        <Step n={3} icon={<Check className="size-6" aria-hidden="true" strokeWidth={2.4} />} text="Pronta, con lo stemma" />
      </ol>
      <p className="m-0 mt-2.5 text-center text-[13px] text-[#4a5d7e]">Su Android compare il pulsante “Installa l'app”: un tocco e basta.</p>
    </Card>
  );
}

function Card({ badge, title, children }: { badge: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby="install-card-t" className="rounded-[22px] bg-white p-5 text-[#0b2a5b] shadow-[0_18px_40px_rgba(0,0,0,0.35)]" data-testid="install-card">
      <span className="inline-block rounded-full bg-[var(--scd-yellow)] px-2.5 py-1 font-[family-name:var(--font-display)] text-[13px] font-extrabold uppercase tracking-[0.08em]">
        {badge}
      </span>
      <h2 id="install-card-t" className="m-0 mb-3.5 mt-2.5 font-[family-name:var(--font-display)] text-[26px] font-extrabold uppercase leading-none">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ n, icon, text }: { n: number; icon: ReactNode; text: string }) {
  return (
    <li className="rounded-[16px] bg-[#eef3f9] px-2 pb-3 pt-3.5 text-center">
      <span className="mx-auto mb-2 grid size-[46px] place-items-center rounded-full bg-[var(--scd-yellow)] text-[#0b2a5b]">{icon}</span>
      <span className="block font-[family-name:var(--font-brand)] text-[15px] text-[#1556c4]" aria-hidden="true">
        {n}
      </span>
      <span className="mt-0.5 block text-[13.5px] font-semibold leading-tight">{text}</span>
    </li>
  );
}
