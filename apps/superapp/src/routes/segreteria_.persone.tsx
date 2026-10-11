import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Database, LogOut, Search, UserPlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  CERT_LABEL,
  CONSENT_LABEL,
  EVENT_LABEL,
  LEAVE_REASONS,
  LEAVE_TYPES,
  ROLE_KIND_LABEL,
  STATUS_LABEL,
  certificateState,
  filterPeople,
  itDate,
  peopleCounts,
  sortPeople,
  teamsOf,
  validateNewPerson,
  type CertState,
  type NewPersonInput,
  type PeopleFilter,
  type PersonDetail,
  type PersonRow,
  type RoleKind,
} from "@/lib/people";
import { getPeople, getPerson, insertPerson, markPersonLeft, type PeopleData, type WriteOutcome } from "@/lib/people.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { AccessRequestsCard } from "@/components/scd/AccessRequestsCard";

export const Route = createFileRoute("/segreteria_/persone")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "persone" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const data = await getPeople();
    return { gate, interior: true as const, data };
  },
  head: ({ loaderData }) => workAreaHead("persone", loaderData?.gate),
  component: PersoneRoute,
});

function PersoneRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="persone" gate={d.gate}>
      {d.interior && <PersonePage initial={d.data} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const CERT_TONE: Record<CertState, ChipTone> = { scaduto: "crit", "in-scadenza": "warn", ok: "ok", sconosciuto: "mute" };
const inputCls = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";

function PersonePage({ initial, preview }: { initial: PeopleData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<PeopleFilter>({ kind: "tutti" });
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const reload = useServerFn(getPeople);
  const counts = useMemo(() => peopleCounts(data.people, data.today), [data]);
  const teams = useMemo(() => teamsOf(data.people), [data]);
  const shown = useMemo(() => sortPeople(filterPeople(data.people, filter)), [data, filter]);

  async function refresh() {
    try {
      setData(await reload());
    } catch {
      /* keep what we have */
    }
  }

  return (
    <WorkAreaShell
      id="persone"
      preview={preview}
      editable
      highlights={[
        { value: data.connected ? counts.active : null, label: "persone attive" },
        { value: data.connected ? counts.athletes : null, label: "atleti" },
        { value: data.connected ? counts.staff : null, label: "staff e dirigenti" },
        { value: data.connected ? counts.certificateIssues : null, label: "certificati da sistemare" },
      ]}
      note={data.connected ? <>Database del club{data.organization ? ` · ${data.organization}` : ""}: chi esce resta nello storico e sparisce dalle viste.</> : <>Database del club non collegato su questo server: la pagina è pronta, i dati arrivano quando la Direzione attiva il collegamento.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {data.connected && <AccessRequestsCard people={data.people} today={data.today} canWrite={data.canWrite} onChanged={refresh} />}
          <Card
            id="persone-elenco"
            title="Elenco"
            sub={data.connected ? `${shown.length} di ${counts.active} persone attive${counts.left ? ` · ${counts.left} uscite nello storico` : ""}` : "Persone, ruoli e stato documenti."}
            aside={
              data.canWrite ? (
                <button type="button" onClick={() => setAdding(true)} className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3.5 text-[14.5px] font-bold text-white" data-testid="persone-add">
                  <UserPlus className="size-4" aria-hidden="true" />
                  Inserisci
                </button>
              ) : null
            }
          >
            <div className="px-4 pb-4 sm:px-[18px]">
              {!data.connected ? (
                <EmptyState title="Collegamento al database non attivo">
                  {data.error ?? "Servono le chiavi del progetto Supabase SCD sul server e un accesso con ruolo Direzione o Segreteria. Nessun dato viene mostrato da fogli o copie."}
                </EmptyState>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
                      <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                      <input type="search" placeholder="Cerca nome, ruolo o squadra" value={filter.q ?? ""} onChange={(e) => setFilter({ ...filter, q: e.target.value })} className="h-10 w-full bg-transparent text-[15px] outline-none" aria-label="Cerca persone" />
                    </label>
                    <select value={filter.kind ?? "tutti"} onChange={(e) => setFilter({ ...filter, kind: e.target.value as PeopleFilter["kind"] })} className="h-10 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Tipo">
                      <option value="tutti">Tutti</option>
                      <option value="atleta">Atleti</option>
                      <option value="staff">Staff e dirigenti</option>
                      <option value="altro">Senza ruolo</option>
                    </select>
                    <select value={filter.status ?? ""} onChange={(e) => setFilter({ ...filter, ...(e.target.value ? { status: e.target.value as PeopleFilter["status"] } : { status: undefined }) })} className="h-10 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Stato">
                      <option value="">Attivi</option>
                      <option value="LEFT">Usciti (storico)</option>
                      <option value="PENDING">In attesa</option>
                      <option value="tutti">Tutti gli stati</option>
                    </select>
                    {teams.length > 0 && (
                      <select value={filter.team ?? ""} onChange={(e) => setFilter({ ...filter, ...(e.target.value ? { team: e.target.value } : { team: undefined }) })} className="h-10 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Squadra">
                        <option value="">Tutte le squadre</option>
                        {teams.map((t) => (
                          <option key={t.code} value={t.code}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {shown.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState title={data.people.length === 0 ? "Nessuna persona nel database" : "Nessun risultato"}>
                        {data.people.length === 0 ? "L'importazione iniziale dai database di iscrizione e dall'elenco dirigenti non è ancora stata fatta." : "Prova a cambiare ricerca o filtri."}
                      </EmptyState>
                    </div>
                  ) : (
                    <ul className="m-0 mt-3 list-none divide-y divide-[var(--in-line)] p-0" data-testid="persone-list">
                      {shown.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => setSelected(p.id)} aria-pressed={selected === p.id} className={`scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left ${selected === p.id ? "bg-[var(--in-info-bg)]" : "hover:bg-[#f7fbff]"}`}>
                            <span className="min-w-0">
                              <b className="block truncate text-[15.5px] leading-tight">
                                {p.displayName}
                                {p.minor === true && <span className="ml-2 rounded-full bg-[#eef3f9] px-1.5 text-[11.5px] font-semibold text-[var(--in-sub)]">minore</span>}
                              </b>
                              <small className="mt-0.5 block truncate text-[13px] text-[var(--in-sub)]">
                                {p.kind === "atleta" ? "Atleta" : p.kind === "staff" ? p.roles.map((r) => r.label).join(" · ") : "Senza ruolo"}
                                {p.birthYear ? ` · ${p.birthYear}` : ""}
                                {p.status === "LEFT" ? ` · uscito il ${itDate(p.leftAt)}` : ""}
                              </small>
                            </span>
                            <span className="flex flex-wrap justify-end gap-1">
                              {p.roles.filter((r) => r.teamCode).slice(0, 2).map((r) => (
                                <Chip key={r.id} tone="info">{r.teamCode}</Chip>
                              ))}
                              {p.athlete && p.status === "ACTIVE" && <Chip tone={CERT_TONE[certificateState(p.athlete.certificateExpiresAt, data.today)]}>{certificateState(p.athlete.certificateExpiresAt, data.today) === "sconosciuto" ? "cert. —" : certificateState(p.athlete.certificateExpiresAt, data.today) === "ok" ? "cert. ok" : "cert. " + certificateState(p.athlete.certificateExpiresAt, data.today)}</Chip>}
                              {p.status !== "ACTIVE" && <Chip tone="mute">{STATUS_LABEL[p.status]}</Chip>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          {selected ? (
            <PersonCard id={selected} today={data.today} canWrite={data.canWrite} onClose={() => setSelected(null)} onChanged={refresh} />
          ) : (
            <Card title="Scheda" sub="Tocca una persona per aprirla.">
              <p className="px-4 pb-4 text-[14.5px] leading-snug text-[var(--in-sub)] sm:px-[18px]">
                La scheda mostra ruoli, squadre, consensi e lo storico di entrate e uscite. I recapiti compaiono solo qui, mai nell'elenco né nelle pagine pubbliche.
              </p>
            </Card>
          )}
          <SourcesBox id="persone" />
        </div>
      </div>

      {adding && <AddPersonDialog onClose={() => setAdding(false)} onDone={refresh} />}
    </WorkAreaShell>
  );
}

function PersonCard({ id, today, canWrite, onClose, onChanged }: { id: string; today: string; canWrite: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const load = useServerFn(getPerson);
  const [p, setP] = useState<PersonDetail | null | undefined>(undefined);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    let alive = true;
    setP(undefined);
    load({ data: { id } })
      .then((r) => alive && setP(r))
      .catch(() => alive && setP(null));
    return () => {
      alive = false;
    };
  }, [id, load]);

  if (p === undefined) return <Card title="Scheda"><p className="px-4 pb-4 text-[14.5px] text-[var(--in-sub)] sm:px-[18px]" role="status">Carico la scheda…</p></Card>;
  if (p === null) return <Card title="Scheda"><p className="px-4 pb-4 text-[14.5px] text-[var(--in-sub)] sm:px-[18px]">Scheda non disponibile.</p></Card>;
  const cert = p.athlete ? certificateState(p.athlete.certificateExpiresAt, today) : null;
  return (
    <Card
      id="persona-scheda"
      title={p.displayName}
      sub={`${STATUS_LABEL[p.status]}${p.minor === true ? " · minore" : ""}${p.birthDate ? ` · nato/a il ${itDate(p.birthDate)}` : ""}`}
      aside={
        <button type="button" onClick={onClose} aria-label="Chiudi scheda" className="scd-focus grid size-9 place-items-center rounded-full bg-[#eef3f9]">
          <X className="size-4" aria-hidden="true" />
        </button>
      }
    >
      <div className="grid gap-3 px-4 pb-4 text-[14.5px] sm:px-[18px]" data-testid="persona-scheda">
        {p.status === "LEFT" && (
          <p className="rounded-[10px] bg-[#eef3f9] px-3 py-2 text-[var(--in-sub)]">Uscito/a il {itDate(p.leftAt)}{p.leftReason ? ` · ${p.leftReason}` : ""}. Resta nello storico.</p>
        )}
        <section>
          <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--in-sub)]">Ruoli e squadre</h3>
          {p.roles.length ? (
            <ul className="m-0 mt-1 list-none p-0">
              {p.roles.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-1">
                  <b>{r.label}</b>
                  <Chip tone="mute">{ROLE_KIND_LABEL[r.kind]}</Chip>
                  {r.teamCode && <Chip tone="info">{r.teamName ?? r.teamCode}</Chip>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-1 text-[var(--in-sub)]">{p.kind === "atleta" ? "Atleta" : "Nessun ruolo attivo."}</p>
          )}
          {p.athlete && cert && (
            <p className="m-0 mt-2 flex flex-wrap items-center gap-2">
              <Chip tone={CERT_TONE[cert]}>{CERT_LABEL[cert]}</Chip>
              {p.athlete.certificateExpiresAt && <span className="text-[var(--in-sub)]">scade il {itDate(p.athlete.certificateExpiresAt)}</span>}
              <Chip tone="mute">tesseramento: {p.athlete.registrationStatus}</Chip>
            </p>
          )}
        </section>
        <section>
          <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--in-sub)]">Recapiti</h3>
          <p className="m-0 mt-1">{p.email ?? "—"}</p>
          <p className="m-0">{p.phone ?? "—"}</p>
          {p.minor === true && <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">Per i minori i recapiti sono quelli del genitore o tutore.</p>}
        </section>
        {p.consents.length > 0 && (
          <section>
            <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--in-sub)]">Consensi</h3>
            <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
              {p.consents.map((c) => (
                <li key={`${c.type}-${c.givenAt}`}>
                  <Chip tone={c.revokedAt ? "mute" : c.granted ? "ok" : "warn"}>{CONSENT_LABEL[c.type] ?? c.type}{c.revokedAt ? " · revocato" : c.granted ? "" : " · negato"}</Chip>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--in-sub)]">Storico</h3>
          {p.events.length ? (
            <ol className="m-0 mt-1 list-none p-0">
              {p.events.map((e) => (
                <li key={e.id} className="grid grid-cols-[86px_minmax(0,1fr)] gap-2 py-1 text-[14px]">
                  <span className="tabular-nums text-[var(--in-sub)]">{itDate(e.date)}</span>
                  <span>
                    <b>{EVENT_LABEL[e.type] ?? e.type}</b>
                    {e.reason ? ` · ${e.reason}` : ""}
                    {e.otherClub ? ` · ${e.otherClub}` : ""}
                    {e.note && <span className="block text-[13px] text-[var(--in-sub)]">{e.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 mt-1 text-[var(--in-sub)]">Nessun evento registrato.</p>
          )}
        </section>
        <p className="m-0 text-[12.5px] text-[var(--in-sub)]">Fonte: {p.sourceId}</p>
        {canWrite && p.status === "ACTIVE" && (
          <button type="button" onClick={() => setLeaving(true)} className="scd-focus inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-crit)] px-3.5 text-[14.5px] font-bold text-[var(--in-crit)]" data-testid="persona-esci">
            <LogOut className="size-4" aria-hidden="true" />
            Segna uscito/a
          </button>
        )}
      </div>
      {leaving && (
        <LeaveDialog
          person={p}
          today={today}
          onClose={() => setLeaving(false)}
          onDone={async () => {
            setLeaving(false);
            await onChanged();
            const r = await load({ data: { id } });
            setP(r);
          }}
        />
      )}
    </Card>
  );
}

function Dialog({ title, onClose, children, testId }: { title: string; onClose: () => void; children: React.ReactNode; testId: string }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgb(2_15_40/0.6)] p-3 sm:items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] rounded-[20px] bg-white p-5 text-[var(--in-ink)] shadow-[0_24px_48px_rgb(0_8_30/0.5)]" data-testid={testId}>
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-t`} className="m-0 text-[22px] font-bold leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="scd-focus grid size-10 place-items-center rounded-full bg-[#eef3f9]">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function LeaveDialog({ person, today, onClose, onDone }: { person: PersonDetail; today: string; onClose: () => void; onDone: () => Promise<void> }) {
  const send = useServerFn(markPersonLeft);
  const [type, setType] = useState<(typeof LEAVE_TYPES)[number]["id"]>("USCITA");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState(LEAVE_REASONS[0] ?? "");
  const [club, setClub] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<WriteOutcome | null>(null);
  const needsClub = LEAVE_TYPES.find((t) => t.id === type)?.needsClub ?? false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await send({ data: { id: person.id, leftAt: date, reason, eventType: type, otherClub: needsClub ? club : undefined, note: note || undefined } });
      setOut(r);
      if (r.ok) await onDone();
    } catch {
      setOut({ ok: false, message: "Controlla i campi e riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Segna uscito/a: ${person.displayName}`} onClose={onClose} testId="leave-dialog">
      <form onSubmit={submit} className="mt-3 grid gap-3 text-[14.5px]">
        <label className="grid gap-1">
          <span className="font-bold">Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
            {LEAVE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-bold">Data</span>
          <input type="date" required value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1">
          <span className="font-bold">Motivo</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            {LEAVE_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        {needsClub && (
          <label className="grid gap-1">
            <span className="font-bold">Club di destinazione</span>
            <input required value={club} onChange={(e) => setClub(e.target.value)} className={inputCls} />
          </label>
        )}
        <label className="grid gap-1">
          <span className="font-bold">Nota (facoltativa)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] outline-none focus:border-[var(--in-info)]" />
        </label>
        <p className="m-0 text-[13px] leading-snug text-[var(--in-sub)]">Ruoli e squadre vengono chiusi alla data indicata; la persona resta nello storico e sparisce dalle viste e dagli omini.</p>
        {out && <p role="status" className={`rounded-[10px] px-3 py-2 ${out.ok ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}>{out.message}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy || out?.ok} className="scd-focus inline-flex h-11 flex-1 items-center justify-center rounded-[10px] bg-[var(--in-crit)] text-[15px] font-bold text-white disabled:opacity-60">{busy ? "Registro…" : "Registra uscita"}</button>
          <button type="button" onClick={onClose} className="scd-focus inline-flex h-11 items-center justify-center rounded-[10px] border border-[var(--in-line)] px-4 text-[15px] font-semibold">{out?.ok ? "Chiudi" : "Annulla"}</button>
        </div>
      </form>
    </Dialog>
  );
}

const EMPTY_NEW: NewPersonInput = { firstName: "", lastName: "", birthDate: "", email: "", phone: "", kind: "atleta", roleLabel: "", roleKind: "", note: "" };

function AddPersonDialog({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const send = useServerFn(insertPerson);
  const [f, setF] = useState<NewPersonInput>(EMPTY_NEW);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<WriteOutcome | null>(null);
  const set = (k: keyof NewPersonInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateNewPerson(f);
    setErrors(errs);
    if (errs.length || busy) return;
    setBusy(true);
    try {
      const r = await send({
        data: {
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          birthDate: f.birthDate || undefined,
          email: f.email.trim() || undefined,
          phone: f.phone.trim() || undefined,
          kind: f.kind,
          roleLabel: f.kind === "staff" ? f.roleLabel.trim() : undefined,
          roleKind: f.kind === "staff" && f.roleKind ? f.roleKind : undefined,
          note: f.note.trim() || undefined,
        },
      });
      setOut(r);
      if (r.ok) {
        await onDone();
        setF(EMPTY_NEW);
      }
    } catch {
      setOut({ ok: false, message: "Controlla i campi e riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Inserisci persona" onClose={onClose} testId="add-dialog">
      <form onSubmit={submit} className="mt-3 grid gap-3 text-[14.5px] sm:grid-cols-2">
        <label className="grid gap-1"><span className="font-bold">Nome</span><input required value={f.firstName} onChange={set("firstName")} className={inputCls} autoComplete="off" /></label>
        <label className="grid gap-1"><span className="font-bold">Cognome</span><input required value={f.lastName} onChange={set("lastName")} className={inputCls} autoComplete="off" /></label>
        <label className="grid gap-1"><span className="font-bold">Data di nascita</span><input type="date" value={f.birthDate} onChange={set("birthDate")} className={inputCls} /></label>
        <label className="grid gap-1">
          <span className="font-bold">Chi è</span>
          <select value={f.kind} onChange={set("kind")} className={inputCls}>
            <option value="atleta">Atleta (tesseramento da verificare)</option>
            <option value="staff">Staff, dirigente, mister, autista</option>
          </select>
        </label>
        {f.kind === "staff" && (
          <>
            <label className="grid gap-1"><span className="font-bold">Ruolo (come lo scrive la società)</span><input value={f.roleLabel} onChange={set("roleLabel")} placeholder="es. Dirigente accompagnatore U15" className={inputCls} /></label>
            <label className="grid gap-1">
              <span className="font-bold">Tipo di ruolo</span>
              <select value={f.roleKind} onChange={set("roleKind")} className={inputCls}>
                <option value="">—</option>
                {(Object.keys(ROLE_KIND_LABEL) as RoleKind[]).map((k) => (
                  <option key={k} value={k}>{ROLE_KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="grid gap-1"><span className="font-bold">E-mail{f.kind === "atleta" ? " (del genitore se minore)" : ""}</span><input type="email" value={f.email} onChange={set("email")} className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Telefono</span><input type="tel" value={f.phone} onChange={set("phone")} className={inputCls} /></label>
        <label className="grid gap-1 sm:col-span-2"><span className="font-bold">Nota (facoltativa)</span><textarea rows={2} value={f.note} onChange={set("note")} className="rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] outline-none focus:border-[var(--in-info)]" /></label>
        {errors.length > 0 && (
          <ul className="m-0 list-disc rounded-[10px] bg-[var(--in-warn-bg)] py-2 pl-7 pr-3 text-[var(--in-warn)] sm:col-span-2">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {out && <p role="status" className={`m-0 rounded-[10px] px-3 py-2 sm:col-span-2 ${out.ok ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}>{out.message}</p>}
        <p className="m-0 flex items-start gap-2 text-[13px] leading-snug text-[var(--in-sub)] sm:col-span-2">
          <Database className="mt-[2px] size-4 shrink-0" aria-hidden="true" />
          La persona entra nel database del club con un evento "Entrata" e fonte "Direzione". Il tesseramento FIGC resta da verificare sui registri ufficiali: qui non si inventa.
        </p>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className="scd-focus inline-flex h-11 flex-1 items-center justify-center rounded-[10px] bg-[var(--in-info)] text-[15px] font-bold text-white disabled:opacity-60">{busy ? "Inserisco…" : "Inserisci"}</button>
          <button type="button" onClick={onClose} className="scd-focus inline-flex h-11 items-center justify-center rounded-[10px] border border-[var(--in-line)] px-4 text-[15px] font-semibold">Chiudi</button>
        </div>
      </form>
      <p className="mt-3 text-[13px] text-[var(--in-sub)]">
        Per i minori servono i consensi del genitore: si raccolgono dal modulo di iscrizione (<Link to="/entra" className="underline">Entra nella SCD</Link>), non da qui.
      </p>
    </Dialog>
  );
}
