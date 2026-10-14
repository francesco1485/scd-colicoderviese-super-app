/**
 * Day view per pitch (release 2, item 8c): prenotato / disponibile / rilasciato
 * for Colico campo 1, campo 2 and Dervio on one day. Calendar matches,
 * confirmed register rows and the Quadro trainings of the chosen week hold the
 * pitch; cancelled rows show as released; pending requests are listed and
 * never reserve. Read only.
 */
import { useId, useMemo, useState } from "react";

import type { Proposal } from "@/lib/bookings-register";
import {
  DAY_STATE_LABEL,
  freeShareText,
  pitchDayView,
  type DayBlock,
  type DayState,
  type QuadroRotationLike,
  type QuadroWeek,
} from "@/lib/impianti-planning";
import { PITCHES, hhmm, longDay, type PitchId, type RotationMatch } from "@/lib/rotation";
import { Chip, inputCls, labelCls, type Tone } from "./ui";

const FROM = 8 * 60;
const TO = 23 * 60;
const PITCH_IDS: readonly PitchId[] = ["C1", "C2", "DV"];

const STATE_TONE: Record<DayState, Tone> = {
  prenotato: "info",
  disponibile: "ok",
  rilasciato: "warn",
};
const STATE_FILL: Record<DayState, string> = {
  prenotato: "bg-[var(--in-rail)]",
  disponibile: "bg-[var(--in-ok-bg)]",
  rilasciato:
    "bg-[repeating-linear-gradient(135deg,#fff6d6_0_6px,#f1dc7a_6px_9px)]",
};

function blockText(b: DayBlock): string {
  const parts: string[] = [];
  if (b.state === "prenotato") {
    parts.push(freeShareText(b.used));
    parts.push(b.uses.map((u) => u.label).join("; "));
  }
  if (b.released.length)
    parts.push(`rilasciato da ${b.released.map((u) => u.label).join("; ")}`);
  if (b.pending.length)
    parts.push(`in attesa: ${b.pending.map((u) => u.label).join("; ")}`);
  return parts.filter(Boolean).join(" · ");
}

function PitchDay({
  pitch,
  date,
  items,
  proposals,
  rotations,
  week,
}: {
  pitch: PitchId;
  date: string;
  items: readonly RotationMatch[];
  proposals: readonly Proposal[] | null;
  rotations: readonly QuadroRotationLike[] | null;
  week: QuadroWeek;
}) {
  const v = useMemo(
    () =>
      pitchDayView({ date, pitch, items, proposals, rotations, week, from: FROM, to: TO }),
    [date, pitch, items, proposals, rotations, week],
  );
  const p = PITCHES[pitch];
  const span = TO - FROM;
  const hid = useId();
  const busy = v.blocks.filter(
    (b) => b.state !== "disponibile" || b.pending.length,
  );
  return (
    <section aria-labelledby={hid} className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={hid} className="m-0 text-[16px] font-bold">
          {p.site} {p.name.toLowerCase()}{" "}
          <span className="font-normal text-[var(--in-sub)]">
            · {p.surface} · {p.size ?? "—"}
          </span>
        </h3>
        <span className="text-[13px] text-[var(--in-sub)]">
          Disponibile {Math.round((v.totals.disponibile / 60) * 10) / 10} h su{" "}
          {span / 60}
        </span>
      </div>
      <div
        className="relative flex h-7 overflow-hidden rounded-lg border border-[var(--in-line)]"
        aria-hidden="true"
      >
        {v.blocks.map((b) => (
          <div
            key={`${b.start}-${b.state}`}
            className={`${STATE_FILL[b.state]} h-full border-r border-white/70 last:border-r-0 ${b.state === "prenotato" && b.used < 1 - 1e-9 ? "opacity-70" : ""}`}
            style={{ width: `${((b.end - b.start) / span) * 100}%` }}
            title={`${hhmm(b.start)}–${hhmm(b.end)} ${DAY_STATE_LABEL[b.state]}`}
          />
        ))}
      </div>
      <div
        className="flex justify-between text-[12px] tabular-nums text-[var(--in-sub)]"
        aria-hidden="true"
      >
        {[8, 11, 14, 17, 20, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}</span>
        ))}
      </div>
      {busy.length ? (
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {busy.map((b) => (
            <li
              key={`${b.start}-${b.end}`}
              className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1 text-[14px] sm:grid-cols-[96px_auto_1fr]"
            >
              <span className="font-semibold tabular-nums">
                {hhmm(b.start)}–{hhmm(b.end)}
              </span>
              <span className="justify-self-start">
                <Chip tone={b.used > 1 + 1e-9 ? "crit" : STATE_TONE[b.state]}>
                  {DAY_STATE_LABEL[b.state]}
                </Chip>
              </span>
              <span className="col-span-2 text-[var(--in-sub)] sm:col-span-1">
                {blockText(b)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[14px] text-[var(--in-ok)]">
          Disponibile tutto il giorno ({hhmm(FROM)}–{hhmm(TO)}).
        </p>
      )}
    </section>
  );
}

/** Day of the three pitches with a week A/B switch (the quadro cannot tell the week of a date). */
export function PitchDayView({
  date: dateIn,
  editableDate = false,
  items,
  proposals,
  rotations,
  title = "Giornata dei campi",
}: {
  date: string;
  editableDate?: boolean;
  items: readonly RotationMatch[];
  /** Register rows; null when the register is not read on this page. */
  proposals: readonly Proposal[] | null;
  rotations: readonly QuadroRotationLike[] | null;
  title?: string;
}) {
  const [week, setWeek] = useState<QuadroWeek>("A");
  const [picked, setPicked] = useState<string | null>(null);
  const date = editableDate && picked ? picked : dateIn;
  const hid = useId();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  return (
    <section
      aria-labelledby={hid}
      className="grid gap-3.5 rounded-2xl border border-[var(--in-line)] bg-white p-4 shadow-[var(--in-card-shadow)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={hid} className="m-0 text-[19px] font-bold">
            {title}
          </h2>
          <p className="m-0 mt-0.5 text-[14px] text-[var(--in-sub)]">
            {valid ? longDay(date) : "Giorno da scegliere"} · prenotato,
            disponibile o rilasciato, dalle {hhmm(FROM)} alle {hhmm(TO)}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {editableDate && (
            <label className="grid gap-1">
              <span className={labelCls}>Giorno</span>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setPicked(e.target.value || null)}
              />
            </label>
          )}
          <div
            role="group"
            aria-label="Settimana del Quadro settimanale"
            className="grid gap-1"
          >
            <span className={labelCls}>Settimana del Quadro</span>
            <div className="flex rounded-[10px] border border-[#b9d5ef] p-0.5">
              {(["A", "B"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={week === w}
                  onClick={() => setWeek(w)}
                  className={`scd-focus min-h-10 min-w-11 rounded-lg px-3 text-[15px] font-semibold ${week === w ? "bg-[var(--in-rail)] text-white" : "text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ul
        className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px] text-[var(--in-sub)]"
        aria-label="Legenda"
      >
        {(["prenotato", "disponibile", "rilasciato"] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={`inline-block size-3.5 rounded-sm border border-[var(--in-line)] ${STATE_FILL[s]}`}
              aria-hidden="true"
            />
            {DAY_STATE_LABEL[s]}
          </li>
        ))}
        <li>Più chiaro: campo occupato solo in parte.</li>
      </ul>
      {valid ? (
        <div className="grid gap-5 @[1100px]:grid-cols-3 @[1100px]:gap-6">
          {PITCH_IDS.map((p) => (
            <PitchDay
              key={p}
              pitch={p}
              date={date}
              items={items}
              proposals={proposals}
              rotations={rotations}
              week={week}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 text-[14px] text-[var(--in-sub)]">Scegli un giorno.</p>
      )}
      <p className="m-0 text-[13px] leading-snug text-[var(--in-sub)]">
        Prenotato: gare del calendario,
        {proposals === null
          ? " (registro prenotazioni non letto in questa pagina),"
          : " prenotazioni CONFERMATE del registro,"}{" "}
        {rotations === null
          ? "allenamenti del Quadro non disponibili qui"
          : `allenamenti del Quadro settimanale della settimana ${week}`}
        . Rilasciato: prenotazione annullata, campo di nuovo libero. Le
        richieste in attesa e le ipotesi non bloccano il campo. Il cambio campo
        di 15 minuti non è disegnato.
      </p>
    </section>
  );
}
