import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Ban, Check, ChevronLeft, ChevronRight, ClipboardCopy, FileText, Paperclip, Plus, Search, ShieldCheck, Undo2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  BLOCKER_LABEL,
  CONTRACT_LABEL,
  ENTRY_KINDS,
  ENTRY_LABEL,
  STATUS_LABEL,
  daysUntil,
  defaultPeriod,
  dueDateOf,
  dueLabel,
  entrySign,
  euro,
  filterLines,
  isPeriod,
  itDay,
  paymentListText,
  periodLabel,
  shiftPeriod,
  summarize,
  type CompActor,
  type CompFilter,
  type CompLine,
  type ContractStatus,
  type ContractType,
  type EntryKind,
  type IbanStatus,
  type PeriodStatus,
  type RelationshipStatus,
} from "@/lib/compensation";
import {
  addCompEntry,
  cancelCompEntry,
  compPeriodAction,
  getCompBoard,
  openCompDocument,
  saveCompAgreement,
  uploadCompDocument,
  type AgreementInput,
  type CompData,
  type CompOutcome,
  type PeriodActionInput,
} from "@/lib/compensation.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** ?mese=2026-09 opens a competence month; default: the month whose payment is due next. */
function validateSearch(raw: Record<string, unknown>): { mese?: string } {
  return typeof raw["mese"] === "string" && isPeriod(raw["mese"]) ? { mese: raw["mese"] } : {};
}

/** Compensi e stipendi (UD-075): Direzione verifies and authorizes, Tesoreria pays. */
export const Route = createFileRoute("/tesoreria_/compensi")({
  validateSearch,
  loaderDeps: ({ search }) => ({ mese: search.mese }),
  loader: async ({ deps }) => {
    const gate = await getWorkAreaGate({ data: { area: "compensi" } });
    const today = romeToday();
    const period = deps.mese ?? defaultPeriod(today);
    const data: CompData = gate.view === "page" ? await getCompBoard({ data: { period } }) : { connected: false, board: null, error: null };
    return { gate, interior: gate.view === "page", today, period, data };
  },
  head: ({ loaderData }) => workAreaHead("compensi", loaderData?.gate),
  component: CompensiRoute,
});

function CompensiRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="compensi" gate={d.gate}>
      {d.interior && <CompPage key={d.period} initial={d.data} period={d.period} today={d.today} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const STATUS_TONE: Record<PeriodStatus, ChipTone> = { BOZZA: "warn", AUTORIZZATO: "info", PAGATO: "ok", BLOCCATO: "crit" };
const inputCls = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";
const btnPrimary = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50";
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

const FILTERS: ReadonlyArray<{ id: CompFilter; label: string }> = [
  { id: "tutti", label: "Tutti" },
  { id: "da-verificare", label: "Da sistemare" },
  { id: "pronti", label: "Pronti da autorizzare" },
  { id: "autorizzati", label: "Da pagare" },
  { id: "pagati", label: "Pagati" },
  { id: "bloccati", label: "Bloccati" },
];

function lineState(l: CompLine): { tone: ChipTone; text: string } {
  if (l.status === "BOZZA" && l.blockers.length === 0) return { tone: "info", text: "Pronto da autorizzare" };
  if (l.status === "BOZZA") return { tone: "warn", text: "Da sistemare" };
  return { tone: STATUS_TONE[l.status], text: STATUS_LABEL[l.status] };
}

function Feedback({ out }: { out: CompOutcome | null }) {
  if (!out) return null;
  return (
    <p role="status" className={`m-0 rounded-[10px] px-3 py-2 text-[14.5px] ${out.ok ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}>
      {out.message}
    </p>
  );
}

function CompPage({ initial, period, today, preview }: { initial: CompData; period: string; today: string; preview: boolean }) {
  const [data, setData] = useState(initial);
  const board = data.board;
  const actor: CompActor | null = board?.actor ?? null;
  const [filter, setFilter] = useState<CompFilter>(actor === "TESORERIA" ? "autorizzati" : "tutti");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const reload = useServerFn(getCompBoard);
  const navigate = useNavigate();

  const lines = board?.lines ?? [];
  const s = useMemo(() => summarize(lines), [lines]);
  const shown = useMemo(() => filterLines(lines, filter, q), [lines, filter, q]);
  const current = lines.find((l) => l.agreementId === selected) ?? null;
  const due = dueDateOf(period);
  const days = daysUntil(today, due);

  async function refresh() {
    try {
      setData(await reload({ data: { period } }));
    } catch {
      /* keep what we have */
    }
  }

  function goMonth(delta: number) {
    void navigate({ to: "/tesoreria/compensi", search: { mese: shiftPeriod(period, delta) } });
  }

  async function copyList() {
    const text = paymentListText(lines, period);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Elenco copiato: incollalo nella mail o nel foglio della banca.");
    } catch {
      setCopied(text);
    }
  }

  return (
    <WorkAreaShell
      id="compensi"
      title="Compensi e stipendi"
      preview={preview}
      editable
      highlights={[
        { value: board ? s.people : null, label: "persone nel mese" },
        { value: board ? s.readyToAuthorize : null, label: "pronti da autorizzare" },
        { value: board ? s.authorized : null, label: "autorizzati da pagare" },
        { value: board ? s.paid : null, label: "pagati" },
        { value: board ? s.toVerify - s.readyToAuthorize : null, label: "da sistemare (IBAN, contratto, importo)" },
      ]}
      note={<>La Direzione verifica e autorizza; la Tesoreria paga e segna il bonifico. L'app non esegue pagamenti e non conserva IBAN.</>}
    >
      <Card id="comp-mese" title={`Competenza ${periodLabel(period)}`} sub={<>Da pagare entro <b>{itDay(due)}</b> · {dueLabel(days)}</>}
        aside={
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => goMonth(-1)} className={btnGhost} aria-label="Mese precedente"><ChevronLeft className="size-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => goMonth(1)} className={btnGhost} aria-label="Mese successivo"><ChevronRight className="size-4" aria-hidden="true" /></button>
          </div>
        }>
        {board && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4 sm:px-[18px]" data-testid="comp-totals">
            <Total label="Netto del mese (tutti)" value={euro(s.netTotal)} />
            <Total label="Autorizzato da pagare" value={euro(s.authorizedTotal)} tone={s.authorized ? "info" : undefined} />
            <Total label="Già pagato" value={euro(s.paidTotal)} tone={s.paid ? "ok" : undefined} />
            <Total label="IBAN da confermare" value={String(s.missingIban)} tone={s.missingIban ? "warn" : undefined} />
          </div>
        )}
        {board && days >= 0 && days <= 3 && s.toVerify > 0 && actor === "DIREZIONE" && (
          <p className="mx-4 mb-4 rounded-[10px] bg-[var(--in-warn-bg)] px-3 py-2 text-[14.5px] text-[var(--in-warn)] sm:mx-[18px]">
            Scadenza vicina: {s.toVerify} persone ancora da autorizzare. Prima sistema IBAN e contratto, poi autorizza: la Tesoreria vede solo ciò che è autorizzato.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="comp-elenco" title="Persone del mese"
            sub={board ? `${shown.length} mostrate su ${lines.length}` : "Accordi economici di collaboratori, staff e atleti."}
            aside={board ? (
              <>
                {s.authorized > 0 && (
                  <button type="button" onClick={copyList} className={btnGhost} data-testid="comp-copy">
                    <ClipboardCopy className="size-4" aria-hidden="true" /> Elenco bonifici
                  </button>
                )}
                {actor === "DIREZIONE" && (
                  <button type="button" onClick={() => setAdding(true)} className={btnPrimary} data-testid="comp-add">
                    <UserPlus className="size-4" aria-hidden="true" /> Aggiungi persona
                  </button>
                )}
              </>
            ) : null}>
            <div className="px-4 pb-4 sm:px-[18px]">
              {!data.connected ? (
                <EmptyState title="Entra con il tuo account">Compensi e stipendi sono visibili solo alla Direzione e alla Tesoreria, dopo l'accesso personale.</EmptyState>
              ) : !board ? (
                <EmptyState title={data.error ? "Lettura non riuscita" : "Area riservata"}>
                  {data.error ?? "Il tuo account non ha la posizione Direzione o Tesoreria. La Direzione può assegnarla da Accessi."}
                </EmptyState>
              ) : (
                <>
                  {copied && (
                    <div className="mb-3 flex items-start gap-2 rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2 text-[14px] text-[var(--in-info)]">
                      <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap font-[inherit]">{copied}</pre>
                      <button type="button" onClick={() => setCopied(null)} className="scd-focus rounded" aria-label="Chiudi"><X className="size-4" aria-hidden="true" /></button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra per stato">
                    {FILTERS.map((f) => (
                      <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                        className={`scd-focus h-9 rounded-full px-3 text-[14px] font-semibold ${filter === f.id ? "bg-[var(--in-info)] text-white" : "bg-[#eef3f9] text-[var(--in-ink)]"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
                    <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                    <input type="search" placeholder="Cerca nome, ruolo o area" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-full bg-transparent text-[15px] outline-none" aria-label="Cerca" />
                  </label>
                  {shown.length === 0 ? (
                    <div className="mt-3"><EmptyState title="Nessuno in questo elenco">{filter === "autorizzati" ? "Nessun compenso autorizzato da pagare per questo mese." : "Prova un altro filtro o un'altra ricerca."}</EmptyState></div>
                  ) : (
                    <ul className="m-0 mt-3 list-none divide-y divide-[var(--in-line)] p-0" data-testid="comp-list">
                      {shown.map((l) => {
                        const st = lineState(l);
                        return (
                          <li key={l.agreementId}>
                            <button type="button" onClick={() => setSelected(l.agreementId)} aria-pressed={selected === l.agreementId}
                              className={`scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left ${selected === l.agreementId ? "bg-[var(--in-info-bg)]" : "hover:bg-[#f7fbff]"}`}>
                              <span className="min-w-0">
                                <b className="block truncate text-[15.5px] leading-tight">{l.name}</b>
                                <small className="mt-0.5 block truncate text-[13px] text-[var(--in-sub)]">
                                  {[l.role, l.area, CONTRACT_LABEL[l.contractType]].filter(Boolean).join(" · ")}
                                </small>
                                {l.status === "BOZZA" && l.blockers.length > 0 && (
                                  <small className="mt-0.5 block truncate text-[13px] text-[var(--in-warn)]">{l.blockers.map((b) => BLOCKER_LABEL[b] ?? b).join(" · ")}</small>
                                )}
                              </span>
                              <span className="flex flex-col items-end gap-1">
                                <b className="font-title text-[18px] tabular-nums">{euro(l.status === "PAGATO" ? l.paidAmount : l.status === "AUTORIZZATO" ? (l.authorizedNet ?? l.net) : l.net)}</b>
                                <Chip tone={st.tone}>{st.text}</Chip>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          {board && current ? (
            <PersonSheet key={current.agreementId + period} line={current} actor={board.actor} period={period} today={today} onClose={() => setSelected(null)} onChanged={refresh} />
          ) : (
            <HowItWorks actor={actor} />
          )}
          <SourcesBox id="compensi" />
        </div>
      </div>

      {adding && <AgreementDialog line={null} onClose={() => setAdding(false)} onDone={refresh} />}
    </WorkAreaShell>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: ChipTone | undefined }) {
  const bg = tone === "warn" ? "bg-[var(--in-warn-bg)]" : tone === "ok" ? "bg-[var(--in-ok-bg)]" : "bg-[var(--in-info-bg)]";
  return (
    <div className={`min-w-0 rounded-xl px-3 py-2.5 ${bg}`}>
      <span className="block font-title text-[22px] font-black leading-none tabular-nums">{value}</span>
      <span className="mt-1 block text-[13px] leading-tight text-[var(--in-sub)]">{label}</span>
    </div>
  );
}

function HowItWorks({ actor }: { actor: CompActor | null }) {
  const steps = [
    ["Accordo", "Per ogni persona: tipo di rapporto, fisso mensile, IBAN confermato sì/no, contratto o RASD verificato."],
    ["Voci del mese", "Durante il mese Direzione o Tesoreria segnano goal, premi, rimborsi, acconti dati, aiuti casa, con il documento allegato."],
    ["Autorizzazione", "Entro il 15 la Direzione controlla il netto e autorizza. Si può autorizzare solo senza blocchi."],
    ["Pagamento", "La Tesoreria vede gli autorizzati, fa il bonifico dalla banca e lo segna pagato con data e riferimento."],
  ] as const;
  return (
    <Card title="Come funziona" sub={actor === "TESORERIA" ? "Tu vedi in evidenza ciò che la Direzione ha autorizzato." : "Tocca una persona per aprire la sua scheda del mese."}>
      <ol className="m-0 grid list-none gap-3 px-4 pb-4 sm:px-[18px]">
        {steps.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--in-info-bg)] font-title text-[16px] font-black text-[var(--in-info)]">{i + 1}</span>
            <span className="min-w-0 text-[14.5px] leading-snug"><b>{t}.</b> <span className="text-[var(--in-sub)]">{d}</span></span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* --------------------------------------------------------------- person sheet */

function agreementInput(l: CompLine, patch: Partial<AgreementInput> = {}): AgreementInput {
  return {
    id: l.agreementId,
    personCode: l.personCode,
    name: l.name,
    area: l.area,
    role: l.role,
    contractType: l.contractType,
    monthlyFixed: l.monthlyFixed,
    goalRate: l.goalRate,
    ibanStatus: l.ibanStatus,
    contractStatus: l.contractStatus,
    relationshipStatus: l.relationshipStatus,
    startDate: l.startDate,
    endDate: l.endDate,
    ceasedAt: l.ceasedAt,
    notes: l.notes,
    ...patch,
  };
}

function PersonSheet({ line: l, actor, period, today, onClose, onChanged }: { line: CompLine; actor: CompActor; period: string; today: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const save = useServerFn(saveCompAgreement);
  const act = useServerFn(compPeriodAction);
  const [out, setOut] = useState<CompOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const isDir = actor === "DIREZIONE";
  useEffect(() => {
    // On phones the sheet sits under the list: bring it into view when a person is opened.
    if (window.innerWidth < 1024) document.getElementById("comp-scheda-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const locked = l.status === "AUTORIZZATO" || l.status === "PAGATO";
  const st = lineState(l);

  async function run(fn: () => Promise<CompOutcome>) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      setOut(r);
      if (r.ok) await onChanged();
    } catch {
      setOut({ ok: false, message: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }
  const patch = (p: Partial<AgreementInput>) => run(() => save({ data: agreementInput(l, p) }));
  const action = (a: PeriodActionInput["action"], extra: Omit<PeriodActionInput, "agreementId" | "period" | "action"> = {}) =>
    run(() => act({ data: { agreementId: l.agreementId, period, action: a, ...extra } }));

  return (
    <Card id="comp-scheda" title={l.name} sub={[l.role, l.area].filter(Boolean).join(" · ") || "Scheda compensi"}
      aside={<button type="button" onClick={onClose} className="scd-focus rounded-lg p-1.5" aria-label="Chiudi scheda"><X className="size-5" aria-hidden="true" /></button>}>
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px]" data-testid="comp-sheet">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={st.tone}>{st.text}</Chip>
          <Chip tone="mute">{CONTRACT_LABEL[l.contractType]}</Chip>
          {l.relationshipStatus !== "ATTIVO" && <Chip tone="crit">{l.relationshipStatus === "SOSPESO" ? "Sospeso" : "Cessato"}</Chip>}
        </div>

        <section aria-label="Calcolo del mese" className="rounded-xl bg-[#f7fbff] p-3">
          <Row label={`Fisso ${periodLabel(period)}`} value={euro(l.fixed)} />
          <Row label="Voci in più" value={`+ ${euro(l.plus)}`} />
          <Row label="Voci in meno (acconti, aiuti, recuperi)" value={`− ${euro(l.minus)}`} />
          <div className="mt-1.5 flex items-baseline justify-between border-t border-[var(--in-line)] pt-1.5">
            <b>Netto da pagare</b>
            <b className="font-title text-[24px] tabular-nums">{euro(l.net)}</b>
          </div>
          {l.status === "PAGATO" && <p className="m-0 mt-1 text-[13.5px] text-[var(--in-ok)]">Pagato {euro(l.paidAmount)} il {itDay(l.paidAt)}{l.paidMethod ? ` · ${l.paidMethod}` : ""}{l.paidRef ? ` · rif. ${l.paidRef}` : ""}</p>}
          {l.status === "AUTORIZZATO" && <p className="m-0 mt-1 text-[13.5px] text-[var(--in-info)]">Autorizzato {euro(l.authorizedNet)} il {itDay(l.authorizedAt)}</p>}
          {(l.openAdvances > 0 || l.openRecoveries > 0) && (
            <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">Dal foglio storico: acconti aperti {euro(l.openAdvances)}, recuperi da incassare {euro(l.openRecoveries)}. Se valgono per questo mese, registrali come voce.</p>
          )}
        </section>

        {l.status === "BOZZA" && l.blockers.length > 0 && (
          <section aria-label="Cosa manca" className="rounded-xl bg-[var(--in-warn-bg)] p-3 text-[14.5px] text-[var(--in-warn)]">
            <b>Prima di autorizzare:</b>
            <ul className="m-0 mt-1 list-disc pl-5">{l.blockers.map((b) => <li key={b}>{BLOCKER_LABEL[b] ?? b}</li>)}</ul>
          </section>
        )}

        {isDir && !locked && (
          <section aria-label="Verifiche" className="grid gap-2">
            <h3 className="m-0 text-[15px] font-bold">Verifiche della Direzione</h3>
            <label className="grid gap-1 text-[14px]"><span className="font-semibold">IBAN (resta nel foglio protetto: qui solo lo stato)</span>
              <select disabled={busy} value={l.ibanStatus} onChange={(e) => void patch({ ibanStatus: e.target.value as IbanStatus })} className={inputCls}>
                <option value="MANCANTE">Mancante</option><option value="DA_VERIFICARE">Presente, da verificare</option><option value="CONFERMATO">Confermato</option>
              </select>
            </label>
            <label className="grid gap-1 text-[14px]"><span className="font-semibold">Contratto / RASD</span>
              <select disabled={busy} value={l.contractStatus} onChange={(e) => void patch({ contractStatus: e.target.value as ContractStatus })} className={inputCls}>
                <option value="DA_VERIFICARE">Da verificare</option><option value="OK">Verificato</option><option value="BLOCCATO">Bloccato</option>
              </select>
            </label>
            {l.monthlyFixed === 0 && l.legacyMonthly !== null && l.legacyMonthly > 0 && (
              <div className="rounded-[10px] border border-dashed border-[var(--in-line)] p-2.5 text-[14px]">
                Nel foglio storico l'importo mensile era <b>{euro(l.legacyMonthly)}</b>, ma il fisso documentato è zero.
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void patch({ monthlyFixed: l.legacyMonthly ?? 0 })} className={btnGhost}>Usa {euro(l.legacyMonthly)} come fisso</button>
                  <button type="button" disabled={busy} onClick={() => void action("set_fixed", { fixed: l.legacyMonthly ?? 0, note: "importo storico solo per questo mese" })} className={btnGhost}>Solo per {periodLabel(period)}</button>
                </div>
              </div>
            )}
            <button type="button" onClick={() => setEditing(true)} className={btnGhost}>Modifica accordo</button>
          </section>
        )}

        <Feedback out={out} />

        <div className="flex flex-wrap gap-2">
          {isDir && l.status === "BOZZA" && (
            <button type="button" disabled={busy || l.blockers.length > 0} onClick={() => void action("authorize")} className={btnPrimary} data-testid="comp-authorize">
              <ShieldCheck className="size-4" aria-hidden="true" /> Autorizza {euro(l.net)}
            </button>
          )}
          {isDir && l.status === "BOZZA" && <button type="button" disabled={busy} onClick={() => void action("block", { note: "bloccato dalla Direzione" })} className={btnGhost}><Ban className="size-4" aria-hidden="true" /> Blocca</button>}
          {isDir && l.status === "BLOCCATO" && <button type="button" disabled={busy} onClick={() => void action("unblock")} className={btnGhost}><Undo2 className="size-4" aria-hidden="true" /> Togli blocco</button>}
          {isDir && l.status === "AUTORIZZATO" && <button type="button" disabled={busy} onClick={() => void action("unauthorize")} className={btnGhost}><Undo2 className="size-4" aria-hidden="true" /> Togli autorizzazione</button>}
          {l.status === "AUTORIZZATO" && <button type="button" disabled={busy} onClick={() => setPaying(true)} className={btnPrimary} data-testid="comp-pay"><Check className="size-4" aria-hidden="true" /> Segna pagato</button>}
          {isDir && l.status === "PAGATO" && <button type="button" disabled={busy} onClick={() => void action("unmark_paid")} className={btnGhost}><Undo2 className="size-4" aria-hidden="true" /> Annulla pagamento</button>}
        </div>

        <Entries line={l} period={period} today={today} locked={locked} onChanged={onChanged} />
        <Documents line={l} onChanged={onChanged} />
        {l.notes && <p className="m-0 text-[13.5px] leading-snug text-[var(--in-sub)]"><b>Note:</b> {l.notes}</p>}
      </div>
      {editing && <AgreementDialog line={l} onClose={() => setEditing(false)} onDone={onChanged} />}
      {paying && <PayDialog line={l} period={period} today={today} onClose={() => setPaying(false)} onDone={onChanged} />}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
      <span className="text-[var(--in-sub)]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------- entries */

/** Uploads one file for a person; returns the new document id or an error outcome. */
async function uploadFile(send: (opts: { data: FormData }) => Promise<CompOutcome>, agreementId: string, file: File, kind: string): Promise<CompOutcome> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("agreementId", agreementId);
  fd.set("kind", kind);
  return send({ data: fd });
}

function Entries({ line: l, period, today, locked, onChanged }: { line: CompLine; period: string; today: string; locked: boolean; onChanged: () => Promise<void> }) {
  const add = useServerFn(addCompEntry);
  const cancel = useServerFn(cancelCompEntry);
  const upload = useServerFn(uploadCompDocument);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EntryKind>("GOAL");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today.slice(0, 7) === period ? today : `${period}-${today.slice(8, 10) > "28" ? "28" : today.slice(8, 10)}`);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<CompOutcome | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (kind === "GOAL" && l.goalRate && !unit) setUnit(String(l.goalRate));
  }, [kind, l.goalRate, unit]);

  const computed = qty && unit ? Math.round(Number(qty.replace(",", ".")) * Number(unit.replace(",", ".")) * 100) / 100 : null;
  const value = computed ?? (amount ? Number(amount.replace(",", ".")) : NaN);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!Number.isFinite(value) || value <= 0) {
      setOut({ ok: false, message: "Scrivi un importo maggiore di zero (oppure quantità × importo unitario)." });
      return;
    }
    setBusy(true);
    try {
      let documentId: string | undefined;
      if (file) {
        const up = await uploadFile(upload, l.agreementId, file, entrySign(kind) < 0 ? "RICEVUTA" : "GIUSTIFICATIVO");
        if (!up.ok || !up.id) {
          setOut(up);
          return;
        }
        documentId = up.id;
      }
      const r = await add({
        data: {
          agreementId: l.agreementId, period, kind, amount: value, date,
          quantity: computed !== null ? Number(qty.replace(",", ".")) : null,
          unitAmount: computed !== null ? Number(unit.replace(",", ".")) : null,
          note: note.trim() || null, documentId: documentId ?? null,
        },
      });
      setOut(r);
      if (r.ok) {
        setQty(""); setAmount(""); setNote(""); setFile(null);
        await onChanged();
      }
    } catch {
      setOut({ ok: false, message: "Controlla i campi e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel(id: string) {
    if (!reason.trim() || busy) return;
    setBusy(true);
    try {
      const r = await cancel({ data: { entryId: id, reason: reason.trim() } });
      setOut(r);
      if (r.ok) {
        setCancelling(null); setReason("");
        await onChanged();
      }
    } catch {
      setOut({ ok: false, message: "Annullamento non riuscito." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Voci del mese" className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-[15px] font-bold">Voci di {periodLabel(period)}</h3>
        {!locked && !open && <button type="button" onClick={() => setOpen(true)} className={btnGhost} data-testid="comp-entry-open"><Plus className="size-4" aria-hidden="true" /> Aggiungi voce</button>}
      </div>
      {l.entries.length === 0 ? (
        <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessuna voce: il netto è il fisso del mese.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0">
          {l.entries.map((e) => (
            <li key={e.id} className={`py-2 text-[14.5px] ${e.status === "ANNULLATA" ? "opacity-60" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0">
                  <b className={e.status === "ANNULLATA" ? "line-through" : ""}>{ENTRY_LABEL[e.kind]}</b>
                  <small className="block text-[13px] text-[var(--in-sub)]">
                    {itDay(e.date)}{e.quantity !== null && e.unitAmount !== null ? ` · ${e.quantity} × ${euro(e.unitAmount)}` : ""}{e.note ? ` · ${e.note}` : ""}{e.documentId ? " · documento allegato" : ""}
                    {e.status === "ANNULLATA" && e.cancelReason ? ` · annullata: ${e.cancelReason}` : ""}
                  </small>
                </span>
                <span className="flex items-center gap-2">
                  <b className={`tabular-nums ${e.sign < 0 ? "text-[var(--in-crit)]" : ""}`}>{e.sign < 0 ? "−" : "+"} {euro(e.amount)}</b>
                  {!locked && e.status === "ATTIVA" && cancelling !== e.id && (
                    <button type="button" onClick={() => { setCancelling(e.id); setReason(""); }} className="scd-focus rounded p-1 text-[var(--in-sub)]" aria-label={`Annulla ${ENTRY_LABEL[e.kind]}`}><X className="size-4" aria-hidden="true" /></button>
                  )}
                </span>
              </div>
              {cancelling === e.id && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Motivo dell'annullamento" className={`${inputCls} min-w-0 flex-1`} aria-label="Motivo dell'annullamento" />
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => void confirmCancel(e.id)} className={btnPrimary}>Annulla voce</button>
                  <button type="button" onClick={() => setCancelling(null)} className={btnGhost}>Lascia</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {locked && <p className="m-0 text-[13px] text-[var(--in-sub)]">Mese autorizzato o pagato: le voci sono bloccate. Per cambiarle la Direzione toglie l'autorizzazione.</p>}
      {open && !locked && (
        <form onSubmit={submit} className="grid gap-2 rounded-xl border border-[var(--in-line)] p-3 text-[14px] sm:grid-cols-2" data-testid="comp-entry-form">
          <label className="grid gap-1 sm:col-span-2"><span className="font-semibold">Tipo di voce</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as EntryKind)} className={inputCls}>
              <optgroup label="In più">{ENTRY_KINDS.filter((k) => entrySign(k) > 0).map((k) => <option key={k} value={k}>{ENTRY_LABEL[k]}</option>)}</optgroup>
              <optgroup label="In meno (già dato o da recuperare)">{ENTRY_KINDS.filter((k) => entrySign(k) < 0).map((k) => <option key={k} value={k}>{ENTRY_LABEL[k]}</option>)}</optgroup>
            </select>
          </label>
          <label className="grid gap-1"><span className="font-semibold">Quantità (facoltativa)</span><input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="es. 2 goal" className={inputCls} /></label>
          <label className="grid gap-1"><span className="font-semibold">Importo unitario</span><input inputMode="decimal" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="€" className={inputCls} /></label>
          <label className="grid gap-1"><span className="font-semibold">Importo totale</span>
            <input inputMode="decimal" value={computed !== null ? String(computed) : amount} disabled={computed !== null} onChange={(e) => setAmount(e.target.value)} placeholder="€" className={inputCls} />
          </label>
          <label className="grid gap-1"><span className="font-semibold">Data</span><input type="date" value={date} min={`${period}-01`} onChange={(e) => setDate(e.target.value)} className={inputCls} /></label>
          <label className="grid gap-1 sm:col-span-2"><span className="font-semibold">Nota</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. gara del 20/09, scontrino benzina" className={inputCls} maxLength={500} /></label>
          <label className="grid gap-1 sm:col-span-2"><span className="font-semibold">Documento (ricevuta, scontrino, delibera) · PDF o foto</span>
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-[14px]" />
          </label>
          <div className="sm:col-span-2"><Feedback out={out} /></div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className={`${btnPrimary} flex-1`}>{busy ? "Salvo…" : `Registra ${Number.isFinite(value) && value > 0 ? (entrySign(kind) < 0 ? "− " : "+ ") + euro(value) : "voce"}`}</button>
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Chiudi</button>
          </div>
        </form>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ documents */

const DOC_KIND_LABEL: Readonly<Record<string, string>> = {
  CONTRATTO: "Contratto",
  RASD: "Registrazione RASD",
  RICEVUTA: "Ricevuta",
  GIUSTIFICATIVO: "Giustificativo",
  DELIBERA: "Delibera",
  BONIFICO: "Contabile bonifico",
  ALTRO: "Altro",
};

function Documents({ line: l, onChanged }: { line: CompLine; onChanged: () => Promise<void> }) {
  const upload = useServerFn(uploadCompDocument);
  const openDoc = useServerFn(openCompDocument);
  const [kind, setKind] = useState("CONTRATTO");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<CompOutcome | null>(null);

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const r = await uploadFile(upload, l.agreementId, file, kind);
      setOut(r);
      if (r.ok) await onChanged();
    } catch {
      setOut({ ok: false, message: "Caricamento non riuscito." });
    } finally {
      setBusy(false);
    }
  }

  async function show(id: string) {
    try {
      const r = await openDoc({ data: { documentId: id } });
      if (r.url) window.open(r.url, "_blank", "noopener");
      else setOut({ ok: false, message: r.message });
    } catch {
      setOut({ ok: false, message: "Apertura non riuscita." });
    }
  }

  return (
    <section aria-label="Documenti" className="grid gap-2">
      <h3 className="m-0 text-[15px] font-bold">Documenti della persona</h3>
      {l.documents.length === 0 ? (
        <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessun documento. Allega contratto o RASD: servono per sbloccare il pagamento.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {l.documents.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => void show(d.id)} className="scd-focus flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-[14.5px] hover:bg-[#f7fbff]">
                <FileText className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <small className="text-[12.5px] text-[var(--in-sub)]">{DOC_KIND_LABEL[d.kind] ?? d.kind} · {itDay(d.uploadedAt)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputCls} w-auto`} aria-label="Tipo di documento">
          {Object.entries(DOC_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className={`${btnGhost} cursor-pointer`}>
          <Paperclip className="size-4" aria-hidden="true" /> {busy ? "Carico…" : "Allega file"}
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={busy} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <Feedback out={out} />
    </section>
  );
}

/* -------------------------------------------------------------------- dialogs */

const EMPTY_AGREEMENT: AgreementInput = {
  id: null, name: "", area: "", role: "", contractType: "DA_VERIFICARE", monthlyFixed: 0, goalRate: null,
  ibanStatus: "MANCANTE", contractStatus: "DA_VERIFICARE", relationshipStatus: "ATTIVO", startDate: null, endDate: null, ceasedAt: null, notes: "",
};

function AgreementDialog({ line, onClose, onDone }: { line: CompLine | null; onClose: () => void; onDone: () => Promise<void> }) {
  const save = useServerFn(saveCompAgreement);
  const [f, setF] = useState<AgreementInput>(line ? agreementInput(line) : EMPTY_AGREEMENT);
  const [fixed, setFixed] = useState(String(f.monthlyFixed ?? 0));
  const [goal, setGoal] = useState(f.goalRate != null ? String(f.goalRate) : "");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<CompOutcome | null>(null);
  const set = <K extends keyof AgreementInput>(k: K, v: AgreementInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: "name" | "area" | "role" | "notes") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value);
  const dateField = (k: "startDate" | "endDate" | "ceasedAt") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value || null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const monthly = Number(fixed.replace(",", "."));
    const rate = goal.trim() ? Number(goal.replace(",", ".")) : null;
    if (!f.name.trim() || !Number.isFinite(monthly) || monthly < 0 || (rate !== null && (!Number.isFinite(rate) || rate < 0))) {
      setOut({ ok: false, message: "Servono nome e importi validi (zero o più)." });
      return;
    }
    setBusy(true);
    try {
      const r = await save({ data: { ...f, name: f.name.trim(), monthlyFixed: monthly, goalRate: rate, area: f.area || null, role: f.role || null, notes: f.notes || null } });
      setOut(r);
      if (r.ok) {
        await onDone();
        onClose();
      }
    } catch {
      setOut({ ok: false, message: "Controlla i campi e riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={line ? `Accordo di ${line.name}` : "Aggiungi persona ai compensi"} onClose={onClose} testId="comp-agreement">
      <form onSubmit={submit} className="mt-3 grid gap-3 text-[14.5px] sm:grid-cols-2">
        <label className="grid gap-1 sm:col-span-2"><span className="font-bold">Nome e cognome</span><input required value={f.name} onChange={text("name")} className={inputCls} autoComplete="off" /></label>
        <label className="grid gap-1"><span className="font-bold">Ruolo</span><input value={f.role ?? ""} onChange={text("role")} placeholder="es. Mister U17, Responsabile lavanderia" className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Area</span><input value={f.area ?? ""} onChange={text("area")} placeholder="es. Prima squadra, Struttura Colico" className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Tipo di rapporto</span>
          <select value={f.contractType} onChange={(e) => set("contractType", e.target.value as ContractType)} className={inputCls}>
            {(Object.keys(CONTRACT_LABEL) as ContractType[]).map((k) => <option key={k} value={k}>{CONTRACT_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="grid gap-1"><span className="font-bold">Stato del rapporto</span>
          <select value={f.relationshipStatus} onChange={(e) => set("relationshipStatus", e.target.value as RelationshipStatus)} className={inputCls}>
            <option value="ATTIVO">Attivo</option><option value="SOSPESO">Sospeso</option><option value="CESSATO">Cessato</option>
          </select>
        </label>
        <label className="grid gap-1"><span className="font-bold">Fisso mensile (€)</span><input inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Premio per goal (€, facoltativo)</span><input inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">IBAN</span>
          <select value={f.ibanStatus} onChange={(e) => set("ibanStatus", e.target.value as IbanStatus)} className={inputCls}>
            <option value="MANCANTE">Mancante</option><option value="DA_VERIFICARE">Presente, da verificare</option><option value="CONFERMATO">Confermato</option>
          </select>
        </label>
        <label className="grid gap-1"><span className="font-bold">Contratto / RASD</span>
          <select value={f.contractStatus} onChange={(e) => set("contractStatus", e.target.value as ContractStatus)} className={inputCls}>
            <option value="DA_VERIFICARE">Da verificare</option><option value="OK">Verificato</option><option value="BLOCCATO">Bloccato</option>
          </select>
        </label>
        <label className="grid gap-1"><span className="font-bold">Inizio</span><input type="date" value={f.startDate ?? ""} onChange={dateField("startDate")} className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Fine prevista</span><input type="date" value={f.endDate ?? ""} onChange={dateField("endDate")} className={inputCls} /></label>
        {f.relationshipStatus === "CESSATO" && <label className="grid gap-1"><span className="font-bold">Cessato dal</span><input type="date" value={f.ceasedAt ?? ""} onChange={dateField("ceasedAt")} className={inputCls} /></label>}
        <label className="grid gap-1 sm:col-span-2"><span className="font-bold">Note dell'accordo</span><textarea rows={2} value={f.notes ?? ""} onChange={text("notes")} maxLength={1000} className="rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] outline-none focus:border-[var(--in-info)]" /></label>
        <p className="m-0 text-[13px] leading-snug text-[var(--in-sub)] sm:col-span-2">Non scrivere qui IBAN o codice fiscale: restano nel foglio protetto della Direzione. Ogni modifica resta nello storico con il tuo nome.</p>
        <div className="sm:col-span-2"><Feedback out={out} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className={`${btnPrimary} flex-1`}>{busy ? "Salvo…" : line ? "Salva accordo" : "Aggiungi"}</button>
          <button type="button" onClick={onClose} className={btnGhost}>Chiudi</button>
        </div>
      </form>
    </Dialog>
  );
}

function PayDialog({ line: l, period, today, onClose, onDone }: { line: CompLine; period: string; today: string; onClose: () => void; onDone: () => Promise<void> }) {
  const act = useServerFn(compPeriodAction);
  const upload = useServerFn(uploadCompDocument);
  const [amount, setAmount] = useState(String(l.authorizedNet ?? l.net));
  const [paidAt, setPaidAt] = useState(today);
  const [method, setMethod] = useState("Bonifico");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<CompOutcome | null>(null);
  const value = Number(amount.replace(",", "."));
  const differs = Number.isFinite(value) && Math.abs(value - (l.authorizedNet ?? l.net)) > 0.004;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!Number.isFinite(value) || value <= 0) {
      setOut({ ok: false, message: "Importo pagato non valido." });
      return;
    }
    setBusy(true);
    try {
      let documentId: string | null = null;
      if (file) {
        const up = await uploadFile(upload, l.agreementId, file, "BONIFICO");
        if (!up.ok || !up.id) {
          setOut(up);
          return;
        }
        documentId = up.id;
      }
      const r = await act({ data: { agreementId: l.agreementId, period, action: "mark_paid", amount: value, paidAt, method, ref: ref.trim() || null, documentId } });
      setOut(r);
      if (r.ok) {
        await onDone();
        onClose();
      }
    } catch {
      setOut({ ok: false, message: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Pagamento di ${l.name}`} onClose={onClose} testId="comp-pay-dialog">
      <form onSubmit={submit} className="mt-3 grid gap-3 text-[14.5px] sm:grid-cols-2">
        <p className="m-0 sm:col-span-2">Autorizzato dalla Direzione: <b>{euro(l.authorizedNet ?? l.net)}</b> per {periodLabel(period)}. Fai il bonifico dalla banca, poi registralo qui.</p>
        <label className="grid gap-1"><span className="font-bold">Importo pagato (€)</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Data del pagamento</span><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} /></label>
        <label className="grid gap-1"><span className="font-bold">Metodo</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}><option>Bonifico</option><option>Contanti</option><option>Assegno</option><option>Altro</option></select>
        </label>
        <label className="grid gap-1"><span className="font-bold">Riferimento (CRO/TRN)</span><input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} className={inputCls} /></label>
        <label className="grid gap-1 sm:col-span-2"><span className="font-bold">Contabile del bonifico (facoltativa)</span><input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-[14px]" /></label>
        {differs && <p className="m-0 rounded-[10px] bg-[var(--in-warn-bg)] px-3 py-2 text-[var(--in-warn)] sm:col-span-2">L'importo è diverso da quello autorizzato: verrà registrato così, con il tuo nome.</p>}
        <div className="sm:col-span-2"><Feedback out={out} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className={`${btnPrimary} flex-1`}>{busy ? "Registro…" : "Segna pagato"}</button>
          <button type="button" onClick={onClose} className={btnGhost}>Chiudi</button>
        </div>
      </form>
      <p className="mt-3 text-[13px] text-[var(--in-sub)]">L'app non esegue bonifici. Torna a <Link to="/tesoreria" className="underline">Tesoreria</Link>.</p>
    </Dialog>
  );
}
