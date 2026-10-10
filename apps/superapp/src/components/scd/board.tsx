/**
 * Primitive del sistema grafico delle tavole SCD ("SISTEMA GRAFICO DEFINITIVO – STRUTTURA APP IN
 * TEMPO REALE"): testate, foglio bianco, linguette di sezione, tessere icona, controlli segmentati,
 * righe con barra colorata, blocco data, anello di avanzamento, pill di stato, striscia DEMO.
 * Solo presentazione: nessun dato qui dentro.
 */
import { Link, type LinkProps } from "@tanstack/react-router";
import { Bell, Check, ChevronRight, Lock, MapPin, Settings } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { cn } from "@/lib/utils";
import skyAsset from "@/assets/brand/sky-scd.png.asset.json";
import lario from "@/assets/scd/lario-header.webp.asset.json";

export const CLUB_NAME = "S.C.D. ColicoDerviese";

type To = LinkProps["to"];
type LinkTarget = { to: To; search?: LinkProps["search"]; params?: LinkProps["params"]; hash?: string };

/** Unione classi con risoluzione dei conflitti Tailwind (l'ultima vince). */
function cx(...parts: (string | false | null | undefined)[]) {
  return cn(...parts);
}

/* ------------------------------------------------------------------ marchio */

/** Stemma ufficiale (480×628): altezza richiesta, larghezza proporzionale. */
export function Crest({ height = 40, className = "" }: { height?: number; className?: string }) {
  return (
    <img
      src={crest.url}
      alt={`Stemma ufficiale ${CLUB_NAME}`}
      width={Math.round((height * 480) / 628)}
      height={height}
      className={cx("shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)]", className)}
      style={{ height, width: "auto" }}
    />
  );
}

/** Wordmark delle tavole: "S.C.D." piccolo, COLICO giallo + DERVIESE bianco, filetto sotto. */
export function Wordmark({ scale = 1, className = "" }: { scale?: number; className?: string }) {
  return (
    <span className={cx("inline-flex flex-col leading-none text-white", className)} aria-label={CLUB_NAME} role="img">
      <span className="font-sans font-bold tracking-[0.08em]" style={{ fontSize: 19 * scale }} aria-hidden="true">S.C.D.</span>
      <span className="font-brand mt-[2px] whitespace-nowrap" style={{ fontSize: 32 * scale, lineHeight: 1 }} aria-hidden="true">
        <span className="text-[#ffd600]">COLICO</span>DERVIESE
      </span>
      <span className="mt-[5px] block h-[2px] rounded-full bg-gradient-to-r from-white/85 via-white/70 to-transparent" style={{ width: "100%" }} aria-hidden="true" />
    </span>
  );
}

/* ------------------------------------------------------------------ testate */

/** Campanella con pallino giallo: porta alle Comunicazioni. */
export function BellAction({ dot = true }: { dot?: boolean }) {
  return (
    <Link to="/comunicazioni" aria-label={dot ? "Comunicazioni: ci sono aggiornamenti" : "Comunicazioni"} className="relative flex size-11 items-center justify-center text-white">
      <Bell className="size-[34px]" strokeWidth={2} aria-hidden="true" />
      {dot && <span className="absolute right-[3px] top-[2px] size-[15px] rounded-full bg-[#ffd600]" aria-hidden="true" />}
    </Link>
  );
}

export function GearAction({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Impostazioni e menu" className="flex size-11 items-center justify-center text-white">
      <Settings className="size-[32px]" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

/** Posizione di Sky nelle due testate della tavola che la mostrano (Home grande, Staff più raccolta). */
const SKY_POS = {
  home: "top-[80px] right-[-66px] w-[272px] sm:top-auto sm:bottom-[-28px] sm:right-[16%] sm:w-[300px]",
  staff: "top-[86px] right-[-26px] w-[214px] sm:top-auto sm:bottom-[-24px] sm:right-[16%] sm:w-[250px]",
} as const;

/**
 * Testata "hero" (Home, Area Staff, Comunicazioni): banda blu con lago e montagne (o blu pieno),
 * stemma, wordmark, azione a destra, titolo bianco con sottotitolo e, dove la tavola la mostra, Sky.
 */
export function HeroHeader({
  title, subtitle, action, sky, plain = false, children, className = "", testId, titleGap = 34, bottomGap = 30,
}: {
  title: string; subtitle: ReactNode; action?: ReactNode; sky?: keyof typeof SKY_POS; plain?: boolean; children?: ReactNode; className?: string; testId?: string; titleGap?: number; bottomGap?: number;
}) {
  return (
    <header className={cx("relative isolate overflow-hidden text-white", plain ? "scd-hero-plain" : "bg-[var(--scd-navy)]", className)} data-testid={testId}>
      {!plain && (
        <>
          <img src={lario.url} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_42%] [filter:saturate(1.35)_contrast(1.08)_brightness(1.04)]" />
          <div className="scd-hero-shade absolute inset-0 -z-10" aria-hidden="true" />
        </>
      )}
      <div className="mx-auto max-w-6xl px-4 pt-[10px] sm:px-6">
        <div className="flex items-start gap-[14px]">
          <Link to="/" aria-label={`${CLUB_NAME}, vai alla Home`} className="shrink-0">
            <Crest height={80} />
          </Link>
          <Wordmark className="mt-[10px]" />
          <div className="ml-auto -mr-2 mt-[8px]">{action}</div>
        </div>
        <div className="relative z-10" style={{ paddingTop: titleGap, paddingBottom: bottomGap }}>
          <h1 className="text-[31px] font-bold leading-[1.05] tracking-[-0.01em] [text-shadow:0_2px_10px_rgb(0_0_0/0.45)] sm:text-[40px]">{title}</h1>
          <p className="mt-[5px] max-w-[36ch] text-[18px] font-semibold leading-[1.2] text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.55)] sm:max-w-[40ch]">{subtitle}</p>
        </div>
        {children}
      </div>
      {sky && (
        <img
          src={skyAsset.url}
          alt="Sky, la mascotte del club"
          width={200}
          height={190}
          className={cx("pointer-events-none absolute z-0 h-auto select-none", SKY_POS[sky])}
          loading="eager"
          decoding="async"
        />
      )}
    </header>
  );
}

/** Testata corta (Calendario, Area Atleta, Area Riservata): stemma che sborda, titolo e azione. */
export function PageHeader({ title, action, testId }: { title: string; action?: ReactNode; testId?: string }) {
  return (
    <header className="scd-hero-plain relative z-10 text-white" data-testid={testId}>
      <div className="relative mx-auto flex h-[90px] max-w-6xl items-start px-4 pb-[14px] sm:px-6">
        <Link to="/" aria-label={`${CLUB_NAME}, vai alla Home`} className="absolute left-4 top-[8px] z-20 sm:left-6">
          <Crest height={80} />
        </Link>
        <div className="flex h-[76px] w-full items-center gap-3 pl-[86px]">
          <h1 className="min-w-0 flex-1 truncate text-[28px] font-bold leading-none tracking-[-0.01em]">{title}</h1>
          <div className="-mr-2 shrink-0">{action}</div>
        </div>
      </div>
    </header>
  );
}

/** Foglio chiaro arrotondato che si sovrappone alla testata. */
export function Sheet({ children, className = "", overlap = 14 }: { children: ReactNode; className?: string; overlap?: number }) {
  return (
    <div className={cx("relative z-[5] rounded-t-[18px] bg-[var(--scd-page)]", className)} style={{ marginTop: -overlap }}>
      <div className="mx-auto max-w-6xl px-[10px] pb-6 pt-[10px] sm:px-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ sezioni */

function MoreLink({ label, target, light = false }: { label: string; target: LinkTarget; light?: boolean }) {
  return (
    <Link {...(target as LinkProps)} className={cx("inline-flex shrink-0 items-center gap-[2px] text-[16px] font-semibold", light ? "text-white" : "text-[var(--scd-blue)]")}>
      {label}<ChevronRight className="size-[18px]" strokeWidth={2.6} aria-hidden="true" />
    </Link>
  );
}

/** Titolo semplice di sezione ("Prossime gare", "I miei documenti") con link blu a destra. */
export function SectionHead({ title, more, id }: { title: string; more?: { label: string; target: LinkTarget }; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-[6px] pb-[8px] pt-[14px]">
      <h2 id={id} className="text-[20px] font-bold leading-tight text-[var(--scd-ink)]">{title}</h2>
      {more && <MoreLink label={more.label} target={more.target} />}
    </div>
  );
}

/** Linguetta blu con taglio obliquo sopra una card (Home: "PROSSIMA GARA"). */
export function TabCard({ title, icon: Icon, more, children, testId }: {
  title: string; icon?: ComponentType<{ className?: string }>; more?: { label: string; target: LinkTarget }; children: ReactNode; testId?: string;
}) {
  return (
    <section className="mt-[14px]" data-testid={testId}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="scd-notch flex h-[31px] items-center gap-[7px] rounded-tl-[10px] bg-[var(--scd-blue)] pl-[12px] pr-[38px] text-[17px] font-bold uppercase tracking-[0.01em] text-white">
          {Icon && <Icon className="size-[17px]" aria-hidden="true" />}{title}
        </h2>
        {more && <div className="pb-[4px] pr-[4px]"><MoreLink label={more.label} target={more.target} /></div>}
      </div>
      <div className="scd-card rounded-tl-none border-l-[4px] border-[var(--scd-blue)]">{children}</div>
    </section>
  );
}

/** Banda blu a tutta larghezza con titolo e link bianchi (Staff, sponsor Home). */
export function BandCard({ title, more, children, className = "", bodyClassName = "", testId }: {
  title: string; more?: { label: string; target: LinkTarget }; children: ReactNode; className?: string; bodyClassName?: string; testId?: string;
}) {
  return (
    <section className={cx("mt-[14px] overflow-hidden rounded-[12px] scd-card", className)} data-testid={testId}>
      <div className="flex h-[40px] items-center justify-between gap-3 rounded-t-[12px] bg-[var(--scd-blue)] px-[12px] text-white">
        <h2 className="text-[18px] font-bold leading-none">{title}</h2>
        {more && <MoreLink label={more.label} target={more.target} light />}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ controlli */

export type SegItem = { label: string; active: boolean; icon?: ComponentType<{ className?: string }>; target?: LinkTarget; onClick?: () => void };

/**
 * Controllo segmentato: attivo blu pieno (Calendario, Atleta), attivo giallo (Famiglia),
 * oppure su testata blu con attivo bianco (Comunicazioni).
 */
export function Segmented({ items, tone = "blue", label, className = "" }: { items: SegItem[]; tone?: "blue" | "yellow" | "header"; label: string; className?: string }) {
  const base = "flex h-[40px] min-w-0 flex-1 items-center justify-center gap-[7px] rounded-[9px] px-2 text-[16px] font-semibold leading-none transition-colors";
  const on = tone === "yellow" ? "bg-[var(--scd-yellow)] text-[var(--scd-ink)] font-bold shadow-[0_1px_3px_rgb(0_0_0/0.15)]"
    : tone === "header" ? "bg-white text-[var(--scd-ink)] font-bold shadow-[0_2px_6px_rgb(0_0_0/0.2)]"
    : "bg-[var(--scd-blue)] text-white shadow-[0_2px_5px_rgb(4_87_175/0.35)]";
  const off = tone === "header" ? "bg-white/10 text-white/90 ring-1 ring-white/15" : "bg-[#eef0f3] text-[var(--scd-ink)]";
  return (
    <div className={cx("flex gap-[8px]", className)} role="group" aria-label={label}>
      {items.map((it) => {
        const cls = cx(base, it.active ? on : off);
        const inner = <>{it.icon && <it.icon className="size-[18px]" />}<span className="truncate">{it.label}</span></>;
        return it.target
          ? <Link key={it.label} {...(it.target as LinkProps)} aria-current={it.active ? "page" : undefined} className={cls}>{inner}</Link>
          : <button key={it.label} type="button" aria-pressed={it.active} onClick={it.onClick} className={cls}>{inner}</button>;
      })}
    </div>
  );
}

/** Tessera icona (Home 4-up, Atleta 3x2, Staff). */
export function IconTile({ label, icon, target, badge, className = "", labelClassName = "" }: {
  label: ReactNode; icon: ReactNode; target?: LinkTarget; badge?: number | null; className?: string; labelClassName?: string;
}) {
  const body = (
    <>
      {badge != null && badge > 0 && <NotifBadge n={badge} className="absolute right-[8px] top-[6px]" />}
      <span className="flex h-[40px] items-center justify-center">{icon}</span>
      <span className={cx("mt-[6px] text-center text-[15.5px] font-semibold leading-[1.12] tracking-[-0.01em] text-[var(--scd-ink)]", labelClassName)}>{label}</span>
    </>
  );
  const cls = cx("scd-card relative flex flex-col items-center justify-center px-1 py-[10px]", className);
  return target ? <Link {...(target as LinkProps)} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function NotifBadge({ n, className = "" }: { n: number; className?: string }) {
  return <span className={cx("flex size-[24px] items-center justify-center rounded-full bg-[var(--scd-red)] text-[13px] font-bold text-white ring-2 ring-white", className)} aria-label={`${n} nuovi`}>{n}</span>;
}

/** Pulsante primario blu a tutta larghezza ("Vedi tutti gli eventi →"). */
export function PrimaryButton({ children, target, onClick, className = "" }: { children: ReactNode; target?: LinkTarget; onClick?: () => void; className?: string }) {
  const cls = cx("flex h-[46px] w-full items-center justify-center gap-2 rounded-[9px] bg-[var(--scd-blue)] text-[17px] font-semibold text-white shadow-[0_3px_8px_-2px_rgb(4_87_175/0.5)]", className);
  return target ? <Link {...(target as LinkProps)} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

/* ------------------------------------------------------------------ righe */

/** Riga elenco con barra colorata a sinistra (Calendario, Famiglia, Staff). */
export function ListRow({ bar, lead, icon, title, sub, trail, target, className = "", testId }: {
  bar: string; lead?: ReactNode; icon?: ReactNode; title: ReactNode; sub?: ReactNode; trail?: ReactNode; target?: LinkTarget; className?: string; testId?: string;
}) {
  const body = (
    <>
      <span className="w-[4px] shrink-0 self-stretch rounded-full" style={{ background: bar }} aria-hidden="true" />
      {lead && <span className="w-[74px] shrink-0 leading-none">{lead}</span>}
      {icon && <span className="flex w-[44px] shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[16px] font-bold leading-[1.2] text-[var(--scd-ink)]">{title}</span>
        {sub && <span className="mt-[3px] block text-[13.5px] font-medium leading-[1.25] text-[var(--scd-sub)]">{sub}</span>}
      </span>
      {trail}
    </>
  );
  const cls = cx("flex items-center gap-[12px] py-[12px] pr-[4px]", className);
  return target ? <Link {...(target as LinkProps)} className={cls} data-testid={testId}>{body}</Link> : <div className={cls} data-testid={testId}>{body}</div>;
}

export function Venue({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-w-0 items-start gap-[3px]"><MapPin className="mt-[2px] size-[14px] shrink-0" strokeWidth={2.4} aria-hidden="true" /><span className="min-w-0 break-words">{children}</span></span>;
}

/** Blocco data verticale: DOM / 10 / NOV / 15:30. */
export function DateBlock({ weekday, day, month, time, size = "md" }: { weekday: string; day: string; month: string; time?: string; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className="flex flex-col items-center text-center leading-none text-[var(--scd-ink)]">
      <span className={cx(lg ? "text-[18px]" : "text-[15px]", "font-bold uppercase")}>{weekday}</span>
      <span className={cx(lg ? "text-[44px]" : "text-[34px]", "my-[3px] font-extrabold tracking-[-0.03em]")}>{day}</span>
      <span className={cx(lg ? "text-[18px]" : "text-[15px]", "font-bold uppercase")}>{month}</span>
      {time && <span className={cx(lg ? "mt-[6px] text-[18px]" : "mt-[5px] text-[16px]", "font-bold")}>{time}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ stati */

export function StatusPill({ children, icon = true, className = "" }: { children: ReactNode; icon?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex h-[30px] items-center gap-[6px] rounded-[8px] bg-[var(--scd-green)] px-[12px] text-[15px] font-bold text-white shadow-[0_2px_4px_rgb(18_146_46/0.35)]", className)}>
      {icon && <span className="flex size-[17px] items-center justify-center rounded-full bg-white text-[var(--scd-green)]"><Check className="size-[12px]" strokeWidth={3.5} aria-hidden="true" /></span>}
      {children}
    </span>
  );
}

export function CheckCircle({ label }: { label: string }) {
  return <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--scd-green)] text-white" role="img" aria-label={label}><Check className="size-[18px]" strokeWidth={3.2} aria-hidden="true" /></span>;
}

/** Anello di avanzamento (Stato pagamenti 70%). */
export function RingProgress({ value, size = 112, label }: { value: number; size?: number; label: string }) {
  const r = 44; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label} className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e4e6ea" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--scd-green)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="25" fontWeight="800" fill="var(--scd-ink)" fontFamily="Fira Sans, sans-serif">{v}%</text>
    </svg>
  );
}

/** Avatar a iniziali nella stessa cornice circolare delle tavole (mai foto di minori). */
export function InitialsAvatar({ initials, size = 104, ring = "white", className = "" }: { initials: string; size?: number; ring?: string; className?: string }) {
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#dfe9f6] to-[#b9cde8] font-extrabold text-[var(--scd-navy)]", className)}
      style={{ width: size, height: size, fontSize: size * 0.34, boxShadow: `0 0 0 ${Math.max(3, size * 0.04)}px ${ring}, 0 4px 10px rgb(0 0 0 / 0.18)` }} role="img" aria-label={`Avatar ${initials}`}>
      {initials}
    </span>
  );
}

/** Scudo neutro con iniziali per le avversarie: nessuno stemma inventato. */
export function OpponentShield({ name, size = 52 }: { name: string; size?: number }) {
  const words = name.replace(/[^A-Za-zÀ-ú0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !/^(ASD|SSD|AC|GS|GSO|US|POL|SC|ASDC|SRL|DEL|DI|LA|IL|CALCIO|ASD)$/i.test(w));
  const initials = (words.length >= 2 ? words[0]![0]! + words[1]![0]! : (words[0] ?? name).slice(0, 2)).toUpperCase();
  return (
    <svg viewBox="0 0 48 56" width={size * 0.857} height={size} role="img" aria-label={`Stemma ${name} non disponibile: iniziali`} className="shrink-0">
      <path d="M24 2 44 8v18c0 13.5-8.6 23.2-20 28C12.6 49.2 4 39.5 4 26V8z" fill="#eef1f5" stroke="#9aa6b8" strokeWidth="2.2" />
      <path d="M24 7.5 39 12v14c0 10.4-6.2 18.2-15 22.2C15.2 44.2 9 36.4 9 26V12z" fill="none" stroke="#c9d1dc" strokeWidth="1.2" />
      <text x="24" y="30" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="800" fill="#4a5568" fontFamily="Fira Sans, sans-serif">{initials}</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ demo */

/** Striscia delle tavole: anteprima grafica con dati dimostrativi (schermate private). */
export function DemoStrip() {
  return (
    <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30 flex h-[22px] items-center justify-center bg-[#071a3a] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#ffd600] lg:static lg:h-8 lg:text-xs" data-testid="demo-strip">
      DEMO · ANTEPRIMA&nbsp;—&nbsp;ANTEPRIMA GRAFICA · DATI DIMOSTRATIVI
    </div>
  );
}

/** Nota obbligatoria: i dati personali arrivano solo dopo l'autenticazione R20. */
export function R20Note({ area }: { area: "atleta" | "famiglia" | "staff" }) {
  return (
    <div role="note" className="mt-[14px] flex items-start gap-[10px] rounded-[12px] border border-[#f1d77a] bg-[#fff7d6] px-[12px] py-[10px] text-[13px] font-medium leading-snug text-[var(--scd-ink)]">
      <Lock className="mt-[2px] size-4 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
      <span>
        <b>Accesso riservato: in arrivo con R20.</b> Le informazioni personali (atleti, famiglie, quote, documenti) compariranno solo dopo la verifica dell'identità sul gestionale R20. Qui solo contenuti dimostrativi, nessun salvataggio.{" "}
        <Link to="/aree/$area" params={{ area }} className="font-bold text-[var(--scd-blue)] underline">Area riservata (email + PIN R20)</Link>
      </span>
    </div>
  );
}
