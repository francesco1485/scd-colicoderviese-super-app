/**
 * Bookings register: the Drive master "17 - PRENOTAZIONI IMPIANTI 2026-27"
 * (manifest source PRENOTAZIONI_IMPIANTI_SHEET).
 *
 * The app never writes to it. It builds rows and a summary for the Direzione
 * that the manager copies and pastes, and it reads proposals back from the
 * sheet's published CSV (env SCD_BOOKINGS_CSV_URL, no personal data) to show
 * them in /gestionale/impianti/approvazioni with conflicts recomputed by the
 * rotation engine. Workflow: PROPOSTA → IN VALUTAZIONE → CONFERMATA | RESPINTA.
 */
import {
  BOOKING_KIND_LABEL,
  NOTICE_DAYS,
  PITCHES,
  ROOMS,
  checkSlot,
  groupByDay,
  hhmm,
  longDay,
  minusDays,
  pitchUnits,
  roomClashes,
  toMinutes,
  type Booking,
  type BookingKind,
  type PitchFormat,
  type PitchId,
  type QuadroRoom,
  type RotationMatch,
} from "./rotation";
import {
  checkSlotWithQuadro,
  lightsAdvice,
  requestNote,
  trainingLines,
  type CapacityCheck,
  type QuadroRotationLike,
} from "./impianti-planning";

/** Column order of the master. */
export const REGISTRY_COLUMNS = [
  "ID",
  "Data",
  "Ora inizio",
  "Ora fine",
  "Sede",
  "ID spazio",
  "Zona",
  "Tipo",
  "Squadra o soggetto",
  "Formato",
  "Spogliatoi",
  "Ingresso",
  "Stato",
  "Richiesto da",
  "Approvato da",
  "Importo affitto",
  "Contratto o link",
  "Avviso Comune",
  "Note",
  "Origine",
] as const;
export type RegistryColumn = (typeof REGISTRY_COLUMNS)[number];

export const REGISTRY_URL =
  "https://docs.google.com/spreadsheets/d/14Idop9OuCWGMaxVgiQgGSpM5E7mNaO6SL6kt_i_lSVY/edit";

export type BookingStatus =
  "PROPOSTA" | "IN VALUTAZIONE" | "CONFERMATA" | "RESPINTA" | "ANNULLATA";
export const STATUS_FLOW: readonly BookingStatus[] = [
  "PROPOSTA",
  "IN VALUTAZIONE",
  "CONFERMATA",
  "RESPINTA",
];
/** Statuses still waiting for the Direzione. */
export const OPEN_STATUSES: readonly BookingStatus[] = [
  "PROPOSTA",
  "IN VALUTAZIONE",
];

export function normalizeStatus(v: string): BookingStatus | null {
  const s = v.trim().toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ");
  return (
    (
      [
        "PROPOSTA",
        "IN VALUTAZIONE",
        "CONFERMATA",
        "RESPINTA",
        "ANNULLATA",
      ] as const
    ).find((x) => x === s) ?? null
  );
}

const zoneOf = (pitch: PitchId, format: PitchFormat): string => {
  const w = pitchUnits(pitch, format);
  return w >= 0.999
    ? "Campo intero"
    : w >= 0.49
      ? "Metà campo"
      : w >= 0.33
        ? "Un terzo"
        : "Un quarto";
};
export const itDate = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const cell = (v: string) => v.replace(/[\t\r\n]+/g, " ").trim();
const fmtLabel = (f: PitchFormat) =>
  f === "full" ? "Campo intero" : `${f} contro ${f}`;

/**
 * One TSV row for the master, in REGISTRY_COLUMNS order. Status is always
 * PROPOSTA: the Direzione decides in the sheet. `requestedBy` is the
 * position of the person sending it (empty when not verified). The Note
 * carries the lights of the same request and, with `at`, the first entry of
 * the state history ("Storico: dd/mm/yyyy hh:mm PROPOSTA (ruolo)").
 */
export function bookingToRegistryRow(
  b: Booking,
  requestedBy = "",
  at: Date | null = null,
): string {
  const start = toMinutes(b.start) ?? 0;
  const p = PITCHES[b.pitch];
  const roomIds = (b.rooms ?? []).map(
    (r) => ROOMS.find((x) => x.id === r)?.spaceId ?? r,
  );
  const values: Record<RegistryColumn, string> = {
    ID: `IPO-${b.id}`,
    Data: itDate(b.date),
    "Ora inizio": hhmm(start),
    "Ora fine": hhmm(start + b.duration),
    Sede: p.siteId,
    "ID spazio": p.spaceId,
    Zona: zoneOf(b.pitch, b.format),
    Tipo: BOOKING_KIND_LABEL[b.kind],
    "Squadra o soggetto": b.title,
    Formato: fmtLabel(b.format),
    Spogliatoi: roomIds.join(", "),
    Ingresso: b.entrance ?? "",
    Stato: "PROPOSTA",
    "Richiesto da": requestedBy,
    "Approvato da": "",
    "Importo affitto": b.kind === "affitto" ? (b.amount ?? "") : "",
    "Contratto o link": "",
    "Avviso Comune":
      b.pitch === "DV"
        ? `Entro il ${itDate(minusDays(b.date, NOTICE_DAYS))}`
        : "Non serve",
    Note: requestNote(b, requestedBy, at),
    Origine: "Super App /gestionale/impianti",
  };
  return REGISTRY_COLUMNS.map((c) => cell(values[c])).join("\t");
}

/* ---------------- Summary for the Direzione ---------------- */

export interface BriefContext {
  /** All occupancy items of the day set (matches of the scenario + other ipotesi). */
  items: readonly RotationMatch[];
  others: readonly Booking[];
  quadroRooms: readonly QuadroRoom[];
  buffer: number;
  today: string;
  requestedBy: string;
  /** Training board rotations; when given, trainings enter the pitch check (week A and B). */
  rotations?: readonly QuadroRotationLike[] | null;
}

/** Pre-filled "scheda per la Direzione": plain text, ready to copy. */
export function directionBrief(b: Booking, ctx: BriefContext): string {
  const start = toMinutes(b.start) ?? 0;
  const p = PITCHES[b.pitch];
  const day = groupByDay(ctx.items).get(b.date) ?? [];
  const sameDay = day.filter((m) => m.id !== `ipotesi-${b.id}`);
  const quadro: CapacityCheck | null =
    ctx.rotations !== undefined
      ? checkSlotWithQuadro(
          sameDay,
          ctx.rotations,
          b.date,
          b.pitch,
          start,
          b.duration,
          b.format,
          ctx.buffer,
        )
      : null;
  const check =
    quadro ??
    checkSlot(sameDay, b.pitch, start, b.duration, b.format, ctx.buffer);
  const lights = lightsAdvice(b);
  const rooms = roomClashes(
    b,
    ctx.others.filter((o) => o.id !== b.id),
    ctx.quadroRooms,
    ctx.buffer,
  );
  const lines: string[] = [
    `SCHEDA PER LA DIREZIONE · proposta di prenotazione IPO-${b.id}`,
    `Cosa: ${BOOKING_KIND_LABEL[b.kind]}${b.title.trim() ? ` · ${b.title.trim()}` : ""}`,
    `Dove: ${p.site} ${p.name.toLowerCase()} (${p.spaceId}, ${p.surface}, ${p.size ?? "—"}), ${zoneOf(b.pitch, b.format).toLowerCase()} · ${fmtLabel(b.format).toLowerCase()}`,
    `Quando: ${longDay(b.date)} ${b.date.slice(0, 4)}, ${hhmm(start)}–${hhmm(start + b.duration)} (+${ctx.buffer} min cambio campo)`,
    check.fits
      ? `Conflitti sul campo: nessuno${check.sharing.length ? `; condivide il campo con ${check.sharing.map((m) => `${m.label} ${hhmm(m.start)}`).join(", ")}` : ""}`
      : `Conflitti sul campo: SÌ, il campo non basta con ${
          [
            ...check.sharing.map((m) => `${m.label} ${hhmm(m.start)}`),
            ...(quadro &&
            !quadro.measuresToVerify &&
            (quadro.byWeek.A.trainings.length ||
              quadro.byWeek.B.trainings.length)
              ? ["gli allenamenti del Quadro settimanale"]
              : []),
          ].join(", ") || "il formato scelto (misure da verificare)"
        }`,
    `Spogliatoi: ${(b.rooms ?? []).length ? (b.rooms ?? []).map((r) => (r === "ARB" ? "arbitri" : r)).join(", ") : "—"}${rooms.length ? ` · ATTENZIONE già assegnati: ${rooms.map((r) => `${r.room} a ${r.by} ${hhmm(r.start)}`).join("; ")}` : ""}`,
    `Luci: ${lights.window ? `sì, ${hhmm(lights.window[0])}–${hhmm(lights.window[1])}` : lights.recommended ? "non richieste (finisce dopo le 17:00: da valutare)" : "no"}`,
    `Ingresso: ${(b.entrance ?? "").trim() || "—"}`,
  ];
  if (quadro) lines.splice(5, 0, ...trainingLines(quadro));
  if (b.kind === "affitto")
    lines.push(
      `Affitto: importo ${(b.amount ?? "").trim() ? `${(b.amount ?? "").trim()} €` : "—"}; servono accordo scritto e verifica dell'assicurazione dell'ente`,
    );
  if (b.pitch === "DV") {
    const notice = minusDays(b.date, NOTICE_DAYS);
    lines.push(
      `Avviso al Comune di Dervio: entro il ${itDate(notice)}${notice < ctx.today ? " (GIÀ IN RITARDO)" : ""}`,
    );
  }
  lines.push(`Richiesto da: ${ctx.requestedBy || "—"}`);
  lines.push(
    "Stato: PROPOSTA. Decisione della Direzione: CONFERMATA o RESPINTA (con motivo) nel registro prenotazioni.",
  );
  return lines.join("\n");
}

/* ---------------- Reading the published CSV ---------------- */

/** RFC 4180 CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF, empty cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface Proposal {
  id: string;
  /** ISO day, or null when the cell cannot be read. */
  date: string | null;
  start: number | null;
  end: number | null;
  pitch: PitchId | null;
  format: PitchFormat | null;
  kind: BookingKind | null;
  kindLabel: string;
  subject: string;
  rooms: string;
  entrance: string;
  status: BookingStatus | null;
  requestedBy: string;
  approvedBy: string;
  amount: string;
  notice: string;
  note: string;
  source: "registro" | "ipotesi";
}

const SPACE_TO_PITCH: Readonly<Record<string, PitchId>> = {
  "SPA-COL-C1": "C1",
  "SPA-COL-C2": "C2",
  "SPA-DER-C1": "DV",
};

function readDate(v: string): string | null {
  const t = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
    const d = new Date(`${iso}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
      ? iso
      : null;
  }
  return null;
}

function readFormat(v: string): PitchFormat | null {
  const t = v.trim().toLowerCase();
  if (!t) return null;
  if (t.includes("intero")) return "full";
  const m = /^(11|9|7|5|3)\b/.exec(t);
  return m ? (Number(m[1]) as PitchFormat) : null;
}

function readKind(v: string): BookingKind | null {
  const t = v.trim().toLowerCase();
  const hit = (
    Object.entries(BOOKING_KIND_LABEL) as [BookingKind, string][]
  ).find(([k, label]) => t === label.toLowerCase() || t === k);
  if (hit) return hit[0];
  if (t.startsWith("allenament")) return "allenamento";
  if (t.startsWith("torneo") || t.startsWith("evento")) return "torneo";
  if (t.startsWith("affitt")) return "affitto";
  if (t.startsWith("manutenz") || t.startsWith("chiusur"))
    return "manutenzione";
  if (t.startsWith("gara") || t.startsWith("amichevol")) return "gara";
  return null;
}

/** Proposals from the master's CSV (header row required; columns matched by name, any order). */
export function csvToProposals(text: string): Proposal[] {
  const rows = parseCsv(text);
  const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (name: RegistryColumn) => header.indexOf(name.toLowerCase());
  if (col("ID") < 0 || col("Data") < 0) return [];
  const get = (r: string[], name: RegistryColumn) => {
    const i = col(name);
    return i >= 0 ? (r[i] ?? "").trim() : "";
  };
  return rows
    .slice(1)
    .map((r): Proposal => {
      const start = toMinutes(get(r, "Ora inizio"));
      const end = toMinutes(get(r, "Ora fine"));
      return {
        id: get(r, "ID"),
        date: readDate(get(r, "Data")),
        start,
        end: end !== null && start !== null && end > start ? end : null,
        pitch: SPACE_TO_PITCH[get(r, "ID spazio").toUpperCase()] ?? null,
        format: readFormat(get(r, "Formato")),
        kind: readKind(get(r, "Tipo")),
        kindLabel: get(r, "Tipo"),
        subject: get(r, "Squadra o soggetto"),
        rooms: get(r, "Spogliatoi"),
        entrance: get(r, "Ingresso"),
        status: normalizeStatus(get(r, "Stato")),
        requestedBy: get(r, "Richiesto da"),
        approvedBy: get(r, "Approvato da"),
        amount: get(r, "Importo affitto"),
        notice: get(r, "Avviso Comune"),
        note: get(r, "Note"),
        source: "registro",
      };
    })
    .filter((p) => p.id !== "");
}

/** A local ipotesi as a proposal card (status PROPOSTA, not yet in the master). */
export function bookingToProposal(b: Booking, requestedBy = ""): Proposal {
  const created = b.createdAt ? new Date(b.createdAt) : null;
  const start = toMinutes(b.start);
  return {
    id: `IPO-${b.id}`,
    date: b.date,
    start,
    end: start === null ? null : start + b.duration,
    pitch: b.pitch,
    format: b.format,
    kind: b.kind,
    kindLabel: BOOKING_KIND_LABEL[b.kind],
    subject: b.title,
    rooms: (b.rooms ?? []).join(", "),
    entrance: b.entrance ?? "",
    status: "PROPOSTA",
    requestedBy,
    approvedBy: "",
    amount: b.amount ?? "",
    notice:
      b.pitch === "DV"
        ? `Entro il ${itDate(minusDays(b.date, NOTICE_DAYS))}`
        : "Non serve",
    note: requestNote(
      b,
      requestedBy,
      created && !Number.isNaN(created.getTime()) ? created : null,
    ),
    source: "ipotesi",
  };
}

export interface ProposalCheck {
  /** False when date, time, pitch or format cannot be read: conflicts are unknown. */
  checkable: boolean;
  fits: boolean | null;
  sharing: RotationMatch[];
  /** Present when the training board was part of the check (week A and B). */
  quadro?: CapacityCheck;
}

/**
 * Conflicts of a proposal recomputed against the calendar snapshot and, when
 * `rotations` is given, the trainings of the Quadro settimanale.
 */
export function checkProposal(
  p: Proposal,
  matches: readonly RotationMatch[],
  buffer: number,
  rotations?: readonly QuadroRotationLike[] | null,
): ProposalCheck {
  if (!p.date || p.start === null || p.end === null || !p.pitch || !p.format)
    return { checkable: false, fits: null, sharing: [] };
  const day = groupByDay(matches).get(p.date) ?? [];
  if (rotations !== undefined) {
    const q = checkSlotWithQuadro(
      day,
      rotations,
      p.date,
      p.pitch,
      p.start,
      p.end - p.start,
      p.format,
      buffer,
    );
    return { checkable: true, fits: q.fits, sharing: q.sharing, quadro: q };
  }
  const r = checkSlot(day, p.pitch, p.start, p.end - p.start, p.format, buffer);
  return { checkable: true, fits: r.fits, sharing: r.sharing };
}

/** Value to paste in the Stato column, and the Note text for a rejection. */
export function decisionCells(
  decision: "CONFERMATA" | "RESPINTA" | "IN VALUTAZIONE",
  reason = "",
): { stato: BookingStatus; note: string } {
  const r = reason.replace(/[\t\r\n]+/g, " ").trim();
  return {
    stato: decision,
    note:
      decision === "RESPINTA"
        ? r
          ? `Respinta: ${r}`
          : "Respinta: motivo da indicare"
        : "",
  };
}
