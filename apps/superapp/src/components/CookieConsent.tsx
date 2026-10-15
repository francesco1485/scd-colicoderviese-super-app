import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  CONSENT_KEY,
  consentCookie,
  consentFromCookie,
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
/** No statistics or marketing tool is configured today (audit 2026-10-12): the banner says so and asks nothing. */
export const OPTIONAL_TOOLS_ACTIVE = false;

export const openCookiePrefs = () =>
  window.dispatchEvent(new CustomEvent("scd:cookie-prefs"));

/**
 * The choice is kept in localStorage AND in a first-party technical cookie (UD-110 bug fix: "il banner ricompare a
 * ogni apertura della home"). Root cause: when localStorage is unavailable or wiped — in-app browsers (WhatsApp,
 * Instagram, Facebook), private windows, storage blocked by the browser — the write failed silently and the banner
 * came back on every load. The cookie is the fallback read when localStorage has nothing valid.
 */
function readConsent(): Consent | null {
  let fromStorage: Consent | null = null;
  try {
    fromStorage = parseConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    fromStorage = null;
  }
  if (fromStorage) return fromStorage;
  try {
    return parseConsent(consentFromCookie(document.cookie));
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  const raw = JSON.stringify(c);
  try {
    localStorage.setItem(CONSENT_KEY, raw);
  } catch {
    /* storage bloccato: resta il cookie tecnico */
  }
  try {
    document.cookie = consentCookie(raw, window.location.protocol === "https:");
  } catch {
    /* cookie bloccati: la scelta vale per questa visita */
  }
  window.dispatchEvent(new CustomEvent("scd:consent", { detail: c }));
}

/** interior: work-area shells have no bottom bar and no sponsor strip, so the strip sits at the very bottom. */
export function CookieConsent({ interior = false }: { interior?: boolean } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [consent, setConsent] = useState<Consent | null>(null);
  const [banner, setBanner] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [stats, setStats] = useState(false);
  const [mkt, setMkt] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setConsent(c);
    // In the page flow (UD-135): shown at hydration, no delay, so the layout settles once instead of jumping later.
    if (!c) setBanner(true);
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
      {banner && !prefs && !OPTIONAL_TOOLS_ACTIVE && (
        <div
          role="region"
          aria-label="Cookie e privacy"
          data-testid="cookie-banner"
          className={`flex items-center gap-3 bg-white px-4 py-0.5 text-[var(--scd-ink)] lg:justify-center ${interior ? "fixed inset-x-0 bottom-0 z-[45] border-t border-[#d5dfec] pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_16px_-10px_rgb(11_42_91/0.35)]" : "relative z-[1] border-b border-[#d5dfec]"}`}
        >
          <p className="m-0 min-w-0 flex-1 text-[12.5px] leading-[1.3] text-[var(--scd-sub)] lg:flex-none">
            Solo cookie tecnici: nessuna statistica, nessuna pubblicità.{" "}
            <a href="/privacy" className="font-semibold text-[var(--scd-blue)] underline">Privacy</a>
          </p>
          <button type="button" onClick={() => save(false, false)} className="min-h-11 shrink-0 rounded-[10px] px-3 text-[14px] font-extrabold text-[var(--scd-blue)]" data-testid="cookie-ok">
            Ho capito
          </button>
        </div>
      )}
      {banner && !prefs && OPTIONAL_TOOLS_ACTIVE && (
        <div
          role="dialog"
          aria-labelledby="ck-t"
          aria-describedby="ck-d"
          data-testid="cookie-banner-consent"
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
            Usiamo cookie tecnici per far funzionare l'app. Con il tuo consenso usiamo anche statistiche e strumenti di misura delle campagne. Nelle aree riservate e nei profili dei minori non usiamo mai cookie di marketing.{" "}
            <a href="/privacy" className="font-semibold text-[var(--scd-blue)] underline">Informativa privacy</a>
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
            {!OPTIONAL_TOOLS_ACTIVE && (
              <p className="m-0 py-3 text-[14px] leading-snug text-[var(--scd-sub)]">
                Oggi l'app non usa statistiche né strumenti di marketing: non c'è niente da attivare.{" "}
                <a href="/privacy" className="font-semibold text-[var(--scd-blue)] underline">Informativa privacy</a>
              </p>
            )}
            {OPTIONAL_TOOLS_ACTIVE && <Toggle
              title="Statistiche"
              text="Conteggi anonimi di visite e tocchi: servono a migliorare l'app e a dare numeri veri agli sponsor."
              checked={stats}
              onChange={setStats}
            />}
            {OPTIONAL_TOOLS_ACTIVE && <Toggle
              title="Marketing"
              text="Strumenti di misura delle campagne social, solo dopo che la società li avrà configurati. Mai nelle aree riservate né nei profili dei minori."
              checked={mkt}
              onChange={setMkt}
            />}
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
