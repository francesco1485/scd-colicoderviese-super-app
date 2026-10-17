import { useServerFn } from "@tanstack/react-start";
import { FileText, Lock, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton } from "@/components/scd/work-area-ui";
import {
  AREA_PARTITE_LIVE,
  DOC_KINDS,
  DOC_LABEL,
  NOT_LIVE_TEXT,
  REASON_LABEL,
  TABELLINO_LABEL,
  documentProblems,
  fileSizeLabel,
  scoreOf,
  tabellinoState,
  type DocKind,
  type TabellinoState,
} from "@/lib/team-area";
import {
  getMatchArea,
  openMatchDocument,
  removeMatchDocument,
  saveMatchNotes,
  setOfficialResult,
  uploadMatchDocument,
  type MatchArea,
} from "@/lib/team-area.functions";

const STATE_TONE: Readonly<Record<TabellinoState, ChipTone>> = { NON_COMPILATO: "mute", PROVVISORIO: "warn", CONFERMATO: "ok", DIVERSO: "crit" };

const inputCls = "scd-focus w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] leading-snug";

/**
 * Area partite, part 2 (r117): resoconto, opponent line-up and scorers as free text, referto and distinte of both
 * teams as private files, impediments with their reason, and the «Provvisorio» state of the tabellino against the
 * official LND score typed by the Segreteria. Before «applica r117» it shows what will come, disabled.
 */
export function MatchAreaPanel({ eventId, played, heading }: { eventId: string; played: boolean; heading: string }) {
  if (!AREA_PARTITE_LIVE) return <NotLive played={played} />;
  return <LivePanel eventId={eventId} played={played} heading={heading} />;
}

function NotLive({ played }: { played: boolean }) {
  return (
    <div className="flex flex-col gap-3" data-panel="area-partite-off">
      <p className="m-0 flex items-start gap-2 rounded-xl bg-[#fffbe6] px-3 py-3 text-[14.5px] leading-snug">
        <Lock className="mt-0.5 size-4 flex-none text-[var(--in-warn)]" aria-hidden="true" />
        <span><b>In arrivo (serve r117).</b> {NOT_LIVE_TEXT.partite}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <PendingButton reason="Serve l'aggiornamento r117 del database">Scrivi il resoconto</PendingButton>
        <PendingButton reason="Serve l'aggiornamento r117 del database">Formazione e marcatori avversari</PendingButton>
        <PendingButton reason="Serve l'aggiornamento r117 del database">{played ? "Carica referto e distinte" : "Carica la distinta"}</PendingButton>
      </div>
    </div>
  );
}

function LivePanel({ eventId, played, heading }: { eventId: string; played: boolean; heading: string }) {
  const load = useServerFn(getMatchArea);
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "signed-out" | "error">("loading");
  const [area, setArea] = useState<MatchArea | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await load({ data: { eventId } });
      setArea(r.area);
      setState(r.state === "ok" ? "ok" : r.state === "forbidden" ? "forbidden" : r.state === "signed-out" ? "signed-out" : "error");
    } catch {
      setState("error");
    }
  }, [eventId, load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (state === "loading") return <p className="m-0 text-[14px] text-[var(--in-sub)]" role="status">Carico la gara…</p>;
  if (state !== "ok" || !area) {
    return (
      <EmptyState title={state === "forbidden" ? "Non è una tua squadra" : state === "signed-out" ? "Accedi" : "Dati non disponibili"}>
        {state === "forbidden"
          ? "Resoconto e documenti li gestiscono lo staff della squadra, la Segreteria e la Direzione."
          : state === "signed-out"
            ? "Accedi con il ruolo della squadra."
            : "Lettura non riuscita, riprova tra poco."}
      </EmptyState>
    );
  }

  const st = tabellinoState(area.tabellino, area.official ? scoreOf(area.official.goalsFor, area.official.goalsAgainst) : null);
  return (
    <div className="flex flex-col gap-4" data-panel="area-partite">
      <p className="m-0 text-[14px] font-semibold text-[var(--in-sub)]">{heading}</p>
      <div className="flex flex-wrap gap-2" aria-label="Stato della gara">
        <Chip tone={area.callups.sent > 0 ? "ok" : "mute"}>Convocati {area.callups.sent}{area.callups.sent ? ` · viste ${area.callups.seen}` : ""}</Chip>
        <Chip tone={area.sheetStatus === "READY" ? "ok" : area.sheetStatus === "DRAFT" ? "warn" : "mute"}>
          Distinta {area.sheetStatus === "READY" ? "pronta" : area.sheetStatus === "DRAFT" ? "in bozza" : "da fare"}
        </Chip>
        {played && <Chip tone={STATE_TONE[st]}>{TABELLINO_LABEL[st]}</Chip>}
        {played && <Chip tone={area.documents.some((d) => d.kind === "REFERTO") ? "ok" : "mute"}>Referto {area.documents.some((d) => d.kind === "REFERTO") ? "caricato" : "da caricare"}</Chip>}
      </div>
      {area.tabellino && (
        <p className="m-0 text-[14.5px]">
          Tabellino del mister: <b>{area.tabellino.goalsFor}–{area.tabellino.goalsAgainst}</b>
          {area.official ? <> · ufficiale LND: <b>{area.official.goalsFor}–{area.official.goalsAgainst}</b></> : " · risultato ufficiale non ancora registrato"}
        </p>
      )}

      {area.impediments.length > 0 && (
        <section aria-label="Impedimenti segnalati" className="rounded-xl bg-[#fff8ec] p-3">
          <b className="block text-[15px]">Impedimenti segnalati ({area.impediments.length})</b>
          <ul className="m-0 mt-1 list-none p-0 text-[14.5px]">
            {area.impediments.map((i) => (
              <li key={i.athleteId}>{i.displayName}{i.code ? ` · ${REASON_LABEL[i.code]}` : ""}{i.note ? ` — ${i.note}` : ""}</li>
            ))}
          </ul>
          <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">La convocazione resta valida: decidi tu. Nomi visibili solo allo staff della squadra.</p>
        </section>
      )}

      <NotesForm eventId={eventId} area={area} played={played} onSaved={reload} />
      <Documents eventId={eventId} area={area} played={played} onChanged={reload} />
      {played && <OfficialForm eventId={eventId} area={area} onSaved={reload} />}
    </div>
  );
}

function NotesForm({ eventId, area, played, onSaved }: { eventId: string; area: MatchArea; played: boolean; onSaved: () => Promise<void> }) {
  const save = useServerFn(saveMatchNotes);
  const id = useId();
  const [summary, setSummary] = useState(area.summary);
  const [lineup, setLineup] = useState(area.opponentLineup);
  const [scorers, setScorers] = useState(area.opponentScorers);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({ data: { eventId, summary, opponentLineup: lineup, opponentScorers: scorers } });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) await onSaved();
    } catch {
      setMsg({ ok: false, text: "Salvataggio non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2" aria-label="Resoconto e avversari">
      <label htmlFor={`${id}-sum`} className="text-[15px] font-semibold">Resoconto {played ? "" : "(dopo la gara)"}</label>
      <textarea id={`${id}-sum`} value={summary} maxLength={2000} rows={4} onChange={(e) => setSummary(e.target.value)} className={inputCls}
        placeholder="Com'è andata, cosa è funzionato, cosa migliorare. Niente dati di salute." />
      <label htmlFor={`${id}-lin`} className="text-[15px] font-semibold">Formazione avversaria</label>
      <textarea id={`${id}-lin`} value={lineup} maxLength={1500} rows={3} onChange={(e) => setLineup(e.target.value)} className={inputCls}
        placeholder="Numeri e cognomi come sulla loro distinta, oppure carica la foto qui sotto." />
      <label htmlFor={`${id}-sco`} className="text-[15px] font-semibold">Marcatori avversari</label>
      <input id={`${id}-sco`} value={scorers} maxLength={600} onChange={(e) => setScorers(e.target.value)} className={`${inputCls} h-11`} placeholder="Es. 10 (23'), 9 (71')" />
      <p className="m-0 text-[13px] text-[var(--in-sub)]">I nostri marcatori, assist, minuti e cartellini si segnano nel tabellino con la rosa. Telefoni ed e-mail scritti qui vengono tolti.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white disabled:opacity-60">Salva</button>
        <span role="status" aria-live="polite" className={`text-[14px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</span>
      </div>
    </form>
  );
}

function Documents({ eventId, area, played, onChanged }: { eventId: string; area: MatchArea; played: boolean; onChanged: () => Promise<void> }) {
  const upload = useServerFn(uploadMatchDocument);
  const open = useServerFn(openMatchDocument);
  const remove = useServerFn(removeMatchDocument);
  const id = useId();
  const [kind, setKind] = useState<DocKind>(played ? "REFERTO" : "DISTINTA_NOSTRA");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const problems = documentProblems(file);
    if (problems.length) {
      setMsg({ ok: false, text: problems.join(" ") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("eventId", eventId);
      fd.set("kind", kind);
      const r = await upload({ data: fd });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setFile(null);
        await onChanged();
      }
    } catch {
      setMsg({ ok: false, text: "Caricamento non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  };
  const view = async (docId: string) => {
    const r = await open({ data: { documentId: docId } });
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    else setMsg({ ok: false, text: r.message });
  };
  const drop = async (docId: string) => {
    const r = await remove({ data: { documentId: docId } });
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) await onChanged();
  };

  return (
    <section aria-labelledby={`${id}-t`} className="flex flex-col gap-2">
      <h3 id={`${id}-t`} className="m-0 flex items-center gap-2 text-[16px] font-bold"><Paperclip className="size-4" aria-hidden="true" />Referto e distinte</h3>
      <p className="m-0 text-[13.5px] text-[var(--in-sub)]">PDF o foto. Li vedono solo lo staff della squadra, la Segreteria e la Direzione: mai le famiglie, mai il pubblico.</p>
      {area.documents.length > 0 && (
        <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
          {area.documents.map((d) => (
            <li key={d.id} className="flex min-h-12 flex-wrap items-center gap-2 border-t border-[var(--in-line)] px-3 py-2 text-[14.5px] first:border-t-0">
              <FileText className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
              <b>{DOC_LABEL[d.kind]}</b>
              <span className="min-w-0 flex-1 truncate text-[var(--in-sub)]">{d.fileName} · {fileSizeLabel(d.size)}</span>
              <button type="button" onClick={() => void view(d.id)} className="scd-focus inline-flex h-10 items-center rounded-[10px] border border-[var(--in-line)] px-3 font-semibold">Apri</button>
              <button type="button" onClick={() => void drop(d.id)} aria-label={`Togli ${DOC_LABEL[d.kind]} ${d.fileName}`} className="scd-focus inline-flex size-10 items-center justify-center rounded-[10px] text-[var(--in-crit)]">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void send(e)} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[14px] font-semibold">
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal">
            {DOC_KINDS.map((k) => <option key={k} value={k}>{DOC_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[14px] font-semibold">
          File
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/heic,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 py-2 text-[14px] font-normal" />
        </label>
        <button type="submit" disabled={busy || !file} className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white disabled:opacity-60">Carica</button>
      </form>
      <p role="status" aria-live="polite" className={`m-0 min-h-[1.2em] text-[14px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</p>
    </section>
  );
}

function OfficialForm({ eventId, area, onSaved }: { eventId: string; area: MatchArea; onSaved: () => Promise<void> }) {
  const save = useServerFn(setOfficialResult);
  const id = useId();
  const [gf, setGf] = useState(area.official ? String(area.official.goalsFor) : "");
  const [ga, setGa] = useState(area.official ? String(area.official.goalsAgainst) : "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = gf.trim() === "" ? null : Number(gf);
    const a = ga.trim() === "" ? null : Number(ga);
    if ((f === null) !== (a === null) || (f !== null && (!Number.isInteger(f) || f < 0 || f > 30)) || (a !== null && (!Number.isInteger(a) || a < 0 || a > 30))) {
      setMsg({ ok: false, text: "Scrivi entrambi i numeri (0–30), oppure lasciali vuoti per cancellare." });
      return;
    }
    try {
      const r = await save({ data: { eventId, goalsFor: f, goalsAgainst: a } });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) await onSaved();
    } catch {
      setMsg({ ok: false, text: "Non riuscito, riprova." });
    }
  };
  return (
    <details className="rounded-xl border border-[var(--in-line)] bg-[#f7fbff] px-3 py-2">
      <summary className="cursor-pointer text-[15px] font-semibold">Risultato ufficiale LND (Segreteria e Direzione)</summary>
      <form onSubmit={(e) => void submit(e)} className="mt-2 flex flex-wrap items-end gap-2" aria-describedby={`${id}-h`}>
        <label className="flex flex-col gap-1 text-[14px] font-semibold">SCD<input inputMode="numeric" value={gf} onChange={(e) => setGf(e.target.value)} className="scd-focus h-11 w-20 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]" /></label>
        <label className="flex flex-col gap-1 text-[14px] font-semibold">Avversari<input inputMode="numeric" value={ga} onChange={(e) => setGa(e.target.value)} className="scd-focus h-11 w-20 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]" /></label>
        <button type="submit" className="scd-focus inline-flex h-11 items-center rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold">Registra</button>
      </form>
      <p id={`${id}-h`} className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">Copia il risultato dal portale LND. Finché non c'è, o se è diverso, il tabellino del mister resta «Provvisorio».</p>
      <p role="status" aria-live="polite" className={`m-0 min-h-[1.2em] text-[14px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</p>
    </details>
  );
}
