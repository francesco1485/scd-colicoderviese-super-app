/**
 * Colico: 2D map of campo 1 and campo 2 (board Rotazione-campi) with a day and
 * time-slot selector. Match days come from the calendar snapshot (plus the
 * user's ipotesi); weekday training comes from the training board rotations.
 */
import { useEffect, useMemo, useState } from "react";

import {
  pitchUnits,
  unitsToVerify,
  groupByDay,
  hhmm,
  layoutPitch,
  loadAt,
  longDay,
  shortDay,
  type MatchFormat,
  type PitchFormat,
  type RotationMatch,
} from "@/lib/rotation";
import { useImpianti } from "./context";
import { presetLabel, teamColor, type ImpiantiModel } from "./model";
import {
  Card,
  Chip,
  SimulationNote,
  Src,
  btnPrimary,
  inputCls,
  labelCls,
} from "./ui";

interface Block {
  key: string;
  x: number;
  w: number;
  title: string;
  sub: string;
  color: string;
  over: boolean;
  ipotesi: boolean;
}

const fmtText = (f: PitchFormat) =>
  f === "full" ? "campo intero" : `${f} contro ${f}`;
const spaceText = (w: number) =>
  w >= 0.999
    ? "tutto il campo"
    : w >= 0.49
      ? "metà campo"
      : w >= 0.33
        ? "un terzo"
        : "un quarto";

function matchBlocks(
  active: RotationMatch[],
  pitch: "C1" | "C2",
  overIds: Set<string>,
): { blocks: Block[]; overflow: RotationMatch[] } {
  const slots = layoutPitch(active, pitch);
  const blocks: Block[] = [];
  const overflow: RotationMatch[] = [];
  for (const s of slots) {
    if (s.overflow) {
      overflow.push(s.match);
      continue;
    }
    blocks.push({
      key: s.match.id,
      x: s.x,
      w: s.w,
      title: s.match.kind === "match" ? s.match.short : "Ipotesi",
      sub: `${fmtText(s.match.format)} · ${spaceText(s.w)}`,
      color: teamColor(s.match.group),
      over: overIds.has(s.match.id),
      ipotesi: s.match.kind !== "match",
    });
  }
  return { blocks, overflow };
}

/* ---------------- Training board (weekday rotations) ---------------- */

interface Rotation {
  week: string;
  days: string[];
  start: number;
  end: number;
  timeLabel: string;
  zones: Record<string, string>;
}
const weekdayLabel = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

function zoneBlocks(
  zones: Record<string, string>,
  prefix: "C1" | "C2",
  keys: string[],
): Block[] {
  const out: Block[] = [];
  const share = 1 / keys.length;
  keys.forEach((k, i) => {
    const raw = (zones[`${prefix}_${k}`] ?? "").trim();
    const team = raw && raw !== "—" ? raw : "";
    const prev = out[out.length - 1];
    if (prev && prev.title === (team || "Libero")) {
      prev.w += share;
      prev.sub = spaceText(prev.w);
      return;
    }
    out.push({
      key: `${prefix}${k}`,
      x: i * share,
      w: share,
      title: team || "Libero",
      sub: `zona ${k}`,
      color: team ? "#0860A8" : "#9fb4c9",
      over: false,
      ipotesi: false,
    });
  });
  for (const b of out)
    if (b.title !== "Libero" && b.w > share + 1e-6) b.sub = spaceText(b.w);
  return out;
}

/* ---------------- SVG ---------------- */

const C1 = { x: 40, y: 70, w: 600, h: 360 };
const C2 = { x: 690, y: 70, w: 250, h: 150 };

function PitchSvgBlocks({
  area,
  blocks,
  big,
}: {
  area: typeof C1;
  blocks: Block[];
  big: boolean;
}) {
  return (
    <>
      {blocks.map((b) => {
        const x = area.x + b.x * area.w;
        const w = b.w * area.w;
        const free = b.title === "Libero";
        const cx = x + w / 2;
        const cy = area.y + area.h / 2;
        return (
          <g key={b.key}>
            {!free && (
              <rect
                x={x + 2}
                y={area.y + 2}
                width={w - 4}
                height={area.h - 4}
                fill={b.color}
                fillOpacity={b.ipotesi ? 0.35 : 0.62}
                stroke={b.over ? "#a3241b" : b.ipotesi ? "#F8D000" : "none"}
                strokeWidth={b.over || b.ipotesi ? 4 : 0}
                strokeDasharray={b.ipotesi ? "10 6" : undefined}
              />
            )}
            {b.over && (
              <rect
                x={x + 2}
                y={area.y + 2}
                width={w - 4}
                height={area.h - 4}
                fill="url(#hatch)"
              />
            )}
            <rect
              x={cx - Math.min(w - 16, big ? 250 : 116) / 2}
              y={cy - (big ? 30 : 24)}
              width={Math.min(w - 16, big ? 250 : 116)}
              height={big ? 60 : 48}
              rx="10"
              fill="#ffffff"
              fillOpacity={free ? 0.75 : 0.95}
            />
            <text
              x={cx}
              y={cy - (big ? 4 : 2)}
              textAnchor="middle"
              fontFamily="Barlow"
              fontWeight="700"
              fontSize={big ? 22 : 18}
              fill={b.over ? "#a3241b" : "#062a52"}
            >
              {b.title.length > (big ? 22 : 12)
                ? `${b.title.slice(0, big ? 21 : 11)}…`
                : b.title}
            </text>
            <text
              x={cx}
              y={cy + (big ? 20 : 16)}
              textAnchor="middle"
              fontFamily="Barlow"
              fontSize={big ? 16 : 13}
              fill="#062a52"
            >
              {big ? b.sub : b.sub.split(" · ")[0]}
            </text>
          </g>
        );
      })}
    </>
  );
}

function ColicoMap({
  c1,
  c2,
  overflow,
  label,
  conflict,
}: {
  c1: Block[];
  c2: Block[];
  overflow: { key: string; text: string; color: string }[];
  label: string;
  conflict: boolean;
}) {
  return (
    <svg
      viewBox="0 0 980 520"
      width="100%"
      role="img"
      aria-label={label}
      className="block h-auto"
    >
      <defs>
        <pattern
          id="hatch"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="14" fill="#a3241b" fillOpacity=".28" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="980" height="520" rx="18" fill="#e9f2fb" />
      <text
        x="340"
        y="50"
        textAnchor="middle"
        fontFamily="Barlow"
        fontWeight="700"
        fontSize="19"
        fill="#062a52"
      >
        CAMPO 1 · sintetico · 100 × 60 m
      </text>
      <rect x="30" y="60" width="620" height="380" rx="10" fill="#2f8a4f" />
      <PitchSvgBlocks area={C1} blocks={c1} big />
      <g
        stroke="#ffffff"
        strokeOpacity=".75"
        strokeWidth="2"
        fill="none"
        pointerEvents="none"
      >
        <rect x="40" y="70" width="600" height="360" rx="4" />
        <line x1="340" y1="70" x2="340" y2="430" />
        <circle cx="340" cy="250" r="46" />
        <rect x="40" y="160" width="80" height="180" />
        <rect x="560" y="160" width="80" height="180" />
      </g>
      {overflow.map((o, i) => (
        <g key={o.key}>
          <rect
            x={140 + (i % 2) * 290}
            y={366 - Math.floor(i / 2) * 56}
            width="280"
            height="48"
            rx="10"
            fill={o.color}
            stroke="#fff"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          <text
            x={280 + (i % 2) * 290}
            y={396 - Math.floor(i / 2) * 56}
            textAnchor="middle"
            fontFamily="Barlow"
            fontWeight="700"
            fontSize="17"
            fill="#ffffff"
          >
            {o.text}
          </text>
        </g>
      ))}
      {conflict && (
        <g>
          <rect
            x="190"
            y="78"
            width="300"
            height="40"
            rx="10"
            fill="#fff"
            stroke="#a3241b"
            strokeWidth="2"
          />
          <text
            x="340"
            y="105"
            textAnchor="middle"
            fontFamily="Barlow"
            fontWeight="700"
            fontSize="20"
            fill="#a3241b"
          >
            Conflitto sul campo 1
          </text>
        </g>
      )}
      <text
        x="815"
        y="50"
        textAnchor="middle"
        fontFamily="Barlow"
        fontWeight="700"
        fontSize="19"
        fill="#062a52"
      >
        CAMPO 2 · sintetico · 96 × 48 m
      </text>
      <rect x="680" y="60" width="270" height="170" rx="10" fill="#2f8a4f" />
      <PitchSvgBlocks area={C2} blocks={c2} big={false} />
      <g
        stroke="#fff"
        strokeOpacity=".7"
        strokeWidth="2"
        fill="none"
        pointerEvents="none"
      >
        <rect x="690" y="70" width="250" height="150" rx="3" />
        <line x1="815" y1="70" x2="815" y2="220" />
      </g>
      {[
        ["SP1", 680, 250],
        ["SP2", 822, 250],
        ["SP3", 680, 316],
        ["SP4", 822, 316],
      ].map(([id, x, y]) => (
        <g key={id as string}>
          <rect
            x={x as number}
            y={y as number}
            width="128"
            height="56"
            rx="6"
            fill="#fff"
            stroke="#b9d5ef"
            strokeWidth="2"
          />
          <text
            x={(x as number) + 64}
            y={(y as number) + 22}
            textAnchor="middle"
            fontFamily="Barlow"
            fontWeight="700"
            fontSize="20"
            fill="#062a52"
          >
            {id}
          </text>
          <text
            x={(x as number) + 64}
            y={(y as number) + 46}
            textAnchor="middle"
            fontFamily="Barlow"
            fontSize="16"
            fill="#062a52"
          >
            da assegnare
          </text>
        </g>
      ))}
      <rect
        x="680"
        y="384"
        width="128"
        height="56"
        rx="6"
        fill="#fff3c4"
        stroke="#f1dc7a"
        strokeWidth="2"
      />
      <text
        x="744"
        y="417"
        textAnchor="middle"
        fontFamily="Barlow"
        fontWeight="700"
        fontSize="20"
        fill="#062a52"
      >
        Club House
      </text>
      <rect
        x="822"
        y="384"
        width="128"
        height="56"
        rx="6"
        fill="#fff3c4"
        stroke="#f1dc7a"
        strokeWidth="2"
      />
      <text
        x="886"
        y="417"
        textAnchor="middle"
        fontFamily="Barlow"
        fontWeight="700"
        fontSize="20"
        fill="#062a52"
      >
        Biglietteria
      </text>
      <text x="30" y="480" fontFamily="Barlow" fontSize="16" fill="#3b5683">
        Schema non in scala, non è un rilievo. Spogliatoi da assegnare nel
        foglio rotazione.
      </text>
    </svg>
  );
}

/* ---------------- Tab ---------------- */

const CAPACITY_ROWS: {
  f: MatchFormat;
  space: string;
  together: string;
  players: string;
}[] = [
  {
    f: 11,
    space: "Tutto il campo",
    together: "1 gara",
    players: "22 in campo",
  },
  {
    f: 9,
    space: "Metà campo",
    together: "2 gare insieme",
    players: "18 per gara",
  },
  {
    f: 7,
    space: "Metà campo",
    together: "2 gare insieme",
    players: "14 per gara",
  },
  {
    f: 5,
    space: "Un terzo",
    together: "3 gare insieme",
    players: "10 per gara",
  },
  {
    f: 3,
    space: "Un quarto",
    together: "4 gare insieme",
    players: "6 per gara",
  },
];

export function ColicoTab({
  model,
  onSimulate,
  focusDate,
}: {
  model: ImpiantiModel;
  onSimulate: (date: string) => void;
  focusDate: string | null;
}) {
  const { quadro } = useImpianti();
  const ROTATIONS = useMemo(() => (quadro.rotations as unknown as Rotation[]).filter((r) => r.zones), [quadro]);
  const WEEKDAYS = quadro.days as string[];
  const [mode, setMode] = useState<"gare" | "allenamenti">("gare");
  const byDay = useMemo(
    () => groupByDay(model.items.filter((m) => m.pitch !== "DV")),
    [model.items],
  );
  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const reportByDay = useMemo(
    () => new Map(model.analysis.days.map((d) => [d.date, d])),
    [model.analysis],
  );
  const defaultDay = useMemo(
    () => days.find((d) => d >= model.today) ?? days[days.length - 1] ?? "",
    [days, model.today],
  );
  const [day, setDay] = useState(defaultDay);
  useEffect(() => {
    if (!days.includes(day)) setDay(defaultDay);
  }, [days, day, defaultDay]);
  useEffect(() => {
    if (focusDate && days.includes(focusDate)) {
      setDay(focusDate);
      setMode("gare");
    }
  }, [focusDate, days]);

  const dayItems = useMemo(() => byDay.get(day) ?? [], [byDay, day]);
  const slots = useMemo(
    () => [...new Set(dayItems.map((m) => m.start))].sort((a, b) => a - b),
    [dayItems],
  );
  const buffer = model.options.buffer;
  const slotState = (t: number) => {
    const c1 = loadAt(dayItems, "C1", t, buffer);
    const c2 = loadAt(dayItems, "C2", t, buffer);
    const verify = c2.active.some((m) => unitsToVerify("C2", m.format));
    return {
      over: c1.load > 1 + 1e-9 || c2.load > 1 + 1e-9,
      verify,
      teams: [...c1.active, ...c2.active]
        .filter((m) => m.start === t)
        .map((m) => (m.kind === "match" ? m.short : "IP")),
    };
  };
  const firstOver = slots.find((t) => slotState(t).over);
  const [slot, setSlot] = useState<number | null>(null);
  useEffect(() => {
    setSlot(firstOver ?? slots[0] ?? null);
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const t =
    slot !== null && slots.includes(slot)
      ? slot
      : (firstOver ?? slots[0] ?? null);

  const report = reportByDay.get(day);
  const c1Active = t === null ? [] : loadAt(dayItems, "C1", t, buffer).active;
  const c2Active = t === null ? [] : loadAt(dayItems, "C2", t, buffer).active;
  const c1Load = c1Active.reduce((a, m) => a + pitchUnits("C1", m.format), 0);
  const c1Over = c1Load > 1 + 1e-9;
  const overIds = new Set<string>(c1Over ? c1Active.map((m) => m.id) : []);
  const c1 = matchBlocks(c1Active, "C1", overIds);
  const c2 = matchBlocks(
    c2Active,
    "C2",
    new Set(report ? [...report.over.C2] : []),
  );
  if (!c1.blocks.length)
    c1.blocks.push({
      key: "free1",
      x: 0,
      w: 1,
      title: "Libero",
      sub: t === null ? "nessuna gara" : `alle ${hhmm(t)}`,
      color: "#9fb4c9",
      over: false,
      ipotesi: false,
    });
  if (!c2.blocks.length)
    c2.blocks.push({
      key: "free2",
      x: 0,
      w: 1,
      title: "Libero",
      sub: t === null ? "" : `alle ${hhmm(t)}`,
      color: "#9fb4c9",
      over: false,
      ipotesi: false,
    });

  // Training board
  const [wd, setWd] = useState(WEEKDAYS[0] ?? "LUNEDÌ");
  const [week, setWeek] = useState<"A" | "B">("A");
  const rots = ROTATIONS.filter(
    (r) => r.days.includes(wd) && (r.week === week || r.week === "A/B"),
  );
  const [rotIdx, setRotIdx] = useState(0);
  useEffect(() => setRotIdx(0), [wd, week]);
  const rot = rots[Math.min(rotIdx, rots.length - 1)];

  const isMatches = mode === "gare";
  const blocksC1 = isMatches
    ? c1.blocks
    : rot
      ? zoneBlocks(rot.zones, "C1", ["A", "B", "C"])
      : [];
  const blocksC2 = isMatches
    ? c2.blocks
    : rot
      ? zoneBlocks(rot.zones, "C2", ["A", "B"])
      : [];
  const overflow = isMatches
    ? c1.overflow.map((m) => ({
        key: m.id,
        text: `${m.kind === "match" ? m.short : "Ipotesi"} · ${fmtText(m.format)}: non ci sta`,
        color: teamColor(m.group),
      }))
    : [];
  const mapLabel = isMatches
    ? `Schema del centro sportivo di Colico, ${day ? longDay(day) : "—"}${t !== null ? ` alle ${hhmm(t)}` : ""}${c1Over ? ": conflitto sul campo 1" : ""}`
    : `Schema del centro sportivo di Colico, allenamenti ${weekdayLabel(wd)} settimana ${week}${rot ? `, ${rot.timeLabel}` : ""}`;
  const listed = isMatches
    ? [
        ...c1Active.map((m) => ({ m, p: "Campo 1" })),
        ...c2Active.map((m) => ({ m, p: "Campo 2" })),
      ]
    : [];

  return (
    <div className="grid gap-[18px] @[1080px]:grid-cols-[minmax(0,1fr)_400px]">
      <Card
        id="h-colico-map"
        title="Mappa del centro · Colico"
        subtitle="Scegli giorno e orario: vedi chi usa quale parte del campo."
        actions={
          <div
            role="group"
            aria-label="Cosa vedere"
            className="flex gap-1 rounded-xl bg-[#e2edf8] p-1"
          >
            {(["gare", "allenamenti"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`scd-focus min-h-9 rounded-[10px] px-3.5 text-[15px] font-semibold ${mode === m ? "bg-white text-[var(--in-ink)]" : "text-[var(--in-sub)]"}`}
              >
                {m === "gare" ? "Gare" : "Allenamenti"}
              </button>
            ))}
          </div>
        }
      >
        {isMatches ? (
          <div className="grid gap-3 px-4 pb-3 sm:px-[18px]">
            <label className="grid max-w-[340px] gap-1">
              <span className={labelCls}>Giorno con gare in casa a Colico</span>
              <select
                className={inputCls}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {days.map((d) => {
                  const r = reportByDay.get(d);
                  const bad = r && (r.over.C1.size > 0 || r.over.C2.size > 0);
                  return (
                    <option
                      key={d}
                      value={d}
                    >{`${longDay(d)}${d.slice(0, 4) !== "2026" ? ` ${d.slice(0, 4)}` : ""}${bad ? " · conflitto" : ""}`}</option>
                  );
                })}
              </select>
            </label>
            <div
              role="group"
              aria-label="Orario"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {slots.map((s) => {
                const st = slotState(s);
                const on = s === t;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSlot(s)}
                    className={`scd-focus min-w-[112px] flex-none rounded-xl px-3 py-2 text-left ${on ? "border-2 border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border border-[var(--in-line)] bg-white"}`}
                  >
                    <div className="text-[13px] text-[var(--in-sub)]">
                      {shortDay(day)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <b className="text-[18px]">{hhmm(s)}</b>
                      <Chip
                        tone={st.over ? "crit" : st.verify ? "warn" : "ok"}
                        className="!min-h-[22px]"
                      >
                        {st.teams.join(" + ") || "libero"}
                      </Chip>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 px-4 pb-3 sm:px-[18px]">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1">
                <span className={labelCls}>Giorno</span>
                <select
                  className={`${inputCls} w-auto`}
                  value={wd}
                  onChange={(e) => setWd(e.target.value)}
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d} value={d}>
                      {weekdayLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
              <div
                role="group"
                aria-label="Settimana"
                className="flex gap-1 rounded-xl bg-[#e2edf8] p-1"
              >
                {(["A", "B"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={week === w}
                    onClick={() => setWeek(w)}
                    className={`scd-focus min-h-9 rounded-[10px] px-3.5 text-[15px] font-semibold ${week === w ? "bg-white text-[var(--in-ink)]" : "text-[var(--in-sub)]"}`}
                  >
                    Settimana {w}
                  </button>
                ))}
              </div>
            </div>
            <div
              role="group"
              aria-label="Turno"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {rots.map((r, i) => (
                <button
                  key={`${r.timeLabel}-${r.week}`}
                  type="button"
                  aria-pressed={i === rotIdx}
                  onClick={() => setRotIdx(i)}
                  className={`scd-focus flex-none rounded-xl px-3 py-2 text-left text-[15px] font-semibold ${i === rotIdx ? "border-2 border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border border-[var(--in-line)] bg-white"}`}
                >
                  {r.timeLabel.replace(/^[A-Za-zì/]+\s/, "")}
                </button>
              ))}
              {!rots.length && (
                <p className="m-0 text-[14px] text-[var(--in-sub)]">
                  Nessun turno nel quadro per questo giorno.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="px-4 pb-3 sm:px-[18px]">
          <ColicoMap
            c1={blocksC1}
            c2={blocksC2}
            overflow={overflow}
            label={mapLabel}
            conflict={isMatches && c1Over}
          />
        </div>

        {isMatches ? (
          <ul
            className="m-0 grid list-none gap-1.5 px-4 pb-3 text-[15px] sm:px-[18px]"
            aria-label="Chi usa i campi in questo orario"
          >
            {listed.map(({ m, p }) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 rounded-sm"
                  style={{ background: teamColor(m.group) }}
                />
                <b>{m.label}</b>
                <span className="text-[var(--in-sub)]">
                  {p} · {hhmm(m.start)}–{hhmm(m.end)}
                  {m.endKnown ? "" : " (durata stimata)"} · {fmtText(m.format)}
                </span>
                {m.kind !== "match" && <Chip tone="mute">ipotesi</Chip>}
                {overIds.has(m.id) && <Chip tone="crit">non ci sta</Chip>}
                {p === "Campo 2" && unitsToVerify("C2", m.format) && (
                  <Chip tone="warn">misure del campo 2 da verificare</Chip>
                )}
              </li>
            ))}
            {!listed.length && (
              <li className="text-[var(--in-sub)]">
                Nessuna gara a Colico in questo orario.
              </li>
            )}
          </ul>
        ) : (
          <Src>
            Quadro settimanale allenamenti 2026/27, foglio ROTAZIONE CAMPI.
            Settimana A/B non determinabile in automatico; confini delle zone
            non certificati sulla planimetria.
          </Src>
        )}

        {isMatches && c1Over && t !== null && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
            <span className="text-[15px]">
              <b>Conflitto alle {hhmm(t)}:</b> il campo 1 non basta. Prova le
              soluzioni nella simulazione: nessuno spostamento è deciso qui.
            </span>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => onSimulate(day)}
            >
              Prova le soluzioni
            </button>
          </div>
        )}
        <Src>
          Gare in casa dal Master Calendario (snapshot) · scenario:{" "}
          {presetLabel(model.preset)}.
        </Src>
      </Card>

      <div className="grid content-start gap-[18px]">
        <Card
          id="h-capacity"
          title="Quante gare ci stanno"
          subtitle="Campo 1 di Colico, 100 × 60 m"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[13px] text-[var(--in-sub)]">
                  <th
                    scope="col"
                    className="border-b border-[var(--in-line)] px-4 py-2.5 font-semibold sm:px-[18px]"
                  >
                    Formato
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--in-line)] px-2 py-2.5 font-semibold"
                  >
                    Spazio
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--in-line)] px-2 py-2.5 font-semibold"
                  >
                    Insieme
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-[var(--in-line)] px-2 py-2.5 font-semibold sm:table-cell"
                  >
                    Giocatori
                  </th>
                </tr>
              </thead>
              <tbody>
                {CAPACITY_ROWS.map((r) => (
                  <tr key={r.f} className="text-[15px]">
                    <td className="whitespace-nowrap border-b border-[var(--in-line)] px-4 py-2.5 font-bold sm:px-[18px]">
                      {r.f} contro {r.f}
                    </td>
                    <td className="border-b border-[var(--in-line)] px-2 py-2.5">
                      {r.space}
                    </td>
                    <td className="border-b border-[var(--in-line)] px-2 py-2.5">
                      {r.together}
                    </td>
                    <td className="hidden border-b border-[var(--in-line)] px-2 py-2.5 text-[var(--in-sub)] sm:table-cell">
                      {r.players}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 px-4 pt-3 text-[14px] font-semibold sm:px-[18px]">
            L'11 contro 11 non divide il campo con nessun'altra gara.
          </p>
          <p className="m-0 px-4 pt-1.5 text-[14px] text-[var(--in-sub)] sm:px-[18px]">
            Campo 2, sintetico 96 × 48: 1 gara a 11 (misure da verificare) o a
            9, oppure 2 a 7, 3 a 5. Tra una gara e l'altra si contano{" "}
            {model.options.buffer} minuti di cambio campo.
          </p>
          <Src>
            Panchine e staff si aggiungono dalle distinte. Le rose arrivano da
            R20.
          </Src>
        </Card>
        <Card id="h-sheet" title="Stato del foglio rotazione">
          <div className="grid grid-cols-3 gap-2 px-4 pb-3 sm:px-[18px]">
            {["turni fino al 31/1", "variazioni", "confermati"].map((l) => (
              <div key={l} className="rounded-xl bg-[#f6f9fd] p-2.5">
                <div className="font-title text-[30px] font-black leading-none text-[var(--in-sub)]">
                  —<span className="sr-only"> (dato non disponibile)</span>
                </div>
                <div className="text-[13px] text-[var(--in-sub)]">{l}</div>
              </div>
            ))}
          </div>
          <Src>
            Foglio «Rotazione campi 17/10–31/01» non ancora collegato all'app: i
            numeri arriveranno da lì, non vengono stimati.
          </Src>
        </Card>
        <SimulationNote>
          L&apos;11 ottobre la società ha deciso di valutare le rotazioni con
          simulazioni prima di qualsiasi avviso al Comune di Dervio.
        </SimulationNote>
      </div>
    </div>
  );
}
