import { useServerFn } from "@tanstack/react-start";
import { Check, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ROLES,
  ROLE_LABEL,
  performancePoints,
  fmtPoints,
  reportProblems,
  type FantaRole,
  type MatchReport,
  type ReportPlayer,
} from "@/lib/fanta";
import { getMatchReport, saveMatchReport } from "@/lib/fanta.functions";

/**
 * Tabellino (r92): after kick-off the staff of the team records the final score and, for each player who took part,
 * minutes, goals, assists and cards. It feeds the Fantacalcio SCD: points are computed by the database only from
 * what is recorded here, never estimated.
 */
export function MatchReportPanel({
  eventId,
  heading,
}: {
  eventId: string;
  heading: string;
}) {
  const load = useServerFn(getMatchReport);
  const save = useServerFn(saveMatchReport);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [state, setState] = useState<
    "loading" | "ok" | "no-match" | "signed-out" | "error"
  >("loading");
  const [rows, setRows] = useState<ReportPlayer[]>([]);
  const [played, setPlayed] = useState<Set<string>>(new Set());
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const reload = useCallback(async () => {
    try {
      const r = await load({ data: { eventId } });
      setState(r.state);
      setReport(r.report);
      if (r.report) {
        setRows(r.report.players);
        setPlayed(
          new Set(
            r.report.players
              .filter((p) => p.recorded && p.minutes > 0)
              .map((p) => p.athleteId),
          ),
        );
        setGf(r.report.goalsFor ?? 0);
        setGa(r.report.goalsAgainst ?? 0);
      }
    } catch {
      setState("error");
    }
  }, [eventId, load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const chosen = useMemo(
    () => rows.filter((r) => played.has(r.athleteId)),
    [rows, played],
  );
  const problems = useMemo(
    () => reportProblems(gf, ga, chosen),
    [gf, ga, chosen],
  );

  const patch = (id: string, p: Partial<ReportPlayer>) =>
    setRows((rs) => rs.map((r) => (r.athleteId === id ? { ...r, ...p } : r)));
  const togglePlayed = (r: ReportPlayer) =>
    setPlayed((s) => {
      const n = new Set(s);
      if (n.has(r.athleteId)) n.delete(r.athleteId);
      else {
        n.add(r.athleteId);
        if (r.minutes === 0) patch(r.athleteId, { minutes: 90 });
      }
      return n;
    });

  const submit = async () => {
    if (!report || problems.length) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await save({
        data: {
          matchId: report.matchId,
          goalsFor: gf,
          goalsAgainst: ga,
          rows: chosen.map((x) => ({
            athleteId: x.athleteId,
            minutes: x.minutes,
            goals: x.goals,
            assists: x.assists,
            yellow: x.yellow,
            red: x.red,
            role: x.role,
          })),
        },
      });
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok) await reload();
    } catch {
      setMessage({ ok: false, text: "Salvataggio non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading")
    return (
      <p className="m-0 text-[14px] text-[var(--in-sub)]" role="status">
        Carico il tabellino…
      </p>
    );
  if (state !== "ok" || !report) {
    return (
      <p className="m-0 rounded-xl bg-[#f6f9fd] px-3 py-3 text-[14.5px] text-[var(--in-sub)]">
        {state === "no-match"
          ? "Il tabellino si compila per le gare con convocazione inviata dall'app."
          : state === "signed-out"
            ? "Accedi con un ruolo della squadra per compilare il tabellino."
            : "Tabellino non disponibile, riprova tra poco."}
      </p>
    );
  }
  if (!report.open)
    return (
      <p className="m-0 rounded-xl bg-[#f6f9fd] px-3 py-3 text-[14.5px] text-[var(--in-sub)]">
        Il tabellino si apre al fischio d'inizio.
      </p>
    );

  return (
    <div className="flex flex-col gap-3" data-panel="tabellino">
      <p className="m-0 text-[14px] font-semibold text-[var(--in-sub)]">
        {heading}
      </p>
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] bg-[#0b2a5b] px-4 py-3 text-white">
        <span className="text-[14px] font-semibold">Risultato finale</span>
        <Stepper label="Gol fatti" value={gf} onChange={setGf} max={30} dark />
        <span aria-hidden="true" className="font-uv text-[22px]">
          –
        </span>
        <Stepper label="Gol subiti" value={ga} onChange={setGa} max={30} dark />
        {report.recordedAt && (
          <span className="ml-auto text-[12.5px] text-[#c8d8ee]">Salvato</span>
        )}
      </div>

      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((r) => {
          const on = played.has(r.athleteId);
          return (
            <li
              key={r.athleteId}
              className={`rounded-[14px] border px-3 py-2.5 ${on ? "border-[#1e7fd8] bg-white" : "border-[var(--in-line)] bg-[#f8fafd]"}`}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => togglePlayed(r)}
                  aria-pressed={on}
                  className={`scd-focus grid size-7 shrink-0 place-items-center rounded-full ${on ? "bg-[#1e7fd8] text-white" : "bg-[#e6edf6] text-transparent"}`}
                  aria-label={
                    on
                      ? `${r.displayName}: ha giocato`
                      : `${r.displayName}: non ha giocato`
                  }
                >
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <b className="min-w-0 flex-1 truncate text-[15px]">
                  {r.displayName}
                </b>
                <label className="flex items-center gap-1.5 text-[13px] text-[var(--in-sub)]">
                  Ruolo
                  <select
                    value={r.role ?? ""}
                    onChange={(e) =>
                      patch(r.athleteId, {
                        role: (e.target.value || null) as FantaRole | null,
                      })
                    }
                    className="scd-focus h-9 rounded-[8px] border border-[var(--in-line)] bg-white px-2 text-[14px]"
                  >
                    <option value="">—</option>
                    {ROLES.map((x) => (
                      <option key={x} value={x}>
                        {ROLE_LABEL[x]}
                      </option>
                    ))}
                  </select>
                </label>
                {on && (
                  <span className="rounded-full bg-[#fff6bf] px-2 py-0.5 text-[13px] font-bold text-[#0b1e3a]">
                    {fmtPoints(performancePoints(r, ga))} pt
                  </span>
                )}
              </div>
              {on && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Stepper
                    label="Minuti"
                    value={r.minutes}
                    onChange={(v) => patch(r.athleteId, { minutes: v })}
                    max={130}
                    step={5}
                  />
                  <Stepper
                    label="Gol"
                    value={r.goals}
                    onChange={(v) => patch(r.athleteId, { goals: v })}
                    max={30}
                  />
                  <Stepper
                    label="Assist"
                    value={r.assists}
                    onChange={(v) => patch(r.athleteId, { assists: v })}
                    max={30}
                  />
                  <Stepper
                    label="Gialli"
                    value={r.yellow}
                    onChange={(v) => patch(r.athleteId, { yellow: v })}
                    max={2}
                  />
                  <label className="flex items-center gap-2 text-[14px]">
                    <input
                      type="checkbox"
                      checked={r.red}
                      onChange={(e) =>
                        patch(r.athleteId, { red: e.target.checked })
                      }
                      className="size-5 accent-[#c23c3f]"
                    />
                    Rosso
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {problems.length > 0 && (
        <ul className="m-0 list-none rounded-xl bg-[#fff4e5] px-3 py-2 text-[14px] text-[#7a4b00]">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || problems.length > 0}
          className="scd-focus h-11 rounded-[12px] bg-[var(--uv-gold,#ffd600)] px-5 text-[15px] font-bold text-[#0b1e3a] disabled:opacity-50"
        >
          {busy ? "Salvo…" : "Salva tabellino"}
        </button>
        <span className="text-[13px] text-[var(--in-sub)]">
          {chosen.length} giocatori in campo
        </span>
        {message && (
          <span
            role="status"
            className={`text-[14px] font-semibold ${message.ok ? "text-[#1d7a4c]" : "text-[#b4232a]"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max,
  step = 1,
  dark = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step?: number;
  dark?: boolean;
}) {
  const btn = `scd-focus grid size-8 place-items-center rounded-full ${dark ? "bg-white/15 text-white" : "bg-[#e6edf6] text-[#0b2a5b]"} disabled:opacity-40`;
  return (
    <span className="flex items-center gap-1.5" role="group" aria-label={label}>
      <span
        className={`text-[13px] ${dark ? "text-[#c8d8ee]" : "text-[var(--in-sub)]"}`}
      >
        {label}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(0, value - step))}
        disabled={value <= 0}
        aria-label={`${label}: meno`}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output className="w-8 text-center text-[16px] font-bold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`${label}: più`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}
