import { Scale, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import {
  COMMUNICATION_LEAD_DAYS,
  COMPLIANCE_STATUS_LABEL,
  COMPLIANCE_STATUSES,
  complianceSchedule,
  earliestDrawDate,
  LEGAL_CHECKED_ON,
  LEGAL_DISCLAIMER,
  LEGAL_SOURCES,
  shortDay,
  type ComplianceRecord,
  type ComplianceRow,
  type ComplianceStatus,
  type DueState,
  type LotteryState,
} from "@/lib/lottery";

import type { LotteryActions } from "./store";
import {
  btnSecondary,
  DateField,
  ResultLine,
  SelectField,
  TextField,
  useAction,
} from "./ui";

const DUE: Record<
  DueState,
  { tone: ChipTone; label: (r: ComplianceRow) => string }
> = {
  FATTO: { tone: "ok", label: () => "Fatto" },
  NON_RICHIESTO: { tone: "mute", label: () => "Non richiesto" },
  SCADUTO: {
    tone: "crit",
    label: (r) => `Scaduto da ${Math.abs(r.daysLeft ?? 0)} gg`,
  },
  IN_SCADENZA: {
    tone: "warn",
    label: (r) => (r.daysLeft === 0 ? "Scade oggi" : `Tra ${r.daysLeft} gg`),
  },
  IN_TEMPO: { tone: "info", label: (r) => `Tra ${r.daysLeft} gg` },
  SENZA_DATA: { tone: "mute", label: () => "Data da calcolare" },
};

export function CompliancePanel({
  state,
  today,
  actions,
  canWrite,
}: {
  state: LotteryState;
  today: string;
  actions: LotteryActions;
  canWrite: boolean;
}) {
  const rows = complianceSchedule(state.setup, state.compliance, today);
  const late = rows.filter((r) => r.dueState === "SCADUTO").length;
  const soon = rows.filter((r) => r.dueState === "IN_SCADENZA").length;
  const done = rows.filter(
    (r) => r.dueState === "FATTO" || r.dueState === "NON_RICHIESTO",
  ).length;
  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-compliance"
        title="2 · Adempimenti"
        sub={`Scadenze calcolate dalla data dell'estrazione (comunicazioni almeno ${COMMUNICATION_LEAD_DAYS} giorni prima). Numeri di protocollo come testo: l'app non conserva documenti.`}
        aside={
          <>
            <Chip tone="ok">
              {done}/{rows.length} completati
            </Chip>
            {late > 0 && <Chip tone="crit">{late} scaduti</Chip>}
            {soon > 0 && <Chip tone="warn">{soon} in scadenza</Chip>}
          </>
        }
      >
        <div
          className="mx-4 mb-3 flex gap-2 rounded-xl border border-[#f1dca6] bg-[var(--in-warn-bg)] px-4 py-3 sm:mx-[18px]"
          data-testid="lot-legal-disclaimer"
        >
          <Scale
            className="mt-0.5 size-5 flex-none text-[var(--in-warn)]"
            aria-hidden="true"
          />
          <p className="m-0 text-[14.5px] leading-snug">
            <b>Da verificare con SUAP, Prefettura di Lecco e commercialista.</b>{" "}
            {LEGAL_DISCLAIMER}
            {!state.setup.drawDate && (
              <>
                {" "}
                Se le comunicazioni partissero oggi, l'estrazione non potrebbe
                essere prima del {shortDay(earliestDrawDate(today))}.
              </>
            )}
          </p>
        </div>
        <ol className="m-0 list-none p-0" data-testid="lot-compliance-list">
          {rows.map((r) => (
            <ComplianceItem
              key={r.code}
              row={r}
              actions={actions}
              disabled={!canWrite || !state.id}
            />
          ))}
        </ol>
      </Card>
      <Card
        id="lot-sources"
        title="Fonti verificate"
        sub={`Controllate il ${shortDay(LEGAL_CHECKED_ON)}. Non sono un parere legale.`}
      >
        <ul className="m-0 list-disc px-4 pb-4 pl-9 text-[14.5px] leading-snug text-[var(--in-sub)] sm:px-[18px] sm:pl-10">
          {LEGAL_SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ComplianceItem({
  row,
  actions,
  disabled,
}: {
  row: ComplianceRow;
  actions: LotteryActions;
  disabled: boolean;
}) {
  const [rec, setRec] = useState<ComplianceRecord>(row.record);
  useEffect(() => setRec(row.record), [row.record]);
  const save = useAction();
  const dirty = JSON.stringify(rec) !== JSON.stringify(row.record);
  const due = DUE[row.dueState];
  return (
    <li
      className="border-t border-[var(--in-line)] px-4 py-3.5 sm:px-[18px]"
      data-testid={`lot-compliance-${row.code}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-[280px]">
          <p className="m-0 text-[16px] font-bold leading-snug">
            {row.title}
            {row.certainty === "VERIFICARE" && (
              <Chip tone="warn" className="ml-2 align-middle">
                Verificare se richiesta
              </Chip>
            )}
          </p>
          <p className="m-0 mt-0.5 text-[14px] leading-snug text-[var(--in-sub)]">
            {row.detail}
          </p>
          <p className="m-0 mt-1 text-[13.5px] text-[var(--in-sub)]">
            Chi: {row.who} · Scadenza:{" "}
            <b className="text-[var(--in-ink)]">
              {row.dueDate
                ? shortDay(row.dueDate)
                : "manca la data di riferimento"}
            </b>
          </p>
        </div>
        <Chip tone={due.tone}>{due.label(row)}</Chip>
      </div>
      <details className="mt-2">
        <summary className="scd-focus inline-flex min-h-11 cursor-pointer items-center rounded-lg text-[14.5px] font-semibold text-[var(--in-info)]">
          Aggiorna stato{row.hasProtocol ? " e protocollo" : ""}
        </summary>
        <form
          className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save.run(() => actions.saveCompliance(row.code, rec));
          }}
        >
          <SelectField<ComplianceStatus>
            label="Stato"
            value={rec.status}
            options={COMPLIANCE_STATUSES.map((s) => ({
              value: s,
              label: COMPLIANCE_STATUS_LABEL[s],
            }))}
            onChange={(v) =>
              setRec({ ...rec, status: (v || "DA_FARE") as ComplianceStatus })
            }
            disabled={disabled}
          />
          <DateField
            label="Fatto il"
            value={rec.doneOn}
            onChange={(v) => setRec({ ...rec, doneOn: v })}
            disabled={disabled}
          />
          {row.hasProtocol ? (
            <TextField
              label="Protocollo / riferimento"
              value={rec.protocol}
              onChange={(v) => setRec({ ...rec, protocol: v })}
              maxLength={120}
              disabled={disabled}
            />
          ) : (
            <span className="hidden lg:block" />
          )}
          <TextField
            label="Nota"
            value={rec.note}
            onChange={(v) => setRec({ ...rec, note: v })}
            maxLength={400}
            disabled={disabled}
          />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className={btnSecondary}
              disabled={disabled || !dirty || save.busy}
            >
              <Save className="size-4" aria-hidden="true" /> Salva
            </button>
            <ResultLine result={save.result} />
          </div>
        </form>
      </details>
    </li>
  );
}
