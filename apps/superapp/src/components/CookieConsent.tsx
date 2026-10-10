import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  CONSENT_KEY,
  marketingAllowed,
  parseConsent,
  type Consent,
} from "@/lib/universe";

/**
 * Consenso cookie secondo le Linee guida del Garante (2021): "Rifiuta" e "Accetta tutti" con lo stesso peso,
 * la X equivale a rifiutare, nessun blocco dei contenuti. Prima della scelta girano solo i cookie tecnici.
 * Nessun pixel è configurato oggi: quando la società fornirà gli ID, si caricheranno solo se
 * marketingAllowed() è vero (consenso marketing e pagina pubblica, mai aree riservate o minori).
 */
export const openCookiePrefs = () =>
  window.dispatchEvent(new CustomEvent("scd:cookie-prefs"));

function readConsent(): Consent | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  } catch {
    /* storage bloccato: la scelta vale per questa visita */
  }
  window.dispatchEvent(new CustomEvent("scd:consent", { detail: c }));
}

export function CookieConsent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [consent, setConsent] = useState<Consent | null>(null);
  const [banner, setBanner] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [stats, setStats] = useState(false);
  const [mkt, setMkt] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setConsent(c);
    if (c) return undefined;
    const t = setTimeout(() => setBanner(true), 900);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const open = () => {
      const c = readConsent();
      setStats(!!c?.stats);
      setMkt(!!c?.mkt);
      setPrefs(true);
    };
    window.addEventListener("scd:cookie-prefs", open);
    return () => window.removeEventListener("scd:cookie-prefs", open);
  }, []);
  useEffect(() => {
    document.documentElement.dataset["consentStats"] = String(!!consent?.stats);
    document.documentElement.dataset["consentMarketing"] = String(
      marketingAllowed(consent, pathname),
    );
  }, [consent, pathname]);

  const save = (s: boolean, m: boolean) => {
    const c: Consent = { v: 1, stats: s, mkt: m, ts: new Date().toISOString() };
    writeConsent(c);
    setConsent(c);
    setBanner(false);
    setPrefs(false);
  };

  return (
    <>
      {banner && !prefs && (
        <div
          role="dialog"
          aria-labelledby="ck-t"
          aria-describedby="ck-d"
          data-testid="cookie-banner"
          className="fixed inset-x-3 bottom-[calc(118px+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-[560px] rounded-[18px] border-2 border-[var(--uv-gold)] bg-white p-4 text-[var(--scd-ink)] shadow-[0_18px_50px_rgb(0_0_0/0.5)] lg:bottom-[62px]"
        >
          <div className="flex items-center justify-between gap-2">
            <b id="ck-t" className="font-uv text-[22px] uppercase leading-none">
              Cookie e privacy
            </b>
            <button
              type="button"
              onClick={() => save(false, false)}
              aria-label="Chiudi e rifiuta i cookie non necessari"
              className="flex size-11 items-center justify-center rounded-full bg-[#eef4ff] text-[20px]"
            >
              ×
            </button>
          </div>
          <p
            id="ck-d"
            className="mb-3 mt-[6px] text-[14px] leading-[1.4] text-[var(--scd-sub)]"
          >
            Usiamo cookie tecnici per far funzionare l'app. Con il tuo consenso
            usiamo anche statistiche anonime e strumenti di Meta e TikTok per
            misurare le campagne. Nelle aree riservate e nei profili dei minori
            non usiamo mai cookie di marketing.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => save(false, false)}
              className="min-h-12 rounded-[12px] bg-[var(--uv-night)] text-[15px] font-extrabold text-white"
            >
              Rifiuta
            </button>
            <button
              type="button"
              onClick={() => save(true, true)}
              className="min-h-12 rounded-[12px] bg-[var(--uv-night)] text-[15px] font-extrabold text-white"
            >
              Accetta tutti
            </button>
            <button
              type="button"
              onClick={() => {
                setStats(false);
                setMkt(false);
                setPrefs(true);
              }}
              className="col-span-2 min-h-12 rounded-[12px] border-2 border-[var(--scd-line)] text-[15px] font-extrabold"
            >
              Personalizza
            </button>
          </div>
        </div>
      )}
      {prefs && (
        <>
          <button
            type="button"
            aria-label="Chiudi preferenze"
            onClick={() => setPrefs(false)}
            className="fixed inset-0 z-[71] cursor-default bg-[#00081e]/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pf-t"
            className="fixed inset-x-0 bottom-0 z-[72] mx-auto max-w-[600px] rounded-t-[22px] border-t-[5px] border-[var(--uv-gold)] bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 text-[var(--scd-ink)]"
          >
            <div className="flex items-center justify-between">
              <h2
                id="pf-t"
                className="font-uv text-[28px] uppercase leading-none"
              >
                Preferenze cookie
              </h2>
              <button
                type="button"
                onClick={() => setPrefs(false)}
                className="min-h-11 rounded-full bg-[#eef4ff] px-4 font-extrabold"
              >
                Chiudi
              </button>
            </div>
            <Toggle
              title="Necessari"
              text="Accesso, preferenze, sicurezza. Sempre attivi."
              checked
              disabled
            />
            <Toggle
              title="Statistiche"
              text="Conteggi anonimi di visite e tocchi: servono a migliorare l'app e a dare numeri veri agli sponsor."
              checked={stats}
              onChange={setStats}
            />
            <Toggle
              title="Marketing"
              text="Meta Pixel e TikTok Pixel per misurare le campagne social. Mai nelle aree riservate né nei profili dei minori."
              checked={mkt}
              onChange={setMkt}
            />
            <button
              type="button"
              onClick={() => save(stats, mkt)}
              className="mt-4 min-h-[50px] w-full rounded-[14px] bg-[var(--uv-night)] font-uv text-[20px] uppercase tracking-[0.06em] text-[var(--uv-gold)]"
            >
              Salva le scelte
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Toggle({
  title,
  text,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--scd-line)] py-3">
      <span>
        <b className="block text-[15.5px]">{title}</b>
        <small className="mt-[2px] block text-[13px] leading-[1.35] text-[var(--scd-sub)]">
          {text}
        </small>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="relative h-[30px] w-[52px] cursor-pointer appearance-none rounded-full bg-[var(--scd-line)] transition-colors after:absolute after:left-[3px] after:top-[3px] after:size-6 after:rounded-full after:bg-white after:shadow after:transition-[left] after:content-[''] checked:bg-[var(--scd-green)] checked:after:left-[25px] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
