import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { DIRECTION_LABEL, REQUEST_LABEL, TRANSPORT_ACK_LIVE, groupByEvent, type OfficeRequest, type RequestState } from "@/lib/transport-requests";
import { decideTransportRequest } from "@/lib/transport-requests.functions";
import { TRANSPORT_OFFICE, TRANSPORT_OFFICE_BACKUP } from "@/lib/transport";

const TONE: Readonly<Record<RequestState, ChipTone>> = { RICHIESTA: "warn", CONFERMATA: "ok", NON_POSSIBILE: "crit", ANNULLATA: "mute" };

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * Richieste delle famiglie per le trasferte (r84), for the transport office: grouped by match, with the stop and the
 * direction asked. Confirming does not place the child on a van: the seat is planned on the trip.
 */
export function TransportRequestsOffice({ initial }: { initial: OfficeRequest[] }) {
  const [items, setItems] = useState(initial);
  const groups = useMemo(() => groupByEvent(items), [items]);
  const waiting = items.filter((r) => r.status === "RICHIESTA").length;

  return (
    <Card id="pul-richieste" title="Richieste delle famiglie" sub={waiting ? `${waiting} da gestire: conferma o rispondi "non possibile" con il motivo. Decide il ${TRANSPORT_OFFICE}.` : `Le famiglie chiedono il posto dalla loro area per ogni trasferta; decide il ${TRANSPORT_OFFICE}.`}>
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]" data-testid="pul-richieste">
        {groups.length === 0 ? (
          <EmptyState title="Nessuna richiesta">Quando una famiglia chiede il pulmino per una trasferta, la richiesta compare qui.</EmptyState>
        ) : groups.map((g) => (
          <section key={g.eventId} className="rounded-xl border border-[var(--in-line)] bg-white" aria-label={`Richieste per ${g.event ?? g.eventId}`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--in-line)] px-3 py-2">
              <b className="text-[15px]">{dayLabel(g.date)} · {g.teamCode.toUpperCase()}{g.event ? ` · ${g.event.split(" · ")[0]}` : ""}</b>
              <span className="text-[13.5px] tabular-nums text-[var(--in-sub)]">{g.confirmed} confermati · {g.waiting} da gestire</span>
            </header>
            <ul className="m-0 list-none p-0">
              {g.items.map((r) => (
                <Row key={r.id} r={r} onDecided={(status, note) => setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, status, decisionNote: note } : x)))} />
              ))}
            </ul>
          </section>
        ))}
        <p className="m-0 text-[13px] text-[var(--in-sub)]">Nome e iniziale del cognome, visibili solo al {TRANSPORT_OFFICE} e, in sua assenza, a {TRANSPORT_OFFICE_BACKUP}. Il posto sul pulmino si assegna nella corsa.</p>
      </div>
    </Card>
  );
}

function Row({ r, onDecided }: { r: OfficeRequest; onDecided: (s: RequestState, note: string | null) => void }) {
  const decide = useServerFn(decideTransportRequest);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function run(decision: "CONFERMATA" | "NON_POSSIBILE") {
    setBusy(true);
    setMsg(null);
    try {
      const out = await decide({ data: { id: r.id, decision, note: note.trim() || undefined } });
      setMsg(out.message);
      if (out.ok) onDecided(decision, note.trim() || null);
    } catch {
      setMsg("Operazione non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="flex flex-col gap-2 border-t border-[var(--in-line)] px-3 py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <b className="block text-[15px]">{r.name}</b>
          <span className="block text-[13.5px] text-[var(--in-sub)]">{DIRECTION_LABEL[r.direction]}{r.stop ? ` · ${r.stop}` : " · fermata da chiedere"}{r.note ? ` · "${r.note}"` : ""}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Chip tone={TONE[r.status]}>{REQUEST_LABEL[r.status]}</Chip>
          {TRANSPORT_ACK_LIVE && r.status === "CONFERMATA" && <Chip tone={r.acknowledged ? "ok" : "mute"}>{r.acknowledged ? "presa visione" : "attesa presa visione"}</Chip>}
        </span>
      </div>
      {r.status !== "ANNULLATA" && r.status !== "CONFERMATA" && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Motivo (serve per 'non possibile')" aria-label={`Motivo per ${r.name}`}
            className="h-11 w-full min-w-0 rounded-[10px] border border-[var(--in-line)] px-3 text-[14.5px] sm:w-auto sm:flex-1" />
          <button type="button" disabled={busy} onClick={() => void run("CONFERMATA")} className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-[#0f7a28] px-3 text-[14.5px] font-semibold text-white disabled:opacity-50">
            <Check className="size-4" aria-hidden="true" />Conferma
          </button>
          <button type="button" disabled={busy || note.trim() === ""} onClick={() => void run("NON_POSSIBILE")} className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-[#b42318] bg-white px-3 text-[14.5px] font-semibold text-[#9a1d14] disabled:opacity-50">
            <X className="size-4" aria-hidden="true" />Non possibile
          </button>
        </div>
      )}
      {r.decisionNote && <span className="text-[13.5px] text-[var(--in-sub)]">Risposta: {r.decisionNote}</span>}
      {msg && <span role="status" className="text-[13.5px] text-[var(--in-sub)]">{msg}</span>}
    </li>
  );
}
