/**
 * One set of actions for the Lotteria back office, in two modes:
 * - "simulation" (r102 not applied, or no database session): everything happens in this browser tab's memory, with
 *   the same validation as the server; nothing is saved and a reload starts again;
 * - "live" (r102 applied): each action calls its server function (the database decides again) and reloads the page data.
 */
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  checkBlock,
  checkLedgerEntry,
  checkPrize,
  checkSeries,
  checkSetup,
  drawComplete,
  localId,
  proposeDraw,
  type ComplianceRecord,
  type LedgerKind,
  type LotterySetup,
  type LotteryState,
  type Prize,
  type SeriesRange,
  type TicketBlock,
} from "@/lib/lottery";
import {
  addLotteryLedger,
  cancelLotteryLedger,
  confirmLotteryWinners,
  recordLotteryDraw,
  removeLotteryBlock,
  removeLotteryPrize,
  saveLotteryBlock,
  saveLotteryCompliance,
  saveLotteryPrize,
  saveLotterySeries,
  saveLotterySetup,
  setLotteryPublished,
  undoLotteryDraw,
} from "@/lib/lottery.functions";

import type { ActionResult } from "./ui";

export type Mode = "simulation" | "live";

export interface LotteryActions {
  saveSetup(setup: LotterySetup): Promise<ActionResult>;
  saveSeries(series: SeriesRange[]): Promise<ActionResult>;
  saveCompliance(code: string, record: ComplianceRecord): Promise<ActionResult>;
  savePrize(prize: Prize, isNew: boolean): Promise<ActionResult>;
  removePrize(id: string): Promise<ActionResult>;
  saveBlock(block: TicketBlock, isNew: boolean): Promise<ActionResult>;
  removeBlock(id: string): Promise<ActionResult>;
  recordDraw(series: string, number: number): Promise<ActionResult>;
  undoDraw(): Promise<ActionResult>;
  addLedger(entry: {
    kind: LedgerKind;
    label: string;
    amountCents: number;
    entryDate: string;
  }): Promise<ActionResult>;
  cancelLedger(id: string, reason: string): Promise<ActionResult>;
  setPublished(published: boolean, today: string): Promise<ActionResult>;
  confirmWinners(today: string): Promise<ActionResult>;
}

const NEEDS_SETUP: ActionResult = {
  ok: false,
  message: "Salva prima l'impostazione dell'iniziativa.",
};
const DRAW_STARTED: ActionResult = {
  ok: false,
  message:
    "L'estrazione è già iniziata: impostazione, premi e registri non si cambiano più.",
};

export function useLotteryStore(mode: Mode, initial: LotteryState) {
  const [sim, setSim] = useState<LotteryState>(initial);
  const router = useRouter();
  const fns = {
    setup: useServerFn(saveLotterySetup),
    series: useServerFn(saveLotterySeries),
    compliance: useServerFn(saveLotteryCompliance),
    prize: useServerFn(saveLotteryPrize),
    removePrize: useServerFn(removeLotteryPrize),
    block: useServerFn(saveLotteryBlock),
    removeBlock: useServerFn(removeLotteryBlock),
    draw: useServerFn(recordLotteryDraw),
    undo: useServerFn(undoLotteryDraw),
    ledger: useServerFn(addLotteryLedger),
    cancel: useServerFn(cancelLotteryLedger),
    publish: useServerFn(setLotteryPublished),
    confirm: useServerFn(confirmLotteryWinners),
  };
  const state = mode === "live" ? initial : sim;

  async function live(p: Promise<ActionResult>): Promise<ActionResult> {
    const r = await p;
    if (r.ok) await router.invalidate();
    return r;
  }
  const simOk = (message: string): ActionResult => ({
    ok: true,
    message: `${message} (simulazione: non salvato)`,
  });

  const actions: LotteryActions = {
    async saveSetup(setup) {
      const check = checkSetup(setup, []);
      if (check.errors.length)
        return { ok: false, message: check.errors[0]!.message };
      if (state.draws.length) return DRAW_STARTED;
      if (
        state.blocks.length &&
        setup.ticketsTotal !== state.setup.ticketsTotal
      )
        return {
          ok: false,
          message:
            "Ci sono già blocchi assegnati: i biglietti emessi non si cambiano più.",
        };
      if (mode === "live")
        return live(fns.setup({ data: { lotteryId: state.id, setup } }));
      setSim((s) => ({ ...s, id: s.id ?? "simulazione", setup }));
      return simOk("Impostazione aggiornata");
    },
    async saveSeries(series) {
      if (!state.id) return NEEDS_SETUP;
      const issues = checkSeries(series, state.setup.ticketsTotal);
      if (issues.length) return { ok: false, message: issues[0]!.message };
      if (state.blocks.length)
        return {
          ok: false,
          message:
            "Ci sono già blocchi assegnati: la numerazione non si cambia più.",
        };
      if (mode === "live")
        return live(
          fns.series({
            data: {
              lotteryId: state.id,
              series,
              ticketsTotal: state.setup.ticketsTotal,
            },
          }),
        );
      setSim((s) => ({ ...s, series }));
      return simOk("Numerazione aggiornata");
    },
    async saveCompliance(code, record) {
      if (!state.id) return NEEDS_SETUP;
      if (mode === "live")
        return live(
          fns.compliance({
            data: {
              lotteryId: state.id,
              code,
              status: record.status,
              protocol: record.protocol,
              doneOn: record.doneOn,
              note: record.note,
            },
          }),
        );
      setSim((s) => ({
        ...s,
        compliance: { ...s.compliance, [code]: record },
      }));
      return simOk("Adempimento aggiornato");
    },
    async savePrize(prize, isNew) {
      if (!state.id) return NEEDS_SETUP;
      if (state.draws.length) return DRAW_STARTED;
      const issues = checkPrize(prize);
      if (issues.length) return { ok: false, message: issues[0]!.message };
      if (state.prizes.some((p) => p.rank === prize.rank && p.id !== prize.id))
        return {
          ok: false,
          message: `C'è già un premio in posizione ${prize.rank}.`,
        };
      if (mode === "live") {
        const { id, ...rest } = prize;
        return live(
          fns.prize({
            data: {
              lotteryId: state.id,
              prizeId: isNew ? null : id,
              prize: rest,
            },
          }),
        );
      }
      setSim((s) => ({
        ...s,
        prizes: isNew
          ? [...s.prizes, { ...prize, id: localId("premio") }]
          : s.prizes.map((p) => (p.id === prize.id ? prize : p)),
      }));
      return simOk("Premio salvato");
    },
    async removePrize(id) {
      if (state.draws.length) return DRAW_STARTED;
      if (mode === "live")
        return live(fns.removePrize({ data: { prizeId: id } }));
      setSim((s) => ({ ...s, prizes: s.prizes.filter((p) => p.id !== id) }));
      return simOk("Premio tolto");
    },
    async saveBlock(block, isNew) {
      if (!state.id) return NEEDS_SETUP;
      if (state.draws.length) return DRAW_STARTED;
      const issues = checkBlock(
        isNew ? { ...block, id: "__new__" } : block,
        state.series,
        state.blocks,
      );
      if (issues.length) return { ok: false, message: issues[0]!.message };
      if (mode === "live") {
        const { id, ...rest } = block;
        return live(
          fns.block({
            data: {
              lotteryId: state.id,
              blockId: isNew ? null : id,
              block: rest,
            },
          }),
        );
      }
      setSim((s) => ({
        ...s,
        blocks: isNew
          ? [...s.blocks, { ...block, id: localId("blocco") }]
          : s.blocks.map((b) => (b.id === block.id ? block : b)),
      }));
      return simOk("Blocco salvato");
    },
    async removeBlock(id) {
      if (state.draws.length) return DRAW_STARTED;
      if (mode === "live")
        return live(fns.removeBlock({ data: { blockId: id } }));
      setSim((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));
      return simOk("Blocco tolto");
    },
    async recordDraw(series, number) {
      if (!state.id) return NEEDS_SETUP;
      if (state.winnersConfirmedOn)
        return {
          ok: false,
          message: "I vincitori sono già confermati: l'estrazione è chiusa.",
        };
      const p = proposeDraw(
        state.series,
        state.blocks,
        state.prizes,
        state.draws,
        state.setup.drawOrder,
        series,
        number,
      );
      if (p.duplicate)
        return { ok: false, message: "Questo biglietto è già stato estratto." };
      if (
        p.state === "DA_RICONCILIARE" ||
        state.blocks.some((b) => b.status === "ASSEGNATO")
      )
        return {
          ok: false,
          message:
            "Ci sono ancora blocchi fuori: completare il ritiro dei registri prima di estrarre.",
        };
      if (p.state === "VALIDO" && !p.prize)
        return {
          ok: false,
          message: "Tutti i premi sono già stati assegnati.",
        };
      if (mode === "live")
        return live(
          fns.draw({ data: { lotteryId: state.id, series, number } }),
        );
      const at = new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      setSim((s) => ({
        ...s,
        draws: [
          ...s.draws,
          {
            id: localId("estrazione"),
            order: s.draws.length + 1,
            series,
            number,
            state: p.state,
            prizeId: p.prize?.id ?? null,
            at,
          },
        ],
      }));
      return simOk(
        p.state === "VALIDO"
          ? `Vince il ${p.prize!.rank}° premio`
          : "Estrazione registrata: si ripete",
      );
    },
    async undoDraw() {
      if (!state.id || state.draws.length === 0)
        return { ok: false, message: "Nessuna estrazione da annullare." };
      if (state.winnersConfirmedOn)
        return {
          ok: false,
          message: "I vincitori sono già confermati: l'estrazione è chiusa.",
        };
      if (mode === "live")
        return live(fns.undo({ data: { lotteryId: state.id } }));
      setSim((s) => ({ ...s, draws: s.draws.slice(0, -1) }));
      return simOk("Ultima registrazione annullata");
    },
    async addLedger(entry) {
      if (!state.id) return NEEDS_SETUP;
      const issues = checkLedgerEntry(entry);
      if (issues.length) return { ok: false, message: issues[0]!.message };
      if (mode === "live")
        return live(fns.ledger({ data: { lotteryId: state.id, ...entry } }));
      setSim((s) => ({
        ...s,
        ledger: [
          ...s.ledger,
          {
            ...entry,
            label: entry.label.trim(),
            id: localId("movimento"),
            cancelled: false,
          },
        ],
      }));
      return simOk("Movimento registrato");
    },
    async cancelLedger(id, reason) {
      if (mode === "live")
        return live(fns.cancel({ data: { entryId: id, reason } }));
      setSim((s) => ({
        ...s,
        ledger: s.ledger.map((e) =>
          e.id === id ? { ...e, cancelled: true } : e,
        ),
      }));
      return simOk("Movimento annullato");
    },
    async setPublished(published, today) {
      if (!state.id) return NEEDS_SETUP;
      const s0 = state.setup;
      if (
        published &&
        (!s0.title.trim() ||
          !s0.drawDate ||
          !s0.sportDay ||
          !s0.salePoints.trim())
      )
        return {
          ok: false,
          message:
            "Per pubblicare servono nome, data dell'estrazione, giornata dello sport e punti vendita.",
        };
      if (mode === "live")
        return live(fns.publish({ data: { lotteryId: state.id, published } }));
      setSim((s) => ({ ...s, publishedOn: published ? today : null }));
      return simOk(
        published ? "Pagina pubblica attivata" : "Pagina pubblica ritirata",
      );
    },
    async confirmWinners(today) {
      if (!state.id) return NEEDS_SETUP;
      if (!drawComplete(state.prizes, state.draws))
        return { ok: false, message: "Ci sono ancora premi da estrarre." };
      if (mode === "live")
        return live(fns.confirm({ data: { lotteryId: state.id } }));
      setSim((s) => ({ ...s, winnersConfirmedOn: today }));
      return simOk("Numeri vincenti confermati");
    },
  };
  return { state, actions };
}
