import { createFileRoute } from "@tanstack/react-router";

import { LotteryBackOffice } from "@/components/lottery/LotteryBackOffice";
import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { getLotteryBoard } from "@/lib/lottery.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Lotteria dello sport (Direzione 14/10/2026, UD-115): back office for Direzione and Tesoreria. Same work-area gate as
 * the other reserved pages; writes only after r102 is applied (until then: local simulation, nothing saved).
 */
export const Route = createFileRoute("/direzione_/lotteria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "lotteria" } });
    // The board decides the gate again on the server; nothing is read for a visitor without access.
    const board = gate.view === "page" ? await getLotteryBoard() : null;
    return { gate, board, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => workAreaHead("lotteria", loaderData?.gate),
  component: LotteriaRoute,
});

function LotteriaRoute() {
  const { gate, board } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="lotteria" gate={gate}>
      {board && board.gate.view === "page" && (
        <LotteryBackOffice board={board} />
      )}
    </WorkAreaGateView>
  );
}
