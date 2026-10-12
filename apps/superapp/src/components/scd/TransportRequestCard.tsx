import { useServerFn } from "@tanstack/react-start";
import { Bus } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { titleCase, venueCase } from "@/lib/board-data";
import type { FamilyMember } from "@/lib/roster.functions";
import {
  DIRECTIONS,
  DIRECTION_LABEL,
  REQUEST_LABEL,
  stopLabel,
  type AwayMatch,
  type Direction,
  type MyRequest,
  type RequestState,
  type StopOption,
} from "@/lib/transport-requests";
import { cancelTransportRequest, requestTransport } from "@/lib/transport-requests.functions";

const TONE: Readonly<Record<RequestState, ChipTone>> = { RICHIESTA: "warn", CONFERMATA: "ok", NON_POSSIBILE: "crit", ANNULLATA: "mute" };
const btnMain = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

function dayLabel(date: string, time: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
  return time ? `${day}, ore ${time}` : day;
}

/**
 * Pulmino per le trasferte (r84): for each person of the family circle, the next away matches of their team from the
 * official calendar copy; the family asks a seat with stop and direction, and sees the office's answer here.
 */
export function TransportRequestCard({ members, matches, requests, stops }: { members: FamilyMember[]; matches: AwayMatch[]; requests: MyRequest[]; stops: StopOption[] }) {
  const [items, setItems] = useState(requests);
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => members.flatMap((m) => matches
    .filter((x) => m.teamCodes.includes(x.teamCode))
    .map((x) => ({ key: `${m.personId}:${x.eventId}`, member: m, match: x, request: items.find((r) => r.personId === m.personId && r.eventId === x.eventId) ?? null })))
    .sort((a, b) => (a.match.date + a.match.time).localeCompare(b.match.date + b.match.time)), [members, matches, items]);

  return (
    <Card id="fam-pulmino" title="Pulmino per le trasferte" sub="Le prossime partite fuori casa delle squadre dei tuoi ragazzi. Chiedi il posto: il responsabile trasporti conferma qui.">
      <div className="flex flex-col gap-2 px-4 pb-4 sm:px-[18px]" data-testid="fam-pulmino">
        {rows.length === 0 ? (
          <EmptyState title="Nessuna trasferta nelle prossime tre settimane">
            Quando la squadra gioca fuori casa, la partita compare qui e puoi chiedere il pulmino.
          </EmptyState>
        ) : rows.map(({ key, member, match, request }) => {
          const active = request && request.status !== "ANNULLATA" ? request : null;
          return (
            <article key={key} className="rounded-xl border border-[var(--in-line)] bg-white p-3" aria-label={`Trasferta di ${member.displayName}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 text-[13px] font-semibold text-[var(--in-sub)]">{member.displayName}</p>
                  <h3 className="m-0 text-[16px] font-bold leading-snug">contro {match.opponent ? titleCase(match.opponent) : "avversaria da definire"}</h3>
                  <p className="m-0 text-[14px] text-[var(--in-sub)]">{dayLabel(match.date, match.time)}{match.venue ? ` · ${venueCase(match.venue)}` : ""}</p>
                </div>
                {active && <Chip tone={TONE[active.status]}>{REQUEST_LABEL[active.status]}</Chip>}
              </div>
              {active && (
                <p className="m-0 mt-1.5 text-[14px]">
                  {DIRECTION_LABEL[active.direction]}{active.stop ? ` · fermata ${active.stop}` : ""}
                  {active.decisionNote ? <span className="block text-[var(--in-sub)]">Risposta: {active.decisionNote}</span> : null}
                </p>
              )}
              {open === key ? (
                <RequestForm member={member} match={match} current={active} stops={stops}
                  onClose={() => setOpen(null)}
                  onSaved={(r) => { setItems((prev) => [...prev.filter((x) => x.id !== r.id && !(x.personId === r.personId && x.eventId === r.eventId)), r]); setOpen(null); }} />
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(!active || active.status === "RICHIESTA" || active.status === "NON_POSSIBILE") && (
                    <button type="button" className={active ? btnGhost : btnMain} onClick={() => setOpen(key)}>
                      <Bus className="size-4" aria-hidden="true" />{active ? "Modifica la richiesta" : "Chiedi il pulmino"}
                    </button>
                  )}
                  {active && <CancelButton request={active} onCancelled={() => setItems((prev) => prev.map((x) => (x.id === active.id ? { ...x, status: "ANNULLATA" } : x)))} />}
                </div>
              )}
            </article>
          );
        })}
        <p className="m-0 text-[13px] text-[var(--in-sub)]">La richiesta non è ancora il posto: lo conferma il responsabile trasporti in base a pulmini, autisti e posti liberi.</p>
      </div>
    </Card>
  );
}

function RequestForm({ member, match, current, stops, onClose, onSaved }: {
  member: FamilyMember; match: AwayMatch; current: MyRequest | null; stops: StopOption[];
  onClose: () => void; onSaved: (r: MyRequest) => void;
}) {
  const [direction, setDirection] = useState<Direction>(current?.direction ?? "ANDATA_RITORNO");
  const [stopId, setStopId] = useState<string>(current?.stopId ?? "");
  const [note, setNote] = useState(current?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const send = useServerFn(requestTransport);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const out = await send({ data: {
        personId: member.personId, eventId: match.eventId, date: match.date, teamCode: match.teamCode,
        event: `${match.opponent} · ${match.date}`.slice(0, 160), direction, stopId: stopId || null, note: note.trim() || undefined,
      } });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok && out.id) {
        const stop = stops.find((s) => s.id === stopId);
        onSaved({ id: out.id, eventId: match.eventId, date: match.date, teamCode: match.teamCode, event: null, personId: member.personId,
          direction, stopId: stopId || null, stop: stop ? stopLabel(stop) : null, note: note.trim() || null, status: "RICHIESTA", decisionNote: null });
      }
    } catch {
      setMsg({ ok: false, text: "Richiesta non inviata, riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-3 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
        <legend className="mb-1 text-[13.5px] font-semibold">Viaggio</legend>
        {DIRECTIONS.map((d) => (
          <label key={d} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-[14.5px] ${direction === d ? "border-[#0860A8] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"}`}>
            <input type="radio" name="direzione" value={d} checked={direction === d} onChange={() => setDirection(d)} />
            {DIRECTION_LABEL[d]}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-[13.5px] font-semibold">Fermata</span>
        <select value={stopId} onChange={(e) => setStopId(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]">
          <option value="">{stops.length ? "Scegli la fermata" : "Fermate non ancora caricate: lo dirai al responsabile"}</option>
          {stops.map((s) => <option key={s.id} value={s.id}>{stopLabel(s)}{s.line ? ` (${s.line})` : ""}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[13.5px] font-semibold">Nota per il responsabile (facoltativa)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="h-11 rounded-[10px] border border-[var(--in-line)] px-3 text-[15px]" />
      </label>
      {msg && <p role="status" className={`m-0 rounded-[10px] px-3 py-2 text-[14px] ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btnMain}>{current ? "Aggiorna la richiesta" : "Invia la richiesta"}</button>
        <button type="button" disabled={busy} onClick={onClose} className={btnGhost}>Chiudi</button>
      </div>
    </form>
  );
}

function CancelButton({ request, onCancelled }: { request: MyRequest; onCancelled: () => void }) {
  const cancel = useServerFn(cancelTransportRequest);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button type="button" disabled={busy} className={btnGhost} onClick={() => {
        setBusy(true);
        void cancel({ data: { id: request.id } })
          .then((o) => { setMsg(o.message); if (o.ok) onCancelled(); })
          .catch(() => setMsg("Annullamento non riuscito, riprova."))
          .finally(() => setBusy(false));
      }}>Non serve più</button>
      {msg && <span role="status" className="self-center text-[13.5px] text-[var(--in-sub)]">{msg}</span>}
    </>
  );
}
