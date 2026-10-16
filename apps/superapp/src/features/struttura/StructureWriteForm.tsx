/**
 * Writing of "Attività in struttura" (G04, migration r137 STAGED). UD-159: the Direzione, the Presidente and the
 * Direttore generale decide the activities in the gestionale; UD-156: the Segreteria is informed of every change (the
 * database puts the notice in the work queue). Fail closed: the form renders only when the database said canWrite
 * ("on"); writers by session see why writing is not open yet. Not optimistic: the page reloads after a save.
 * The server calls are passed in as props, so the states can be rendered and tested without a router.
 */
import { CircleAlert, Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { roleLabel } from "@/lib/access";
import {
  AREA_LABEL,
  KIND_LABEL,
  SITE_LABEL,
  STRUCTURE_AREAS,
  STRUCTURE_KINDS,
  STRUCTURE_RESPONSIBLE_OPTIONS,
  STRUCTURE_SEGRETERIA_NOTICE,
  STRUCTURE_WRITE_FAILED,
  STRUCTURE_WRITE_MESSAGES,
  STRUCTURE_WRITE_OFF,
  STRUCTURE_WRITE_UNAVAILABLE,
  validateCancelReason,
  validateStructureDraft,
  type StructureArea,
  type StructureDraft,
  type StructureKind,
  type StructureSite,
  type StructureWriteOutcome,
  type StructureWriteState,
} from "@/lib/structure-activities";

const field =
  "scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] focus:border-[var(--in-focus)]";
const label = "grid content-start gap-1 text-[14px] font-semibold text-[var(--in-sub)]";
const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary = `${btn} bg-[var(--in-info)] text-white`;
const btnGhost = `${btn} border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]`;
const btnDanger = `${btn} border border-[var(--in-crit)] bg-white text-[var(--in-crit)]`;

/** Why writing is not open, for writers by session only ("not-applied", "unavailable"); nothing otherwise. */
export function StructureWriteNotice({ state }: { state: StructureWriteState }) {
  if (state !== "not-applied" && state !== "unavailable") return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-[#b9d5ef] bg-[var(--in-info-bg)] px-4 py-3 sm:px-[18px]">
      <Info className="mt-0.5 size-5 flex-none text-[var(--in-info)]" strokeWidth={2} aria-hidden="true" />
      <p className="m-0 text-[14.5px] leading-snug">
        <b className="block text-[15.5px]">{state === "not-applied" ? STRUCTURE_WRITE_OFF : STRUCTURE_WRITE_UNAVAILABLE}</b>
        Per ora le attività si vedono soltanto. Le decidono la Direzione, il Presidente e il Direttore generale; la Segreteria
        sarà avvisata di ogni cambio.
      </p>
    </div>
  );
}

export interface StructureWriteFormProps {
  state: StructureWriteState;
  /** Club day (Europe/Rome): bounds of the day field. */
  today: string;
  /** Sites the writer may choose (the sites the page shows). */
  sites: readonly StructureSite[];
  /** Activity being edited (with its id), or null for a new one. */
  editing: { id: string; draft: StructureDraft } | null;
  /** Initial values of a new activity. */
  initial: StructureDraft;
  onSave: (input: { id: string | null; draft: StructureDraft }) => Promise<StructureWriteOutcome>;
  onCancelActivity: (input: { id: string; reason: string | null }) => Promise<StructureWriteOutcome>;
  /** Called after a successful write with the message to show; the page reloads the week. */
  onDone: (message: string) => void;
  onClose: () => void;
}

function Field({ id, text, hint, children }: { id: string; text: string; hint?: string; children: ReactNode }) {
  return (
    <div className={label}>
      <label htmlFor={id}>{text}</label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className="text-[13px] font-normal">
          {hint}
        </span>
      )}
    </div>
  );
}

const dayBound = (today: string, n: number) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Form to add or edit an activity, and to cancel it. Renders nothing unless the database opened writing ("on"). */
export function StructureWriteForm(props: StructureWriteFormProps) {
  const { state, today, sites, editing, initial, onSave, onCancelActivity, onDone, onClose } = props;
  const id = useId();
  const [draft, setDraft] = useState<StructureDraft>(editing?.draft ?? initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (state !== "on") return null;

  const set = <K extends keyof StructureDraft>(k: K) => (v: StructureDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setError(null);
  };

  const run = async (call: () => Promise<StructureWriteOutcome>) => {
    setBusy(true);
    setError(null);
    try {
      const out = await call();
      if (out.ok) onDone(out.message);
      else setError(out.message);
    } catch {
      setError(STRUCTURE_WRITE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const v = validateStructureDraft(draft, today);
    if (!v.ok) {
      setError(STRUCTURE_WRITE_MESSAGES[v.code]);
      return;
    }
    void run(() => onSave({ id: editing?.id ?? null, draft: v.value }));
  };

  const cancelActivity = () => {
    if (!editing) return;
    const r = validateCancelReason(reason);
    if (!r.ok) {
      setError(STRUCTURE_WRITE_MESSAGES[r.code]);
      return;
    }
    void run(() => onCancelActivity({ id: editing.id, reason: r.value }));
  };

  return (
    <form
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-3"
    >
      <h3 id={`${id}-title`} className="m-0 text-[16px] font-bold">
        {editing ? "Modifica attività" : "Nuova attività"}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id={`${id}-site`} text="Sede">
          <select id={`${id}-site`} className={field} value={draft.site} onChange={(e) => set("site")(e.target.value as StructureSite)}>
            {sites.map((s) => (
              <option key={s} value={s}>
                {SITE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-area`} text="Dove">
          <select id={`${id}-area`} className={field} value={draft.area} onChange={(e) => set("area")(e.target.value as StructureArea)}>
            {STRUCTURE_AREAS.map((a) => (
              <option key={a} value={a}>
                {AREA_LABEL[a]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-kind`} text="Tipo di attività">
          <select id={`${id}-kind`} className={field} value={draft.kind} onChange={(e) => set("kind")(e.target.value as StructureKind)}>
            {STRUCTURE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-date`} text="Giorno">
          <input
            id={`${id}-date`}
            type="date"
            className={field}
            value={draft.date}
            min={dayBound(today, -7)}
            max={dayBound(today, 366)}
            onChange={(e) => set("date")(e.target.value)}
          />
        </Field>
        <Field id={`${id}-start`} text="Dalle">
          <input id={`${id}-start`} type="time" className={field} value={draft.start} onChange={(e) => set("start")(e.target.value)} />
        </Field>
        <Field id={`${id}-end`} text="Alle" hint="Se finisce dopo mezzanotte, metti l'ora del giorno dopo.">
          <input
            id={`${id}-end`}
            type="time"
            className={field}
            value={draft.end}
            aria-describedby={`${id}-end-hint`}
            onChange={(e) => set("end")(e.target.value)}
          />
        </Field>
      </div>
      <Field id={`${id}-name`} text="Titolo" hint="Da 2 a 80 caratteri. Nessun nome di persone, mai di minori; niente telefoni o e-mail.">
        <input
          id={`${id}-name`}
          className={field}
          value={draft.title}
          maxLength={80}
          aria-describedby={`${id}-name-hint`}
          onChange={(e) => set("title")(e.target.value)}
        />
      </Field>
      <Field id={`${id}-role`} text="Responsabile (ruolo, mai un nome)">
        <select id={`${id}-role`} className={field} value={draft.responsibleRole ?? ""} onChange={(e) => set("responsibleRole")(e.target.value || null)}>
          <option value="">Nessuno per ora</option>
          {STRUCTURE_RESPONSIBLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-[15px] font-semibold">
        <input type="checkbox" className="scd-focus size-5" checked={draft.covered} onChange={(e) => set("covered")(e.target.checked)} />
        Turno coperto (qualcuno lo ha preso; chi, non si scrive qui)
      </label>
      <Field id={`${id}-notes`} text="Note (facoltative)" hint="Al massimo 300 caratteri. Niente telefoni o e-mail.">
        <textarea
          id={`${id}-notes`}
          className={`${field} h-auto min-h-[88px] py-2`}
          value={draft.notes ?? ""}
          maxLength={300}
          aria-describedby={`${id}-notes-hint`}
          onChange={(e) => set("notes")(e.target.value || null)}
        />
      </Field>

      <p className="m-0 flex items-start gap-2 text-[14px] text-[var(--in-sub)]">
        <Info className="mt-0.5 size-4 flex-none" aria-hidden="true" />
        {STRUCTURE_SEGRETERIA_NOTICE}
      </p>

      {error && (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-xl border border-[var(--in-crit)] bg-[var(--in-crit-bg)] px-3 py-2 text-[14.5px] font-semibold text-[var(--in-crit)]">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Salvataggio…" : editing ? "Salva modifiche" : "Salva attività"}
        </button>
        <button type="button" disabled={busy} onClick={onClose} className={btnGhost}>
          Chiudi senza salvare
        </button>
        {editing && !cancelOpen && (
          <button type="button" disabled={busy} onClick={() => setCancelOpen(true)} className={btnDanger}>
            Annulla attività
          </button>
        )}
      </div>

      {editing && cancelOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--in-line)] bg-[#fff8f8] p-3">
          <Field id={`${id}-reason`} text="Motivo dell'annullamento (facoltativo)" hint="Lo legge la Segreteria. Niente telefoni o e-mail.">
            <input
              id={`${id}-reason`}
              className={field}
              value={reason}
              maxLength={300}
              aria-describedby={`${id}-reason-hint`}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={cancelActivity} className={btnDanger}>
              {busy ? "Annullamento…" : "Conferma annullamento"}
            </button>
            <button type="button" disabled={busy} onClick={() => setCancelOpen(false)} className={btnGhost}>
              Non annullare
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
