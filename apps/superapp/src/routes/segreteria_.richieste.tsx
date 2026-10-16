/**
 * /segreteria/richieste — request machine, first case AMICHEVOLE (UD-154). The Segreteria pastes the team's message
 * (read in the browser, never stored), corrects the draft and sends it to whoever confirms that birth-year group;
 * Direzione, Direttore Generale and Coordinatore Attività Sportiva see everything. Confirmed friendlies leave two
 * Segreteria tasks: copy the row into the Master Calendario (the only public calendar) and print the federal form.
 * Fails closed while r133 is not applied: the message reader works (pure, nothing saved), saving says "in preparazione".
 * Engines: TEMPO (no phone round-trips, prefilled form and calendar row) and PERSONE (friendlies reach the calendar).
 */
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, ClipboardCopy, FileText, MessageSquareText, Send, X } from "lucide-react";
import { createContext, useContext, useId, useMemo, useState, type ReactNode } from "react";

import { ClubPicker, type PickedClub } from "@/components/scd/ClubPicker";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { romeParts } from "@/lib/home-week";
import { parseRequestMessage, type ParsedRequest } from "@/lib/request-parser";
import {
  CHANNEL_LABEL,
  FORM_STATUS_LABEL,
  FREE_TEXT_HINT,
  MATCH_SCOPES,
  NOTICE_LABEL,
  REQUEST_CONFIRMERS,
  REQUEST_TEAMS,
  SCOPE_LABEL,
  STATUS_LABEL,
  VENUES,
  confirmBy,
  confirmerLine,
  daysLeft,
  daysLeftLabel,
  isVenue,
  itDay,
  masterCalendarRow,
  masterCalendarTsv,
  missingToSend,
  nextFormStatus,
  noticeDeadline,
  positionExists,
  teamLabel,
  whenLabel,
  type MatchScope,
  type RequestChannel,
  type RequestRow,
  type RequestStatus,
} from "@/lib/request-machine";
import {
  advanceFormStatus,
  cancelRequest,
  createRequestDraft,
  getRequestsDesk,
  markCopiedToMaster,
  sendRequest,
  updateRequestDraft,
  type RequestsDesk,
} from "@/lib/request-machine.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

const PATH = "/segreteria/richieste";

export const Route = createFileRoute("/segreteria_/richieste")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "richieste" } });
    if (gate.view !== "page") return { gate, desk: null };
    return { gate, desk: await getRequestsDesk() };
  },
  head: ({ loaderData }) => {
    const h = workAreaHead("richieste", loaderData?.gate);
    if (!loaderData?.gate || loaderData.gate.view !== "page") return h;
    return {
      meta: [
        { title: "Richieste delle squadre — SCD Dentro · S.C.D. ColicoDerviese" },
        { name: "description", content: "Amichevoli chieste dalle squadre: bozza, conferma entro 15 giorni, calendario ufficiale e modulo federale." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: RichiesteRoute,
});

function RichiesteRoute() {
  const { gate, desk } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="richieste" gate={gate}>
      {desk && (
        <R138Live.Provider value={desk.r138Live === true}>
          <RichiestePage desk={desk} />
        </R138Live.Provider>
      )}
    </WorkAreaGateView>
  );
}

/** r138 live (server-verified, RequestsDesk.r138Live): only then the direttori sportivi are shown as confirmers. */
const R138Live = createContext(false);

const STATUS_TONE: Record<RequestStatus, ChipTone> = {
  BOZZA: "mute",
  DA_CONFERMARE: "warn",
  CONFERMATA: "ok",
  RIFIUTATA: "crit",
  SCADUTA: "crit",
  ANNULLATA: "mute",
};
const pad = "px-4 pb-4 sm:px-[18px]";
const field =
  "scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] focus:border-[var(--in-focus)]";
const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[15px] font-bold";
const btnPrimary = `${btn} bg-[var(--in-info)] text-white`;
const btnGhost = `${btn} border border-[var(--in-info)] bg-white text-[var(--in-info)]`;
const btnPlain = `${btn} border border-[var(--in-line)] bg-white text-[var(--in-ink)]`;

type Flash = { ok: boolean; text: string } | null;
const openTask = (r: RequestRow) => r.status === "CONFERMATA" && (r.formStatus !== "INVIATO" || !r.calendarCopiedAt);

function RichiestePage({ desk }: { desk: RequestsDesk }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RequestRow | null>(null);
  // Kept here, outside the draft card, so the outcome of a save survives the reload of the list.
  const [flash, setFlash] = useState<Flash>(null);
  const live = desk.connected && desk.ready && !desk.error;
  const canWrite = live && desk.canEdit;
  const groups = useMemo(() => {
    const rows = desk.rows;
    return {
      waiting: rows.filter((r) => r.status === "DA_CONFERMARE"),
      drafts: rows.filter((r) => r.status === "BOZZA"),
      tasks: rows.filter(openTask),
      closed: rows.filter((r) => !["DA_CONFERMARE", "BOZZA"].includes(r.status) && !openTask(r)),
    };
  }, [desk.rows]);
  const refresh = () => router.invalidate();
  const listProps = { canWrite, nowMs: desk.serverNow, onEdit: setEditing, onChanged: refresh };

  return (
    <WorkAreaShell
      id="richieste"
      title="Richieste delle squadre"
      path={PATH}
      preview={desk.gate.preview}
      editable
      status={live ? <Chip tone="ok">Richieste attive</Chip> : <Chip tone="warn">Funzione in preparazione</Chip>}
      highlights={[
        { value: live ? groups.waiting.length : null, label: "da confermare" },
        { value: live ? groups.drafts.length : null, label: "bozze" },
        { value: live ? groups.tasks.length : null, label: "da fare in Segreteria" },
      ]}
      note={<>Oggi: amichevoli. Poi tornei, pulmino, campo e visite con lo stesso percorso.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]" data-testid="richieste-page">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {!live && (
            <Card title="Stato">
              <div className={pad}>
                {!desk.connected ? (
                  <EmptyState title="Funzione in preparazione">
                    Collegamento al database non attivo per questo accesso. Il lettore del messaggio qui sotto funziona già, ma non salva nulla.
                  </EmptyState>
                ) : desk.error ? (
                  <EmptyState title="Lettura non riuscita">{desk.error}</EmptyState>
                ) : (
                  <EmptyState title="Funzione in preparazione">
                    Le richieste vanno ancora attivate nel database dalla Direzione (migrazione r133). Il lettore del messaggio funziona già, ma non salva nulla.
                  </EmptyState>
                )}
              </div>
            </Card>
          )}
          {flash && (
            <p className={`m-0 rounded-[12px] border px-4 py-3 text-[15px] font-semibold ${flash.ok ? "border-[#bfe5cf] bg-[#eefaf3] text-[var(--in-ok)]" : "border-[#f3c4bf] bg-[#fdf0ef] text-[var(--in-crit)]"}`} role={flash.ok ? "status" : "alert"} data-testid="request-flash">
              {flash.text}
            </p>
          )}
          <DraftCard
            key={editing?.id ?? "new"}
            canWrite={canWrite}
            editing={editing}
            onSaved={(f) => {
              setFlash(f);
              setEditing(null);
              refresh();
            }}
            onError={setFlash}
            onCancelEdit={() => setEditing(null)}
          />
          <RequestList title="Da confermare" sub="Aspettano la risposta di chi conferma la squadra. Se la modifichi torna in bozza." rows={groups.waiting} empty="Nessuna richiesta in attesa." {...listProps} />
          <RequestList title="Bozze" sub="Da completare e mandare a chi conferma." rows={groups.drafts} empty="Nessuna bozza." {...listProps} />
          <RequestList title="Da fare in Segreteria" sub="Amichevoli confermate: copia la riga nel Master Calendario, stampa il modulo, fallo firmare e mandalo." rows={groups.tasks} empty="Niente in sospeso." {...listProps} />
          {groups.closed.length > 0 && (
            <details className="in-card rounded-[var(--in-radius,16px)] border border-[var(--in-line)] bg-white">
              <summary className="scd-focus flex min-h-11 cursor-pointer items-center px-4 text-[16px] font-bold sm:px-[18px]">Chiuse e archiviate ({groups.closed.length})</summary>
              <ul className="m-0 list-none p-0">
                {groups.closed.map((r) => (
                  <RequestItem key={r.id} r={r} {...listProps} canWrite={canWrite && r.status === "CONFERMATA"} />
                ))}
              </ul>
            </details>
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-[18px]">
          <Card title="Chi conferma" sub="Stagione 2026/27, per fascia d'annata.">
            <ul className="m-0 list-none p-0">
              {REQUEST_CONFIRMERS.map((c) => (
                <li key={c.id} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                  <b className="block text-[15px]">{c.label}</b>
                  <span className="block text-[14px] text-[var(--in-sub)]">
                    {c.groups.map((g) => teamLabel(g)).join(", ")}
                    {c.birthYears ? ` · annate ${c.birthYears[0]}–${c.birthYears[1]}` : ""}
                  </span>
                  {!positionExists(c.position, desk.r138Live === true) && (
                    <span className="mt-1 block text-[13.5px] font-semibold text-[var(--in-warn)]">Ruolo non ancora attivo: conferma la Direzione.</span>
                  )}
                </li>
              ))}
              <li className="border-t border-[var(--in-line)] px-4 py-3 text-[14px] text-[var(--in-sub)] sm:px-[18px]">
                Direttore Generale e Coordinatore Attività Sportiva vedono tutto e sono sempre informati qui nell'app. La Direzione può confermare per tutti.
              </li>
            </ul>
          </Card>
          <Card title="Novità" sub="Ultimi passaggi, solo nell'app.">
            <div className={pad}>
              {desk.notices.length === 0 ? (
                <p className="m-0 text-[14.5px] text-[var(--in-sub)]">{live ? "Nessuna novità negli ultimi 30 giorni." : "Disponibili quando la funzione è attiva."}</p>
              ) : (
                <ul className="m-0 grid list-none gap-2 p-0">
                  {desk.notices.slice(0, 12).map((n, i) => (
                    <li key={`${n.requestId}-${n.at}-${i}`} className="text-[14.5px] leading-snug">
                      <b>{NOTICE_LABEL[n.action] ?? n.action}</b> · {teamLabel(n.teamKey)}
                      {n.opponent ? ` – ${n.opponent}` : ""}
                      <span className="block text-[13px] text-[var(--in-sub)]">{whenLabel(n.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <SourcesBox id="richieste" />
        </aside>
      </div>
    </WorkAreaShell>
  );
}

/* ------------------------------------------------------------------ list */

interface ListProps {
  canWrite: boolean;
  nowMs: number;
  onEdit: (r: RequestRow) => void;
  onChanged: () => void;
}

function RequestList({ title, sub, rows, empty, ...rest }: ListProps & { title: string; sub: string; rows: RequestRow[]; empty: string }) {
  return (
    <Card title={title} sub={sub} aside={<Chip tone={rows.length ? "info" : "mute"}>{rows.length}</Chip>}>
      {rows.length === 0 ? (
        <p className={`${pad} m-0 text-[14.5px] text-[var(--in-sub)]`}>{empty}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((r) => (
            <RequestItem key={r.id} r={r} {...rest} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RequestItem({ r, canWrite, nowMs, onEdit, onChanged }: ListProps & { r: RequestRow }) {
  const r138 = useContext(R138Live);
  const send = useServerFn(sendRequest);
  const cancel = useServerFn(cancelRequest);
  const advance = useServerFn(advanceFormStatus);
  const copied = useServerFn(markCopiedToMaster);
  const [msg, setMsg] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const opponent = r.club?.name ?? r.opponentText ?? "avversaria da indicare";
  const day = r.startsAt ? romeParts(r.startsAt)?.date ?? null : null;
  const federal = noticeDeadline(r.teamKey, r.scope, day);
  const by = confirmBy(r.expiresAt, federal);
  const left = daysLeft(r.expiresAt, nowMs);
  const missing = missingToSend(r);
  const next = nextFormStatus(r.formStatus);

  async function run(p: Promise<{ ok: boolean; message: string }>) {
    setBusy(true);
    try {
      const o = await p;
      setMsg({ ok: o.ok, text: o.message });
      if (o.ok) onChanged();
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita, riprova." });
    } finally {
      setBusy(false);
      setAskCancel(false);
    }
  }

  return (
    <li className="border-t border-[var(--in-line)] px-4 py-3.5 sm:px-[18px]" data-testid="request-item">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <b className="block text-[16px] leading-snug">
            Amichevole {teamLabel(r.teamKey)} – {opponent}
          </b>
          <span className="block text-[14.5px] text-[var(--in-sub)]">
            {whenLabel(r.startsAt)} · {r.homeAway === "FUORI" ? `fuori casa${r.club?.city ? ` (${r.club.city})` : ""}` : r.venue ?? "campo da indicare"}
          </span>
        </div>
        <Chip tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Chip>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip tone="mute">{CHANNEL_LABEL[r.channel]}</Chip>
        {r.status === "DA_CONFERMARE" && (
          <Chip tone={left !== null && left <= 3 ? "crit" : "warn"}>
            {by.day ? `Conferma entro ${itDay(by.day)}` : "Termine non noto"} · {daysLeftLabel(left)}
          </Chip>
        )}
        {r.status === "CONFERMATA" && <Chip tone={r.calendarCopiedAt ? "ok" : "warn"}>{r.calendarCopiedAt ? "Nel Master Calendario" : "Da copiare nel Master Calendario"}</Chip>}
        {r.status === "CONFERMATA" && r.formStatus && <Chip tone={r.formStatus === "INVIATO" ? "ok" : "info"}>{FORM_STATUS_LABEL[r.formStatus]}</Chip>}
        {r.status === "BOZZA" && missing.length > 0 && <Chip tone="warn">Manca: {missing.join(", ")}</Chip>}
      </div>
      {(r.status === "BOZZA" || r.status === "DA_CONFERMARE") && (
        <p className="mt-1.5 text-[13.5px] text-[var(--in-sub)]">
          {confirmerLine(r.teamKey, r138)} · {federal.text}
        </p>
      )}
      {r.decisionNote && <p className="mt-1.5 text-[14px]">Nota: {r.decisionNote}</p>}
      {canWrite && r.status === "CONFERMATA" && !r.calendarCopiedAt && <MasterRow r={r} busy={busy} onDone={() => void run(copied({ data: { id: r.id } }))} />}
      {canWrite && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {r.status === "BOZZA" && (
            <button type="button" disabled={busy || missing.length > 0} onClick={() => void run(send({ data: { id: r.id } }))} className={`${btnPrimary} disabled:opacity-50`}>
              <Send className="size-4" aria-hidden="true" />
              Manda a chi conferma
            </button>
          )}
          {(r.status === "BOZZA" || r.status === "DA_CONFERMARE") && (
            <button type="button" onClick={() => onEdit(r)} className={btnGhost}>
              Modifica
            </button>
          )}
          {r.status === "CONFERMATA" && (
            <>
              <Link to="/segreteria/richieste/$id/modulo" params={{ id: r.id }} className={btnPrimary} data-testid="request-form-link">
                <FileText className="size-4" aria-hidden="true" />
                Modulo da stampare
              </Link>
              {next && (
                <button type="button" disabled={busy} onClick={() => void run(advance({ data: { id: r.id, to: next } }))} className={btnGhost}>
                  Segna: {FORM_STATUS_LABEL[next].replace("Modulo ", "")}
                </button>
              )}
            </>
          )}
          {(r.status === "BOZZA" || r.status === "DA_CONFERMARE" || r.status === "CONFERMATA") &&
            (askCancel ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">{r.status === "CONFERMATA" ? "Annullare l'amichevole già confermata?" : "Annullare la richiesta?"}</span>
                <button type="button" disabled={busy} onClick={() => void run(cancel({ data: { id: r.id } }))} className={`${btn} bg-[var(--in-crit)] text-white`}>
                  Sì, annulla
                </button>
                <button type="button" onClick={() => setAskCancel(false)} className={btnPlain}>
                  No
                </button>
              </span>
            ) : (
              <button type="button" disabled={busy} onClick={() => setAskCancel(true)} className={btnPlain}>
                <X className="size-4" aria-hidden="true" />
                Annulla
              </button>
            ))}
        </div>
      )}
      {msg && (
        <p className={`mt-2 text-[14px] font-semibold ${msg.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
    </li>
  );
}

/** Segreteria task: the exact row to paste into the Master Calendario, then "Fatto". */
function MasterRow({ r, busy, onDone }: { r: RequestRow; busy: boolean; onDone: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const cells = masterCalendarRow(r);
  // Columns event_of() of tools/sync/calendar_public_payload.py needs to publish the row.
  const missing = cells.filter((c) => ["EVENT_ID", "DATE", "CATEGORY", "HOME_AWAY", "OPPONENT_EVENT"].includes(c.column) && !c.value).map((c) => c.column);
  async function copy() {
    try {
      await navigator.clipboard.writeText(masterCalendarTsv(r));
      setCopied("Riga copiata: incollala nel foglio Master Calendario.");
    } catch {
      setCopied("Copia non riuscita: scrivi i valori a mano.");
    }
  }
  return (
    <div className="mt-2.5 rounded-[12px] border border-[#f1dc7a] bg-[#fffbe6] p-3" data-testid="request-master-row">
      <b className="flex items-center gap-2 text-[15px]">
        <CalendarPlus className="size-4" aria-hidden="true" />
        Copia nel Master Calendario
      </b>
      <p className="mt-0.5 text-[13.5px] text-[var(--in-sub)]">È l'unico calendario pubblico: l'amichevole compare alle famiglie solo da lì. Controlla ordine delle colonne e dicitura della categoria nel foglio.</p>
      <dl className="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[14px]">
        {cells.map((c) => (
          <div key={c.column} className="contents">
            <dt className="font-mono text-[12.5px] text-[var(--in-sub)]">{c.column}</dt>
            <dd className="m-0 break-words font-semibold">{c.value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={missing.length > 0} onClick={() => void copy()} className={`${btnGhost} disabled:opacity-50`}>
          <ClipboardCopy className="size-4" aria-hidden="true" />
          Copia la riga
        </button>
        <button type="button" disabled={busy} onClick={onDone} className={btnPrimary}>
          Fatto, è nel Master
        </button>
      </div>
      {missing.length > 0 && (
        <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--in-crit)]" role="status">
          Riga incompleta ({missing.join(", ")}): correggi la richiesta prima di copiarla.
        </p>
      )}
      {copied && (
        <p className="mt-1.5 text-[13.5px]" role="status">
          {copied}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ "Nuova da messaggio" + draft editor */

interface DraftState {
  teamKey: string;
  date: string;
  time: string;
  venue: string;
  homeAway: "" | "CASA" | "FUORI";
  scope: "" | MatchScope;
  opponentText: string;
  note: string;
}

function fromParsed(p: ParsedRequest): DraftState {
  return {
    teamKey: p.teamKey ?? "",
    date: p.date ?? "",
    time: p.time ?? "",
    venue: p.homeAway !== "FUORI" && isVenue(p.venue) ? p.venue : "",
    homeAway: p.homeAway ?? "",
    scope: "",
    opponentText: p.opponent ?? "",
    note: "",
  };
}

function fromRow(r: RequestRow): DraftState {
  const p = r.startsAt ? romeParts(r.startsAt) : null;
  return {
    teamKey: r.teamKey ?? "",
    date: p?.date ?? "",
    time: p?.time ?? "",
    venue: r.venue ?? "",
    homeAway: r.homeAway ?? "",
    scope: r.scope ?? "",
    opponentText: r.opponentText ?? "",
    note: r.note ?? "",
  };
}

function DraftCard({
  canWrite,
  editing,
  onSaved,
  onError,
  onCancelEdit,
}: {
  canWrite: boolean;
  editing: RequestRow | null;
  onSaved: (f: Flash) => void;
  onError: (f: Flash) => void;
  onCancelEdit: () => void;
}) {
  const r138 = useContext(R138Live);
  const create = useServerFn(createRequestDraft);
  const update = useServerFn(updateRequestDraft);
  const send = useServerFn(sendRequest);
  const id = useId();
  const [channel, setChannel] = useState<RequestChannel>("WHATSAPP");
  // The team's message lives only in this browser tab: it is never sent to the server.
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(editing ? fromRow(editing) : null);
  const [club, setClub] = useState<PickedClub | null>(editing?.club ? { id: editing.club.id, name: editing.club.name, city: editing.club.city } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function read() {
    const p = parseRequestMessage(text, new Date());
    setParsed(p);
    setDraft(fromParsed(p));
    setClub(null);
    setErrors({});
    onError(null);
  }

  async function save(andSend: boolean) {
    if (!draft) return;
    setBusy(true);
    const payload = {
      teamKey: draft.teamKey || null,
      date: draft.date || null,
      time: draft.time || null,
      venue: draft.homeAway === "FUORI" ? null : draft.venue || null,
      homeAway: draft.homeAway || null,
      scope: draft.scope || null,
      opponentText: draft.opponentText || club?.name || null,
      opponentClubId: club?.id ?? null,
      note: draft.note || null,
    };
    try {
      const o = editing ? await update({ data: { id: editing.id, ...payload } }) : await create({ data: { channel, ...payload } });
      setErrors(o.errors ?? {});
      if (!o.ok) {
        onError({ ok: false, text: o.message });
        return;
      }
      const reqId = editing?.id ?? o.id;
      let flash: Flash = { ok: true, text: o.message };
      if (andSend && reqId) {
        const s = await send({ data: { id: reqId } });
        flash = { ok: s.ok, text: s.ok ? s.message : `Bozza salvata, ma non inviata: ${s.message}` };
      }
      setText("");
      setParsed(null);
      setDraft(null);
      setClub(null);
      onSaved(flash);
    } catch {
      onError({ ok: false, text: "Operazione non riuscita, riprova." });
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof DraftState) => (v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const day = draft?.date || null;
  const federal = draft ? noticeDeadline(draft.teamKey || null, (draft.scope || null) as MatchScope | null, day) : null;

  return (
    <Card
      id="nuova-richiesta"
      title={editing ? "Modifica richiesta" : "Nuova da messaggio"}
      sub={editing ? (editing.status === "DA_CONFERMARE" ? "Salvando torna in bozza: va rimandata a chi conferma." : "Correggi i dati e salva.") : "Incolla il messaggio della squadra: l'app prepara la bozza, tu la correggi."}
    >
      <div className={`${pad} grid gap-3`}>
        {!editing && (
          <>
            <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <label className="grid content-start gap-1 text-[14px] font-semibold text-[var(--in-sub)]">
                Arrivato da
                <select className={field} value={channel} onChange={(e) => setChannel(e.target.value as RequestChannel)}>
                  {(["WHATSAPP", "EMAIL", "SEGRETERIA"] as const).map((c) => (
                    <option key={c} value={c}>
                      {CHANNEL_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${id}-msg`} className="grid content-start gap-1 text-[14px] font-semibold text-[var(--in-sub)]">
                Messaggio
                <textarea
                  id={`${id}-msg`}
                  value={text}
                  maxLength={1000}
                  rows={3}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="es. amichevole U15 sabato 24 ore 15 a Colico con Olginatese"
                  className="scd-focus w-full rounded-[10px] border border-[var(--in-line)] bg-white p-3 text-[15px] leading-snug text-[var(--in-ink)]"
                  aria-describedby={`${id}-msg-hint`}
                  data-testid="request-message"
                />
                <span className="flex flex-wrap justify-between gap-2 text-[13px] font-normal">
                  <span id={`${id}-msg-hint`} className="font-semibold text-[var(--in-warn)]">
                    {FREE_TEXT_HINT}
                  </span>
                  <span>{text.length}/1000</span>
                </span>
              </label>
            </div>
            <button type="button" onClick={read} disabled={text.trim().length < 3} className={`${btnPrimary} justify-self-start disabled:opacity-50`} data-testid="request-read">
              <MessageSquareText className="size-4" aria-hidden="true" />
              Leggi il messaggio
            </button>
          </>
        )}
        {parsed && parsed.warnings.length > 0 && (
          <ul className="m-0 grid list-none gap-1 rounded-[10px] border border-[#f1dc7a] bg-[#fffbe6] p-3 text-[14px]" aria-label="Da controllare" data-testid="request-warnings">
            {parsed.warnings.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        )}
        {draft && (
          <div className="grid gap-3" data-testid="request-draft">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Squadra" error={errors["teamKey"]}>
                <select className={field} value={draft.teamKey} onChange={(e) => set("teamKey")(e.target.value)}>
                  <option value="">Da indicare</option>
                  {REQUEST_TEAMS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Carattere della gara" error={errors["scope"]}>
                <select className={field} value={draft.scope} onChange={(e) => set("scope")(e.target.value)}>
                  <option value="">Regionale / provinciale / locale</option>
                  {MATCH_SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data" error={errors["date"]}>
                <input type="date" className={field} value={draft.date} onChange={(e) => set("date")(e.target.value)} />
              </Field>
              <Field label="Ora" error={errors["time"]}>
                <input type="time" className={field} value={draft.time} onChange={(e) => set("time")(e.target.value)} />
              </Field>
              <fieldset className="m-0 grid gap-1 border-0 p-0">
                <legend className="mb-1 text-[14px] font-semibold text-[var(--in-sub)]">Casa o fuori</legend>
                <div className="flex gap-2">
                  {(["CASA", "FUORI"] as const).map((h) => (
                    <label
                      key={h}
                      className={`inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] border text-[15px] font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--in-focus)] ${draft.homeAway === h ? "border-[var(--in-info)] bg-[var(--in-info-bg)] text-[var(--in-info)]" : "border-[var(--in-line)] bg-white"}`}
                    >
                      <input type="radio" name={`${id}-ha`} className="sr-only" checked={draft.homeAway === h} onChange={() => set("homeAway")(h)} />
                      {h === "CASA" ? "In casa" : "Fuori casa"}
                    </label>
                  ))}
                </div>
              </fieldset>
              {draft.homeAway === "FUORI" ? (
                <p className="m-0 self-end text-[14px] text-[var(--in-sub)]">Fuori casa: il campo è quello della società avversaria.</p>
              ) : (
                <Field label="Campo del club" error={errors["venue"]}>
                  <select className={field} value={draft.venue} onChange={(e) => set("venue")(e.target.value)}>
                    <option value="">Da indicare</option>
                    {VENUES.map((v) => (
                      <option key={v} value={v}>
                        {v === "Colico" ? "Colico (campo da definire)" : v}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <Field label="Avversaria come scritta nel messaggio">
              <input className={field} value={draft.opponentText} maxLength={120} onChange={(e) => set("opponentText")(e.target.value)} />
            </Field>
            {canWrite ? (
              <ClubPicker value={club} onChange={setClub} initialQuery={draft.opponentText} label="Società avversaria (facoltativa ora, obbligatoria alla conferma)" />
            ) : (
              <p className="m-0 text-[14px] text-[var(--in-sub)]">La ricerca delle società si attiva con la funzione.</p>
            )}
            <Field label="Nota per chi conferma (facoltativa, niente nomi di ragazzi né telefoni)">
              <input className={field} value={draft.note} maxLength={300} onChange={(e) => set("note")(e.target.value)} />
            </Field>
            <p className="m-0 text-[14px] text-[var(--in-sub)]">
              {confirmerLine(draft.teamKey || null, r138)}
              {federal ? ` · ${federal.text}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {canWrite ? (
                <>
                  <button type="button" disabled={busy} onClick={() => void save(true)} className={btnPrimary} data-testid="request-save-send">
                    <Send className="size-4" aria-hidden="true" />
                    {editing?.status === "DA_CONFERMARE" ? "Salva e rimanda a chi conferma" : "Salva e manda a chi conferma"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void save(false)} className={btnGhost}>
                    {editing ? "Salva in bozza" : "Salva bozza"}
                  </button>
                </>
              ) : (
                <PendingButton reason="Funzione in preparazione: si attiva con la migrazione r133">Salva bozza</PendingButton>
              )}
              {editing && (
                <button type="button" onClick={onCancelEdit} className={btnPlain}>
                  Chiudi
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1 text-[14px] font-semibold text-[var(--in-sub)]">
      {label}
      {children}
      {error && (
        <span className="text-[13.5px] font-semibold text-[var(--in-crit)]" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
