import { useId } from "react";

import { NO_HEALTH_HINT, REASON_CODES, REASON_LABEL, REASON_NOTE_MAX, type ReasonCode } from "@/lib/team-area";

/**
 * Reason of an impediment or of an advance absence notice (UD-181): one category and a short note.
 * There is no health category on purpose, and the hint says so in plain words.
 */
export function ReasonPicker({
  code,
  note,
  onCode,
  onNote,
  disabled = false,
}: {
  code: ReasonCode;
  note: string;
  onCode: (c: ReasonCode) => void;
  onNote: (n: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-code`} className="text-[14px] font-semibold">
        Motivo
      </label>
      <select
        id={`${id}-code`}
        value={code}
        disabled={disabled}
        onChange={(e) => onCode(e.target.value as ReasonCode)}
        className="scd-focus h-11 w-full max-w-[320px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]"
      >
        {REASON_CODES.map((c) => (
          <option key={c} value={c}>
            {REASON_LABEL[c]}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-note`} className="text-[14px] font-semibold">
        Nota per il mister <span className="font-normal text-[var(--in-sub)]">(facoltativa)</span>
      </label>
      <input
        id={`${id}-note`}
        value={note}
        maxLength={REASON_NOTE_MAX}
        disabled={disabled}
        onChange={(e) => onNote(e.target.value)}
        aria-describedby={`${id}-hint`}
        className="scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]"
      />
      <p id={`${id}-hint`} className="m-0 text-[13px] leading-snug text-[var(--in-sub)]">
        {NO_HEALTH_HINT}
      </p>
    </div>
  );
}
