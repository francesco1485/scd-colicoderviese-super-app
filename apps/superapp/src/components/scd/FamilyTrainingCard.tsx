import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Lightbulb, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { ReasonPicker } from "@/components/scd/ReasonPicker";
import { romeDay, romeTime } from "@/lib/callups";
import { AREA_ALLENAMENTI_LIVE, ATTENDANCE_LABEL, LIVE_RULES, REASON_LABEL, type ReasonCode } from "@/lib/team-area";
import { getMyTrainings, sendTrainingNotice, type MyTrainingPerson } from "@/lib/team-area.functions";

function isoDay(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * Allenamenti of the family's own children (or of the athlete): the notes the mister chose to share, the Google Meet
 * link of a «live», the child's own attendance, and an advance absence notice. Never other children's data, never
 * the mister's private notes. Renders nothing until r118 is applied (no empty pages).
 */
export function FamilyTrainingCard() {
  const load = useServerFn(getMyTrainings);
  const [people, setPeople] = useState<MyTrainingPerson[] | null>(null);
  const [drills, setDrills] = useState<Array<{ id: string; title: string; description: string; teamCode: string }>>([]);

  const reload = useCallback(async () => {
    try {
      const r = await load({ data: { from: isoDay(-14), to: isoDay(14) } });
      if (r.state === "ok") {
        setPeople(r.people);
        setDrills(r.drills);
      } else setPeople([]);
    } catch {
      setPeople([]);
    }
  }, [load]);

  useEffect(() => {
    if (AREA_ALLENAMENTI_LIVE) void reload();
  }, [reload]);

  if (!AREA_ALLENAMENTI_LIVE || !people || people.every((p) => p.sessions.length === 0 && p.season.recorded === 0) && drills.length === 0) return null;
  const now = Date.now();

  return (
    <Card id="fam-allenamenti" title="Allenamenti" sub="Quello che il mister condivide con la squadra e le presenze dei tuoi ragazzi.">
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
        {people.map((p) => (
          <section key={`${p.personId}-${p.teamCode}`} className="rounded-xl border border-[var(--in-line)] bg-white p-3" aria-label={`Allenamenti di ${p.displayName}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-[15px]">{p.displayName} · {p.teamCode.toUpperCase()}</b>
              <span className="flex flex-wrap gap-1.5">
                <Chip tone="ok">Presenze {p.season.present}</Chip>
                {p.season.justified > 0 && <Chip tone="info">Giustificate {p.season.justified}</Chip>}
                {p.season.absent > 0 && <Chip tone="warn">Assenze {p.season.absent}</Chip>}
              </span>
            </div>
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
              {p.sessions.map((s) => (
                <SessionRow key={s.id} personId={p.personId} s={s} future={Date.parse(s.startsAt) > now} onSaved={reload} />
              ))}
              {p.sessions.length === 0 && <li className="text-[14px] text-[var(--in-sub)]">Nessun allenamento registrato in queste due settimane.</li>}
            </ul>
          </section>
        ))}
        {drills.length > 0 && (
          <section aria-label="Dinamiche di gioco condivise" className="rounded-xl bg-[var(--in-info-bg)] p-3">
            <b className="flex items-center gap-2 text-[15px]"><Lightbulb className="size-4" aria-hidden="true" />Dinamiche di gioco dal mister</b>
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
              {drills.slice(0, 6).map((d) => (
                <li key={d.id} className="text-[14.5px]"><b>{d.title}</b>{d.description ? ` — ${d.description}` : ""}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}

function SessionRow({ personId, s, future, onSaved }: { personId: string; s: MyTrainingPerson["sessions"][number]; future: boolean; onSaved: () => Promise<void> }) {
  const send = useServerFn(sendTrainingNotice);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<ReasonCode>("SCUOLA");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async (c: ReasonCode | null) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await send({ data: { sessionId: s.id, personId, code: c, note: c ? note : "" } });
      setMsg(r.message);
      if (r.ok) {
        setOpen(false);
        await onSaved();
      }
    } catch {
      setMsg("Non salvato, riprova.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="border-t border-[var(--in-line)] pt-2 text-[14.5px] first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
        <span className="font-semibold">{romeDay(s.startsAt)}, {romeTime(s.startsAt)}</span>
        {s.field && <span className="text-[var(--in-sub)]">· {s.field}</span>}
        {s.status === "CANCELLED" && <Chip tone="warn">Annullato</Chip>}
        {s.myStatus && <Chip tone={s.myStatus === "PRESENTE" ? "ok" : s.myStatus === "GIUSTIFICATO" ? "info" : "warn"}>{ATTENDANCE_LABEL[s.myStatus]}</Chip>}
        {!s.myStatus && s.myNotice && <Chip tone="info">Assenza avvisata · {REASON_LABEL[s.myNotice]}</Chip>}
      </div>
      {s.theme && <p className="m-0 mt-1">Tema: {s.theme}</p>}
      {s.sharedNote && <p className="m-0 mt-1">{s.sharedNote}</p>}
      {s.meetingUrl && (
        <p className="m-0 mt-1 flex flex-wrap items-center gap-2">
          <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[var(--scd-blue)] px-3 text-[14px] font-semibold text-white">
            <Video className="size-4" aria-hidden="true" />Entra nel collegamento
            <span className="sr-only">(Google Meet, si apre in una nuova scheda)</span>
          </a>
          {s.liveNote && <span>{s.liveNote}</span>}
        </p>
      )}
      {s.meetingUrl && <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">{LIVE_RULES}</p>}
      {future && s.status !== "CANCELLED" && !s.myStatus && (
        open ? (
          <div className="mt-2 rounded-[10px] border border-[var(--in-line)] bg-[#fff8ec] p-3">
            <ReasonPicker code={code} note={note} onCode={setCode} onNote={setNote} disabled={busy} />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void submit(code)} className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-[#9a1d14] px-4 text-[15px] font-semibold text-white disabled:opacity-60">Avvisa il mister</button>
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="scd-focus inline-flex h-11 items-center rounded-[10px] px-3 text-[15px] font-semibold text-[var(--in-sub)]">Annulla</button>
            </div>
          </div>
        ) : s.myNotice ? (
          <button type="button" disabled={busy} onClick={() => void submit(null)} className="scd-focus mt-1 inline-flex h-11 items-center rounded-[10px] px-1 text-[14.5px] font-semibold text-[var(--scd-blue)] underline underline-offset-2">Ci sarà: togli l'avviso</button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="scd-focus mt-1 inline-flex h-11 items-center rounded-[10px] px-1 text-[14.5px] font-semibold text-[var(--scd-blue)] underline underline-offset-2">Avvisa un'assenza</button>
        )
      )}
      <p role="status" aria-live="polite" className="m-0 min-h-[1em] text-[13px] text-[var(--in-sub)]">{msg}</p>
    </li>
  );
}
