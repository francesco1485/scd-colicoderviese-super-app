/**
 * Back-office frame of the UD-113 sections (Fondo Solidale, Donazioni, Adotta un oggetto, Proposte): same interior shell
 * and palette as Tesoreria / Direzione, the r101 gate states in plain words and small form helpers.
 * Access is per person (r100 grants, scd_can): roles open nothing.
 */
import { Link } from "@tanstack/react-router";
import { Clock, Info, Lock, LogIn, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { Card, Chip } from "@/components/scd/interior-ui";
import { StagingBanner } from "@/components/scd/work-area-ui";
import { ALL_AREAS_ROLES, type StripItem } from "@/lib/areas";
import { NOT_ACTIVE_TEXT, NOT_ACTIVE_TITLE } from "@/lib/giving";
import type { GivingGate, GivingSection } from "@/lib/giving.server";
import { SECTIONS } from "@/lib/person-grants";

const RAIL_ROLES: ReadonlySet<string> = new Set(ALL_AREAS_ROLES);

export const SECTION_META: Readonly<Record<GivingSection, { title: string; rail: string; path: string; description: string }>> = {
  "fondo-solidale": {
    title: "Tesoreria · Fondo Solidale",
    rail: "tesoreria",
    path: "/tesoreria/fondo-solidale",
    description: "Domande riservate, decisioni con quota ridotta, scadenze, entrate e uscite del Fondo e rendiconto. ISEE e nomi solo per chi è abilitato.",
  },
  donazioni: {
    title: "Tesoreria · Donazioni",
    rail: "tesoreria",
    path: "/tesoreria/donazioni",
    description: "Donazioni in denaro registrate dalla Tesoreria con ricevuta, promesse di adozione e materiale offerto per palestra e infermeria.",
  },
  adotta: {
    title: "Direzione · Adotta un oggetto",
    rail: "direzione",
    path: "/direzione/adotta",
    description: "Catalogo delle cose di cui il club ha bisogno: prezzo o preventivo, fornitore, foto del club, adozioni parziali e posti numerati.",
  },
  proposte: {
    title: "Direzione · Proposte di miglioramento",
    rail: "direzione",
    path: "/direzione/proposte",
    description: "Le proposte arrivate da chiunque, anche anonime: valutazione, pubblicazione con testo dello staff, trasformazione in oggetto adottabile.",
  },
};

export function givingHead(section: GivingSection) {
  const m = SECTION_META[section];
  return { meta: [{ title: `${m.title} — SCD Dentro · S.C.D. ColicoDerviese` }, { name: "description", content: m.description }, { name: "robots", content: "noindex" }] };
}

const sectionLabel = (s: GivingSection) => SECTIONS.find((x) => x.code === s)?.label ?? s;

export function GivingShell({
  gate,
  highlights,
  canWrite,
  children,
}: {
  gate: GivingGate;
  highlights?: readonly StripItem[];
  canWrite: boolean;
  children: ReactNode;
}) {
  const m = SECTION_META[gate.section];
  const status =
    gate.state === "open" ? (canWrite ? <Chip tone="ok">Modifiche salvate nel database del club</Chip> : <Chip tone="info">Sola lettura (livello «Vede»)</Chip>)
    : gate.state === "not-active" ? <Chip tone="warn">{NOT_ACTIVE_TITLE}</Chip>
    : <Chip tone="mute">Chiuso</Chip>;
  return (
    <InteriorShell title={m.title} path={m.path} activeAreaId={m.rail} roles={RAIL_ROLES} roleLabel={gate.preview ? "Anteprima staging" : "Area di lavoro"} {...(highlights ? { highlights } : {})}>
      <div className="flex flex-col gap-3 lg:gap-[18px]" data-giving-section={gate.section} data-gate={gate.state}>
        {gate.preview && <StagingBanner />}
        <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] leading-snug text-[var(--in-sub)]">
          {status}
          <span className="min-w-0">Abilitazione per persona: «{sectionLabel(gate.section)}». L'app non incassa e non paga.</span>
        </p>
        <GateNotice gate={gate} />
        {children}
      </div>
    </InteriorShell>
  );
}

/** Plain-language state of the page when it is not open. */
export function GateNotice({ gate }: { gate: GivingGate }) {
  if (gate.state === "open") return null;
  const m = SECTION_META[gate.section];
  const box = "flex items-start gap-3 rounded-xl border px-4 py-3 text-[15px] leading-snug";
  if (gate.state === "not-active")
    return (
      <div role="note" data-testid="giving-not-active" className={`${box} border-[#f1dc7a] bg-[#fffbe6]`}>
        <Clock className="mt-0.5 size-5 flex-none text-[var(--in-warn)]" aria-hidden="true" />
        <span><b>{NOT_ACTIVE_TITLE}.</b> {NOT_ACTIVE_TEXT} Qui sotto vedi come sarà la pagina, senza dati.</span>
      </div>
    );
  if (gate.state === "signed-out")
    return (
      <div role="note" className={`${box} border-[var(--in-line)] bg-white`}>
        <LogIn className="mt-0.5 size-5 flex-none text-[var(--in-info)]" aria-hidden="true" />
        <span>
          Area riservata. <Link to="/accedi" search={{ next: m.path } as never} className="font-semibold text-[var(--in-info)] underline">Accedi</Link> con il tuo account.
        </span>
      </div>
    );
  if (gate.state === "denied")
    return (
      <div role="note" className={`${box} border-[var(--in-line)] bg-white`}>
        <Lock className="mt-0.5 size-5 flex-none text-[var(--in-sub)]" aria-hidden="true" />
        <span>Non sei abilitato a «{sectionLabel(gate.section)}». La abilita la Direzione, persona per persona, da Accessi.</span>
      </div>
    );
  return (
    <div role="note" className={`${box} border-[var(--in-line)] bg-white`}>
      <ShieldAlert className="mt-0.5 size-5 flex-none text-[var(--in-crit)]" aria-hidden="true" />
      <span>Non riusciamo a verificare le abilitazioni in questo momento: per sicurezza la pagina resta chiusa. Riprova tra poco.</span>
    </div>
  );
}

/** True when the page shows its structure: open, or not active yet (structure without data). */
export function showsStructure(gate: GivingGate): boolean {
  return gate.state === "open" || gate.state === "not-active";
}

/* ------------------------------------------------------------------ form helpers (interior palette) */

export const inInput = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)] disabled:bg-[#f3f6fa]";
export const inArea = "w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";
export const inBtn = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50";
export const inGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";
export const inLabel = "text-[13px] font-semibold text-[var(--in-sub)]";

export function InField({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 space-y-1 ${className}`}>
      <span className={inLabel}>{label}</span>
      {children}
      {hint && <span className="block text-[12.5px] leading-snug text-[var(--in-sub)]">{hint}</span>}
    </label>
  );
}

export function Message({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className={`m-0 rounded-[10px] px-3 py-2 text-[14.5px] font-semibold ${ok ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}>
      {children}
    </p>
  );
}

export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 px-4 pb-4 text-[13.5px] leading-snug text-[var(--in-sub)] sm:px-[18px]">
      <Info className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Empty list placeholder used by all four pages. */
export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="m-0 border-t border-[var(--in-line)] px-4 py-4 text-[14.5px] text-[var(--in-sub)] sm:px-[18px]">{children}</p>;
}

export function SectionCard(props: { id: string; title: string; sub?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card id={props.id} title={props.title} {...(props.sub ? { sub: props.sub } : {})} {...(props.aside ? { aside: props.aside } : {})}>
      {props.children}
    </Card>
  );
}
