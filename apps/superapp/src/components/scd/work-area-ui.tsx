/**
 * Shared pieces of the reserved work areas (release 2 item 6): the access gate, the staging
 * banner, the "Fonti" box with the Drive masters, the "Inserisci" row builder for the
 * "Inserimenti a Sky" sheet and the honest empty state. Read-only: nothing is written anywhere.
 */
import { MemberServicesBar } from "@/components/scd/MemberServicesBar";
import { Check, ClipboardCopy, ExternalLink, FileSpreadsheet, Info, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { ALL_AREAS_ROLES, type StripItem } from "@/lib/areas";
import { INSERIMENTI_COLUMNS, INSERIMENTO_TYPES, DESCRIPTION_MAX, buildInserimento } from "@/lib/inserimenti";
import type { WorkAreaGate } from "@/lib/access";
import { DRIVE_MASTERS, WORK_AREAS, areaSources, driveUrl, type WorkAreaId } from "@/lib/work-areas";
import { AccessScreenPage, accessHead } from "./AccessScreen";
import { InteriorShell } from "./InteriorShell";
import { Card, Chip, SourceLine } from "./interior-ui";
import { ShareLink } from "@/components/scd/ShareLink";

/** Rail of the staging preview: every area (navigation only; access control stays with R20). */
const PREVIEW_RAIL_ROLES: ReadonlySet<string> = new Set(ALL_AREAS_ROLES);

/** <head> of a work area: the page when open, otherwise the access screen. Never indexed. */
export function workAreaHead(id: WorkAreaId, gate: WorkAreaGate | undefined) {
  if (!gate || gate.view !== "page") return accessHead(id);
  const a = WORK_AREAS[id];
  const title = `${a.label} — SCD Dentro · S.C.D. ColicoDerviese`;
  return {
    meta: [
      { title },
      { name: "description", content: a.description },
      { name: "robots", content: "noindex" },
    ],
  };
}

/** Renders the access screen unless the gate opened the page. */
export function WorkAreaGateView({ id, gate, children }: { id: WorkAreaId; gate: WorkAreaGate; children: ReactNode }) {
  if (gate.view !== "page") return <AccessScreenPage id={id} />;
  return <>{children}</>;
}

export function StagingBanner() {
  return (
    <div role="note" data-testid="staging-banner" className="flex items-start gap-2 rounded-xl border border-[#f1dc7a] bg-[#fffbe6] px-3 py-1.5 text-[13px] font-semibold leading-snug text-[var(--in-ink)] lg:gap-2.5 lg:px-4 lg:py-2.5 lg:text-[14.5px]">
      <Info className="mt-[1px] size-[18px] flex-none text-[var(--in-warn)]" strokeWidth={2} aria-hidden="true" />
      <span>Anteprima staging — accesso reale da attivare con il login</span>
    </div>
  );
}

/**
 * Work area frame: interior shell, staging banner when previewing, a slim bar with the
 * "Inserisci" action, then the board content.
 */
export function WorkAreaShell({
  id,
  title,
  preview,
  highlights,
  note,
  editable = false,
  children,
}: {
  id: WorkAreaId;
  title?: string;
  preview: boolean;
  highlights?: readonly StripItem[];
  /** True when the page writes to the club database itself: no "Sola lettura" chip, no Inserisci-to-sheet action. */
  editable?: boolean;
  /** Short line next to the Inserisci action (snapshot dates, "sola lettura"). */
  note?: ReactNode;
  children: ReactNode;
}) {
  const a = WORK_AREAS[id];
  return (
    <InteriorShell
      title={title ?? a.label}
      path={a.path}
      activeAreaId={a.railId}
      roles={PREVIEW_RAIL_ROLES}
      roleLabel={preview ? "Anteprima staging" : "Area di lavoro"}
      {...(highlights ? { highlights } : {})}
    >
      <div className="flex flex-col gap-3 lg:gap-[18px]" data-work-area={id}>
        {preview && <StagingBanner />}
        <MemberServicesBar area={id} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[14px] leading-snug text-[var(--in-sub)]">
            {editable ? <Chip tone="ok">Modifiche salvate nel database del club</Chip> : <Chip tone="info">Sola lettura</Chip>}
            {note && <span className="min-w-0">{note}</span>}
          </p>
          <span className="flex flex-wrap items-center gap-2">
            <ShareLink path={a.path} />
            {!editable && <InsertAction id={id} />}
          </span>
        </div>
        {children}
      </div>
    </InteriorShell>
  );
}

/** "Fonti" box: Drive master names; "Apri il file" only for files whose id the club gave. */
export function SourcesBox({ id, className = "" }: { id: WorkAreaId; className?: string }) {
  const sources = areaSources(id);
  return (
    <Card id={`fonti-${id}`} title="Fonti" sub="I master della società da cui arrivano i dati. Nessun registro parallelo." className={className}>
      <ul className="m-0 list-none p-0" data-testid="sources">
        {sources.map((s) => (
          <li key={s.name} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
            <FileSpreadsheet className="size-[18px] flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
              {s.name}
              {s.note && <span className="ml-1.5 text-[13px] font-medium text-[var(--in-sub)]">· {s.note}</span>}
            </span>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[14px] font-semibold text-[var(--in-info)] transition-colors duration-150 hover:bg-[var(--in-info-bg)]"
              >
                Apri il file
                <ExternalLink className="size-4" strokeWidth={1.8} aria-hidden="true" />
                <span className="sr-only"> {s.name} (si apre in una nuova scheda)</span>
              </a>
            ) : (
              <span className="text-[13px] font-medium text-[var(--in-sub)]">nessun link</span>
            )}
          </li>
        ))}
      </ul>
      <SourceLine>I link aprono i master solo a chi ha già accesso al Drive della società: l'app non condivide né copia i file.</SourceLine>
    </Card>
  );
}

/** Honest empty state of the boards: dashed box, what is missing and where it will come from. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#b9d5ef] bg-[#f7fbff] px-4 py-4 sm:px-[18px]">
      <b className="block text-[16px] font-bold leading-snug">{title}</b>
      {children && <p className="mt-1 text-[14.5px] leading-snug text-[var(--in-sub)]">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** A board button that is not active yet: visible, explained, never pretending to work. */
export function PendingButton({ children, reason }: { children: ReactNode; reason: string }) {
  return (
    <button
      type="button"
      disabled
      title={reason}
      aria-label={`${typeof children === "string" ? children : ""} — ${reason}`.trim()}
      className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-[#eef3f9] px-3.5 text-[14.5px] font-semibold text-[var(--in-sub)]"
    >
      {children}
    </button>
  );
}

/** Small stat tile (board "Flotta"): value, optional total, label. Unknown renders "—". */
export function StatTile({ value, of, label }: { value: number | null; of?: number | null; label: string }) {
  const known = value !== null && Number.isFinite(value);
  return (
    <div className="min-w-0 rounded-xl bg-[var(--in-info-bg)] px-3 py-2.5">
      <span className="font-title text-[32px] font-black leading-none">
        {known ? value : "—"}
        {known && of != null && <span className="text-[20px] text-[var(--in-sub)]">/{of}</span>}
        {!known && <span className="sr-only"> (dato non disponibile)</span>}
      </span>
      <span className="mt-1 block text-[13.5px] leading-tight text-[var(--in-sub)]">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ Inserisci */

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const fieldCls =
  "scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] focus:border-[var(--in-focus)]";

/**
 * "Inserisci": a small form that builds ONE row for the "Inserimenti a Sky" sheet and copies it.
 * Fallback when the clipboard is blocked: the row is shown selected, to copy by hand.
 */
export function InsertAction({ id }: { id: WorkAreaId }) {
  const a = WORK_AREAS[id];
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(a.insertRoles[0] ?? "");
  const [type, setType] = useState<string>(INSERIMENTO_TYPES[0]);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [row, setRow] = useState<string | null>(null);
  const [copied, setCopied] = useState<"yes" | "manual" | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const sheetUrl = driveUrl(DRIVE_MASTERS.inserimenti.fileId);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("select,input,textarea,button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (copied === "manual") rowRef.current?.select();
  }, [copied]);

  const reset = () => {
    setDescription(""); setDeadline(""); setLink(""); setErrors({}); setRow(null); setCopied(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = buildInserimento({ role, type, area: a.label, description, deadline, link });
    if (!r.ok) {
      setErrors(r.errors as Record<string, string>);
      setRow(null);
      return;
    }
    setErrors({});
    setRow(r.tsv);
    setCopied((await copyText(r.tsv)) ? "yes" : "manual");
  };

  const err = (k: string) =>
    errors[k] ? (
      <span id={`ins-${k}-err`} className="mt-1 block text-[13px] font-semibold text-[var(--in-crit)]">{errors[k]}</span>
    ) : null;

  return (
    <>
      <button type="button" onClick={() => { reset(); setOpen(true); }} className="scd-action" data-testid="insert-open">
        <Plus className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        Inserisci
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <button type="button" aria-label="Chiudi" className="absolute inset-0 bg-[#021433]/55" onClick={() => setOpen(false)} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="scd-interior scd-access-panel relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[0_24px_60px_-20px_rgb(2_20_51/0.6)] sm:max-w-[560px] sm:rounded-2xl sm:p-6"
          >
            <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi" className="scd-focus absolute right-2 top-2 flex size-11 items-center justify-center rounded-lg text-[var(--in-sub)]">
              <X className="size-5" aria-hidden="true" />
            </button>
            <h2 id={titleId} className="m-0 pr-10 text-[21px] font-bold">Inserisci in «{DRIVE_MASTERS.inserimenti.name}»</h2>
            <p className="mt-1 text-[14.5px] leading-snug text-[var(--in-sub)]">
              Prepara una riga pronta da incollare nel foglio. L'app non scrive nulla: incolli tu la riga, e chi la lavora compila Esito e data.
            </p>

            <form onSubmit={submit} noValidate className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="block text-[14px] font-semibold">
                Inserito da (ruolo)
                <select value={role} onChange={(e) => setRole(e.target.value)} className={`${fieldCls} mt-1`} aria-invalid={!!errors["role"]} aria-describedby={errors["role"] ? "ins-role-err" : undefined}>
                  {a.insertRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {err("role")}
              </label>
              <label className="block text-[14px] font-semibold">
                Tipo
                <select value={type} onChange={(e) => setType(e.target.value)} className={`${fieldCls} mt-1`} aria-invalid={!!errors["type"]}>
                  {INSERIMENTO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {err("type")}
              </label>
              <p className="m-0 text-[14px] font-semibold sm:col-span-2">
                Area <span className="ml-1 font-medium text-[var(--in-sub)]">{a.label}</span>
              </p>
              <label className="block text-[14px] font-semibold sm:col-span-2">
                Descrizione
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={DESCRIPTION_MAX + 50}
                  className="scd-focus mt-1 block w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2.5 text-[15px] text-[var(--in-ink)] focus:border-[var(--in-focus)]"
                  aria-invalid={!!errors["description"]}
                  aria-describedby={`ins-desc-help${errors["description"] ? " ins-description-err" : ""}`}
                />
                <span id="ins-desc-help" className="mt-1 block text-[13px] font-medium text-[var(--in-sub)]">
                  Niente nomi di ragazzi, dati di salute o coordinate bancarie: scrivi cosa serve e dove trovarlo.
                </span>
                {err("description")}
              </label>
              <label className="block text-[14px] font-semibold">
                Scadenza <span className="font-medium text-[var(--in-sub)]">(facoltativa)</span>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${fieldCls} mt-1`} aria-invalid={!!errors["deadline"]} />
                {err("deadline")}
              </label>
              <label className="block text-[14px] font-semibold">
                Link o allegato <span className="font-medium text-[var(--in-sub)]">(facoltativo)</span>
                <input type="text" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… o nome del file" className={`${fieldCls} mt-1`} aria-invalid={!!errors["link"]} />
                {err("link")}
              </label>
              <div className="flex flex-wrap items-center gap-2.5 sm:col-span-2">
                <button type="submit" className="scd-action" data-testid="insert-build">
                  <ClipboardCopy className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  Prepara e copia la riga
                </button>
                {sheetUrl && (
                  <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-[#b9d5ef] px-3.5 text-[15px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]">
                    Apri il foglio
                    <ExternalLink className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </a>
                )}
              </div>
            </form>

            <div role="status" aria-live="polite" className="mt-3">
              {row && (
                <div className="rounded-xl border border-[var(--in-line)] bg-[#f7fbff] p-3.5">
                  <p className="m-0 flex items-center gap-2 text-[14.5px] font-semibold">
                    {copied === "yes" ? (
                      <><Check className="size-4 text-[var(--in-ok)]" strokeWidth={2} aria-hidden="true" />Riga copiata: incollala nella prima riga libera del foglio.</>
                    ) : (
                      <>Copia a mano la riga qui sotto (è già selezionata).</>
                    )}
                  </p>
                  <textarea
                    ref={rowRef}
                    readOnly
                    value={row}
                    rows={2}
                    aria-label="Riga pronta da incollare"
                    data-testid="insert-row"
                    onFocus={(e) => e.currentTarget.select()}
                    className="mt-2 block w-full resize-none rounded-lg border border-[var(--in-line)] bg-white px-2.5 py-2 font-mono text-[12.5px] text-[var(--in-ink)]"
                  />
                  <p className="mt-2 text-[12.5px] leading-snug text-[var(--in-sub)]">Colonne: {INSERIMENTI_COLUMNS.join(" · ")}. Stato iniziale NUOVA.</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-[13px] leading-snug text-[var(--in-sub)]">Il foglio si apre solo a chi ha già accesso al Drive della società.</p>
          </div>
        </div>
      )}
    </>
  );
}
