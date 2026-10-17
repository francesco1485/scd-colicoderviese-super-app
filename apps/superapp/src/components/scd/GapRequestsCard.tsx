import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { AREA_ALLENAMENTI_LIVE, AREA_PARTITE_LIVE } from "@/lib/team-area";
import { answerGapRequest, getMyGapRequests, type GapRequest } from "@/lib/team-area.functions";
import { monthLabel } from "@/lib/monthly-check";

const STATUS_TEXT: Readonly<Record<GapRequest["status"], string>> = {
  OPEN: "Da fare",
  INTEGRATED: "Integrato",
  JUSTIFIED: "Giustificato",
  CLOSED: "Chiuso dalla Segreteria",
};

/**
 * «Richieste di integrazione o giustificazione» of the caller's teams (r118): the Segreteria created them after the
 * monthly check; the team staff completes the missing item in the app («Fatto, l'ho integrato») or explains why
 * («Giustifica»). Renders nothing until r117 + r118 are applied, or when there is nothing to answer.
 */
export function GapRequestsCard({ teamCode }: { teamCode?: string }) {
  const load = useServerFn(getMyGapRequests);
  const [rows, setRows] = useState<GapRequest[]>([]);
  const reload = useCallback(async () => {
    try {
      const r = await load();
      setRows(r.state === "ok" ? r.rows : []);
    } catch {
      setRows([]);
    }
  }, [load]);
  useEffect(() => {
    if (AREA_PARTITE_LIVE && AREA_ALLENAMENTI_LIVE) void reload();
  }, [reload]);

  const shown = rows.filter((r) => !teamCode || r.teamCode === teamCode);
  if (!AREA_PARTITE_LIVE || !AREA_ALLENAMENTI_LIVE || shown.length === 0) return null;
  const open = shown.filter((r) => r.status === "OPEN").length;
  return (
    <Card id="mis-richieste" title="Richieste della Segreteria" sub="Dalla verifica mensile: completa quello che manca o spiega perché." aside={open ? <Chip tone="warn">{open} da fare</Chip> : <Chip tone="ok">Tutto risposto</Chip>}>
      <ul className="m-0 list-none p-0">
        {shown.map((r) => <Row key={r.id} r={r} onDone={reload} />)}
      </ul>
    </Card>
  );
}

function Row({ r, onDone }: { r: GapRequest; onDone: () => Promise<void> }) {
  const answer = useServerFn(answerGapRequest);
  const [justify, setJustify] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const send = async (status: "INTEGRATED" | "JUSTIFIED") => {
    try {
      const res = await answer({ data: { requestId: r.id, status, note } });
      setMsg(res.message);
      if (res.ok) await onDone();
    } catch {
      setMsg("Non riuscito, riprova.");
    }
  };
  return (
    <li className="border-t border-[var(--in-line)] px-4 py-3 text-[14.5px] sm:px-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-semibold">{r.label}</span>
        <Chip tone={r.status === "OPEN" ? "warn" : "ok"}>{STATUS_TEXT[r.status]}</Chip>
      </div>
      <p className="m-0 text-[13px] text-[var(--in-sub)]">{r.month ? monthLabel(r.month.slice(0, 7)) : ""}{r.answerNote ? ` · ${r.answerNote}` : ""}</p>
      {r.status === "OPEN" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void send("INTEGRATED")} className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white">Fatto, l'ho integrato</button>
          {justify ? (
            <>
              <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} aria-label="Motivo della giustificazione" placeholder="Perché manca"
                className="scd-focus h-11 min-w-[220px] flex-1 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]" />
              <button type="button" onClick={() => void send("JUSTIFIED")} className="scd-focus inline-flex h-11 items-center rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold">Invia</button>
            </>
          ) : (
            <button type="button" onClick={() => setJustify(true)} className="scd-focus inline-flex h-11 items-center rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold">Giustifica</button>
          )}
        </div>
      )}
      <p role="status" aria-live="polite" className="m-0 min-h-[1em] text-[13px] text-[var(--in-sub)]">{msg}</p>
    </li>
  );
}
