import { Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";

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
        to: "/impianti",
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

/* ------------------------------------------------ identità e avatar */

const AVATAR_STEPS = [
  {
    title: "Un selfie, il tuo avatar",
    text: "L'app crea un volto realistico che ti somiglia ma non è una tua foto: in pubblico resti anonimo.",
  },
  {
    title: "Entri nella tua squadra",
    text: "Chi risulta tesserato trova la sua squadra e carica 1 foto per ogni partita. Dirigenti e staff hanno il loro avatar, così tutti li riconoscono.",
  },
  {
    title: "Se vuoi, colleghi Instagram",
    text: "Condividi i momenti della tua squadra con i tuoi amici, direttamente dall'app.",
  },
] as const;

/** Carta giocatore dimostrativa: sagoma generica, mai il volto di una persona reale. */
function AvatarCardDemo() {
  return (
    <div
      aria-hidden="true"
      className="avatar-card relative mx-auto grid w-[clamp(112px,32vw,140px)] shrink-0 justify-items-center rounded-[16px] border-[3px] border-[var(--uv-gold)] bg-gradient-to-b from-[#1f74d1] to-[var(--uv-night)] px-2 pb-2 pt-3 shadow-[0_10px_20px_rgb(0_0_0/0.35)]"
    >
      <span className="absolute left-2 top-2 rounded-[6px] bg-[var(--uv-gold)] px-[6px] py-[1px] font-uv text-[13px] uppercase text-[var(--uv-night)]">
        U16
      </span>
      <img
        src="/media/brand/logo-scd.webp"
        alt=""
        className="absolute right-2 top-2 size-[22px] object-contain"
      />
      <svg viewBox="0 0 100 100" className="mt-3 size-[clamp(64px,19vw,84px)]">
        <circle cx="50" cy="36" r="20" fill="#cfe0ff" />
        <path d="M14 98c3-24 18-36 36-36s33 12 36 36z" fill="#cfe0ff" />
        <circle
          cx="50"
          cy="36"
          r="20"
          fill="none"
          stroke="#ffd82a"
          strokeWidth="3"
          strokeDasharray="6 5"
        />
      </svg>
      <b className="mt-1 font-uv text-[17px] uppercase leading-none text-white">
        Il tuo nome
      </b>
      <span className="mt-[3px] text-[11.5px] font-semibold text-[#cfe0ff]">
        Avatar realistico
      </span>
      <span className="mt-2 flex w-full justify-between gap-1 rounded-[8px] bg-white/10 px-2 py-1 text-[10.5px] font-bold text-white">
        <span>📸 1 a gara</span>
        <span>IG</span>
      </span>
    </div>
  );
}

export function IdentityCard() {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const titleId = `${uid}-t`;
  const stepsId = `${uid}-steps`;
  return (
    <section
      className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--uv-royal)] to-[var(--uv-night)] p-5 text-white shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-labelledby={titleId}
      data-testid="identity-card"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-white/15 px-[10px] py-[3px] text-[12.5px] font-bold text-[var(--uv-gold)]">
            Stagione 2026/27
          </span>
          <h3
            id={titleId}
            className="mt-2 font-uv text-[clamp(30px,8.4vw,38px)] uppercase leading-[0.9]"
          >
            Crea il tuo <span className="text-[var(--uv-gold)]">avatar</span> e
            gioca il tuo campionato
          </h3>
          <p className="mt-2 text-[15px] leading-[1.4] text-[#dbe7ff]">
            La tua identità SCD: avviso dei cambi, "Ci sarò", la tua squadra e
            le tue foto partita.
          </p>
        </div>
        <AvatarCardDemo />
      </div>

      <Link
        to="/aree"
        className="mt-4 flex min-h-[54px] items-center justify-center rounded-[14px] bg-[var(--uv-gold)] font-uv text-[21px] uppercase tracking-[0.06em] text-[var(--uv-night)] shadow-[0_4px_0_#b38f00] active:translate-y-[2px] active:shadow-[0_2px_0_#b38f00]"
      >
        Crea il tuo avatar
      </Link>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={stepsId}
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] py-2 text-[14.5px] font-bold text-[#cfe0ff] underline-offset-4 hover:underline"
      >
        {open ? "Chiudi" : "Come funziona"}
      </button>
      <ol id={stepsId} hidden={!open} className="mt-1 grid gap-[10px]">
        {AVATAR_STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-[14px] bg-white/10 p-3"
          >
            <span className="grid size-[28px] shrink-0 place-items-center rounded-full bg-[var(--uv-gold)] font-uv text-[17px] text-[var(--uv-night)]">
              {i + 1}
            </span>
            <span className="min-w-0">
              <b className="block text-[15.5px]">{step.title}</b>
              <span className="text-[14px] leading-[1.35] text-[#dbe7ff]">
                {step.text}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <small className="mt-3 block text-center text-[12.5px] leading-[1.35] text-[#c5d6f5]">
        In arrivo con l'accesso unico. Sotto i 14 anni l'avatar lo attiva un
        genitore. Calendario e risultati restano aperti a tutti.
      </small>
    </section>
  );
}

/* ------------------------------------------ inviti e canali ufficiali */

export function ShareCard() {
  const text = encodeURIComponent(
    "Vieni con me a vedere la ColicoDerviese! Gare e allenamenti di tutte le squadre: https://www.colicoderviese.it/",
  );
  return (
    <section
      id="seguici"
      className="relative overflow-hidden rounded-[18px] bg-white p-[18px] text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
      aria-labelledby="share-t"
      data-testid="share-card"
    >
      <img
        src="/media/brand/sky-atv-cut.webp"
        alt=""
        className="sky-float pointer-events-none absolute -right-[6px] top-[4px] w-[clamp(58px,16vw,74px)] drop-shadow-[0_8px_12px_rgb(0_0_0/0.25)]"
        loading="lazy"
      />
      <h3
        id="share-t"
        className="pr-[clamp(56px,17vw,76px)] font-uv text-[clamp(26px,7.4vw,30px)] uppercase leading-[0.92]"
      >
        Fai girare la <span className="text-[var(--uv-royal)]">SCD</span>
      </h3>
      <p className="mt-1 pr-[clamp(56px,17vw,76px)] text-[14.5px] text-[var(--scd-sub)]">
        Porta un amico al campo e seguici sui canali ufficiali.
      </p>
      <a
        href={`https://wa.me/?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-[1] mt-3 flex min-h-[50px] items-center justify-center rounded-[14px] bg-[#1fa855] font-uv text-[19px] uppercase tracking-[0.05em] text-white shadow-[0_4px_0_#11713a]"
      >
        Invita un amico
      </a>
      <ul
        className="mt-4 grid grid-cols-6 gap-1"
        aria-label="Canali ufficiali SCD"
      >
        {CHANNELS.map((c) => (
          <li key={c.name}>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-col items-center gap-1 rounded-[12px] py-1 text-center text-[10.5px] font-bold leading-tight tracking-[-0.01em] sm:text-[11.5px]"
              aria-label={`${c.name}: ${c.sub}`}
            >
              <span
                aria-hidden="true"
                className="grid size-[clamp(38px,11vw,46px)] place-items-center rounded-full text-[15px] font-black text-white shadow-[0_3px_8px_rgb(0_10_40/0.25)]"
                style={{ background: c.bg }}
              >
                {c.mark}
              </span>
              {c.name}
            </a>
          </li>
        ))}
      </ul>
      <small className="mt-2 block text-[12.5px] text-[var(--scd-sub)]">
        Nessun numero viene salvato dall'app. Il premio "partita gratis" per chi
        invita arriverà con l'accesso, alle regole decise dalla società.
      </small>
    </section>
  );
}

export function Affiliations({
  tone = "dark",
}: { tone?: "dark" | "light" } = {}) {
  return (
    <section
      aria-label="Affiliazioni"
      className={tone === "light" ? "" : "mt-6"}
    >
      <div className="flex items-center justify-around gap-3 rounded-[18px] bg-white p-[14px] shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)]">
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
      <span
        className={`mt-2 block text-center text-[13px] font-bold ${tone === "light" ? "text-[#3a4d6b]" : "text-[#cfe0ff]"}`}
      >
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
  // Sits just above the Sky jolly button (SkyChat: nav 62px + strip 34px + 12px gap + 56px button).
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed bottom-[calc(62px+34px+12px+56px+12px+env(safe-area-inset-bottom))] right-4 z-[45] flex max-w-[calc(100vw-2rem)] items-end justify-end transition-transform duration-500 ease-[cubic-bezier(.22,1.35,.4,1)] motion-reduce:transition-none lg:bottom-[134px] ${message ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"}`}
    >
      {message && (
        <button
          type="button"
          onClick={onClose}
          aria-label={`${message.title}. ${message.text}. Chiudi`}
          className="pointer-events-auto flex min-w-0 max-w-[min(300px,calc(100vw-2rem))] items-start gap-3 rounded-[18px] border border-[#dbe3ee] bg-white px-3 py-3 text-left shadow-[0_18px_40px_-12px_rgb(11_42_91/0.35)]"
        >
          <span
            key={`${message.title}|${message.text}`}
            aria-hidden="true"
            className="sky-hop-in inline-block size-11 shrink-0 overflow-hidden rounded-full bg-[#eef3f9] ring-2 ring-[#0b2a5b]"
          >
            <img
              src="/media/brand/sky-atv-head.webp"
              alt=""
              width={44}
              height={44}
              className="size-full object-cover object-top"
              style={{ transform: "scale(1.12)", transformOrigin: "50% 20%" }}
            />
          </span>
          <span className="min-w-0">
            <b className="block border-l-[3px] border-[#ffd600] pl-2 text-[14px] font-bold leading-tight text-[#0b2a5b]">
              {message.title}
            </b>
            <span className="mt-1 block text-[13.5px] leading-[1.35] text-[#0b1e3a]">
              {message.text}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
