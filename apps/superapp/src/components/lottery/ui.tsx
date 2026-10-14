/**
 * Small form pieces of the Lotteria back office, in the interior palette (`--in-*`). Plain labels, 44px targets,
 * errors linked to their field (aria-describedby), messages announced politely.
 */
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { formatEuro, parseEuroToCents, type Issue } from "@/lib/lottery";

export const inputCls =
  "h-11 w-full min-w-0 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)] focus-visible:ring-2 focus-visible:ring-[var(--in-info)]/30 disabled:bg-[#f2f6fb] disabled:text-[var(--in-sub)]";
export const textareaCls =
  "min-h-[88px] w-full min-w-0 rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] leading-snug text-[var(--in-ink)] outline-none focus:border-[var(--in-info)] focus-visible:ring-2 focus-visible:ring-[var(--in-info)]/30 disabled:bg-[#f2f6fb]";
export const btnPrimary =
  "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";
export const btnAction =
  "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-bold text-[var(--in-ink)] disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold text-[var(--in-ink)] hover:bg-[#f4f8fd] disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhostDanger =
  "scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[14px] font-semibold text-[var(--in-crit)] hover:bg-[var(--in-crit-bg)] disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label
        htmlFor={id}
        className="text-[14px] font-semibold text-[var(--in-ink)]"
      >
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && (
        <p
          id={hintId}
          className="m-0 text-[13px] leading-snug text-[var(--in-sub)]"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errId}
          className="m-0 text-[13px] font-semibold leading-snug text-[var(--in-crit)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  maxLength,
  disabled,
  multiline,
  className,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string | undefined;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  multiline?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy, invalid }) =>
        multiline ? (
          <textarea
            id={id}
            className={textareaCls}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            data-testid={testId}
          />
        ) : (
          <input
            id={id}
            className={inputCls}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            data-testid={testId}
          />
        )
      }
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  error,
  disabled,
  testId,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  hint?: ReactNode;
  error?: string | undefined;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="date"
          className={inputCls}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          data-testid={testId}
        />
      )}
    </Field>
  );
}

/** Euro amount typed in Italian ("2,50"); the parent receives cents or null. */
export function MoneyField({
  label,
  cents,
  onChange,
  hint,
  error,
  disabled,
  testId,
}: {
  label: string;
  cents: number | null;
  onChange: (v: number | null) => void;
  hint?: ReactNode;
  error?: string | undefined;
  disabled?: boolean;
  testId?: string;
}) {
  const [text, setText] = useState(
    cents === null ? "" : formatEuro(cents).replace(/\s?€/, ""),
  );
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText((t) => {
      const parsed = parseEuroToCents(t);
      if (parsed === cents) return t;
      return cents === null ? "" : formatEuro(cents).replace(/\s?€/, "");
    });
  }, [cents]);
  return (
    <Field
      label={label}
      hint={hint}
      error={error ?? (bad ? "Importo non valido (es. 2,50)." : undefined)}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            inputMode="decimal"
            className={`${inputCls} pr-9`}
            value={text}
            onChange={(e) => {
              const t = e.target.value;
              setText(t);
              const parsed = parseEuroToCents(t);
              setBad(t.trim() !== "" && parsed === null);
              if (t.trim() === "") onChange(null);
              else if (parsed !== null) onChange(parsed);
            }}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || bad || undefined}
            data-testid={testId}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--in-sub)]"
          >
            €
          </span>
        </div>
      )}
    </Field>
  );
}

export function IntField({
  label,
  value,
  onChange,
  hint,
  error,
  disabled,
  min = 1,
  testId,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: ReactNode;
  error?: string | undefined;
  disabled?: boolean;
  min?: number;
  testId?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          step={1}
          className={inputCls}
          value={value ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return onChange(null);
            const n = Number(v);
            onChange(Number.isFinite(n) ? Math.trunc(n) : null);
          }}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          data-testid={testId}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  disabled,
  testId,
}: {
  label: string;
  value: T | "";
  options: ReadonlyArray<{ value: T | ""; label: string }>;
  onChange: (v: T | "") => void;
  hint?: ReactNode;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {({ id, describedBy }) => (
        <select
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value as T | "")}
          disabled={disabled}
          aria-describedby={describedBy}
          data-testid={testId}
        >
          {options.map((o) => (
            <option key={o.value || "_"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function IssueList({
  errors,
  warnings = [],
  testId,
}: {
  errors: readonly Issue[];
  warnings?: readonly Issue[];
  testId?: string;
}) {
  if (errors.length === 0 && warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-[#f2c4c4] bg-[var(--in-crit-bg)] px-4 py-3"
        >
          <p className="m-0 flex items-center gap-2 text-[15px] font-bold text-[var(--in-crit)]">
            <AlertTriangle className="size-4 flex-none" aria-hidden="true" /> Da
            correggere prima di salvare
          </p>
          <ul className="m-0 mt-1 list-disc pl-6 text-[14.5px] leading-snug text-[var(--in-ink)]">
            {errors.map((e, i) => (
              <li key={`${e.field}-${i}`}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-[#f1dca6] bg-[var(--in-warn-bg)] px-4 py-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-bold text-[var(--in-warn)]">
            <Info className="size-4 flex-none" aria-hidden="true" /> Da tenere
            presente
          </p>
          <ul className="m-0 mt-1 list-disc pl-6 text-[14.5px] leading-snug text-[var(--in-ink)]">
            {warnings.map((e, i) => (
              <li key={`${e.field}-${i}`}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Last outcome of an action, announced to screen readers. */
export function ResultLine({ result }: { result: ActionResult | null }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="m-0 min-h-[1.25rem] text-[14px] font-semibold"
    >
      {result && (
        <span
          className={`inline-flex items-center gap-1.5 ${result.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`}
        >
          {result.ok ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-4" aria-hidden="true" />
          )}
          {result.message}
        </span>
      )}
    </p>
  );
}

/** Runs an async action with a busy flag and keeps its result. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
    setBusy(true);
    try {
      const r = await fn();
      setResult(r);
      return r;
    } catch {
      const r = { ok: false, message: "Operazione non riuscita, riprova." };
      setResult(r);
      return r;
    } finally {
      setBusy(false);
    }
  }
  return { busy, result, run, setResult };
}
