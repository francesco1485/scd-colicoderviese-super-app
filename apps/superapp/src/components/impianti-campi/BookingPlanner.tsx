/**
 * New booking (/gestionale/impianti/nuova): hypothetical bookings ("ipotesi")
 * with a live 2D preview of the chosen pitch, changing-room check, and
 * "Invia alla Direzione": the master row (Stato PROPOSTA) plus a pre-filled
 * summary for the Direzione, both copied by the manager. Browser only: no
 * server writes. The pitch SVG is self-contained here so it can later merge
 * into the shared facility map component.
 */
import { Check, ClipboardCopy, ExternalLink, Send, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import {
  REGISTRY_URL,
  bookingToRegistryRow,
  directionBrief,
} from "@/lib/bookings-register";
import {
  BOOKING_DEFAULTS,
  BOOKING_KIND_LABEL,
  BOOKING_TITLE_MAX,
  PITCHES,
  ROOMS,
  bookingToItem,
  checkSlot,
  ddmm,
  groupByDay,
  hhmm,
  layoutPitch,
  longDay,
  pitchUnits,
  roomClashes,
  roomGuidance,
  toMinutes,
  validateBooking,
  type Booking,
  type BookingKind,
  type PitchFormat,
  type PitchId,
  type QuadroRoom,
  type RoomId,
  type RotationMatch,
} from "@/lib/rotation";
import { useImpianti } from "./context";
import { teamColor, type ImpiantiModel } from "./model";
import { Chip, btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

export type BookingDraft = Omit<Booking, "id">;


const emptyDraft = (date: string): BookingDraft => ({
  kind: "allenamento",
  pitch: "C1",
  date,
  start: "18:00",
  duration: BOOKING_DEFAULTS.allenamento.duration,
  format: BOOKING_DEFAULTS.allenamento.format,
  title: "",
  rooms: [],
  entrance: "",
  amount: "",
});

const fmtText = (f: PitchFormat) =>
  f === "full" ? "campo intero" : `${f} contro ${f}`;
const shareText = (w: number) =>
  w >= 0.999
    ? "tutto il campo"
    : w >= 0.49
      ? "metà campo"
      : w >= 0.33
        ? "un terzo del campo"
        : "un quarto del campo";

/* ---------------- Live 2D pitch ---------------- */

export interface Preview {
  fits: boolean;
  others: RotationMatch[];
  probe: RotationMatch | null;
}

/** Preview of a use of `pitch` against the items of that day (pure). */
export function previewFor(
  items: readonly RotationMatch[],
  buffer: number,
  d: BookingDraft,
  excludeId?: string,
): Preview {
  const start = toMinutes(d.start);
  if (start === null || !Number.isFinite(d.duration) || d.duration < 15)
    return { fits: false, others: [], probe: null };
  const dayItems = (groupByDay(items).get(d.date) ?? []).filter(
    (m) => m.id !== excludeId,
  );
  const check = checkSlot(
    dayItems,
    d.pitch,
    start,
    d.duration,
    d.format,
    buffer,
  );
  const probe = bookingToItem({
    ...d,
    id: "__draft__",
    title: d.title || "Nuova ipotesi",
  });
  return { fits: check.fits, others: check.sharing, probe };
}

export function PitchPreview({
  pitch,
  format,
  preview,
  title = "Nuova ipotesi",
}: {
  pitch: PitchId;
  format: PitchFormat;
  preview: Preview;
  title?: string;
}) {
  const big = pitch === "C1";
  const W = 600;
  const H = big ? 360 : 300; // 100x60 and 96x48 in proportion
  const pad = 14;
  const iw = W - pad * 2;
  const ih = H - pad * 2;
  const share = pitchUnits(pitch, format);
  const parts = Math.max(1, Math.round(1 / share));
  const slots = preview.probe
    ? layoutPitch([...preview.others, preview.probe], pitch)
    : layoutPitch(preview.others, pitch);
  const probeSlot = slots.find((s) => s.match.id === preview.probe?.id);
  const p = PITCHES[pitch];
  const hatchId = useId().replace(/:/g, "");
  const label = `${p.site} ${p.name.toLowerCase()}, ${p.size ?? "misure —"}: ${
    preview.probe
      ? preview.fits
        ? `ci sta e occupa ${shareText(share)}`
        : "non ci sta"
      : "orario non valido"
  }${preview.others.length ? `; già in campo: ${preview.others.map((m) => m.label).join(", ")}` : "; nessun altro uso nell'orario"}`;
  const px = (s: { x: number; overflow: boolean }) =>
    pad + (s.overflow ? 0 : s.x) * iw + 3;
  return (
    <figure className="m-0 grid gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
        className="block h-auto"
      >
        <defs>
          <pattern
            id={hatchId}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="12" fill="#a3241b" fillOpacity=".35" />
          </pattern>
        </defs>
        <rect width={W} height={H} rx="12" fill="#2e8550" />
        {slots
          .filter((s) => !s.overflow && s.match.id !== preview.probe?.id)
          .map((s) => (
            <g key={s.match.id}>
              <rect
                x={pad + s.x * iw + 2}
                y={pad + 2}
                width={s.w * iw - 4}
                height={ih - 4}
                fill={teamColor(s.match.group)}
                fillOpacity=".7"
              />
              <rect
                x={pad + s.x * iw + s.w * iw * 0.1}
                y={H / 2 - 22}
                width={s.w * iw * 0.8}
                height="44"
                rx="8"
                fill="#fff"
              />
              <text
                x={pad + s.x * iw + (s.w * iw) / 2}
                y={H / 2 + 7}
                textAnchor="middle"
                fontFamily="Barlow"
                fontWeight="700"
                fontSize="20"
                fill="#062a52"
              >
                {s.match.kind === "match" ? s.match.short : "Ipotesi"}{" "}
                {hhmm(s.match.start)}
              </text>
            </g>
          ))}
        {slots
          .filter((s) => s.overflow && s.match.id !== preview.probe?.id)
          .map((s, i) => (
            <g key={s.match.id}>
              <rect
                x={pad + 8 + i * 190}
                y={pad + 8}
                width="180"
                height="34"
                rx="8"
                fill="#fde7e4"
                stroke="#a3241b"
                strokeWidth="2"
              />
              <text
                x={pad + 98 + i * 190}
                y={pad + 31}
                textAnchor="middle"
                fontFamily="Barlow"
                fontWeight="700"
                fontSize="16"
                fill="#a3241b"
              >
                {s.match.kind === "match" ? s.match.short : "Ipotesi"}{" "}
                {hhmm(s.match.start)}: già oltre
              </text>
            </g>
          ))}
        {probeSlot && (
          <g>
            <rect
              x={px(probeSlot)}
              y={pad + (probeSlot.overflow ? ih * 0.62 : 0) + 3}
              width={probeSlot.w * iw - 6}
              height={(probeSlot.overflow ? ih * 0.38 : ih) - 6}
              fill={preview.fits ? "#F8D000" : "#fde7e4"}
              fillOpacity={preview.fits ? 0.85 : 0.95}
              stroke={preview.fits ? "#062a52" : "#a3241b"}
              strokeWidth="4"
              strokeDasharray="12 7"
            />
            {!preview.fits && (
              <rect
                x={px(probeSlot)}
                y={pad + (probeSlot.overflow ? ih * 0.62 : 0) + 3}
                width={probeSlot.w * iw - 6}
                height={(probeSlot.overflow ? ih * 0.38 : ih) - 6}
                fill={`url(#${hatchId})`}
              />
            )}
            <text
              x={px(probeSlot) - 3 + (probeSlot.w * iw) / 2}
              y={pad + (probeSlot.overflow ? ih * 0.81 : ih / 2) + 8}
              textAnchor="middle"
              fontFamily="Barlow"
              fontWeight="700"
              fontSize="22"
              fill={preview.fits ? "#062a52" : "#a3241b"}
            >
              {preview.fits ? title : "Non ci sta"}
            </text>
          </g>
        )}
        <g
          stroke="#fff"
          strokeOpacity=".8"
          strokeWidth="2"
          fill="none"
          pointerEvents="none"
        >
          <rect x={pad} y={pad} width={iw} height={ih} rx="3" />
          <line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} />
          <circle cx={W / 2} cy={H / 2} r={big ? 36 : 30} />
        </g>
        {parts > 2 && (
          <g
            stroke="#fff"
            strokeOpacity=".7"
            strokeWidth="2"
            strokeDasharray="8 6"
            pointerEvents="none"
          >
            {Array.from({ length: parts - 1 }, (_, i) => (
              <line
                key={i}
                x1={pad + ((i + 1) * iw) / parts}
                y1={pad}
                x2={pad + ((i + 1) * iw) / parts}
                y2={H - pad}
              />
            ))}
          </g>
        )}
      </svg>
      <figcaption className="text-[13px] text-[var(--in-sub)]">
        {p.site} {p.name.toLowerCase()} · {p.surface} · {p.size ?? "—"}. Schema
        non in scala. Il campo intero blocca metà, terzi e quarti, e una parte
        occupata blocca il campo intero: il controllo avviene prima dell'invio,
        cambio campo compreso. Allenamenti del Quadro non inclusi nel controllo
        del campo.
      </figcaption>
    </figure>
  );
}

/* ---------------- Copy to clipboard ---------------- */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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
}

function CopyBlock({
  label,
  text,
  rows,
}: {
  label: string;
  text: string;
  rows: number;
}) {
  const [state, setState] = useState<"idle" | "ok" | "ko">("idle");
  const id = useId();
  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 4000);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-[14px] font-semibold">
          {label}
        </label>
        <button
          type="button"
          className={btnSecondary}
          onClick={async () => setState((await copyText(text)) ? "ok" : "ko")}
        >
          {state === "ok" ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <ClipboardCopy className="size-4" aria-hidden="true" />
          )}
          Copia
        </button>
      </div>
      <textarea
        id={id}
        readOnly
        rows={rows}
        value={text}
        className="scd-focus w-full resize-y rounded-lg border border-[var(--in-line)] bg-[var(--in-ground)] p-2.5 font-mono text-[12.5px] leading-snug"
        onFocus={(e) => e.currentTarget.select()}
      />
      <span
        role="status"
        aria-live="polite"
        className="text-[13px] text-[var(--in-sub)]"
      >
        {state === "ok"
          ? "Copiato."
          : state === "ko"
            ? "Copia non riuscita: seleziona il testo e copialo a mano."
            : ""}
      </span>
    </div>
  );
}

function SendPanel({
  booking,
  model,
  requestedBy,
  onClose,
}: {
  booking: Booking;
  model: ImpiantiModel;
  requestedBy: string;
  onClose: () => void;
}) {
  const quadroRooms = useImpianti().quadro.rooms as QuadroRoom[];
  const row = bookingToRegistryRow(booking, requestedBy);
  const brief = directionBrief(booking, {
    items: model.items,
    others: model.bookings,
    quadroRooms,
    buffer: model.options.buffer,
    today: model.today,
    requestedBy,
  });
  return (
    <section
      aria-labelledby="h-send"
      className="grid gap-3 rounded-2xl border-2 border-[var(--in-info)] bg-[var(--in-info-bg)] p-4"
      tabIndex={-1}
      id="invio-direzione"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="h-send" className="m-0 text-[18px] font-bold">
          Invia alla Direzione · IPO-{booking.id}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="scd-focus min-h-10 rounded-lg px-3 text-[14px] font-semibold text-[var(--in-info)] hover:bg-white"
        >
          Chiudi
        </button>
      </div>
      <ol className="m-0 grid gap-1 pl-5 text-[14px]">
        <li>
          Copia la riga e incollala nella prima riga libera del registro,
          colonna ID (Stato PROPOSTA).
        </li>
        <li>
          Copia la scheda e mandala a Presidente o Direttore generale (mail o
          messaggio del club).
        </li>
        <li>
          La Direzione mette IN VALUTAZIONE e poi CONFERMATA o RESPINTA con il
          motivo, anche da «Approvazioni».
        </li>
      </ol>
      {!requestedBy && (
        <p className="m-0 text-[13px] text-[var(--in-warn)]">
          «Richiesto da» resta vuoto finché il login SCD non verifica il tuo
          ruolo: compilalo nel registro.
        </p>
      )}
      <CopyBlock
        label="Riga per il registro prenotazioni"
        text={row}
        rows={2}
      />
      <CopyBlock label="Scheda per la Direzione" text={brief} rows={10} />
      <div>
        <a
          href={REGISTRY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={btnPrimary}
        >
          Apri il registro prenotazioni
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only">(si apre in una nuova scheda)</span>
        </a>
      </div>
    </section>
  );
}

/* ---------------- Planner ---------------- */

export function BookingPlanner({
  model,
  draftIn,
  requestedBy,
}: {
  model: ImpiantiModel;
  draftIn: BookingDraft | null;
  requestedBy: string;
}) {
  const [d, setD] = useState<BookingDraft>(() =>
    draftIn
      ? { ...emptyDraft(model.today), ...draftIn }
      : emptyDraft(model.today),
  );
  const quadroRooms = useImpianti().quadro.rooms as QuadroRoom[];
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState<Booking | null>(null);
  const fid = useId();
  useEffect(() => {
    if (draftIn) {
      setD({ ...emptyDraft(model.today), ...draftIn });
      setErrors([]);
      setDone(null);
    }
  }, [draftIn, model.today]);
  useEffect(() => {
    if (sending) document.getElementById("invio-direzione")?.focus();
  }, [sending]);

  const set = <K extends keyof BookingDraft>(k: K, v: BookingDraft[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const preview = useMemo(
    () => previewFor(model.items, model.options.buffer, d),
    [model.items, model.options.buffer, d],
  );
  const clashes = useMemo(
    () => roomClashes(d, model.bookings, quadroRooms, model.options.buffer),
    [d, model.bookings, quadroRooms, model.options.buffer],
  );
  const guidance = roomGuidance(d.kind);
  const colico = d.pitch !== "DV";
  const toggleRoom = (r: RoomId) =>
    setD((x) => ({
      ...x,
      rooms: (x.rooms ?? []).includes(r)
        ? (x.rooms ?? []).filter((y) => y !== r)
        : [...(x.rooms ?? []), r],
    }));

  const create = (): Booking | null => {
    const clean: BookingDraft = {
      ...d,
      title: d.title.trim(),
      rooms: colico ? (d.rooms ?? []) : [],
      entrance: (d.entrance ?? "").trim(),
      amount: d.kind === "affitto" ? (d.amount ?? "").trim() : "",
    };
    const errs = validateBooking(clean);
    setErrors(errs);
    if (errs.length) return null;
    const b = model.addBooking(clean);
    setDone(
      `Ipotesi aggiunta: ${BOOKING_KIND_LABEL[d.kind]}, ${longDay(d.date)} alle ${d.start}.`,
    );
    return b;
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create();
  };
  const sendNow = () => {
    const b = create();
    if (b) setSending(b);
  };

  return (
    <section
      aria-labelledby="h-ip"
      className="grid gap-3.5 rounded-2xl border border-[var(--in-line)] bg-white p-4 shadow-[var(--in-card-shadow)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="h-ip" className="m-0 text-[19px] font-bold">
          Nuova prenotazione
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="warn">non salvato nel gestionale</Chip>
          <a
            href={REGISTRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary}
          >
            Apri il registro prenotazioni
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only">(si apre in una nuova scheda)</span>
          </a>
        </div>
      </div>
      <p className="m-0 text-[14px] text-[var(--in-sub)]">
        Allenamenti extra, amichevoli, tornei, affitti a terzi o chiusure: il
        controllo è lo stesso delle gare. «Invia alla Direzione» prepara la riga
        per il registro «17 - PRENOTAZIONI IMPIANTI 2026-27» e la scheda da
        mandare: lo stato resta PROPOSTA finché la Direzione non decide.
      </p>

      <div className="grid gap-4 @[900px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <form
          onSubmit={submit}
          className="grid content-start gap-3"
          aria-describedby={`${fid}-note`}
          id="ipotesi-form"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className={labelCls}>Tipo</span>
              <select
                className={inputCls}
                value={d.kind}
                onChange={(e) => {
                  const k = e.target.value as BookingKind;
                  setD((x) => ({
                    ...x,
                    kind: k,
                    duration: BOOKING_DEFAULTS[k].duration,
                    format: BOOKING_DEFAULTS[k].format,
                  }));
                }}
              >
                {(Object.keys(BOOKING_KIND_LABEL) as BookingKind[]).map((k) => (
                  <option key={k} value={k}>
                    {BOOKING_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>Campo</span>
              <select
                className={inputCls}
                value={d.pitch}
                onChange={(e) => set("pitch", e.target.value as PitchId)}
              >
                {(["C1", "C2", "DV"] as PitchId[]).map((p) => (
                  <option key={p} value={p}>
                    {PITCHES[p].site} {PITCHES[p].name.toLowerCase()} ·{" "}
                    {PITCHES[p].size}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>Giorno</span>
              <input
                type="date"
                className={inputCls}
                value={d.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>Inizio</span>
              <input
                type="time"
                className={inputCls}
                value={d.start}
                step={300}
                onChange={(e) => set("start", e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>Durata (minuti)</span>
              <input
                type="number"
                className={inputCls}
                min={15}
                max={720}
                step={15}
                value={d.duration}
                onChange={(e) => set("duration", Number(e.target.value))}
              />
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>Formato</span>
              <select
                className={inputCls}
                value={String(d.format)}
                onChange={(e) =>
                  set(
                    "format",
                    (e.target.value === "full"
                      ? "full"
                      : Number(e.target.value)) as PitchFormat,
                  )
                }
              >
                <option value="full">Campo intero</option>
                {[11, 9, 7, 5].map((f) => (
                  <option key={f} value={f}>
                    {f} contro {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className={labelCls}>
                {d.kind === "affitto"
                  ? "Ente o società che chiede il campo"
                  : "Descrizione (squadra o evento)"}
              </span>
              <input
                type="text"
                className={inputCls}
                maxLength={BOOKING_TITLE_MAX}
                value={d.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={
                  d.kind === "affitto"
                    ? "es. nome dell'associazione"
                    : "facoltativa"
                }
              />
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>Ingresso</span>
              <input
                type="text"
                className={inputCls}
                maxLength={40}
                value={d.entrance ?? ""}
                onChange={(e) => set("entrance", e.target.value)}
                placeholder="facoltativo"
              />
            </label>
            {d.kind === "affitto" && (
              <label className="grid gap-1">
                <span className={labelCls}>Importo affitto (€)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputCls}
                  maxLength={8}
                  value={d.amount ?? ""}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="da concordare"
                />
              </label>
            )}
          </div>

          <fieldset className="m-0 grid gap-2 rounded-xl border border-[var(--in-line)] p-3">
            <legend className="px-1 text-[13px] font-semibold text-[var(--in-sub)]">
              Spogliatoi
            </legend>
            {colico ? (
              <div className="flex flex-wrap gap-2">
                {ROOMS.map((r) => {
                  const on = (d.rooms ?? []).includes(r.id);
                  const busy = clashes.some((c) => c.room === r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[15px] font-semibold ${on ? (busy ? "border-[var(--in-crit)] bg-[var(--in-crit-bg)]" : "border-[var(--in-info)] bg-[var(--in-info-bg)]") : "border-[var(--in-line)] bg-white"}`}
                    >
                      <input
                        type="checkbox"
                        className="scd-focus size-5"
                        checked={on}
                        onChange={() => toggleRoom(r.id)}
                      />
                      {r.label}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="m-0 text-[14px] text-[var(--in-sub)]">
                Dervio: un blocco spogliatoi (SP1, 4 squadre + arbitri).
                Assegnazione da concordare con il Comune.
              </p>
            )}
            {clashes.length > 0 && (
              <ul
                role="alert"
                className="m-0 grid gap-1 rounded-lg bg-[var(--in-warn-bg)] px-4 py-2 text-[14px] text-[var(--in-warn)]"
              >
                {clashes.map((c) => (
                  <li key={`${c.room}-${c.source}-${c.start}-${c.by}`}>
                    {c.room === "ARB" ? "Spogliatoio arbitri" : c.room} già
                    assegnato: {c.by} {hhmm(c.start)}–{hhmm(c.end)}
                    {c.source === "quadro"
                      ? ` (Quadro settimanale, settimana ${c.week ?? "—"})`
                      : " (altra ipotesi)"}
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-1">
              <b className="text-[13px]">
                Come usare gli spogliatoi · {BOOKING_KIND_LABEL[d.kind]}
              </b>
              <ul className="m-0 grid gap-1 pl-5 text-[13.5px] text-[var(--in-sub)]">
                {guidance.map((g) => (
                  <li key={g.text}>
                    {g.text}{" "}
                    <span
                      className={`text-[12px] font-semibold ${g.basis === "fonte" ? "text-[var(--in-ok)]" : "text-[var(--in-warn)]"}`}
                    >
                      (
                      {g.basis === "fonte"
                        ? "dal master Sedi e impianti"
                        : "regola proposta"}
                      )
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </fieldset>

          <p
            id={`${fid}-note`}
            className="m-0 text-[13px] text-[var(--in-sub)]"
          >
            Solo nomi di squadre, eventi o enti: niente nomi di persone, email o
            telefoni. Le ipotesi restano in questo browser, non salvate nel
            gestionale.
          </p>
          {errors.length > 0 && (
            <ul
              role="alert"
              className="m-0 grid gap-1 rounded-lg bg-[var(--in-crit-bg)] px-4 py-2 text-[14px] text-[var(--in-crit)]"
            >
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary} onClick={sendNow}>
              <Send className="size-4" aria-hidden="true" />
              Invia alla Direzione
            </button>
            <button type="submit" className={btnSecondary}>
              Salva solo come ipotesi
            </button>
            <span
              role="status"
              aria-live="polite"
              className="text-[14px] text-[var(--in-ok)]"
            >
              {done}
            </span>
          </div>
        </form>

        <div className="grid content-start gap-2" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[15px]">Anteprima sul campo</b>
            {preview.probe ? (
              <Chip tone={preview.fits ? "ok" : "crit"}>
                {preview.fits ? "Ci sta" : "Conflitto"}
              </Chip>
            ) : (
              <Chip tone="mute">Orario da completare</Chip>
            )}
          </div>
          <PitchPreview pitch={d.pitch} format={d.format} preview={preview} />
          <ul className="m-0 grid gap-1 pl-5 text-[13.5px] text-[var(--in-sub)]">
            {preview.probe && (
              <li>
                Nuova ipotesi: {fmtText(d.format)},{" "}
                {shareText(pitchUnits(d.pitch, d.format))}, {d.start}–
                {hhmm(preview.probe.end)} più {model.options.buffer} minuti di
                cambio campo.
              </li>
            )}
            {preview.others.map((m) => (
              <li key={m.id}>
                Già in campo: {m.label}
                {m.kind === "match" ? "" : " (ipotesi)"} {hhmm(m.start)}–
                {hhmm(m.end)} · {fmtText(m.format)}
              </li>
            ))}
            {preview.probe && !preview.others.length && (
              <li>Nessun altro uso del campo in quell'orario.</li>
            )}
          </ul>
        </div>
      </div>

      {sending && (
        <SendPanel
          booking={sending}
          model={model}
          requestedBy={requestedBy}
          onClose={() => setSending(null)}
        />
      )}

      {!model.storageOk && (
        <p role="alert" className="m-0 text-[14px] text-[var(--in-warn)]">
          Questo browser non salva le ipotesi: spariranno chiudendo la pagina.
        </p>
      )}
      {model.bookings.length > 0 && (
        <ul
          className="m-0 grid list-none gap-2 p-0"
          aria-label="Ipotesi aggiunte"
        >
          {model.bookings.map((b) => {
            const bad = model.analysis.bookingConflicts.includes(
              `ipotesi-${b.id}`,
            );
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[var(--in-sub)]/50 bg-[#f8fbfe] px-3 py-2 text-[14px]"
              >
                <span className="rounded bg-[var(--in-ink)] px-1.5 text-[11px] font-semibold uppercase text-white">
                  ipotesi
                </span>
                <b>
                  {BOOKING_KIND_LABEL[b.kind]}
                  {b.title ? ` · ${b.title}` : ""}
                </b>
                <span className="text-[var(--in-sub)]">
                  {PITCHES[b.pitch].site} {PITCHES[b.pitch].name.toLowerCase()}{" "}
                  · {longDay(b.date)} {b.start} · {b.duration} min ·{" "}
                  {fmtText(b.format)}
                  {(b.rooms ?? []).length
                    ? ` · spogliatoi ${(b.rooms ?? []).join(", ")}`
                    : ""}
                </span>
                <Chip tone={bad ? "crit" : "ok"}>
                  {bad ? "non ci sta" : "ci sta"}
                </Chip>
                <span className="ml-auto flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSending(b)}
                    className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
                    aria-label={`Invia alla Direzione: ${BOOKING_KIND_LABEL[b.kind]} del ${ddmm(b.date)}`}
                  >
                    <Send className="size-4" aria-hidden="true" />
                    Invia alla Direzione
                  </button>
                  <button
                    type="button"
                    onClick={() => model.removeBooking(b.id)}
                    className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-[var(--in-crit)] hover:bg-[var(--in-crit-bg)]"
                    aria-label={`Togli l'ipotesi ${BOOKING_KIND_LABEL[b.kind]} del ${ddmm(b.date)}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Togli
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
