import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

/* ------------------------------------------------------- per ogni età */

type Act = {
  icon: string;
  text: string;
  to?: string;
  action?: "crovi" | "bigtext";
};
const AGES: { key: string; label: string; see: Act[]; doo: Act[] }[] = [
  {
    key: "bimbi",
    label: "Bambini 5–10",
    see: [
      {
        icon: "⚽",
        text: "Piccoli Amici, Primi Calci e Pulcini",
        to: "/calendario",
      },
      {
        icon: "📅",
        text: "Gli allenamenti della settimana",
        to: "/allenamenti",
      },
    ],
    doo: [
      { icon: "🎉", text: "Eventi e feste del club", to: "/eventi" },
      { icon: "💬", text: "Fai una domanda a Crovi", action: "crovi" },
    ],
  },
  {
    key: "ragazzi",
    label: "Ragazzi 11–17",
    see: [
      { icon: "📅", text: "Le gare della tua annata", to: "/calendario" },
      { icon: "🏟️", text: "La Prima Squadra al Campo 1", to: "/calendario" },
    ],
    doo: [
      { icon: "✅", text: 'Premi "Ci sarò" sulla prossima gara', to: "/" },
      { icon: "🏆", text: "Tornei ed eventi", to: "/eventi" },
    ],
  },
  {
    key: "genitori",
    label: "Genitori",
    see: [
      {
        icon: "🗓️",
        text: "Gare e allenamenti della settimana",
        to: "/calendario",
      },
      { icon: "📣", text: "Comunicazioni del club", to: "/comunicazioni" },
    ],
    doo: [
      { icon: "👨‍👩‍👧", text: "Area famiglia e accesso", to: "/aree" },
      { icon: "📝", text: "Iscrivi tuo figlio", to: "/entra" },
    ],
  },
  {
    key: "tifosi",
    label: "Tifosi",
    see: [
      { icon: "🔥", text: "Prima Squadra e Juniores", to: "/calendario" },
      { icon: "▶️", text: "Partite e video su YouTube", to: "#seguici" },
    ],
    doo: [
      { icon: "🎟️", text: "Eventi e tornei", to: "/eventi" },
      { icon: "🤝", text: "Diventa partner del club", to: "/sponsor" },
    ],
  },
  {
    key: "nonni",
    label: "Nonni",
    see: [
      { icon: "🕙", text: "Orari delle gare", to: "/calendario" },
      {
        icon: "📍",
        text: "Campi e indicazioni",
        to: "/core/impianti-calendari",
      },
    ],
    doo: [
      { icon: "🔠", text: "Attiva il testo grande", action: "bigtext" },
      { icon: "💬", text: "Chiedi a Crovi", action: "crovi" },
    ],
  },
];

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* preferenza solo per questa visita */
  }
}

export function AgeGuide() {
  const [sel, setSel] = useState("genitori");
  const [big, setBig] = useState(false);
  useEffect(() => {
    const a = readLocal("scd-age");
    if (a && AGES.some((x) => x.key === a)) setSel(a);
    const b = readLocal("scd-big") === "1";
    setBig(b);
    document.documentElement.classList.toggle("uv-big", b);
  }, []);
  const toggleBig = () => {
    const v = !big;
    setBig(v);
    document.documentElement.classList.toggle("uv-big", v);
    writeLocal("scd-big", v ? "1" : "0");
  };
  const age = AGES.find((a) => a.key === sel)!;
  const item = (x: Act) => {
    const cls =
      "flex min-h-12 w-full items-center gap-[10px] rounded-[12px] bg-[#eef4ff] px-3 py-2 text-left text-[15px] font-bold text-[var(--scd-ink)]";
    const inner = (
      <>
        <i
          aria-hidden="true"
          className="w-[26px] text-center text-[20px] not-italic"
        >
          {x.icon}
        </i>
        {x.text}
        {x.action === "bigtext" && big ? " (attivo)" : ""}
      </>
    );
    if (x.action)
      return (
        <button
          type="button"
          className={cls}
          onClick={() =>
            x.action === "crovi"
              ? window.dispatchEvent(new CustomEvent("crovi:open"))
              : toggleBig()
          }
        >
          {inner}
        </button>
      );
    if (x.to?.startsWith("#"))
      return (
        <a href={x.to} className={cls}>
          {inner}
        </a>
      );
    return (
      <Link to={x.to!} className={cls}>
        {inner}
      </Link>
    );
  };
  return (
    <section
      className="rounded-[18px] bg-white p-4 text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-labelledby="age-t"
      data-testid="age-guide"
    >
      <h3 id="age-t" className="font-uv text-[26px] uppercase leading-none">
        Cosa vedere, cosa fare
      </h3>
      <div
        role="group"
        aria-label="Chi sei"
        className="scd-scroll-x -mx-4 mb-1 mt-3 flex gap-[6px] overflow-x-auto px-4"
      >
        {AGES.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-pressed={a.key === sel}
            onClick={() => {
              setSel(a.key);
              writeLocal("scd-age", a.key);
            }}
            className={`min-h-11 shrink-0 rounded-full border-2 px-[14px] text-[14.5px] font-extrabold ${a.key === sel ? "border-[var(--uv-night)] bg-[var(--uv-night)] text-[var(--uv-gold)]" : "border-[var(--scd-line)]"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="mt-[10px] grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div>
          <h4 className="mb-[6px] font-uv text-[16px] uppercase tracking-[0.1em] text-[var(--scd-sub)]">
            Da vedere
          </h4>
          <ul className="grid gap-[6px]">
            {age.see.map((x) => (
              <li key={x.text}>{item(x)}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-[6px] font-uv text-[16px] uppercase tracking-[0.1em] text-[var(--scd-sub)]">
            Da fare
          </h4>
          <ul className="grid gap-[6px]">
            {age.doo.map((x) => (
              <li key={x.text}>{item(x)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ social */

/** Canali ufficiali registrati nel manifest (source_registry). WhatsApp: tramite la pagina Facebook. */
const CHANNELS = [
  {
    name: "Sito",
    sub: "colicoderviese.it",
    href: "https://www.colicoderviese.it/",
    mark: "www",
    bg: "#021f4f",
  },
  {
    name: "Facebook",
    sub: "Pagina ufficiale",
    href: "https://www.facebook.com/ColicoDerviese",
    mark: "f",
    bg: "#1877f2",
  },
  {
    name: "Instagram",
    sub: "Reel e foto",
    href: "https://www.instagram.com/s.c.d.colicoderviese/",
    mark: "IG",
    bg: "linear-gradient(45deg,#f9a825,#e1306c,#7b2fbf)",
  },
  {
    name: "TikTok",
    sub: "Video brevi",
    href: "https://www.tiktok.com/@s.c.d..colicoderv",
    mark: "♪",
    bg: "#111",
  },
  {
    name: "YouTube",
    sub: "Partite e video",
    href: "https://www.youtube.com/@S.C.D.ColicoDerviese",
    mark: "▶",
    bg: "#e62117",
  },
  {
    name: "WhatsApp",
    sub: "Dalla pagina Facebook",
    href: "https://www.facebook.com/ColicoDerviese",
    mark: "WA",
    bg: "#1fa855",
  },
] as const;

export function SocialHub() {
  return (
    <section
      className="rounded-[18px] bg-white p-4 text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-labelledby="soc-t"
      data-testid="social-hub"
    >
      <h3
        id="soc-t"
        className="mb-[10px] font-uv text-[26px] uppercase leading-none"
      >
        I canali ufficiali SCD
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map((c) => (
          <a
            key={c.name}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[84px] flex-col items-center justify-center gap-[6px] rounded-[14px] bg-[#eef4ff] px-1 py-2 text-center text-[13.5px] font-extrabold leading-[1.15]"
          >
            <span
              aria-hidden="true"
              className="grid size-[38px] place-items-center rounded-[12px] text-[18px] font-black text-white"
              style={{ background: c.bg }}
            >
              {c.mark}
            </span>
            {c.name}
            <small className="text-[11.5px] font-semibold text-[var(--scd-sub)]">
              {c.sub}
            </small>
          </a>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------- iscrizione e inviti */

export function JoinCard() {
  return (
    <section
      className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--uv-royal)] to-[var(--uv-night)] p-5 pr-[120px] text-white shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-labelledby="join-t"
      data-testid="join-card"
    >
      <img
        src="/media/brand/sky-atv-cut.webp"
        alt=""
        className="pointer-events-none absolute -right-[14px] top-[18px] w-[132px] drop-shadow-[0_10px_16px_rgb(0_0_0/0.4)]"
        loading="lazy"
      />
      <h3 id="join-t" className="font-uv text-[30px] uppercase leading-[0.92]">
        Entra in <span className="text-[var(--uv-gold)]">squadra</span>
      </h3>
      <ul className="my-[14px] grid gap-[9px]">
        {[
          "Avvisi su orari, campi e cambi della tua annata",
          '"Ci sarò" e la tua agenda della settimana',
          "Un solo accesso per famiglia, atleta, staff",
          "In arrivo: coupon di benvenuto Club House con Sky",
        ].map((t) => (
          <li
            key={t}
            className="flex items-start gap-[10px] text-[15.5px] leading-[1.35]"
          >
            <Check
              className="mt-[1px] size-[22px] shrink-0 text-[var(--uv-gold)]"
              strokeWidth={2.6}
              aria-hidden="true"
            />
            {t}
          </li>
        ))}
      </ul>
      <Link
        to="/aree"
        className="flex min-h-[50px] items-center justify-center rounded-[14px] bg-[var(--uv-gold)] font-uv text-[20px] uppercase tracking-[0.06em] text-[var(--uv-night)] shadow-[0_4px_0_#b38f00]"
      >
        Scegli il tuo ingresso
      </Link>
      <small className="mt-[10px] block text-center text-[13px] text-[#c5d6f5]">
        Calendario e risultati restano aperti a tutti. Valore e regole del
        coupon li decide la società.
      </small>
    </section>
  );
}

export function InviteCard() {
  const text = encodeURIComponent(
    "Vieni con me a vedere la ColicoDerviese! Gare e allenamenti di tutte le squadre: https://www.colicoderviese.it/",
  );
  return (
    <section
      className="rounded-[18px] bg-white p-[18px] text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-labelledby="inv-t"
      data-testid="invite-card"
    >
      <h3 id="inv-t" className="font-uv text-[26px] uppercase leading-none">
        Porta un amico al campo
      </h3>
      <p className="my-2 text-[15px] text-[var(--scd-sub)]">
        Mandagli il calendario su WhatsApp. Il premio "partita gratis" per chi
        invita arriverà con l'accesso, alle regole decise dalla società.
      </p>
      <a
        href={`https://wa.me/?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-[#1fa855] font-uv text-[19px] uppercase tracking-[0.05em] text-white shadow-[0_4px_0_#11713a]"
      >
        Invita su WhatsApp
      </a>
      <small className="mt-2 block text-[13px] text-[var(--scd-sub)]">
        Nessun numero viene salvato dall'app.
      </small>
    </section>
  );
}

export function Affiliations() {
  return (
    <section aria-label="Affiliazioni" className="mt-6">
      <div className="flex items-center justify-around gap-3 rounded-[18px] bg-white p-[14px] shadow-[0_14px_28px_rgb(0_10_40/0.28)]">
        <img
          src="/media/affiliazioni/figc-sgs-3-livello.webp"
          alt="FIGC Settore Giovanile e Scolastico, Club 3° livello"
          className="h-[54px] w-auto max-w-[31%] object-contain"
          loading="lazy"
        />
        <img
          src="/media/affiliazioni/insieme-al-monza.webp"
          alt="Insieme al Monza, AC Monza"
          className="h-[54px] w-auto max-w-[31%] object-contain"
          loading="lazy"
        />
        <img
          src="/media/affiliazioni/lnd.webp"
          alt="FIGC Lega Nazionale Dilettanti"
          className="h-[54px] w-auto max-w-[31%] object-contain"
          loading="lazy"
        />
      </div>
      <span className="mt-2 block text-center text-[13px] font-bold text-[#cfe0ff]">
        Club FIGC SGS di 3° livello, affiliato AC Monza, iscritto LND
      </span>
    </section>
  );
}

/* ------------------------------------------------------------- Sky cameo */

/** Sky entra solo quando ha qualcosa di utile da dire, poi esce. Fermo con "riduci movimento". */
export function SkyCameo({
  message,
  onClose,
}: {
  message: { title: string; text: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed bottom-[calc(4.75rem+46px+72px+env(safe-area-inset-bottom))] right-0 z-[45] flex items-end transition-transform duration-500 ease-[cubic-bezier(.22,1.35,.4,1)] motion-reduce:transition-none lg:bottom-[140px] ${message ? "translate-x-[18px]" : "translate-x-[115%]"}`}
    >
      {message && (
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto mb-[96px] -mr-2 max-w-[190px] rounded-[18px_18px_4px_18px] border-[3px] border-[var(--uv-night)] bg-white px-[13px] py-[11px] text-left text-[14.5px] font-extrabold leading-[1.3] text-[var(--uv-night)] shadow-[5px_5px_0_var(--uv-gold)]"
        >
          <b className="mb-[3px] block font-uv text-[18px] uppercase text-[var(--uv-royal)]">
            {message.title}
          </b>
          {message.text}
        </button>
      )}
      <img
        src="/media/brand/sky-atv-cut.webp"
        alt=""
        className="w-[86px] drop-shadow-[0_10px_16px_rgb(0_0_0/0.45)] lg:w-[118px]"
      />
    </div>
  );
}
