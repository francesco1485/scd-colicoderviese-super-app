import { useServerFn } from "@tanstack/react-start";
import { Check, CircleAlert, Send } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import { OUTCOME_LABEL, RESPONSE_LABEL, outcomeCounts, responseCounts, romeTime, validateCallupInput, type CallupResponse, type SendOutcome } from "@/lib/callups";
import { getEventCallups, sendCallups, type TeamCallup } from "@/lib/callups.functions";
import { certificateState } from "@/lib/people";
import type { RosterRow } from "@/lib/roster";

const RESPONSE_TONE: Readonly<Record<CallupResponse, ChipTone>> = { CONFIRMED: "ok", DECLINED: "crit", PENDING: "mute" };

/**
 * Call-up for one calendar match (UD-062). The mister ticks the squad, sets meeting time and place,
 * sends; families answer "Ci sarò" from their page and the answers appear here.
 * Eligibility (certificate valid on match day, FIGC registration) is enforced by the database:
 * the hints below only warn before sending.
 */
export function CallupPanel({ eventId, eventDate, defaultPlace, squad, tag }: { eventId: string; eventDate: string; defaultPlace: string; squad: RosterRow[]; tag: string }) {
  const load = useServerFn(getEventCallups);
  const send = useServerFn(sendCallups);
  const [callups, setCallups] = useState<TeamCallup[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingPlace, setMeetingPlace] = useState(defaultPlace);
  const [kitNote, setKitNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; blocked: Array<{ name: string; outcome: SendOutcome }> } | null>(null);
  const formId = useId();

  useEffect(() => {
    let alive = true;
    void load({ data: { eventId } }).then((rows) => {
      if (!alive) return;
      setCallups(rows);
      // Merge: ticks made while the saved call-ups were loading must survive.
      setPicked((prev) => new Set([...prev, ...rows.map((r) => r.athleteId)]));
      const first = rows[0];
      if (first?.meetingAt) setMeetingTime(romeTime(first.meetingAt));
      if (first?.meetingPlace) setMeetingPlace(first.meetingPlace);
      if (first?.kitNote) setKitNote(first.kitNote);
    });
    return () => {
      alive = false;
    };
  }, [eventId, load]);

  const byAthlete = useMemo(() => new Map((callups ?? []).map((c) => [c.athleteId, c])), [callups]);
  const counts = responseCounts((callups ?? []).map((c) => ({ response: c.response })));
  const errors = validateCallupInput({ date: eventDate, meetingTime, meetingPlace, kitNote, athleteIds: [...picked] });

  const toggle = (athleteId: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });

  const submit = async () => {
    if (errors.length) {
      setMessage({ ok: false, text: errors.join(" "), blocked: [] });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await send({ data: { eventId, athleteIds: [...picked], meetingTime, meetingPlace, kitNote } });
      const nameOf = new Map(squad.map((p) => [p.athleteId, p.displayName]));
      const blocked = res.outcomes.filter((o) => o.outcome !== "SENT").map((o) => ({ name: nameOf.get(o.athleteId) ?? "Atleta", outcome: o.outcome }));
      const c = outcomeCounts(res.outcomes);
      setMessage({ ok: res.ok, text: res.ok && blocked.length ? `${c.SENT} convocati, ${blocked.length} non convocabili.` : res.message, blocked });
      if (res.outcomes.length > 0) {
        const rows = await load({ data: { eventId } });
        setCallups(rows);
        setPicked(new Set(rows.map((r) => r.athleteId)));
      }
    } catch {
      setMessage({ ok: false, text: "Convocazione non inviata, riprova.", blocked: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {callups && callups.length > 0 && (
        <p className="m-0 flex flex-wrap gap-2 text-[14px]" aria-label="Risposte alla convocazione">
          <Chip tone="info">{counts.total} convocati</Chip>
          <Chip tone="ok">{counts.confirmed} ci saranno</Chip>
          {counts.declined > 0 && <Chip tone="crit">{counts.declined} non ci saranno</Chip>}
          {counts.pending > 0 && <Chip tone="mute">{counts.pending} in attesa</Chip>}
        </p>
      )}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold">Rosa {tag}: scegli i convocati</legend>
        <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
          {squad.map((p) => {
            const aid = p.athleteId;
            if (!aid) return null;
            const call = byAthlete.get(aid);
            const cert = certificateState(p.certificateExpiresAt, eventDate);
            const certWarn = cert === "scaduto" || cert === "sconosciuto";
            const figcWarn = p.registrationStatus !== "VERIFIED";
            const checked = picked.has(aid);
            return (
              <li key={p.personId} className="border-t border-[var(--in-line)] first:border-t-0">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 text-[15px]">
                  <input type="checkbox" checked={checked} onChange={() => toggle(aid)} className="scd-focus size-5 flex-none accent-[var(--scd-blue)]" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-semibold">{p.displayName}</b>
                    <span className="block text-[13px] text-[var(--in-sub)]">
                      {p.birthYear ?? "anno non indicato"}
                      {certWarn && " · certificato da verificare"}
                      {figcWarn && " · tesseramento FIGC da verificare"}
                    </span>
                  </span>
                  {call ? <Chip tone={RESPONSE_TONE[call.response]}>{RESPONSE_LABEL[call.response]}</Chip> : (certWarn || figcWarn) && <CircleAlert className="size-[18px] flex-none text-[var(--in-warn,#b45309)]" aria-label="Potrebbe non essere convocabile" />}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <form
        id={formId}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="flex flex-col gap-1 text-[14px] font-semibold">
          Ritrovo alle
          <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[14px] font-semibold">
          Luogo del ritrovo
          <input type="text" value={meetingPlace} maxLength={160} onChange={(e) => setMeetingPlace(e.target.value)} placeholder="Es. campo di Colico" className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[14px] font-semibold sm:col-span-2">
          Note per le famiglie
          <input type="text" value={kitNote} maxLength={300} onChange={(e) => setKitNote(e.target.value)} placeholder="Es. divisa blu, documento d'identità" className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal" />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={busy || picked.size === 0} className="scd-focus inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-5 text-[16px] font-semibold text-white disabled:opacity-50">
            <Send className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            {busy ? "Invio…" : `Invia convocazione (${picked.size})`}
          </button>
          <span className="text-[13.5px] text-[var(--in-sub)]">Le famiglie rispondono "Ci sarò" dalla loro pagina.</span>
        </div>
      </form>

      <div role="status" aria-live="polite">
        {message && (
          <div className={`rounded-xl border px-3 py-3 text-[14.5px] ${message.ok ? "border-[#b7e0c2] bg-[#f1faf3]" : "border-[#f1d3a5] bg-[#fff8ec]"}`}>
            <b className="flex items-center gap-2">{message.ok && <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />}{message.text}</b>
            {message.blocked.length > 0 && (
              <ul className="m-0 mt-2 list-none p-0">
                {message.blocked.map((b) => (
                  <li key={b.name} className="text-[14px]">{b.name}: {OUTCOME_LABEL[b.outcome]}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
