import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, HeartPulse, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { AcanforaCard } from "@/components/scd/AcanforaCard";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaShell } from "@/components/scd/work-area-ui";
import { TODO_LABEL, certCounts, certTodo, teamProgress, type CertRow, type CertTodo } from "@/lib/certificates";
import {
  CHECK_LABEL,
  HEALTH_DENIED,
  R136_PENDING,
  READ_FAILED,
  SAVED_RELOAD,
  SITES,
  aedState,
  engineText,
  kitState,
  labelOf,
  type AedRow,
  type CheckState,
  type HealthSite,
  type KitRow,
} from "@/lib/health-areas";
import { getInfermeria, saveAed, saveKit, type InfermeriaData } from "@/lib/infermeria.functions";
import { itDate } from "@/lib/people";

const TODO_TONE: Record<CertTodo, ChipTone> = { manca: "mute", scaduto: "crit", "in-scadenza": "warn", "da-controllare": "info", "a-posto": "ok" };
const CHECK_TONE: Record<CheckState, ChipTone> = { mai: "mute", scaduto: "crit", "in-scadenza": "warn", ok: "ok" };

const field = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[16px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";
const primary = "scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50";
const ghost = "scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#e7f0fb] px-4 text-[15px] font-semibold text-[#0b2a5b]";

/**
 * Infermeria board (staff with the infermeria access and Direzione). VR-026 structure: KPI strip, main column with
 * the work lists, side column with the emergency card and Dottor Acanfora's general first aid.
 * No health data of minors: certificate expiry dates (read-only), first-aid kits and defibrillators. The injuries
 * register is deferred until the consent design (UD-043). Unknown is never shown as zero.
 */
export function InfermeriaBoard({ initial, preview }: { initial: InfermeriaData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const reload = useServerFn(getInfermeria);
  const refresh = () => {
    setNotice(null);
    reload().then(setData).catch(() => setNotice(SAVED_RELOAD));
  };
  const counts = useMemo(() => certCounts(data.certs.rows, data.today), [data]);
  const teams = useMemo(() => teamProgress(data.certs.rows, data.today), [data]);
  const certOk = data.certs.state === "ok";
  const board = data.board;
  const equipmentDue = board
    ? board.kits.filter((k) => kitState(k, data.today) !== "ok").length + board.aeds.filter((a) => aedState(a, data.today) !== "ok").length
    : null;
  const stateText = engineText(data.engine);

  return (
    <WorkAreaShell
      id="infermeria"
      preview={preview}
      editable={data.engine === "applied"}
      status={data.engine === "applied" || !stateText ? undefined : <Chip tone={data.engine === "not-applied" ? "warn" : "crit"}>{stateText}</Chip>}
      highlights={[
        { value: certOk ? counts.total - counts.manca - counts.scaduto : null, label: `atleti su ${certOk ? counts.total : "—"} con certificato valido` },
        { value: certOk ? counts.scaduto + counts.manca : null, label: "certificati scaduti o senza data" },
        { value: equipmentDue, label: "cassette e DAE da controllare" },
      ]}
      note={<>Qui non ci sono dati di salute: solo scadenze dei certificati, cassette e defibrillatori.</>}
    >
      {notice && <p role="status" className="m-0 mb-3 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14.5px] font-semibold text-[var(--in-info)]">{notice}</p>}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <CertificatesCard data={data} teams={teams} />
          <EquipmentCard data={data} onSaved={refresh} />
          <AcanforaCard />
          <SourcesBox id="infermeria" />
        </div>
        <div className="order-first flex min-w-0 flex-col gap-[18px] lg:order-none">
          <EmergencyCard />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function Pending({ children }: { children?: ReactNode }) {
  return <EmptyState title={R136_PENDING}>{children ?? "La Direzione deve dare l'OK (\"applica\") alla migrazione r136. Fino ad allora qui non si salva niente."}</EmptyState>;
}

/** The empty state for a section the database did not open: r136 missing, access denied, or a failed read. */
function EngineState({ engine, pending }: { engine: InfermeriaData["engine"]; pending?: ReactNode }) {
  if (engine === "not-applied") return <Pending>{pending}</Pending>;
  if (engine === "denied") return <EmptyState title="Non hai l'abilitazione">{HEALTH_DENIED}</EmptyState>;
  return <EmptyState title={READ_FAILED}>Non siamo riusciti a leggere questa parte. Ricarica la pagina tra poco.</EmptyState>;
}

function CertificatesCard({ data, teams }: { data: InfermeriaData; teams: ReturnType<typeof teamProgress> }) {
  const [team, setTeam] = useState<string | null>(null);
  const todo = useMemo(
    () => data.certs.rows.filter((r) => (team ? r.teamCode === team : true) && certTodo(r, data.today) !== "a-posto"),
    [data, team],
  );
  return (
    <Card id="inf-certificati" title="Certificati medici" sub="Scadenze per squadra. Le date si correggono in Segreteria.">
      <div className="px-4 pb-4 sm:px-[18px]">
        {data.certs.state !== "ok" ? (
          !data.connected ? (
            <EmptyState title="Collegamento al database non attivo">Entra con un account dello staff sanitario.</EmptyState>
          ) : data.certs.state === "denied" ? (
            <EmptyState title="Non hai l'abilitazione">Le scadenze dei certificati le vede chi ha l'Infermeria su tutta la società e la Direzione.</EmptyState>
          ) : data.certs.state === "error" ? (
            <EmptyState title={READ_FAILED}>Non siamo riusciti a leggere i certificati. Ricarica la pagina tra poco.</EmptyState>
          ) : (
            <Pending>Con r136 lo staff sanitario vede le scadenze; oggi le vedono solo Direzione e Segreteria.</Pending>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ul className="m-0 min-w-0 list-none p-0" aria-label="Squadre">
              {teams.map((t) => {
                const pct = t.total ? Math.round((t.ok / t.total) * 100) : 0;
                return (
                  <li key={t.code}>
                    <button type="button" aria-pressed={team === t.code} onClick={() => setTeam(team === t.code ? null : t.code)} className={`scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-2 text-left ${team === t.code ? "bg-[var(--in-info-bg)]" : "hover:bg-[#f7fbff]"}`}>
                      <span className="truncate text-[15px] font-semibold">{t.name}</span>
                      <span className="tabular-nums text-[14px] text-[var(--in-sub)]">{t.ok}/{t.total}</span>
                      <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef3f9]" aria-hidden="true">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "var(--in-ok)" : "var(--in-info)" }} />
                      </span>
                    </button>
                  </li>
                );
              })}
              {teams.length === 0 && <li className="text-[14px] text-[var(--in-sub)]">Nessuna squadra collegata.</li>}
            </ul>
            <div className="min-w-0">
              <h3 className="m-0 mb-1 text-[15px] font-bold">Da sistemare {team ? `· ${teams.find((t) => t.code === team)?.name ?? ""}` : ""}</h3>
              {todo.length === 0 ? (
                <p className="m-0 text-[14px] text-[var(--in-sub)]">Niente da fare in questa selezione.</p>
              ) : (
                <ul className="m-0 max-h-[320px] list-none divide-y divide-[var(--in-line)] overflow-y-auto p-0" data-testid="inf-cert-list">
                  {todo.slice(0, 60).map((r) => (
                    <CertLine key={`${r.athleteId}:${r.teamCode ?? "-"}`} row={r} today={data.today} />
                  ))}
                </ul>
              )}
              <Link to="/segreteria/certificati" className="scd-focus mt-2 inline-block text-[14.5px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline">
                Apri i certificati in Segreteria
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function CertLine({ row, today }: { row: CertRow; today: string }) {
  const t = certTodo(row, today);
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="min-w-0">
        <b className="block truncate text-[15px]">{row.name}</b>
        <small className="block truncate text-[13px] text-[var(--in-sub)]">
          {row.teamName ?? "Senza squadra"}
          {row.expiresAt ? ` · scade il ${itDate(row.expiresAt)}` : ""}
        </small>
      </span>
      <Chip tone={TODO_TONE[t]}>{TODO_LABEL[t]}</Chip>
    </li>
  );
}

function EquipmentCard({ data, onSaved }: { data: InfermeriaData; onSaved: () => void }) {
  const board = data.board;
  const [form, setForm] = useState<null | { kind: "kit"; row?: KitRow | undefined } | { kind: "aed"; row?: AedRow | undefined }>(null);
  const sites: HealthSite[] = board ? SITES.map((s) => s.id).filter((id) => board.sites.includes(id)) : [];
  return (
    <Card
      id="inf-dotazioni"
      title="Cassette di primo soccorso e defibrillatori"
      sub="Per sede: ultimo e prossimo controllo, scadenza di piastre e batteria del DAE."
      aside={board && board.canWriteSites.length > 0 ? (
        <span className="flex flex-wrap gap-2">
          <button type="button" className={ghost} onClick={() => setForm({ kind: "kit" })}><Plus className="size-4" aria-hidden="true" /> Cassetta</button>
          <button type="button" className={ghost} onClick={() => setForm({ kind: "aed" })}><Plus className="size-4" aria-hidden="true" /> DAE</button>
        </span>
      ) : undefined}
    >
      <div className="px-4 pb-4 sm:px-[18px]">
        {data.engine !== "applied" || !board ? (
          <EngineState engine={data.engine} />
        ) : (
          <>
            {form?.kind === "kit" && <KitForm sites={board.canWriteSites} row={form.row} onDone={() => { setForm(null); onSaved(); }} onCancel={() => setForm(null)} />}
            {form?.kind === "aed" && <AedForm sites={board.canWriteSites} row={form.row} onDone={() => { setForm(null); onSaved(); }} onCancel={() => setForm(null)} />}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sites.map((site) => {
                const kits = board.kits.filter((k) => k.site === site);
                const aeds = board.aeds.filter((a) => a.site === site);
                const canEdit = board.canWriteSites.includes(site);
                return (
                  <section key={site} aria-label={`Sede di ${labelOf(SITES, site)}`} className="min-w-0 rounded-[14px] border border-[var(--in-line)] bg-[#f7fbff] p-3">
                    <h3 className="m-0 font-title text-[22px] font-extrabold">{labelOf(SITES, site)}</h3>
                    <h4 className="m-0 mt-2 text-[14px] font-bold text-[var(--in-sub)]">Cassette</h4>
                    {kits.length === 0 ? <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessuna cassetta registrata.</p> : (
                      <ul className="m-0 list-none p-0">
                        {kits.map((k) => {
                          const st = kitState(k, data.today);
                          return (
                            <li key={k.id} className="flex items-center justify-between gap-2 py-1.5">
                              <button type="button" disabled={!canEdit} onClick={() => setForm({ kind: "kit", row: k })} className="scd-focus min-w-0 text-left disabled:cursor-default">
                                <b className="block truncate text-[15px]">{k.kit}</b>
                                <small className="block text-[13px] text-[var(--in-sub)]">ultimo {k.lastCheck ? itDate(k.lastCheck) : "—"} · prossimo {k.nextCheck ? itDate(k.nextCheck) : "—"}</small>
                              </button>
                              <Chip tone={CHECK_TONE[st]}>{CHECK_LABEL[st]}</Chip>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <h4 className="m-0 mt-3 text-[14px] font-bold text-[var(--in-sub)]">Defibrillatori (DAE / BLSD)</h4>
                    {aeds.length === 0 ? <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessun defibrillatore registrato.</p> : (
                      <ul className="m-0 list-none p-0">
                        {aeds.map((a) => {
                          const st = aedState(a, data.today);
                          return (
                            <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                              <button type="button" disabled={!canEdit} onClick={() => setForm({ kind: "aed", row: a })} className="scd-focus min-w-0 text-left disabled:cursor-default">
                                <b className="block truncate text-[15px]">{a.device}</b>
                                <small className="block text-[13px] text-[var(--in-sub)]">piastre {a.padsExpiry ? itDate(a.padsExpiry) : "—"} · batteria {a.batteryExpiry ? itDate(a.batteryExpiry) : "—"} · controllo {a.lastCheck ? itDate(a.lastCheck) : "—"}</small>
                              </button>
                              <Chip tone={CHECK_TONE[st]}>{CHECK_LABEL[st]}</Chip>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function SiteSelect({ sites, value, onChange, locked }: { sites: readonly HealthSite[]; value: string; onChange: (v: string) => void; locked: boolean }) {
  return (
    <label className="grid gap-1 text-[14px] font-semibold">
      Sede
      <select value={value} onChange={(e) => onChange(e.target.value)} className={field} disabled={locked}>
        {sites.map((s) => (
          <option key={s} value={s}>{labelOf(SITES, s)}</option>
        ))}
      </select>
    </label>
  );
}

function KitForm({ sites, row, onDone, onCancel }: { sites: readonly HealthSite[]; row?: KitRow | undefined; onDone: () => void; onCancel: () => void }) {
  const save = useServerFn(saveKit);
  const [site, setSite] = useState<string>(row?.site ?? sites[0] ?? "COLICO");
  const [kit, setKit] = useState(row?.kit ?? "");
  const [lastCheck, setLast] = useState(row?.lastCheck ?? "");
  const [nextCheck, setNext] = useState(row?.nextCheck ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({ data: { site: site as HealthSite, kit, lastCheck, nextCheck } });
      if (r.ok) onDone();
      else setMsg(r.message);
    } catch {
      setMsg("Salvataggio non riuscito, riprova.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mb-3 grid gap-3 rounded-[12px] border border-[var(--in-line)] bg-white p-3 sm:grid-cols-2" data-testid="inf-kit-form">
      <SiteSelect sites={sites} value={site} onChange={setSite} locked={Boolean(row)} />
      <label className="grid gap-1 text-[14px] font-semibold">Cassetta<input value={kit} onChange={(e) => setKit(e.target.value)} readOnly={Boolean(row)} maxLength={60} placeholder="Es. Borsa campo principale" className={field} /></label>
      <label className="grid gap-1 text-[14px] font-semibold">Ultimo controllo<input type="date" value={lastCheck} onChange={(e) => setLast(e.target.value)} className={field} /></label>
      <label className="grid gap-1 text-[14px] font-semibold">Prossimo controllo<input type="date" value={nextCheck} onChange={(e) => setNext(e.target.value)} className={field} /></label>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" className={primary} disabled={busy || kit.trim().length < 2}><Check className="size-4" aria-hidden="true" /> {busy ? "Salvo…" : "Salva"}</button>
        <button type="button" className={ghost} onClick={onCancel}>Annulla</button>
        {msg && <span className="text-[14px] font-semibold text-[var(--in-crit)]" role="status">{msg}</span>}
      </div>
    </form>
  );
}

function AedForm({ sites, row, onDone, onCancel }: { sites: readonly HealthSite[]; row?: AedRow | undefined; onDone: () => void; onCancel: () => void }) {
  const save = useServerFn(saveAed);
  const [site, setSite] = useState<string>(row?.site ?? sites[0] ?? "COLICO");
  const [device, setDevice] = useState(row?.device ?? "");
  const [padsExpiry, setPads] = useState(row?.padsExpiry ?? "");
  const [batteryExpiry, setBattery] = useState(row?.batteryExpiry ?? "");
  const [lastCheck, setLast] = useState(row?.lastCheck ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({ data: { site: site as HealthSite, device, padsExpiry, batteryExpiry, lastCheck } });
      if (r.ok) onDone();
      else setMsg(r.message);
    } catch {
      setMsg("Salvataggio non riuscito, riprova.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mb-3 grid gap-3 rounded-[12px] border border-[var(--in-line)] bg-white p-3 sm:grid-cols-2" data-testid="inf-aed-form">
      <SiteSelect sites={sites} value={site} onChange={setSite} locked={Boolean(row)} />
      <label className="grid gap-1 text-[14px] font-semibold">Defibrillatore<input value={device} onChange={(e) => setDevice(e.target.value)} readOnly={Boolean(row)} maxLength={60} placeholder="Es. DAE spogliatoi" className={field} /></label>
      <label className="grid gap-1 text-[14px] font-semibold">Scadenza piastre<input type="date" value={padsExpiry} onChange={(e) => setPads(e.target.value)} className={field} /></label>
      <label className="grid gap-1 text-[14px] font-semibold">Scadenza batteria<input type="date" value={batteryExpiry} onChange={(e) => setBattery(e.target.value)} className={field} /></label>
      <label className="grid gap-1 text-[14px] font-semibold">Ultimo controllo<input type="date" value={lastCheck} onChange={(e) => setLast(e.target.value)} className={field} /></label>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" className={primary} disabled={busy || device.trim().length < 2}><Check className="size-4" aria-hidden="true" /> {busy ? "Salvo…" : "Salva"}</button>
        <button type="button" className={ghost} onClick={onCancel}>Annulla</button>
        {msg && <span className="text-[14px] font-semibold text-[var(--in-crit)]" role="status">{msg}</span>}
      </div>
    </form>
  );
}

function EmergencyCard() {
  return (
    <Card id="inf-emergenza" title={<span className="flex items-center gap-2"><HeartPulse className="size-6 text-[var(--in-crit)]" aria-hidden="true" /> In campo</span>}>
      <div className="flex flex-col gap-3 px-4 pb-5 sm:px-[18px]">
        <a href="tel:112" className="flex min-h-14 items-center gap-3 rounded-[12px] bg-[var(--in-crit-bg)] px-4 text-[17px] font-bold text-[var(--in-crit)]">
          <TriangleAlert className="size-6 flex-none" strokeWidth={1.8} aria-hidden="true" />
          Emergenza: 112
        </a>
        <p className="m-0 flex gap-2 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]">
          <ShieldCheck className="mt-[1px] size-[18px] flex-none" strokeWidth={1.8} aria-hidden="true" />
          L'infermeria del club non sostituisce il pronto soccorso. Sintomi e diagnosi non si scrivono nell'app: se ne parla di persona con la famiglia.
        </p>
      </div>
    </Card>
  );
}
