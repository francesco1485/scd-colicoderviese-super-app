import { Bus, CalendarPlus, Pencil, TriangleAlert, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { planTransportRun } from "@/lib/transport.functions";
import {
  draftErrors,
  draftFromRun,
  draftPayload,
  draftWarnings,
  emptyDraft,
  expiryTone,
  upcomingRuns,
  workQueue,
  type RunDraft,
  type TransportBoard,
  type TransportRun,
} from "@/lib/transport";

/**
 * Pulmini desk (r74, UD-076): live copy of the Master Flotta e Trasporti and the trips planned in
 * the app. Only Direzione, Segreteria and the transport manager see the planner (board.canManage);
 * the database checks the role again on every save. Service users stay counts: no names here.
 */

const itDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
const itShort = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "da inserire");
const stamp = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(iso)) : "mai";

/* ------------------------------------------------------------------ queue */

export function TransportQueueCard({ board, now }: { board: TransportBoard; now: Date }) {
  const q = workQueue(board, now);
  return (
    <Card
      id="pul-da-sistemare"
      title="Da sistemare nel Master Pulmini"
      sub="Cosa manca o è scaduto, con la scheda del foglio da aprire. Si corregge sul foglio: l'app si aggiorna con la copia automatica."
      aside={<Chip tone={q.some((i) => i.tone === "urgent") ? "crit" : q.length ? "warn" : "ok"}>{q.length === 0 ? "tutto in ordine" : `${q.length} ${q.length === 1 ? "voce" : "voci"}`}</Chip>}
    >
      {q.length === 0 ? (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Niente da sistemare">Flotta, autisti, fermate e utenti sono completi nel Master.</EmptyState>
        </div>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="transport-queue">
          {q.map((i) => (
            <li key={i.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
              <Chip tone={i.tone === "urgent" ? "crit" : i.tone === "todo" ? "warn" : "info"}>{i.tone === "urgent" ? "urgente" : i.tone === "todo" ? "da fare" : "da confermare"}</Chip>
              <span className="min-w-0 text-[15px] font-semibold leading-snug">{i.label}</span>
              <span className="col-start-2 text-[13px] text-[var(--in-sub)]">Master, scheda {i.where}</span>
            </li>
          ))}
        </ul>
      )}
      <SourceLine>Copia del Master Flotta e Trasporti: ultimo aggiornamento {stamp(board.syncedAt)}.</SourceLine>
    </Card>
  );
}

/* ------------------------------------------------------------------ fleet */

const TONE_LABEL = { crit: "scaduta", warn: "entro 30 giorni", ok: "in regola", mute: "da inserire" } as const;

function Due({ label, due, today }: { label: string; due: string | null; today: string }) {
  const t = expiryTone(due, today);
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] text-[var(--in-sub)]">{label}</dt>
      <dd className="m-0 flex flex-wrap items-center gap-1.5 text-[14.5px] font-semibold tabular-nums">
        {itShort(due)}
        {t !== "ok" && <Chip tone={t}>{TONE_LABEL[t]}</Chip>}
      </dd>
    </div>
  );
}

export function TransportFleetCard({ board, today, managers }: { board: TransportBoard; today: string; managers?: ReactNode }) {
  return (
    <Card id="pul-flotta" title="Flotta e autisti" sub="Dal Master Flotta e Trasporti, copia automatica.">
      {board.vehicles.length === 0 ? (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Nessun mezzo nella copia">Il Master non ha ancora mezzi attivi nella scheda 04 FLOTTA MEZZI.</EmptyState>
        </div>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="fleet-live">
          {board.vehicles.map((v) => (
            <li key={v.id} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Bus className="size-4 flex-none self-center text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-[16px] font-bold">{v.label}</span>
                {v.model && <span className="text-[13.5px] text-[var(--in-sub)]">{v.model}</span>}
                <span className="ml-auto text-[13.5px] font-semibold">
                  {v.seatsPassengers !== null ? `${v.seatsPassengers} posti passeggeri` : <Chip tone="warn">posti da confermare</Chip>}
                </span>
              </div>
              <dl className="m-0 mt-2 grid grid-cols-3 gap-2">
                <Due label="Assicurazione" due={v.insuranceDue} today={today} />
                <Due label="Revisione" due={v.inspectionDue} today={today} />
                <Due label="Bollo" due={v.roadTaxDue} today={today} />
              </dl>
              {!v.plate && <p className="m-0 mt-1.5 text-[13px] text-[var(--in-warn)]">Targa da inserire nel Master.</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
        <p className="m-0 mb-2 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Autisti</p>
        {board.drivers.length === 0 ? (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessun autista attivo nella copia.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="drivers-live">
            {board.drivers.map((d) => {
              const lic = expiryTone(d.licenceDue, today);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px]">
                  <span className="font-semibold">{d.name}</span>
                  {d.status && !/^ATTIVO$/i.test(d.status) && <Chip tone="warn">{d.status.toLowerCase()}</Chip>}
                  <span className="text-[13px] text-[var(--in-sub)]">
                    patente {d.licenceCategory ?? ""} {d.licenceDue ? `scade ${itShort(d.licenceDue)}` : "scadenza da inserire"}
                  </span>
                  {lic === "crit" && <Chip tone="crit">patente scaduta</Chip>}
                  {d.phone && <span className="ml-auto select-all text-[13.5px] font-semibold tabular-nums">{d.phone}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {managers}
      <SourceLine>Sul pulmino compare il nome dell'autista; i ragazzi sono figure senza nome. I telefoni li vedono solo Direzione, Segreteria e responsabile trasporti.</SourceLine>
    </Card>
  );
}

/* ---------------------------------------------------------------- planner */

const KIND_LABEL = { TRASFERTA: "Trasferta", ALLENAMENTO: "Allenamento", EXTRA: "Extra" } as const;
const STATUS_TONE = { PIANIFICATA: "warn", CONFERMATA: "ok", ANNULLATA: "mute" } as const;
const STATUS_LABEL = { PIANIFICATA: "pianificata", CONFERMATA: "confermata", ANNULLATA: "annullata" } as const;

export function TransportPlanner({
  board,
  today,
  draft,
  setDraft,
  onSaved,
}: {
  board: TransportBoard;
  today: string;
  draft: RunDraft | null;
  setDraft: (d: RunDraft | null) => void;
  /** Reloads the board after a save (the page passes router.invalidate). */
  onSaved: () => Promise<void> | void;
}) {
  const runs = upcomingRuns(board.runs, today);
  const vehicle = (id: string | null) => board.vehicles.find((v) => v.id === id)?.label ?? null;
  const driver = (id: string | null) => board.drivers.find((d) => d.id === id)?.name ?? null;
  return (
    <Card
      id="pul-organizza"
      title="Corse organizzate"
      sub={board.canManage ? "Trasferte, allenamenti ed extra: pulmino, autista e orari. Ogni salvataggio resta nello storico con il tuo nome." : "Le corse dei prossimi due mesi. Le organizzano Direzione, Segreteria e responsabile trasporti."}
      aside={
        board.canManage && !draft ? (
          <button type="button" onClick={() => setDraft(emptyDraft(today))} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[var(--in-ink)] px-4 text-[14.5px] font-bold text-white">
            <CalendarPlus className="size-4" strokeWidth={2} aria-hidden="true" />
            Nuova corsa
          </button>
        ) : (
          <Chip tone="info">{runs.length} {runs.length === 1 ? "corsa" : "corse"}</Chip>
        )
      }
    >
      {draft && board.canManage && <RunForm board={board} draft={draft} setDraft={setDraft} onSaved={onSaved} />}
      {runs.length === 0 ? (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Nessuna corsa in programma">
            {board.canManage ? "Usa \"Organizza\" su una trasferta del weekend o \"Nuova corsa\" per allenamenti ed extra." : "Quando una corsa è organizzata, qui trovi giorno, partenza, pulmino e autista."}
          </EmptyState>
        </div>
      ) : (
        <ol className="m-0 list-none p-0" data-testid="runs-live">
          {runs.map((r) => (
            <RunRow key={r.id} r={r} vehicle={vehicle(r.vehicleId)} driver={driver(r.driverId)} onEdit={board.canManage ? () => setDraft(draftFromRun(r)) : null} />
          ))}
        </ol>
      )}
      <SourceLine>Le corse si scrivono qui (la scheda 01 CORSE SERVIZI del Master è vuota). Le annullate restano nello storico.</SourceLine>
    </Card>
  );
}

function RunRow({ r, vehicle, driver, onEdit }: { r: TransportRun; vehicle: string | null; driver: string | null; onEdit: (() => void) | null }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold capitalize text-[var(--in-sub)]">{itDay(r.date)}</span>
          <span className="font-title text-[20px] font-black leading-none tabular-nums">{r.departure.slice(0, 5)}</span>
          {r.returnEstimate && <span className="text-[13.5px] text-[var(--in-sub)]">rientro {r.returnEstimate.slice(0, 5)}</span>}
          <Chip tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Chip>
          <Chip tone="mute">{KIND_LABEL[r.kind]}</Chip>
        </div>
        <p className="m-0 mt-1 text-[15.5px] font-semibold leading-snug">{r.title}</p>
        <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
          {[r.destination, r.meetingPoint && `ritrovo ${r.meetingPoint}`, vehicle ?? "pulmino da assegnare", driver ?? "autista da assegnare", r.passengers !== null ? `${r.passengers} passeggeri` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="inline-flex h-11 items-center gap-1.5 self-start rounded-full border border-[var(--in-line)] bg-white px-3.5 text-[14px] font-semibold" aria-label={`Modifica ${r.title}`}>
          <Pencil className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Modifica
        </button>
      )}
    </li>
  );
}

const inputCls = "h-11 w-full min-w-0 rounded-xl border border-[var(--in-line)] bg-white px-3 text-[15.5px]";

function Field({ label, children, hint, wide = false }: { label: string; children: (id: string) => ReactNode; hint?: string; wide?: boolean }) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-[13.5px] font-bold">{label}</label>
      {children(id)}
      {hint && <span className="text-[12.5px] text-[var(--in-sub)]">{hint}</span>}
    </div>
  );
}

function RunForm({ board, draft, setDraft, onSaved }: { board: TransportBoard; draft: RunDraft; setDraft: (d: RunDraft | null) => void; onSaved: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tried, setTried] = useState(false);
  const errors = draftErrors(draft);
  const warnings = draftWarnings(board, draft);
  const set = <K extends keyof RunDraft>(k: K, v: RunDraft[K]) => setDraft({ ...draft, [k]: v });

  async function save(status?: RunDraft["status"]) {
    const d = status ? { ...draft, status } : draft;
    setTried(true);
    if (draftErrors(d).length) return;
    setBusy(true);
    setMsg(null);
    try {
      const out = await planTransportRun({ data: draftPayload(d) });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) {
        await onSaved();
        setDraft(null);
      }
    } catch {
      setMsg({ ok: false, text: "Salvataggio non riuscito. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mx-4 mb-4 grid gap-3 rounded-2xl border border-[#b9d5ef] bg-[#f5f9ff] p-4 sm:mx-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      aria-labelledby="run-form-t"
      data-testid="run-form"
    >
      <div className="flex items-center gap-2">
        <h3 id="run-form-t" className="m-0 flex-1 text-[17px] font-bold">{draft.id ? "Modifica corsa" : "Nuova corsa"}</h3>
        <button type="button" onClick={() => setDraft(null)} className="grid size-11 place-items-center rounded-full" aria-label="Chiudi senza salvare">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Titolo" wide>{(id) => <input id={id} className={inputCls} value={draft.title} maxLength={160} onChange={(e) => set("title", e.target.value)} placeholder="Es. U16 Élite a Lecco" />}</Field>
        <Field label="Tipo">
          {(id) => (
            <select id={id} className={inputCls} value={draft.kind} onChange={(e) => set("kind", e.target.value as RunDraft["kind"])}>
              <option value="TRASFERTA">Trasferta</option>
              <option value="ALLENAMENTO">Allenamento</option>
              <option value="EXTRA">Extra</option>
            </select>
          )}
        </Field>
        <Field label="Data">{(id) => <input id={id} type="date" className={inputCls} value={draft.date} onChange={(e) => set("date", e.target.value)} />}</Field>
        <Field label="Partenza">{(id) => <input id={id} type="time" className={inputCls} value={draft.departure} onChange={(e) => set("departure", e.target.value)} />}</Field>
        <Field label="Rientro previsto" hint="Se vuoto contiamo 4 ore.">{(id) => <input id={id} type="time" className={inputCls} value={draft.returnEstimate} onChange={(e) => set("returnEstimate", e.target.value)} />}</Field>
        <Field label="Destinazione" wide>{(id) => <input id={id} className={inputCls} value={draft.destination} maxLength={200} onChange={(e) => set("destination", e.target.value)} />}</Field>
        <Field label="Punto di ritrovo" wide>{(id) => <input id={id} className={inputCls} value={draft.meetingPoint} maxLength={160} onChange={(e) => set("meetingPoint", e.target.value)} />}</Field>
        <Field label="Pulmino">
          {(id) => (
            <select id={id} className={inputCls} value={draft.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
              <option value="">Da assegnare</option>
              {board.vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}{v.seatsPassengers !== null ? ` · ${v.seatsPassengers} posti` : ""}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Autista">
          {(id) => (
            <select id={id} className={inputCls} value={draft.driverId} onChange={(e) => set("driverId", e.target.value)}>
              <option value="">Da assegnare</option>
              {board.drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Passeggeri" hint="Solo il numero: i nomi restano nel Master.">{(id) => <input id={id} inputMode="numeric" className={inputCls} value={draft.passengers} onChange={(e) => set("passengers", e.target.value.replace(/\D/g, "").slice(0, 2))} />}</Field>
        <Field label="Stato">
          {(id) => (
            <select id={id} className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value as RunDraft["status"])}>
              <option value="PIANIFICATA">Pianificata</option>
              <option value="CONFERMATA">Confermata</option>
              {draft.id && <option value="ANNULLATA">Annullata</option>}
            </select>
          )}
        </Field>
        <Field label="Nota" wide>{(id) => <textarea id={id} className={`${inputCls} h-20 py-2`} value={draft.note} maxLength={500} onChange={(e) => set("note", e.target.value)} />}</Field>
      </div>
      {warnings.length > 0 && (
        <ul className="m-0 grid list-none gap-1 rounded-xl bg-[var(--in-warn-bg)] p-3 text-[14px] text-[var(--in-warn)]" aria-live="polite">
          {warnings.map((w) => (
            <li key={w} className="flex gap-1.5"><TriangleAlert className="mt-[2px] size-4 flex-none" aria-hidden="true" />{w}</li>
          ))}
        </ul>
      )}
      {tried && errors.length > 0 && (
        <ul className="m-0 grid list-none gap-1 rounded-xl bg-[var(--in-crit-bg)] p-3 text-[14px] text-[var(--in-crit)]" role="alert">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {msg && <p className={`m-0 text-[14.5px] font-semibold ${msg.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`} role="status">{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center rounded-full bg-[var(--in-ink)] px-5 text-[15px] font-bold text-white disabled:opacity-60">
          {busy ? "Salvo…" : "Salva corsa"}
        </button>
        {draft.id && draft.status !== "ANNULLATA" && (
          <button type="button" disabled={busy} onClick={() => void save("ANNULLATA")} className="inline-flex h-11 items-center rounded-full border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold text-[var(--in-crit)] disabled:opacity-60">
            Annulla corsa
          </button>
        )}
      </div>
    </form>
  );
}
