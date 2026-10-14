/**
 * Lotteria dello sport on the server (r102, UD-115): feature detection and row mapping. Pure functions only (no SDK
 * import), so the tests can run them on plain objects.
 *
 * Fail-closed: while r102 is not applied (`scd_lotteries` missing) the engine is "not-applied" and the pages work in
 * simulation (local, not saved). Nothing is written anywhere until the Direzione applies r102.
 */
import { isMissingObjectError } from "./person-grants.server";
import {
  COMPLIANCE_STATUSES,
  emptySetup,
  isDay,
  LOTTERY_KINDS,
  type BlockStatus,
  type ComplianceRecord,
  type ComplianceStatus,
  type DrawEntry,
  type DrawOrder,
  type LedgerEntry,
  type LotteryKind,
  type LotterySetup,
  type LotteryState,
  type NumberRange,
  type Prize,
  type PublicLottery,
  type SeriesRange,
  type TicketBlock,
  type TicketState,
} from "./lottery";

export type LotteryEngine = "applied" | "not-applied" | "unknown";

type DbError = { code?: string; message: string } | null;

/** Minimal client shape used for detection (keeps this testable without the SDK). */
export interface LotteryProbeClient {
  from(table: string): {
    select(
      columns: string,
      opts?: { head?: boolean; count?: "exact" },
    ): PromiseLike<{ error: DbError }> & {
      limit(n: number): PromiseLike<{ error: DbError }>;
    };
  };
}

/** Is r102 applied on the connected database? "unknown" when the probe failed for another reason. */
export async function lotteryEngineState(
  sb: LotteryProbeClient | null,
): Promise<LotteryEngine> {
  if (!sb) return "unknown";
  try {
    const { error } = await sb
      .from("scd_lotteries")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (!error) return "applied";
    return isMissingObjectError(error) ? "not-applied" : "unknown";
  } catch {
    return "unknown";
  }
}

export const NOT_APPLIED_MESSAGE =
  "Da attivare: serve l'OK della Direzione per applicare r102. Niente è stato salvato.";

/** Plain Italian for the database refusals of r102. */
export function explainLotteryError(error: {
  code?: string;
  message: string;
}): string {
  const m = error.message;
  if (isMissingObjectError(error)) return NOT_APPLIED_MESSAGE;
  if (m.includes("scd_lotteries_ticket_cap"))
    return "Il totale dei biglietti supera il limite di legge di 51.645,69 €.";
  if (m.includes("tombola prize cap"))
    return "Tombola: i premi superano il limite di 12.911,42 €.";
  if (m.includes("prize forbidden"))
    return "Premio non ammesso: solo beni e servizi (niente denaro, metalli in barre, titoli, carte o strumenti bancari).";
  if (m.includes("draw already started"))
    return "L'estrazione è già iniziata: impostazione, premi e registri non si cambiano più.";
  if (m.includes("blocks already assigned"))
    return "Ci sono già blocchi assegnati: la numerazione non si cambia più.";
  if (m.includes("series total"))
    return "Le serie non contano tanti biglietti quanti quelli emessi.";
  if (m.includes("block outside series"))
    return "Il blocco esce dalla serie del piano di numerazione.";
  if (m.includes("block overlaps"))
    return "Il blocco si sovrappone a un altro già assegnato.";
  if (m.includes("unsold outside block"))
    return "Gli invenduti devono essere numeri del blocco.";
  if (m.includes("registers still out"))
    return "Ci sono ancora blocchi fuori: completare il ritiro dei registri prima di estrarre.";
  if (m.includes("ticket already drawn"))
    return "Questo biglietto è già stato estratto.";
  if (m.includes("no prizes left"))
    return "Tutti i premi sono già stati assegnati.";
  if (m.includes("winners already confirmed"))
    return "I vincitori sono già confermati: l'estrazione è chiusa.";
  if (m.includes("prizes still to draw"))
    return "Ci sono ancora premi da estrarre.";
  if (m.includes("needed to publish"))
    return "Per pubblicare servono nome, data dell'estrazione, giornata dello sport e punti vendita.";
  if (
    m.includes("sale_order") ||
    m.includes("sale_before_draw") ||
    m.includes("delivery_after_draw")
  )
    return "Le date non sono in ordine.";
  if (m.includes("not found"))
    return "Elemento non trovato: ricarica la pagina.";
  if (error.code === "42501" || m.includes("not allowed"))
    return "Non hai i permessi per questa modifica.";
  return "Modifica non riuscita, riprova.";
}

// ---------------------------------------------------------------------------------------------------------------
// Row mapping

export interface LotteryRow {
  id: string;
  kind: string;
  title: string;
  beneficiary: string;
  sale_from: string | null;
  sale_until: string | null;
  draw_date: string | null;
  draw_time: string | null;
  draw_place: string;
  draw_comune: string;
  sport_day: string | null;
  sport_day_place: string;
  ticket_price_cents: number | null;
  tickets_total: number | null;
  prizes_display_place: string;
  prize_delivery_place: string;
  prize_delivery_until: string | null;
  sale_points: string;
  draw_order: string | null;
  goal_cents: number | null;
  published_on: string | null;
  winners_confirmed_on: string | null;
}
export const LOTTERY_COLUMNS =
  "id,kind,title,beneficiary,sale_from,sale_until,draw_date,draw_time,draw_place,draw_comune,sport_day,sport_day_place,ticket_price_cents,tickets_total,prizes_display_place,prize_delivery_place,prize_delivery_until,sale_points,draw_order,goal_cents,published_on,winners_confirmed_on";

export interface SeriesRow {
  series: string;
  first_number: number;
  last_number: number;
}
export interface ComplianceRow {
  item_code: string;
  status: string;
  protocol: string | null;
  done_on: string | null;
  note: string | null;
}
export interface PrizeRow {
  id: string;
  rank: number;
  description: string;
  category: string;
  origin: string;
  sponsor_slug: string | null;
  donor_text: string | null;
  declared_value_cents: number | null;
}
export interface BlockRow {
  id: string;
  series: string;
  from_number: number;
  to_number: number;
  seller: string;
  seller_adult_confirmed: boolean;
  assigned_on: string | null;
  status: string;
  unsold: unknown;
  collected_cents: number | null;
  note: string | null;
}
export interface DrawRow {
  id: string;
  draw_order: number;
  series: string;
  number: number;
  state: string;
  prize_id: string | null;
  drawn_at: string;
}
export interface LedgerRow {
  id: string;
  kind: string;
  label: string;
  amount_cents: number;
  entry_date: string;
  cancelled_at: string | null;
}

const day = (v: string | null | undefined): string | null =>
  isDay(v ?? null) ? (v as string) : null;
const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) ? v : null;

export function toSetup(r: LotteryRow): LotterySetup {
  const base = emptySetup(
    (LOTTERY_KINDS as readonly string[]).includes(r.kind)
      ? (r.kind as LotteryKind)
      : "LOTTERIA",
  );
  return {
    ...base,
    title: r.title ?? "",
    beneficiary: r.beneficiary ?? base.beneficiary,
    saleFrom: day(r.sale_from),
    saleUntil: day(r.sale_until),
    drawDate: day(r.draw_date),
    drawTime: r.draw_time ? r.draw_time.slice(0, 5) : null,
    drawPlace: r.draw_place ?? "",
    drawComune: r.draw_comune ?? "",
    sportDay: day(r.sport_day),
    sportDayPlace: r.sport_day_place ?? "",
    ticketPriceCents: int(r.ticket_price_cents),
    ticketsTotal: int(r.tickets_total),
    prizesDisplayPlace: r.prizes_display_place ?? "",
    prizeDeliveryPlace: r.prize_delivery_place ?? "",
    prizeDeliveryUntil: day(r.prize_delivery_until),
    salePoints: r.sale_points ?? "",
    drawOrder:
      r.draw_order === "DAL_PRIMO" || r.draw_order === "DALL_ULTIMO"
        ? (r.draw_order as DrawOrder)
        : null,
    goalCents: int(r.goal_cents),
  };
}

function toRanges(v: unknown): NumberRange[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      x && typeof x === "object"
        ? {
            from: Number((x as Record<string, unknown>)["from"]),
            to: Number((x as Record<string, unknown>)["to"]),
          }
        : null,
    )
    .filter(
      (x): x is NumberRange =>
        !!x &&
        Number.isInteger(x.from) &&
        Number.isInteger(x.to) &&
        x.to >= x.from,
    );
}

const BLOCK_STATUSES: readonly BlockStatus[] = [
  "ASSEGNATO",
  "RESTITUITO",
  "NON_RESTITUITO",
];
const TICKET_STATES: readonly TicketState[] = [
  "VALIDO",
  "NULLO",
  "INVENDUTO",
  "FUORI_BLOCCO",
  "NON_EMESSO",
  "DA_RICONCILIARE",
];

export function toState(
  l: LotteryRow,
  rows: {
    series: SeriesRow[];
    compliance: ComplianceRow[];
    prizes: PrizeRow[];
    blocks: BlockRow[];
    draws: DrawRow[];
    ledger: LedgerRow[];
  },
): LotteryState {
  const compliance: Record<string, ComplianceRecord> = {};
  for (const c of rows.compliance) {
    if (!(COMPLIANCE_STATUSES as readonly string[]).includes(c.status))
      continue;
    compliance[c.item_code] = {
      status: c.status as ComplianceStatus,
      protocol: c.protocol ?? "",
      doneOn: day(c.done_on),
      note: c.note ?? "",
    };
  }
  return {
    id: l.id,
    setup: toSetup(l),
    series: rows.series
      .map((s): SeriesRange => ({
        series: s.series,
        first: s.first_number,
        last: s.last_number,
      }))
      .sort((a, b) => a.series.localeCompare(b.series)),
    compliance,
    prizes: rows.prizes.map((p): Prize => ({
      id: p.id,
      rank: p.rank,
      description: p.description,
      category: p.category === "SERVIZIO" ? "SERVIZIO" : "BENE",
      origin: p.origin === "ACQUISTATO" ? "ACQUISTATO" : "DONATO",
      sponsorSlug: p.sponsor_slug,
      donorText: p.donor_text ?? "",
      declaredValueCents: int(p.declared_value_cents),
    })),
    blocks: rows.blocks.map((b): TicketBlock => ({
      id: b.id,
      series: b.series,
      from: b.from_number,
      to: b.to_number,
      seller: b.seller,
      sellerAdultConfirmed: b.seller_adult_confirmed,
      assignedOn: day(b.assigned_on),
      status: (BLOCK_STATUSES as readonly string[]).includes(b.status)
        ? (b.status as BlockStatus)
        : "ASSEGNATO",
      unsold: toRanges(b.unsold),
      collectedCents: int(b.collected_cents),
      note: b.note ?? "",
    })),
    draws: rows.draws
      .map((d): DrawEntry => ({
        id: d.id,
        order: d.draw_order,
        series: d.series,
        number: d.number,
        state: (TICKET_STATES as readonly string[]).includes(d.state)
          ? (d.state as TicketState)
          : "NON_EMESSO",
        prizeId: d.prize_id,
        at: d.drawn_at
          ? new Intl.DateTimeFormat("it-IT", {
              timeZone: "Europe/Rome",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(d.drawn_at))
          : null,
      }))
      .sort((a, b) => a.order - b.order),
    ledger: rows.ledger.map((e): LedgerEntry => ({
      id: e.id,
      kind: e.kind === "COSTO" ? "COSTO" : "INCASSO",
      label: e.label,
      amountCents: e.amount_cents,
      entryDate: e.entry_date,
      cancelled: e.cancelled_at !== null,
    })),
    publishedOn: day(l.published_on),
    winnersConfirmedOn: day(l.winners_confirmed_on),
  };
}

/** Parses scd_lottery_public's JSON (null when nothing is published or the shape is wrong). */
export function parsePublicLottery(raw: unknown): PublicLottery | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const d = (k: string) =>
    day(typeof r[k] === "string" ? (r[k] as string) : null);
  const publishedOn = d("publishedOn");
  if (
    !publishedOn ||
    !(LOTTERY_KINDS as readonly string[]).includes(str("kind"))
  )
    return null;
  const prizes = Array.isArray(r["prizes"])
    ? (r["prizes"] as Array<Record<string, unknown>>)
    : [];
  const winners = Array.isArray(r["winners"])
    ? (r["winners"] as Array<Record<string, unknown>>)
    : null;
  const goalCents = int(r["goalCents"]);
  const netCents = Math.max(0, int(r["netCents"]) ?? 0);
  return {
    kind: str("kind") as LotteryKind,
    title: str("title"),
    beneficiary: str("beneficiary"),
    saleFrom: d("saleFrom"),
    saleUntil: d("saleUntil"),
    drawDate: d("drawDate"),
    drawTime: /^\d{2}:\d{2}$/.test(str("drawTime")) ? str("drawTime") : null,
    drawPlace: str("drawPlace"),
    sportDay: d("sportDay"),
    sportDayPlace: str("sportDayPlace"),
    ticketPriceCents: int(r["ticketPriceCents"]),
    salePoints: str("salePoints"),
    prizesDisplayPlace: str("prizesDisplayPlace"),
    prizeDeliveryPlace: str("prizeDeliveryPlace"),
    prizeDeliveryUntil: d("prizeDeliveryUntil"),
    prizes: prizes
      .filter(
        (p) =>
          typeof p["description"] === "string" && Number.isInteger(p["rank"]),
      )
      .map((p) => ({
        rank: p["rank"] as number,
        description: p["description"] as string,
        sponsorSlug:
          typeof p["sponsorSlug"] === "string"
            ? (p["sponsorSlug"] as string)
            : null,
      })),
    winners: winners
      ? winners
          .filter(
            (w) =>
              typeof w["series"] === "string" &&
              Number.isInteger(w["number"]) &&
              Number.isInteger(w["rank"]),
          )
          .map((w) => ({
            rank: w["rank"] as number,
            prize: typeof w["prize"] === "string" ? (w["prize"] as string) : "",
            series: w["series"] as string,
            number: w["number"] as number,
          }))
      : null,
    funds: {
      netCents,
      goalCents,
      goalPercent: goalCents
        ? Math.max(0, Math.min(100, Math.floor((netCents * 100) / goalCents)))
        : null,
    },
    publishedOn,
  };
}
