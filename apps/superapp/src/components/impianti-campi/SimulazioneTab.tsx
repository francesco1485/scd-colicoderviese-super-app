/**
 * Simulazione: scenario chips, per-team modes, options, hypothetical bookings
 * ("ipotesi", browser only), KPI row and per-day timelines with three lanes
 * (Colico C1, Colico C2, Dervio C1). Ported from the reference simulator.
 */
import { useEffect, useMemo, useState } from "react";

import {
  MODE_LABEL,
  MOVABLE,
  PRESETS,
  ddmm,
  hhmm,
  longDay,
  type DayReport,
  type MovableGroup,
  type PitchId,
  type TeamMode,
} from "@/lib/rotation";
import { Link } from "@tanstack/react-router";
import { teamColor, type ImpiantiModel } from "./model";
import { Chip, SimulationNote, btnPrimary, inputCls, labelCls } from "./ui";

const TEAM_NAME: Record<MovableGroup, string> = {
  u15: "U15",
  u16: "U16 Élite",
  u19: "Juniores U19",
};
const LANES: { id: PitchId; site: string; name: string }[] = [
  { id: "C1", site: "Colico", name: "campo 1 · 100×60" },
  { id: "C2", site: "Colico", name: "campo 2" },
  { id: "DV", site: "Dervio", name: "campo 1 · erba" },
];
const AXIS_START = 8 * 60;
const AXIS_END = 23 * 60;
const pos = (m: number) =>
  Math.max(
    0,
    Math.min(100, ((m - AXIS_START) / (AXIS_END - AXIS_START)) * 100),
  );

function Kpi({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "crit" | "warn" | "ok" | "plain";
}) {
  const cls = {
    crit: "border-[var(--in-crit)] bg-[var(--in-crit-bg)] text-[var(--in-crit)]",
    warn: "border-[var(--in-warn)] bg-[var(--in-warn-bg)] text-[var(--in-warn)]",
    ok: "border-[var(--in-ok)] bg-[var(--in-ok-bg)] text-[var(--in-ok)]",
    plain: "border-[var(--in-line)] bg-white text-[var(--in-ink)]",
  }[tone];
  return (
    <div className={`grid gap-0.5 rounded-xl border px-3.5 py-3 ${cls}`}>
      <b className="font-title text-[34px] font-black leading-none">
        {value}
        {value === "—" && <span className="sr-only"> (non disponibile)</span>}
      </b>
      <span className="text-[13.5px] leading-snug text-[var(--in-sub)]">
        {label}
      </span>
    </div>
  );
}

function DayCard({
  report,
  buffer,
  highlight,
}: {
  report: DayReport;
  buffer: number;
  highlight: boolean;
}) {
  const crit = report.issues.some((i) => i.severity === "crit");
  const warn = !crit && report.issues.length > 0;
  const moved = report.matches.some((m) => m.moved);
  const pills = [...new Map(report.issues.map((i) => [i.text, i])).values()];
  const titleId = `day-${report.date}`;
  return (
    <article
      id={`giorno-${report.date}`}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={`scd-focus grid min-w-0 gap-2.5 rounded-2xl border bg-white p-3.5 ${crit ? "border-l-[6px] border-[var(--in-line)] border-l-[var(--in-crit)]" : warn ? "border-l-[6px] border-[var(--in-line)] border-l-[var(--in-warn)]" : "border-[var(--in-line)]"} ${highlight ? "ring-2 ring-[var(--in-focus)]" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-2">
        <h3
          id={titleId}
          className="m-0 font-title text-[20px] font-extrabold first-letter:uppercase"
        >
          {longDay(report.date)}
          {report.date.slice(0, 4) !== "2026"
            ? ` ${report.date.slice(0, 4)}`
            : ""}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {pills.map((i) => (
            <Chip key={i.text} tone={i.severity}>
              {i.text}
            </Chip>
          ))}
          {!pills.length && moved && <Chip tone="ok">Nessun conflitto</Chip>}
          {!pills.length && !moved && <Chip tone="mute">Nessun problema</Chip>}
        </div>
      </div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        aria-label={`Linea del tempo di ${longDay(report.date)}`}
      >
        <div className="grid min-w-[680px] gap-1.5">
          <div
            className="relative ml-[96px] h-[18px] text-[11.5px] text-[var(--in-sub)]"
            aria-hidden="true"
          >
            {[9, 11, 13, 15, 17, 19, 21].map((h) => (
              <span
                key={h}
                className="absolute -translate-x-1/2"
                style={{ left: `${pos(h * 60)}%` }}
              >
                {h}:00
              </span>
            ))}
          </div>
          {LANES.map((lane) => {
            const evs = report.matches.filter((m) => m.pitch === lane.id);
            const over = report.over[lane.id];
            const rows: number[] = [];
            const placed = evs.map((m) => {
              let r = rows.findIndex((end) => end <= m.start);
              if (r < 0) {
                r = rows.length;
                rows.push(0);
              }
              rows[r] = m.end + buffer;
              return { m, r };
            });
            const n = Math.max(1, rows.length);
            return (
              <div
                key={lane.id}
                className="grid grid-cols-[90px_1fr] items-stretch gap-1.5"
              >
                <div className="self-center text-[13px] font-semibold leading-tight">
                  {lane.site}
                  <small className="block text-[11.5px] font-normal text-[var(--in-sub)]">
                    {lane.name}
                  </small>
                </div>
                <div
                  className={`relative rounded-lg ${lane.id === "DV" ? "bg-[#e6f3ea]" : "bg-[#eaf1f8]"}`}
                  style={{ minHeight: Math.max(44, n * 32) }}
                >
                  {placed.map(({ m, r }) => {
                    const ip = m.kind !== "match";
                    const bad = over.has(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`absolute overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-1.5 text-[12px] leading-[1.15] text-[var(--in-ink)] ${bad ? "ring-2 ring-[var(--in-crit)]" : ""} ${m.moved ? "outline-2 outline-offset-1 outline-dashed outline-[#b38f00]" : ""} ${ip ? "border-2 border-dashed border-[var(--in-ink)]/50 bg-[repeating-linear-gradient(135deg,#fff_0_6px,#f1f5fa_6px_12px)]" : "bg-white"}`}
                        style={{
                          left: `${pos(m.start)}%`,
                          width: `${Math.max(4, pos(m.end) - pos(m.start))}%`,
                          top: `calc(${(r * 100) / n}% + 2px)`,
                          height: `calc(${100 / n}% - 4px)`,
                          boxShadow: ip
                            ? undefined
                            : `inset 4px 0 0 ${teamColor(m.group)}`,
                        }}
                        title={`${m.label} ${hhmm(m.start)}–${hhmm(m.end)}${m.opponent ? ` · ${m.opponent}` : ""}`}
                      >
                        <span className="flex h-full items-center gap-1 pl-1">
                          {ip && (
                            <span className="rounded bg-[var(--in-ink)] px-1 text-[10.5px] font-semibold uppercase text-white">
                              ipotesi
                            </span>
                          )}
                          <b>{ip ? m.label : m.short}</b> {hhmm(m.start)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <details>
        <summary className="scd-focus cursor-pointer text-[13px] font-semibold text-[var(--in-sub)]">
          Uso dei campi del giorno ({report.matches.length})
        </summary>
        <ul className="m-0 mt-1 grid gap-1 pl-5 text-[13.5px] text-[var(--in-sub)]">
          {report.matches.map((m) => (
            <li key={m.id}>
              {hhmm(m.start)}–{hhmm(m.end)} {m.label}
              {m.kind === "match"
                ? ` contro ${m.opponent || "—"}`
                : " (ipotesi, non salvata nel gestionale)"}{" "}
              · {m.format === "full" ? "campo intero" : `gara a ${m.format}`} ·{" "}
              {m.pitch === "DV"
                ? "Dervio"
                : `Colico ${m.pitch === "C1" ? "campo 1" : "campo 2"}`}
              {m.moved ? " (spostata nella simulazione)" : ""}
              {m.kind === "match" && !m.endKnown ? " · durata stimata" : ""}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function SimulazioneTab({
  model,
  focusDate,
}: {
  model: ImpiantiModel;
  focusDate: string | null;
}) {
  const { options, analysis: r } = model;
  const [onlyBad, setOnlyBad] = useState(true);
  useEffect(() => {
    if (!focusDate) return;
    setOnlyBad(false);
    const t = window.setTimeout(() => {
      const el = document.getElementById(`giorno-${focusDate}`);
      el?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      el?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [focusDate]);

  const shown = useMemo(
    () =>
      r.days.filter(
        (d) =>
          d.date === focusDate ||
          !onlyBad ||
          (d.date >= model.today &&
            (d.issues.length > 0 ||
              d.matches.some((m) => m.moved || m.kind !== "match"))),
      ),
    [r.days, onlyBad, focusDate, model.today],
  );
  const movedMatches = r.dervio.filter((d) => d.match.kind === "match");
  const upcomingConf = r.conflictDays.filter((d) => d >= model.today);
  const before = r.conflictDaysBefore.filter((d) => d >= model.today).length;

  return (
    <div className="grid gap-5">
      <SimulationNote>
        Prova dove giocare le gare in casa tra Colico e Dervio e aggiungi
        ipotesi di uso dei campi. Prima di qualsiasi avviso al Comune di Dervio
        la società valuta queste simulazioni (decisione dell'11 ottobre).
      </SimulationNote>

      <section
        aria-labelledby="h-scen"
        className="grid gap-3.5 rounded-2xl border border-[var(--in-line)] bg-white p-4 shadow-[var(--in-card-shadow)]"
      >
        <h2 id="h-scen" className="m-0 text-[19px] font-bold">
          Scenario
        </h2>
        <div
          role="group"
          aria-label="Scenari pronti"
          className="flex flex-wrap gap-2"
        >
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={model.preset === p.id}
              onClick={() => model.applyPreset(p.id)}
              className={`scd-focus min-h-10 rounded-full border px-3.5 text-[14px] font-semibold transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${model.preset === p.id ? "border-[var(--in-action)] bg-[var(--in-action)] text-[var(--in-ink)]" : "border-[var(--in-line)] bg-white text-[var(--in-ink)]"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[...MOVABLE].reverse().map((g) => (
            <label key={g} className="grid gap-1">
              <span className={labelCls}>{TEAM_NAME[g]}</span>
              <select
                className={inputCls}
                value={options.modes[g]}
                onChange={(e) =>
                  model.setOptions({
                    modes: {
                      ...options.modes,
                      [g]: e.target.value as TeamMode,
                    },
                  })
                }
              >
                {(Object.keys(MODE_LABEL) as TeamMode[]).map((k) => (
                  <option key={k} value={k}>
                    {MODE_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="grid gap-1">
            <span className={labelCls}>Prima Squadra</span>
            <select className={inputCls} disabled aria-describedby="prima-note">
              <option>Sempre a Colico</option>
            </select>
            <span id="prima-note" className="sr-only">
              La Prima Squadra resta sempre a Colico.
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
          <label className="flex items-center gap-2">
            Dervio dal{" "}
            <input
              type="date"
              className={`${inputCls} w-auto`}
              value={options.startDate}
              onChange={(e) =>
                e.target.value &&
                model.setOptions({ startDate: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2">
            Cambio campo{" "}
            <input
              type="number"
              className={`${inputCls} w-[78px]`}
              min={0}
              max={45}
              step={5}
              value={options.buffer}
              onChange={(e) =>
                model.setOptions({
                  buffer: Math.max(
                    0,
                    Math.min(45, Number(e.target.value) || 0),
                  ),
                })
              }
            />{" "}
            min
          </label>
          <label className="flex items-center gap-2">
            Max gare a Dervio per giorno{" "}
            <input
              type="number"
              className={`${inputCls} w-[70px]`}
              min={1}
              max={4}
              value={options.maxDervioPerDay}
              onChange={(e) =>
                model.setOptions({
                  maxDervioPerDay: Math.max(
                    1,
                    Math.min(4, Number(e.target.value) || 1),
                  ),
                })
              }
            />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="scd-focus size-5"
              checked={model.lightsVerified}
              onChange={(e) => model.setLightsVerified(e.target.checked)}
            />{" "}
            Luci di Dervio verificate
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="scd-focus size-5"
              checked={options.dervioClosedInWinter}
              onChange={(e) =>
                model.setOptions({ dervioClosedInWinter: e.target.checked })
              }
            />{" "}
            Dervio chiuso da dicembre a febbraio (erba)
          </label>
        </div>
      </section>

      <section aria-labelledby="h-res" className="grid gap-2.5">
        <h2 id="h-res" className="m-0 text-[19px] font-bold">
          Risultato
        </h2>
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Kpi
            tone={upcomingConf.length ? "crit" : "ok"}
            value={String(upcomingConf.length)}
            label={`${upcomingConf.length === 1 ? "giorno" : "giorni"} con sovrapposti sul campo 1 da oggi${before ? ` (${before} prima della data Dervio)` : ""}`}
          />
          <Kpi
            tone="plain"
            value={String(movedMatches.length)}
            label={`${movedMatches.length === 1 ? "gara in casa giocata" : "gare in casa giocate"} a Dervio`}
          />
          <Kpi
            tone={r.lateNotices ? "crit" : movedMatches.length ? "ok" : "plain"}
            value={r.firstNotice ? ddmm(r.firstNotice) : "—"}
            label={
              r.firstNotice
                ? r.lateNotices
                  ? `primo avviso al Comune, ${r.lateNotices} già in ritardo`
                  : "primo avviso al Comune (un mese prima)"
                : "nessun avviso al Comune"
            }
          />
          <Kpi
            tone={r.lightsNeeded ? "warn" : "plain"}
            value={String(r.lightsNeeded)}
            label="usi serali a Dervio con luci da verificare"
          />
          <Kpi
            tone={r.winterGrass ? "warn" : "plain"}
            value={String(r.winterGrass)}
            label="usi su erba a Dervio tra dicembre e febbraio"
          />
          <Kpi
            tone={r.bookingConflicts.length ? "crit" : "plain"}
            value={`${r.bookingConflicts.length}/${model.bookings.length}`}
            label="ipotesi che non ci stanno"
          />
        </div>
      </section>

      <section
        aria-labelledby="h-ip"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--in-line)] bg-white p-4 shadow-[var(--in-card-shadow)]"
      >
        <div className="grid gap-1">
          <h2 id="h-ip" className="m-0 text-[19px] font-bold">
            Ipotesi di uso dei campi
          </h2>
          <p className="m-0 text-[14px] text-[var(--in-sub)]">
            {model.bookings.length
              ? `${model.bookings.length} ${model.bookings.length === 1 ? "ipotesi" : "ipotesi"} in questo browser, ${model.analysis.bookingConflicts.length} non ci stanno. Le vedi nelle linee del tempo qui sotto.`
              : "Nessuna ipotesi: allenamenti extra, amichevoli, tornei, affitti o chiusure si aggiungono con l'anteprima 2D."}
          </p>
        </div>
        <Link to="/gestionale/impianti/nuova" className={btnPrimary}>
          Nuova prenotazione
        </Link>
      </section>

      <section aria-labelledby="h-days" className="grid gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-days" className="m-0 text-[19px] font-bold">
            Giorno per giorno
          </h2>
          <label className="flex min-h-11 items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              className="scd-focus size-5"
              checked={onlyBad}
              onChange={(e) => setOnlyBad(e.target.checked)}
            />{" "}
            Solo giorni con problemi
          </label>
        </div>
        <div
          className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[var(--in-sub)]"
          aria-label="Legenda"
        >
          {[
            "prima",
            "u19",
            "u16",
            "u15",
            "2014",
            "2015",
            "pulcini",
            "primicalci",
          ].map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5">
              <i
                className="inline-block size-3 rounded-sm"
                style={{ background: teamColor(g) }}
              />
              {
                (
                  {
                    prima: "Prima Squadra",
                    u19: "Juniores U19",
                    u16: "U16 Élite",
                    u15: "U15",
                    "2014": "Esordienti 2014",
                    "2015": "Esordienti 2015",
                    pulcini: "Pulcini",
                    primicalci: "Primi Calci",
                  } as Record<string, string>
                )[g]
              }
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-sm outline-2 outline-dashed outline-[#b38f00]" />
            spostata a Dervio
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-sm border-2 border-dashed border-[var(--in-ink)]/50" />
            ipotesi
          </span>
        </div>
        <div className="grid gap-3">
          {shown.map((d) => (
            <DayCard
              key={d.date}
              report={d}
              buffer={options.buffer}
              highlight={d.date === focusDate}
            />
          ))}
          {!shown.length && (
            <p className="m-0 text-[14px] text-[var(--in-sub)]">
              Nessun giorno con problemi in questo scenario. Togli il filtro per
              vedere tutte le gare.
            </p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="h-rules"
        className="grid gap-2 rounded-2xl border border-[var(--in-line)] bg-white p-4"
      >
        <h2 id="h-rules" className="m-0 text-[17px] font-bold">
          Regole e ipotesi della simulazione
        </h2>
        <ul className="m-0 grid gap-1 pl-5 text-[13.5px] text-[var(--in-sub)]">
          <li>
            Colico campo 1, sintetico 100×60: nello stesso momento 1 gara a 11,
            oppure 2 a 9, 2 a 7, 3 a 5, 4 a 3.
          </li>
          <li>
            Colico campo 2, sintetico 96 × 48 (master «16 - SEDI E IMPIANTI»): 1
            gara a 11 (misure da verificare) o a 9, oppure 2 a 7, 3 a 5.
          </li>
          <li>
            Dervio campo 1, erba 97,80 × 50 (verbale di omologazione LND; il master
            riporta ancora 96 × 48): 1 gara a 11, oppure 1 a 9, 2 a 7, 3 a 5.
          </li>
          <li>
            Durata quando il calendario non dà l'orario di fine: 11 contro 11
            105 minuti, 9 contro 9 75, 7 e 5 60, 3 45. Più il cambio campo
            scelto.
          </li>
          <li>
            Ogni uso di Dervio richiede l'avviso al Comune almeno un mese prima.
            La Prima Squadra resta sempre a Colico.
          </li>
          <li>
            «Solo i conflitti» sposta a Dervio, dalla data scelta, la gara
            giovanile a 11 che crea il sovrapposto, nell'ordine U15, U16, U19,
            solo se a Dervio non crea un altro sovrapposto.
          </li>
          <li>
            Allenamenti del weekend e disponibilità degli spogliatoi non sono
            ancora nella simulazione.
          </li>
        </ul>
      </section>
    </div>
  );
}
