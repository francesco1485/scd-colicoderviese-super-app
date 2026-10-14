/**
 * Server functions of the Lotteria dello sport (r102, UD-115).
 *
 * Gate: work area "lotteria" (registry roles, decided on the server from the verified session). Writes: only when r102
 * is applied, and the database decides again (scd_lottery_actor: scd_can 'direzione' or 'tesoreria' READ; publication
 * and winners = Direzione). Every input is validated here with the same pure rules as the page (src/lib/lottery.ts).
 * While r102 is missing every write answers "Da attivare" and nothing is written: the page works in simulation.
 * No sale, payment or gambling mechanic: proceeds are entered by hand.
 */
import { INTERNAL_ONLY } from "./internal-initiatives";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import {
  checkBlock,
  checkLedgerEntry,
  checkPrize,
  checkSeries,
  checkSetup,
  COMPLIANCE_ITEMS,
  COMPLIANCE_STATUSES,
  publicWindow,
  type LotteryState,
  type PublicLottery,
} from "./lottery";
import {
  explainLotteryError,
  LOTTERY_COLUMNS,
  lotteryEngineState,
  NOT_APPLIED_MESSAGE,
  parsePublicLottery,
  toState,
  type BlockRow,
  type ComplianceRow,
  type DrawRow,
  type LedgerRow,
  type LotteryEngine,
  type LotteryProbeClient,
  type LotteryRow,
  type PrizeRow,
  type SeriesRow,
} from "./lottery.server";
import { isInWindow, serverRomeDay } from "./public-window";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

export type LotteryActor = "DIREZIONE" | "EDITOR" | null;

export interface LotteryAuditLine {
  id: number;
  createdAt: string;
  action: string;
}

export interface LotteryBoard {
  gate: WorkAreaGate;
  today: string;
  /** False without a database session (staging preview, signed out). */
  connected: boolean;
  engine: LotteryEngine;
  actor: LotteryActor;
  state: LotteryState | null;
  audit: LotteryAuditLine[];
}

export interface WriteResult {
  ok: boolean;
  message: string;
  id?: string | null;
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("lotteria", {
    preview: stagingPreviewEnabled(process.env, import.meta.env.PROD),
    sessionRoles: roles,
  });
  const org = s.memberships[0] ?? null;
  const sb = s.configured && s.user ? serverSupabase() : null;
  return { gate, org, sb };
}

type Sb = NonNullable<ReturnType<typeof serverSupabase>>;

async function readState(
  sb: Sb,
  organizationId: string,
): Promise<LotteryState | null> {
  const { data: l, error } = await sb
    .from("scd_lotteries")
    .select(LOTTERY_COLUMNS)
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !l) return null;
  const row = l as unknown as LotteryRow;
  const [series, compliance, prizes, blocks, draws, ledger] = await Promise.all(
    [
      sb
        .from("scd_lottery_series")
        .select("series,first_number,last_number")
        .eq("lottery_id", row.id),
      sb
        .from("scd_lottery_compliance")
        .select("item_code,status,protocol,done_on,note")
        .eq("lottery_id", row.id),
      sb
        .from("scd_lottery_prizes")
        .select(
          "id,rank,description,category,origin,sponsor_slug,donor_text,declared_value_cents",
        )
        .eq("lottery_id", row.id)
        .is("removed_at", null)
        .order("rank"),
      sb
        .from("scd_lottery_blocks")
        .select(
          "id,series,from_number,to_number,seller,seller_adult_confirmed,assigned_on,status,unsold,collected_cents,note",
        )
        .eq("lottery_id", row.id)
        .is("removed_at", null)
        .order("series")
        .order("from_number"),
      sb
        .from("scd_lottery_draws")
        .select("id,draw_order,series,number,state,prize_id,drawn_at")
        .eq("lottery_id", row.id)
        .order("draw_order"),
      sb
        .from("scd_lottery_ledger")
        .select("id,kind,label,amount_cents,entry_date,cancelled_at")
        .eq("lottery_id", row.id)
        .order("entry_date")
        .order("created_at"),
    ],
  );
  return toState(row, {
    series: (series.data ?? []) as SeriesRow[],
    compliance: (compliance.data ?? []) as ComplianceRow[],
    prizes: (prizes.data ?? []) as PrizeRow[],
    blocks: (blocks.data ?? []) as BlockRow[],
    draws: (draws.data ?? []) as DrawRow[],
    ledger: (ledger.data ?? []) as LedgerRow[],
  });
}

export const getLotteryBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LotteryBoard> => {
    const { gate, org, sb } = await context();
    const today = serverRomeDay(process.env, Date.now());
    const base: LotteryBoard = {
      gate,
      today,
      connected: false,
      engine: "unknown",
      actor: null,
      state: null,
      audit: [],
    };
    if (gate.view !== "page" || !sb || !org) return base;
    const engine = await lotteryEngineState(
      sb as unknown as LotteryProbeClient,
    );
    if (engine !== "applied") return { ...base, connected: true, engine };
    const actorRes = await sb.rpc("scd_lottery_actor", {
      p_organization_id: org.organizationId,
    });
    const actor: LotteryActor =
      actorRes.data === "DIREZIONE" || actorRes.data === "EDITOR"
        ? actorRes.data
        : null;
    if (!actor) return { ...base, connected: true, engine };
    const state = await readState(sb, org.organizationId);
    let audit: LotteryAuditLine[] = [];
    if (state?.id) {
      const a = await sb
        .from("scd_lottery_audit")
        .select("id,created_at,action")
        .eq("lottery_id", state.id)
        .order("created_at", { ascending: false })
        .limit(30);
      audit = (
        (a.data ?? []) as Array<{
          id: number;
          created_at: string;
          action: string;
        }>
      ).map((r) => ({ id: r.id, createdAt: r.created_at, action: r.action }));
    }
    return { ...base, connected: true, engine, actor, state, audit };
  },
);

/** Runs a write only with a page gate, a database session, r102 applied and a lottery actor. */
async function write(
  fn: (
    sb: Sb,
    organizationId: string,
    actor: Exclude<LotteryActor, null>,
  ) => Promise<WriteResult>,
): Promise<WriteResult> {
  const { gate, org, sb } = await context();
  if (gate.view !== "page" || !sb || !org)
    return { ok: false, message: "Accesso non valido." };
  if (
    (await lotteryEngineState(sb as unknown as LotteryProbeClient)) !==
    "applied"
  )
    return { ok: false, message: NOT_APPLIED_MESSAGE };
  const a = await sb.rpc("scd_lottery_actor", {
    p_organization_id: org.organizationId,
  });
  if (a.data !== "DIREZIONE" && a.data !== "EDITOR")
    return { ok: false, message: "Non hai i permessi per questa modifica." };
  return fn(sb, org.organizationId, a.data);
}

function rpcResult(
  res: { data: unknown; error: { code?: string; message: string } | null },
  okMessage: string,
): WriteResult {
  if (res.error) return { ok: false, message: explainLotteryError(res.error) };
  return {
    ok: true,
    message: okMessage,
    id: typeof res.data === "string" ? res.data : null,
  };
}

const uuid = z.string().uuid();
const dayOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const text = (max: number) => z.string().max(max);
const cents = z.number().int().min(0).max(100_000_000);

const SetupInput = z.object({
  kind: z.enum(["LOTTERIA", "TOMBOLA", "PESCA"]),
  title: text(120),
  beneficiary: text(400),
  saleFrom: dayOrNull,
  saleUntil: dayOrNull,
  drawDate: dayOrNull,
  drawTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  drawPlace: text(200),
  drawComune: text(80),
  sportDay: dayOrNull,
  sportDayPlace: text(200),
  ticketPriceCents: cents.nullable(),
  ticketsTotal: z.number().int().min(1).max(10_000_000).nullable(),
  prizesDisplayPlace: text(200),
  prizeDeliveryPlace: text(200),
  prizeDeliveryUntil: dayOrNull,
  salePoints: text(600),
  drawOrder: z.enum(["DAL_PRIMO", "DALL_ULTIMO"]).nullable(),
  goalCents: cents.nullable(),
});
const SeriesInput = z.object({
  series: z.string().max(3),
  first: z.number().int(),
  last: z.number().int(),
});

export const saveLotterySetup = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { lotteryId: string | null; setup: z.infer<typeof SetupInput> }) =>
      z.object({ lotteryId: uuid.nullable(), setup: SetupInput }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb, organizationId) => {
      // The numbering plan is saved (and checked against the tickets issued) on its own step.
      const check = checkSetup(data.setup, []);
      if (check.errors.length)
        return { ok: false, message: check.errors[0]!.message };
      const saved = await sb.rpc("scd_lottery_save_setup", {
        p_organization_id: organizationId,
        p_lottery_id: data.lotteryId,
        p_setup: data.setup,
      });
      if (saved.error)
        return { ok: false, message: explainLotteryError(saved.error) };
      return {
        ok: true,
        message: "Impostazione salvata.",
        id: typeof saved.data === "string" ? saved.data : null,
      };
    }),
  );

export const saveLotterySeries = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      lotteryId: string;
      series: Array<z.infer<typeof SeriesInput>>;
      ticketsTotal: number | null;
    }) =>
      z
        .object({
          lotteryId: uuid,
          series: z.array(SeriesInput).max(200),
          ticketsTotal: z.number().int().nullable(),
        })
        .parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) => {
      const issues = checkSeries(data.series, data.ticketsTotal);
      if (issues.length) return { ok: false, message: issues[0]!.message };
      return rpcResult(
        await sb.rpc("scd_lottery_set_series", {
          p_lottery_id: data.lotteryId,
          p_series: data.series,
        }),
        "Numerazione salvata.",
      );
    }),
  );

export const saveLotteryCompliance = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      lotteryId: string;
      code: string;
      status: string;
      protocol: string;
      doneOn: string | null;
      note: string;
    }) =>
      z
        .object({
          lotteryId: uuid,
          code: z
            .string()
            .refine((c) => COMPLIANCE_ITEMS.some((i) => i.code === c)),
          status: z.enum(
            COMPLIANCE_STATUSES as unknown as [string, ...string[]],
          ),
          protocol: text(120),
          doneOn: dayOrNull,
          note: text(400),
        })
        .parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) =>
      rpcResult(
        await sb.rpc("scd_lottery_set_compliance", {
          p_lottery_id: data.lotteryId,
          p_code: data.code,
          p_status: data.status,
          p_protocol: data.protocol,
          p_done_on: data.doneOn,
          p_note: data.note,
        }),
        "Adempimento aggiornato.",
      ),
    ),
  );

const PrizeInput = z.object({
  rank: z.number().int().min(1).max(999),
  description: text(300),
  category: z.enum(["BENE", "SERVIZIO"]),
  origin: z.enum(["DONATO", "ACQUISTATO"]),
  sponsorSlug: z
    .string()
    .regex(/^[a-z0-9-]{2,60}$/)
    .nullable(),
  donorText: text(120),
  declaredValueCents: cents.nullable(),
});

export const saveLotteryPrize = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      lotteryId: string;
      prizeId: string | null;
      prize: z.infer<typeof PrizeInput>;
    }) =>
      z
        .object({
          lotteryId: uuid,
          prizeId: uuid.nullable(),
          prize: PrizeInput,
        })
        .parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) => {
      const issues = checkPrize(data.prize);
      if (issues.length) return { ok: false, message: issues[0]!.message };
      return rpcResult(
        await sb.rpc("scd_lottery_save_prize", {
          p_lottery_id: data.lotteryId,
          p_prize_id: data.prizeId,
          p_prize: data.prize,
        }),
        "Premio salvato.",
      );
    }),
  );

export const removeLotteryPrize = createServerFn({ method: "POST" })
  .inputValidator((d: { prizeId: string }) =>
    z.object({ prizeId: uuid }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) =>
      rpcResult(
        await sb.rpc("scd_lottery_remove_prize", { p_prize_id: data.prizeId }),
        "Premio tolto.",
      ),
    ),
  );

const RangeInput = z.object({
  from: z.number().int().min(1),
  to: z.number().int().min(1),
});
const BlockInput = z.object({
  series: z.string().max(3),
  from: z.number().int().min(1),
  to: z.number().int().min(1),
  seller: text(80),
  sellerAdultConfirmed: z.boolean(),
  assignedOn: dayOrNull,
  status: z.enum(["ASSEGNATO", "RESTITUITO", "NON_RESTITUITO"]),
  unsold: z.array(RangeInput).max(500),
  collectedCents: cents.nullable(),
  note: text(300),
});

export const saveLotteryBlock = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      lotteryId: string;
      blockId: string | null;
      block: z.infer<typeof BlockInput>;
    }) =>
      z
        .object({
          lotteryId: uuid,
          blockId: uuid.nullable(),
          block: BlockInput,
        })
        .parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb, organizationId) => {
      const current = await readState(sb, organizationId);
      if (!current || current.id !== data.lotteryId)
        return {
          ok: false,
          message: "Iniziativa non trovata: ricarica la pagina.",
        };
      const issues = checkBlock(
        { ...data.block, ...(data.blockId ? { id: data.blockId } : {}) },
        current.series,
        current.blocks,
      );
      if (issues.length) return { ok: false, message: issues[0]!.message };
      return rpcResult(
        await sb.rpc("scd_lottery_save_block", {
          p_lottery_id: data.lotteryId,
          p_block_id: data.blockId,
          p_block: data.block,
        }),
        "Blocco salvato.",
      );
    }),
  );

export const removeLotteryBlock = createServerFn({ method: "POST" })
  .inputValidator((d: { blockId: string }) =>
    z.object({ blockId: uuid }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) =>
      rpcResult(
        await sb.rpc("scd_lottery_remove_block", { p_block_id: data.blockId }),
        "Blocco tolto.",
      ),
    ),
  );

export const recordLotteryDraw = createServerFn({ method: "POST" })
  .inputValidator((d: { lotteryId: string; series: string; number: number }) =>
    z
      .object({
        lotteryId: uuid,
        series: z.string().regex(/^[A-Z]{1,3}$/),
        number: z.number().int().min(1).max(10_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) =>
      rpcResult(
        await sb.rpc("scd_lottery_record_draw", {
          p_lottery_id: data.lotteryId,
          p_series: data.series,
          p_number: data.number,
        }),
        "Estrazione registrata.",
      ),
    ),
  );

export const undoLotteryDraw = createServerFn({ method: "POST" })
  .inputValidator((d: { lotteryId: string }) =>
    z.object({ lotteryId: uuid }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) =>
      rpcResult(
        await sb.rpc("scd_lottery_undo_last_draw", {
          p_lottery_id: data.lotteryId,
        }),
        "Ultima registrazione annullata.",
      ),
    ),
  );

export const addLotteryLedger = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      lotteryId: string;
      kind: "INCASSO" | "COSTO";
      label: string;
      amountCents: number;
      entryDate: string;
    }) =>
      z
        .object({
          lotteryId: uuid,
          kind: z.enum(["INCASSO", "COSTO"]),
          label: text(200),
          amountCents: cents,
          entryDate: z.string(),
        })
        .parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) => {
      const issues = checkLedgerEntry(data);
      if (issues.length) return { ok: false, message: issues[0]!.message };
      return rpcResult(
        await sb.rpc("scd_lottery_add_ledger", {
          p_lottery_id: data.lotteryId,
          p_kind: data.kind,
          p_label: data.label.trim(),
          p_amount_cents: data.amountCents,
          p_entry_date: data.entryDate,
        }),
        "Movimento registrato.",
      );
    }),
  );

export const cancelLotteryLedger = createServerFn({ method: "POST" })
  .inputValidator((d: { entryId: string; reason: string }) =>
    z.object({ entryId: uuid, reason: text(200) }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb) =>
      rpcResult(
        await sb.rpc("scd_lottery_cancel_ledger", {
          p_entry_id: data.entryId,
          p_reason: data.reason,
        }),
        "Movimento annullato.",
      ),
    ),
  );

export const setLotteryPublished = createServerFn({ method: "POST" })
  .inputValidator((d: { lotteryId: string; published: boolean }) =>
    z.object({ lotteryId: uuid, published: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb, _org, actor) => {
      if (actor !== "DIREZIONE")
        return { ok: false, message: "Solo la Direzione pubblica la pagina." };
      return rpcResult(
        await sb.rpc("scd_lottery_set_published", {
          p_lottery_id: data.lotteryId,
          p_published: data.published,
        }),
        data.published
          ? "Pagina pubblica attivata."
          : "Pagina pubblica ritirata.",
      );
    }),
  );

export const confirmLotteryWinners = createServerFn({ method: "POST" })
  .inputValidator((d: { lotteryId: string }) =>
    z.object({ lotteryId: uuid }).parse(d),
  )
  .handler(async ({ data }) =>
    write(async (sb, _org, actor) => {
      if (actor !== "DIREZIONE")
        return {
          ok: false,
          message: "Solo la Direzione conferma i numeri vincenti.",
        };
      return rpcResult(
        await sb.rpc("scd_lottery_confirm_winners", {
          p_lottery_id: data.lotteryId,
        }),
        "Numeri vincenti confermati: ora sono pubblici.",
      );
    }),
  );

export interface PublicLotteryData {
  today: string;
  lottery: PublicLottery | null;
  /** Staging preview: the page may show its structure with "da definire" for QA. */
  preview: boolean;
}

/** Public projection of the published initiative, inside its window (server Rome day). Null otherwise. */
export const getPublicLottery = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicLotteryData> => {
    const today = serverRomeDay(process.env, Date.now());
    // UD-132: the lottery stays internal; no public content, not even the staging structure preview.
    if (INTERNAL_ONLY.lottery) return { today, lottery: null, preview: false };
    const preview = stagingPreviewEnabled(process.env, import.meta.env.PROD);
    const sb = serverSupabase();
    if (!sb) return { today, lottery: null, preview };
    const res = await sb.rpc("scd_lottery_public", { p_org_slug: ORG_SLUG });
    if (res.error) return { today, lottery: null, preview };
    const lottery = parsePublicLottery(res.data);
    if (!lottery) return { today, lottery: null, preview };
    const win = publicWindow(
      { ...lotterySetupFromPublic(lottery) },
      lottery.publishedOn,
    );
    return {
      today,
      lottery: win && isInWindow(win, today) ? lottery : null,
      preview,
    };
  },
);

function lotterySetupFromPublic(p: PublicLottery) {
  return {
    kind: p.kind,
    title: p.title,
    beneficiary: p.beneficiary,
    saleFrom: p.saleFrom,
    saleUntil: p.saleUntil,
    drawDate: p.drawDate,
    drawTime: p.drawTime,
    drawPlace: p.drawPlace,
    drawComune: "",
    sportDay: p.sportDay,
    sportDayPlace: p.sportDayPlace,
    ticketPriceCents: p.ticketPriceCents,
    ticketsTotal: null,
    prizesDisplayPlace: p.prizesDisplayPlace,
    prizeDeliveryPlace: p.prizeDeliveryPlace,
    prizeDeliveryUntil: p.prizeDeliveryUntil,
    salePoints: p.salePoints,
    drawOrder: null,
    goalCents: p.funds.goalCents,
  };
}
