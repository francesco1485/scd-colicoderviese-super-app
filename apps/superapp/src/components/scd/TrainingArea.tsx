import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Image as ImageIcon, Lightbulb, Lock, Plus, Video } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton } from "@/components/scd/work-area-ui";
import { romeDay, romeTime } from "@/lib/callups";
import type { TrainingSession as QuadroSession } from "@/lib/public-snapshots";
import {
  AREA_ALLENAMENTI_LIVE,
  ATTENDANCE,
  ATTENDANCE_LABEL,
  DRILL_AUDIENCE,
  DRILL_AUDIENCE_LABEL,
  LIVE_RULES,
  NOT_LIVE_TEXT,
  REASON_LABEL,
  SESSION_STATUS_LABEL,
  hhmm,
  nextDateFor,
  romeInstant,
  sessionProblems,
  type AttendanceStatus,
  type DrillAudience,
  type SessionDraft,
} from "@/lib/team-area";
import {
  archiveDrill,
  getAttendance,
  getDrills,
  getTrainings,
  openDrillImage,
  recordAttendance,
  saveDrill,
  saveTraining,
  type AttendanceRow,
  type Drill,
  type TrainingSession,
} from "@/lib/team-area.functions";
import { weekdayKey } from "@/lib/training-view";

const inputCls = "scd-focus w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] leading-snug";
const btnPrimary = "scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white disabled:opacity-60";
const btnGhost = "scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-60";

function isoDay(offset: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offset * 86_400_000));
}

/** Before «applica r118»: what the area will do, disabled, plus the live rules. */
export function TrainingAreaNotLive() {
  return (
    <div className="flex flex-col gap-3" data-panel="area-allenamenti-off">
      <p className="m-0 flex items-start gap-2 rounded-xl bg-[#fffbe6] px-3 py-3 text-[14.5px] leading-snug">
        <Lock className="mt-0.5 size-4 flex-none text-[var(--in-warn)]" aria-hidden="true" />
        <span><b>In arrivo (serve r118).</b> {NOT_LIVE_TEXT.allenamenti}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <PendingButton reason="Serve l'aggiornamento r118 del database">Nuovo allenamento</PendingButton>
        <PendingButton reason="Serve l'aggiornamento r118 del database">Presenti, assenti, giustificati</PendingButton>
        <PendingButton reason="Serve l'aggiornamento r118 del database">Dinamiche di gioco</PendingButton>
        <PendingButton reason="Serve l'aggiornamento r118 del database">Collegamento live (Google Meet)</PendingButton>
      </div>
      <p className="m-0 text-[13.5px] text-[var(--in-sub)]">{LIVE_RULES}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ sessions */

export function SessionsBoard({ teamCode, tag, quadro }: { teamCode: string; tag: string; quadro: readonly QuadroSession[] }) {
  const load = useServerFn(getTrainings);
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "error">("loading");
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [editing, setEditing] = useState<TrainingSession | "new" | null>(null);
  const [attendanceOf, setAttendanceOf] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await load({ data: { teamCode, from: isoDay(-28), to: isoDay(28) } });
      setSessions(r.sessions);
      setState(r.state === "ok" ? "ok" : r.state === "forbidden" || r.state === "signed-out" ? "forbidden" : "error");
    } catch {
      setState("error");
    }
  }, [load, teamCode]);
  useEffect(() => {
    if (AREA_ALLENAMENTI_LIVE) void reload();
  }, [reload]);

  if (!AREA_ALLENAMENTI_LIVE) return <TrainingAreaNotLive />;
  if (state === "loading") return <p className="m-0 text-[14px] text-[var(--in-sub)]" role="status">Carico gli allenamenti…</p>;
  if (state !== "ok") {
    return (
      <EmptyState title={state === "forbidden" ? `Non sei nello staff della ${tag}` : "Dati non disponibili"}>
        {state === "forbidden" ? "Sedute e presenze le gestiscono lo staff della squadra, la Segreteria e la Direzione." : "Lettura non riuscita, riprova tra poco."}
      </EmptyState>
    );
  }
  const now = Date.now();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnPrimary} onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" />Nuovo allenamento</button>
        <span className="text-[13.5px] text-[var(--in-sub)]">Ultime e prossime 4 settimane.</span>
      </div>
      {editing && (
        <SessionForm key={editing === "new" ? "new" : editing.id} teamCode={teamCode} quadro={quadro} session={editing === "new" ? null : editing}
          onDone={async () => { setEditing(null); await reload(); }} onCancel={() => setEditing(null)} />
      )}
      {sessions.length === 0 ? (
        <EmptyState title="Nessun allenamento registrato">Crea la seduta dal quadro settimanale o a mano: poi segni le presenze.</EmptyState>
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
          {sessions.map((s) => {
            const past = Date.parse(s.startsAt) <= now;
            return (
              <li key={s.id} className="border-t border-[var(--in-line)] px-3 py-3 text-[14.5px] first:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarDays className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
                  <b>{romeDay(s.startsAt)}, {romeTime(s.startsAt)}</b>
                  <span className="text-[var(--in-sub)]">{s.duration}′{s.field ? ` · ${s.field}` : ""}</span>
                  <Chip tone={s.status === "DONE" ? "ok" : s.status === "CANCELLED" ? "warn" : "info"}>{SESSION_STATUS_LABEL[s.status]}</Chip>
                  {s.meetingUrl && <Chip tone="info"><Video className="size-3.5" aria-hidden="true" />Live</Chip>}
                  {past && s.status !== "CANCELLED" && (s.recorded ? <Chip tone="ok">Presenti {s.present} · assenti {s.absent} · giustificati {s.justified}</Chip> : <Chip tone="warn">Presenze da segnare</Chip>)}
                  {!past && s.notices > 0 && <Chip tone="warn">{s.notices} assenze avvisate</Chip>}
                </div>
                {s.theme && <p className="m-0 mt-1">Tema: {s.theme}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={btnGhost} onClick={() => setEditing(s)}>Modifica</button>
                  {s.status !== "CANCELLED" && (
                    <button type="button" className={btnGhost} onClick={() => setAttendanceOf(attendanceOf === s.id ? null : s.id)} aria-expanded={attendanceOf === s.id}>
                      {past ? "Presenze" : "Chi ha avvisato"}
                    </button>
                  )}
                </div>
                {attendanceOf === s.id && <AttendanceEditor sessionId={s.id} editable={past} onSaved={reload} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SessionForm({ teamCode, quadro, session, onDone, onCancel }: { teamCode: string; quadro: readonly QuadroSession[]; session: TrainingSession | null; onDone: () => Promise<void>; onCancel: () => void }) {
  const save = useServerFn(saveTraining);
  const id = useId();
  const start = session ? new Date(session.startsAt) : null;
  const [d, setD] = useState<SessionDraft>({
    date: start ? isoOf(start) : isoDay(0),
    time: start ? romeTime(session!.startsAt) : "18:00",
    duration: session?.duration ?? 90,
    field: session?.field ?? "",
    theme: session?.theme ?? "",
    coachNotes: session?.coachNotes ?? "",
    sharedNote: session?.sharedNote ?? "",
    meetingUrl: session?.meetingUrl ?? "",
    liveNote: session?.liveNote ?? "",
  });
  const [status, setStatus] = useState<TrainingSession["status"]>(session?.status ?? "PLANNED");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const problems = useMemo(() => sessionProblems(d), [d]);
  const set = <K extends keyof SessionDraft>(k: K, v: SessionDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const fromQuadro = (idx: string) => {
    const q = quadro[Number(idx)];
    if (!q) return;
    const date = nextDateFor(isoDay(0), q.day, weekdayKey);
    setD((x) => ({ ...x, ...(date ? { date } : {}), time: hhmm(q.start), field: q.field === "C1" ? "Campo 1" : "Campo 2" }));
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (problems.length) {
      setMsg({ ok: false, text: problems.join(" ") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({
        data: {
          ...(session ? { id: session.id } : {}),
          teamCode, startsAt: romeInstant(d.date, d.time), duration: d.duration, field: d.field, theme: d.theme,
          coachNotes: d.coachNotes, sharedNote: d.sharedNote, meetingUrl: d.meetingUrl, liveNote: d.liveNote, status,
        },
      });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) await onDone();
    } catch {
      setMsg({ ok: false, text: "Salvataggio non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 rounded-xl border border-[var(--in-line)] bg-[#f7fbff] p-3" aria-label={session ? "Modifica allenamento" : "Nuovo allenamento"}>
      {!session && quadro.length > 0 && (
        <label className="flex flex-col gap-1 text-[14px] font-semibold">
          Dal quadro settimanale
          <select defaultValue="" onChange={(e) => fromQuadro(e.target.value)} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal">
            <option value="" disabled>Scegli una seduta del quadro</option>
            {quadro.map((q, i) => <option key={`${q.day}-${q.start}-${q.field}`} value={i}>{q.day.charAt(0) + q.day.slice(1).toLowerCase()} {q.timeLabel} · {q.field === "C1" ? "Campo 1" : "Campo 2"}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Giorno<input type="date" value={d.date} onChange={(e) => set("date", e.target.value)} className={`${inputCls} h-11`} /></label>
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Ora<input type="time" value={d.time} onChange={(e) => set("time", e.target.value)} className={`${inputCls} h-11`} /></label>
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Minuti<input type="number" min={15} max={240} value={d.duration} onChange={(e) => set("duration", Number(e.target.value))} className={`${inputCls} h-11`} /></label>
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Campo<input value={d.field} maxLength={80} onChange={(e) => set("field", e.target.value)} className={`${inputCls} h-11`} placeholder="Campo 1" /></label>
      </div>
      <label className="flex flex-col gap-1 text-[14px] font-semibold">Tema<input value={d.theme} maxLength={200} onChange={(e) => set("theme", e.target.value)} className={`${inputCls} h-11`} placeholder="Es. possesso palla e transizioni" /></label>
      <label htmlFor={`${id}-cn`} className="text-[14px] font-semibold">Appunti del mister <span className="font-normal text-[var(--in-sub)]">(li vede solo lo staff della squadra)</span></label>
      <textarea id={`${id}-cn`} rows={3} value={d.coachNotes} maxLength={2000} onChange={(e) => set("coachNotes", e.target.value)} className={inputCls} placeholder="Niente dati di salute." />
      <label htmlFor={`${id}-sn`} className="text-[14px] font-semibold">Nota per ragazzi e famiglie <span className="font-normal text-[var(--in-sub)]">(la vede la squadra)</span></label>
      <textarea id={`${id}-sn`} rows={2} value={d.sharedNote} maxLength={1000} onChange={(e) => set("sharedNote", e.target.value)} className={inputCls} placeholder="Es. portare la pettorina, obiettivo della settimana" />
      <fieldset className="m-0 rounded-[10px] border border-[var(--in-line)] bg-white p-3">
        <legend className="px-1 text-[14px] font-semibold">Live o videoconferenza (facoltativo)</legend>
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Link Google Meet<input value={d.meetingUrl} maxLength={80} onChange={(e) => set("meetingUrl", e.target.value)} className={`${inputCls} h-11`} placeholder="https://meet.google.com/abc-defg-hij" inputMode="url" /></label>
        <label className="mt-2 flex flex-col gap-1 text-[14px] font-semibold">Avviso per la squadra<input value={d.liveNote} maxLength={300} onChange={(e) => set("liveNote", e.target.value)} className={`${inputCls} h-11`} placeholder="Es. giovedì alle 21 rivediamo il pressing" /></label>
        <p className="m-0 mt-2 text-[13px] text-[var(--in-sub)]">{LIVE_RULES}</p>
      </fieldset>
      {session && (
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Stato
          <select value={status} onChange={(e) => setStatus(e.target.value as TrainingSession["status"])} className="scd-focus h-11 max-w-[240px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal">
            {(["PLANNED", "DONE", "CANCELLED"] as const).map((s) => <option key={s} value={s}>{SESSION_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>Salva</button>
        <button type="button" onClick={onCancel} className={btnGhost}>Annulla</button>
        <span role="status" aria-live="polite" className={`text-[14px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</span>
      </div>
    </form>
  );
}

function isoOf(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function AttendanceEditor({ sessionId, editable, onSaved }: { sessionId: string; editable: boolean; onSaved: () => Promise<void> }) {
  const load = useServerFn(getAttendance);
  const save = useServerFn(recordAttendance);
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);
  const [marks, setMarks] = useState<Record<string, { status: AttendanceStatus; reason: string }>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void load({ data: { sessionId } }).then((r) => {
      if (!alive) return;
      setRows(r.rows);
      setMarks(Object.fromEntries(r.rows.map((x) => [x.athleteId, { status: x.status ?? (x.noticeCode ? "GIUSTIFICATO" : "PRESENTE"), reason: x.reason || (x.noticeCode ? REASON_LABEL[x.noticeCode] : "") }])));
    }).catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [load, sessionId]);

  if (!rows) return <p className="m-0 mt-2 text-[14px] text-[var(--in-sub)]" role="status">Carico la rosa…</p>;
  if (rows.length === 0) return <p className="m-0 mt-2 text-[14px] text-[var(--in-sub)]">Nessun atleta in rosa per questa squadra.</p>;
  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({ data: { sessionId, rows: rows.map((x) => ({ athleteId: x.athleteId, status: marks[x.athleteId]?.status ?? "PRESENTE", reason: marks[x.athleteId]?.reason ?? "" })) } });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) await onSaved();
    } catch {
      setMsg({ ok: false, text: "Presenze non salvate, riprova." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 flex flex-col gap-2">
      <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0" aria-label="Presenze">
        {rows.map((x) => {
          const m = marks[x.athleteId] ?? { status: "PRESENTE" as AttendanceStatus, reason: "" };
          return (
            <li key={x.athleteId} className="flex flex-wrap items-center gap-2 border-t border-[var(--in-line)] px-3 py-2 first:border-t-0">
              <span className="min-w-[150px] flex-1">
                <b className="block">{x.displayName}</b>
                {x.noticeCode && <span className="block text-[12.5px] text-[var(--in-warn)]">Ha avvisato: {REASON_LABEL[x.noticeCode]}{x.noticeNote ? ` — ${x.noticeNote}` : ""}</span>}
              </span>
              {editable ? (
                <span role="radiogroup" aria-label={`Presenza di ${x.displayName}`} className="flex flex-wrap gap-1">
                  {ATTENDANCE.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={m.status === s}
                      onClick={() => setMarks((p) => ({ ...p, [x.athleteId]: { ...m, status: s } }))}
                      className={`scd-focus inline-flex h-10 items-center rounded-[10px] border px-3 text-[14px] font-semibold ${m.status === s ? (s === "PRESENTE" ? "border-[#0f7a28] bg-[#e7f6ea] text-[#0f7a28]" : s === "GIUSTIFICATO" ? "border-[var(--in-info)] bg-[var(--in-info-bg)] text-[var(--in-info)]" : "border-[#9a1d14] bg-[#fdecea] text-[#9a1d14]") : "border-[var(--in-line)] bg-white"}`}>
                      {ATTENDANCE_LABEL[s]}
                    </button>
                  ))}
                </span>
              ) : (
                x.status && <Chip tone="info">{ATTENDANCE_LABEL[x.status]}</Chip>
              )}
              {editable && m.status !== "PRESENTE" && (
                <input value={m.reason} maxLength={140} onChange={(e) => setMarks((p) => ({ ...p, [x.athleteId]: { ...m, reason: e.target.value } }))}
                  aria-label={`Motivo per ${x.displayName}`} placeholder="Motivo (niente dati di salute)" className="scd-focus h-10 min-w-[200px] flex-1 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px]" />
              )}
            </li>
          );
        })}
      </ul>
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void submit()} className={btnPrimary}>Salva presenze</button>
          <span role="status" aria-live="polite" className={`text-[14px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ drills */

export function DrillsBoard({ teamCode }: { teamCode: string }) {
  const load = useServerFn(getDrills);
  const save = useServerFn(saveDrill);
  const archive = useServerFn(archiveDrill);
  const openImg = useServerFn(openDrillImage);
  const [drills, setDrills] = useState<Drill[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<DrillAudience>("STAFF_SQUADRA");
  const [image, setImage] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  const reload = useCallback(async () => {
    try {
      const r = await load({ data: { teamCode } });
      setDrills(r.state === "ok" ? r.drills : []);
    } catch {
      setDrills([]);
    }
  }, [load, teamCode]);
  useEffect(() => {
    if (AREA_ALLENAMENTI_LIVE) void reload();
  }, [reload]);

  if (!AREA_ALLENAMENTI_LIVE) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("teamCode", teamCode);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("audience", audience);
      if (image) fd.set("image", image);
      const r = await save({ data: fd });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setTitle("");
        setDescription("");
        setImage(null);
        await reload();
      }
    } catch {
      setMsg({ ok: false, text: "Salvataggio non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card id="all-dinamiche" title="Dinamiche di gioco" sub="Esercizi e situazioni da allenare: per lo staff, per tutto il club o da condividere con la squadra.">
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 rounded-xl border border-[var(--in-line)] bg-[#f7fbff] p-3" aria-label="Nuova dinamica">
          <label className="flex flex-col gap-1 text-[14px] font-semibold">Titolo<input value={title} minLength={3} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} h-11`} required /></label>
          <label htmlFor={`${id}-d`} className="text-[14px] font-semibold">Descrizione</label>
          <textarea id={`${id}-d`} rows={3} value={description} maxLength={3000} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Spazi, numero di giocatori, regole, varianti" />
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[14px] font-semibold">Chi la vede
              <select value={audience} onChange={(e) => setAudience(e.target.value as DrillAudience)} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal">
                {DRILL_AUDIENCE.map((a) => <option key={a} value={a}>{DRILL_AUDIENCE_LABEL[a]}</option>)}
              </select>
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[14px] font-semibold">Disegno o foto della lavagna (facoltativo, solo staff)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 py-2 text-[14px] font-normal" />
            </label>
          </div>
          <p className="m-0 text-[13px] text-[var(--in-sub)]">Nelle immagini niente volti di ragazzi. La lavagna da disegnare nell'app arriva nella fase 2.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={busy || title.trim().length < 3} className={btnPrimary}><Lightbulb className="size-4" aria-hidden="true" />Salva la dinamica</button>
            <span role="status" aria-live="polite" className={`text-[14px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</span>
          </div>
        </form>
        {drills && drills.length === 0 && <EmptyState title="Ancora nessuna dinamica">La prima che salvi compare qui.</EmptyState>}
        {drills && drills.length > 0 && (
          <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
            {drills.map((d) => (
              <li key={d.id} className="border-t border-[var(--in-line)] px-3 py-3 text-[14.5px] first:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="min-w-0 flex-1">{d.title}</b>
                  <Chip tone={d.audience === "SQUADRA" ? "ok" : "info"}>{DRILL_AUDIENCE_LABEL[d.audience]}</Chip>
                </div>
                {d.description && <p className="m-0 mt-1 whitespace-pre-line">{d.description}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.hasImage && (
                    <button type="button" className={btnGhost} onClick={() => void openImg({ data: { drillId: d.id } }).then((r) => (r.url ? window.open(r.url, "_blank", "noopener,noreferrer") : setMsg({ ok: false, text: r.message })))}>
                      <ImageIcon className="size-4" aria-hidden="true" />Vedi l'immagine
                    </button>
                  )}
                  {d.mine && (
                    <button type="button" className={btnGhost} onClick={() => void archive({ data: { drillId: d.id } }).then(async (r) => { setMsg({ ok: r.ok, text: r.message }); if (r.ok) await reload(); })}>Archivia</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
