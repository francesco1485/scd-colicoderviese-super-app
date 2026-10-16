import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ListChecks, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { RolesLink } from "@/components/scd/RolesLink";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  AUDIT_LABEL,
  OFFICE_ROLES,
  POSITION_GROUPS,
  ROLE_LABEL,
  accountCounts,
  canEditAccount,
  filterAccounts,
  grantablePositions,
  grantableRoles,
  lastSeen,
  positionLabel,
  roleLabelOf,
  type Account,
  type AccountFilter,
} from "@/lib/access-admin";
import { getAccessAdmin, grantPersonAccess, revokeLink, setAccess, setTeams, type AccessAdminData } from "@/lib/access-admin.functions";
import { getPeople, type PeopleData } from "@/lib/people.functions";
import { positionLive, type DbRole } from "@/lib/session";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Personalised access (r65): who can enter the app and what they can do. Direzione manages everyone but itself;
 * Segreteria manages non-office accounts. Every change is written to the audit trail shown at the bottom.
 */
export const Route = createFileRoute("/direzione_/accessi")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "accessi" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const [data, people] = await Promise.all([getAccessAdmin(), getPeople()]);
    return { gate, interior: true as const, data, people };
  },
  head: ({ loaderData }) => workAreaHead("accessi", loaderData?.gate),
  component: AccessiRoute,
});

function AccessiRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="accessi" gate={d.gate}>
      {d.interior && <AccessiPage initial={d.data} people={d.people} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

/** r138 live on the database (server-verified, AccessAdminData.r138Live): until then the r138 positions are not offered. */
const R138Live = createContext(false);

const ROLE_TONE: Partial<Record<DbRole, ChipTone>> = { DIRECTION: "crit", SECRETARIAT: "warn", MISTER: "info", MANAGER: "info", STAFF: "mute", FAMILY: "ok", ATHLETE: "ok" };
const inputCls = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";

function AccessiPage({ initial, people, preview }: { initial: AccessAdminData; people: PeopleData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<AccountFilter>({ status: "attivi", role: "tutti" });
  const [open, setOpen] = useState<Account | null>(null);
  const [granting, setGranting] = useState(false);
  const [limit, setLimit] = useState(60);
  const reload = useServerFn(getAccessAdmin);
  const counts = useMemo(() => accountCounts(data.accounts), [data]);
  const shown = useMemo(() => filterAccounts(data.accounts, filter), [data, filter]);

  async function refresh() {
    try {
      setData(await reload());
    } catch {
      /* keep */
    }
  }

  return (
    <R138Live.Provider value={data.r138Live === true}>
    <WorkAreaShell
      id="accessi"
      preview={preview}
      editable
      highlights={[
        { value: data.connected ? counts.active : null, label: "accessi attivi" },
        { value: data.connected ? counts.signedIn : null, label: "già entrati almeno una volta" },
        { value: data.connected ? counts.withExtraAreas : null, label: "con aree su misura" },
        { value: data.connected ? counts.suspended : null, label: "sospesi" },
      ]}
      note={<>Ogni modifica vale dal caricamento successivo della pagina di chi la riceve e resta nello storico. Nessuno può modificare il proprio accesso.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card
            id="accessi-elenco"
            title="Chi entra nell'app"
            sub={data.connected ? `${shown.length} di ${counts.total} accessi` : "Accessi, ruoli e aree."}
            aside={
              data.connected ? (
                <button type="button" onClick={() => setGranting(true)} className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3.5 text-[14.5px] font-bold text-white">
                  <UserPlus className="size-4" aria-hidden="true" />
                  Dai accesso
                </button>
              ) : null
            }
          >
            <div className="px-4 pb-4 sm:px-[18px]">
              {!data.connected ? (
                <EmptyState title="Dati non disponibili">Serve un accesso con ruolo Direzione o Segreteria e il collegamento al database del club.</EmptyState>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
                      <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                      <input type="search" placeholder="Cerca e-mail, nome, area" value={filter.q ?? ""} onChange={(e) => { setFilter({ ...filter, q: e.target.value }); setLimit(60); }} className="h-10 w-full bg-transparent text-[15px] outline-none" aria-label="Cerca accessi" />
                    </label>
                    <select value={filter.role ?? "tutti"} onChange={(e) => setFilter({ ...filter, role: e.target.value as AccountFilter["role"] })} className="h-10 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Ruolo">
                      <option value="tutti">Tutti i ruoli</option>
                      <option value="ufficio">Ufficio</option>
                      {(["MISTER", "MANAGER", "STAFF", "FAMILY", "ATHLETE"] as DbRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <select value={filter.status ?? "attivi"} onChange={(e) => setFilter({ ...filter, status: e.target.value as AccountFilter["status"] })} className="h-10 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Stato">
                      <option value="attivi">Attivi</option>
                      <option value="mai-entrati">Mai entrati</option>
                      <option value="sospesi">Sospesi</option>
                      <option value="tutti">Tutti</option>
                    </select>
                  </div>
                  {shown.length === 0 ? (
                    <div className="mt-3"><EmptyState title="Nessun risultato">Prova a cambiare ricerca o filtri.</EmptyState></div>
                  ) : (
                    <>
                      <ul className="m-0 mt-3 list-none divide-y divide-[var(--in-line)] p-0">
                        {shown.slice(0, limit).map((a) => (
                          <li key={a.userId}>
                            <button type="button" onClick={() => setOpen(a)} className="scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[#f7fbff]">
                              <span className="min-w-0">
                                <b className="block truncate text-[15.5px] leading-tight">{a.persons[0]?.name ?? a.email}{a.persons.length > 1 ? ` +${a.persons.length - 1}` : ""}</b>
                                <small className="mt-0.5 block truncate text-[13px] text-[var(--in-sub)]">
                                  {a.email} · {lastSeen(a.lastSignInAt)}
                                  {a.positions.length ? ` · ${a.positions.map(positionLabel).join(", ")}` : ""}
                                  {a.teams.length ? ` · squadre ${a.teams.join(", ")}` : ""}
                                </small>
                              </span>
                              <span className="flex flex-wrap justify-end gap-1">
                                {!a.active && <Chip tone="mute">Sospeso</Chip>}
                                <Chip tone={ROLE_TONE[a.role] ?? "mute"}>{roleLabelOf(a.role)}</Chip>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {shown.length > limit && (
                        <button type="button" onClick={() => setLimit((n) => n + 100)} className="scd-focus mt-2 h-11 w-full rounded-[10px] border border-[var(--in-line)] text-[15px] font-semibold text-[var(--in-info)]">
                          Mostra altri ({shown.length - limit})
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <RolesLink />
          <Card id="accessi-regole" title="Le regole" sub="Le applica il database, non solo questa pagina.">
            <ul className="m-0 list-none px-4 pb-4 text-[14.5px] leading-snug sm:px-[18px]">
              <li className="flex gap-2 py-1"><ShieldCheck className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />Ruoli e aree d'ufficio li dà e li toglie solo la Direzione.</li>
              <li className="flex gap-2 py-1"><ShieldCheck className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />La Segreteria gestisce famiglie, atleti, staff, dirigenti, mister e le aree di servizio.</li>
              <li className="flex gap-2 py-1"><ShieldCheck className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />Nessuno modifica il proprio accesso; resta sempre almeno una Direzione.</li>
              <li className="flex gap-2 py-1"><ShieldCheck className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />Mister e dirigenti vedono le squadre del loro ruolo nell'organigramma; i genitori solo i propri figli.</li>
            </ul>
          </Card>
          <Card id="accessi-abilitazioni" title="Abilitazioni per persona" sub="Decisione della Direzione del 14/10/2026.">
            <div className="px-4 pb-4 text-[14.5px] leading-snug sm:px-[18px]">
              <p className="m-0">Il ruolo diventa solo una descrizione: ogni sezione si abilita persona per persona, scegliendo <b>Vede</b>, <b>Modifica</b> o <b>Approva</b> e su cosa (tutto, sue annate, sua sede, suoi figli, solo sé).</p>
              <p className="m-0 mt-2 flex items-start gap-2"><ListChecks className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />Apri un accesso e premi <b>Abilitazioni</b> accanto alla persona collegata.</p>
              {data.grantsEngine !== "applied" && (
                <p className="m-0 mt-2 rounded-xl bg-[var(--in-warn-bg)] px-3 py-2 text-[var(--in-warn)]">Da attivare: serve l'OK della Direzione per applicare r100. Fino ad allora gli accessi restano esattamente come oggi.</p>
              )}
            </div>
          </Card>
          <AuditCard audit={data.audit} />
          <SourcesBox id="accessi" />
        </div>
      </div>

      {open && (
        <AccountDialog
          account={open}
          teams={data.teams}
          actorRole={data.actorRole}
          isSelf={Boolean(data.actorEmail && open.email.toLowerCase() === data.actorEmail)}
          onClose={() => setOpen(null)}
          onDone={async () => { setOpen(null); await refresh(); }}
        />
      )}
      {granting && <GrantDialog people={people} actorRole={data.actorRole} onClose={() => setGranting(false)} onDone={async () => { setGranting(false); await refresh(); }} />}
    </WorkAreaShell>
    </R138Live.Provider>
  );
}

function AuditCard({ audit }: { audit: AccessAdminData["audit"] }) {
  const [all, setAll] = useState(false);
  const rows = all ? audit : audit.slice(0, 8);
  return (
    <Card id="accessi-storico" title="Storico modifiche" sub={audit.length ? "Chi ha cambiato cosa, e quando." : "Ancora nessuna modifica."}>
      <ul className="m-0 list-none px-4 pb-3 sm:px-[18px]">
        {rows.map((e) => (
          <li key={e.id} className="border-t border-[var(--in-line)] py-2 text-[14px] first:border-t-0">
            <b className="block">{AUDIT_LABEL[e.action] ?? e.action}{e.targetPerson ? ` · ${e.targetPerson}` : e.targetEmail ? ` · ${e.targetEmail}` : ""}</b>
            <span className="block text-[13px] text-[var(--in-sub)]">
              {new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(e.createdAt))}
              {e.actorEmail ? ` · da ${e.actorEmail}` : ""}
              {e.summary ? ` · ${e.summary}` : ""}
              {e.note ? ` · "${e.note}"` : ""}
            </span>
          </li>
        ))}
      </ul>
      {audit.length > 8 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="scd-focus mx-4 mb-4 text-[14px] font-semibold text-[var(--in-info)] sm:mx-[18px]">{all ? "Mostra meno" : `Mostra tutte (${audit.length})`}</button>
      )}
    </Card>
  );
}

function PositionsPicker({ value, onChange, allowed }: { value: string[]; onChange: (v: string[]) => void; allowed: readonly string[] }) {
  const live = useContext(R138Live);
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1 text-[15px] font-semibold">Aree in più</legend>
      <p className="m-0 mb-2 text-[13px] text-[var(--in-sub)]">Si aggiungono a quelle del ruolo. Esempio: un dirigente che guida il pulmino riceve "Autista".</p>
      <div className="grid gap-3">
        {POSITION_GROUPS.map((g) => ({ ...g, ids: g.ids.filter((p) => positionLive(p, live) || value.includes(p)) }))
          .filter((g) => g.ids.length > 0)
          .map((g) => (
          <div key={g.label}>
            <p className="m-0 mb-1 text-[13px] font-semibold text-[var(--in-sub)]">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {g.ids.map((p) => {
                const can = allowed.includes(p);
                const on = value.includes(p);
                return (
                  <label key={p} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[14px] ${on ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"} ${can ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                    <input type="checkbox" checked={on} disabled={!can && !on} onChange={() => can && toggle(p)} className="size-4 accent-[var(--scd-blue)]" />
                    {positionLabel(p)}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#021433]/50 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="m-0 min-w-0 break-words text-[19px] font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="scd-focus flex size-11 flex-none items-center justify-center rounded-lg"><X className="size-5" aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TeamsPicker({ value, onChange, teams, disabled }: { value: string[]; onChange: (v: string[]) => void; teams: AccessAdminData["teams"]; disabled: boolean }) {
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1 text-[15px] font-semibold">Squadre in più</legend>
      <p className="m-0 mb-2 text-[13px] text-[var(--in-sub)]">Rosa e convocazioni di queste squadre, oltre a quelle del suo ruolo nell'organigramma.</p>
      <div className="flex flex-wrap gap-2">
        {teams.filter((t) => t.status !== "WITHDRAWN" || value.includes(t.code)).map((t) => {
          const on = value.includes(t.code);
          return (
            <label key={t.code} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[14px] ${on ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <input type="checkbox" checked={on} disabled={disabled} onChange={() => toggle(t.code)} className="size-4 accent-[var(--scd-blue)]" />
              {t.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AccountDialog({ account, teams, actorRole, isSelf, onClose, onDone }: { account: Account; teams: AccessAdminData["teams"]; actorRole: DbRole | null; isSelf: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const save = useServerFn(setAccess);
  const saveTeams = useServerFn(setTeams);
  const [teamCodes, setTeamCodes] = useState<string[]>(account.teams);
  const revoke = useServerFn(revokeLink);
  const [role, setRole] = useState<DbRole>(account.role);
  const [positions, setPositions] = useState<string[]>(account.positions);
  const [active, setActive] = useState(account.active);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = canEditAccount(actorRole, account.role, isSelf);
  const roles = grantableRoles(actorRole);
  const allowed = grantablePositions(actorRole, useContext(R138Live));
  const accessChanged = role !== account.role || active !== account.active || [...positions].sort().join() !== [...account.positions].sort().join();
  const teamsChanged = [...teamCodes].sort().join() !== [...account.teams].sort().join();
  const changed = accessChanged || teamsChanged;

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      if (accessChanged) {
        const res = await save({ data: { userId: account.userId, role, positions, active, note } });
        setMessage(res.message);
        if (!res.ok) return;
      }
      if (teamsChanged) {
        const res = await saveTeams({ data: { userId: account.userId, teams: teamCodes, note } });
        setMessage(res.message);
        if (!res.ok) return;
      }
      await onDone();
    } catch {
      setMessage("Modifica non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }
  async function unlink(personId: string) {
    setBusy(true);
    try {
      const res = await revoke({ data: { userId: account.userId, personId, note } });
      setMessage(res.message);
      if (res.ok) await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={account.email} onClose={onClose}>
      <p className="m-0 text-[14px] text-[var(--in-sub)]">{lastSeen(account.lastSignInAt)} · {account.active ? "attivo" : "sospeso"}</p>
      {!editable && (
        <p className="mt-3 rounded-xl bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#7a5200]">
          {isSelf ? "È il tuo accesso: lo può modificare solo un'altra persona della Direzione." : "Account d'ufficio: lo può modificare solo la Direzione."}
        </p>
      )}

      <div className="mt-4">
        <p className="m-0 mb-1 text-[15px] font-semibold">Persone collegate</p>
        {account.persons.length === 0 ? (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessuna: vede solo le parti pubbliche e le aree del ruolo.</p>
        ) : (
          <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
            {account.persons.map((p) => (
              <li key={p.id} className="flex min-h-11 items-center justify-between gap-2 border-t border-[var(--in-line)] px-3 py-1.5 text-[14.5px] first:border-t-0">
                <span className="min-w-0 truncate"><b>{p.name}</b> <span className="text-[13px] text-[var(--in-sub)]">· {p.kind}</span></span>
                <span className="flex flex-none items-center gap-1">
                  <Link to="/direzione/accessi/$personId" params={{ personId: p.id }} className="scd-focus inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13.5px] font-semibold text-[var(--in-info)]">
                    <ListChecks className="size-4" aria-hidden="true" />Abilitazioni
                  </Link>
                  {editable && <button type="button" disabled={busy} onClick={() => void unlink(p.id)} className="scd-focus h-9 rounded-lg px-2 text-[13.5px] font-semibold text-[#9a1d14]">Revoca</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
        Ruolo
        <select value={role} disabled={!editable} onChange={(e) => setRole(e.target.value as DbRole)} className={`${inputCls} font-normal`}>
          {!roles.includes(account.role) && <option value={account.role}>{roleLabelOf(account.role)}</option>}
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}{OFFICE_ROLES.includes(r) ? " (ufficio)" : ""}</option>)}
        </select>
      </label>

      <div className="mt-4"><PositionsPicker value={positions} onChange={setPositions} allowed={editable ? allowed : []} /></div>

      {teams.length > 0 && <div className="mt-4"><TeamsPicker value={teamCodes} onChange={setTeamCodes} teams={teams} disabled={!editable} /></div>}

      <label className="mt-4 flex min-h-11 items-center gap-3 text-[15px] font-semibold">
        <input type="checkbox" checked={!active} disabled={!editable} onChange={(e) => setActive(!e.target.checked)} className="size-5 accent-[#b42318]" />
        Sospendi l'accesso
      </label>

      <label className="mt-3 flex flex-col gap-1 text-[15px] font-semibold">
        Motivo della modifica
        <input value={note} maxLength={300} disabled={!editable} onChange={(e) => setNote(e.target.value)} placeholder="Es. nuovo autista pulmini" className={`${inputCls} font-normal`} />
      </label>

      <button type="button" disabled={!editable || !changed || busy} onClick={() => void submit()} className="scd-focus mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[16px] font-semibold text-white disabled:opacity-50">
        <KeyRound className="size-[18px]" aria-hidden="true" />{busy ? "Salvo…" : "Salva"}
      </button>
      <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
    </Sheet>
  );
}

function GrantDialog({ people, actorRole, onClose, onDone }: { people: PeopleData; actorRole: DbRole | null; onClose: () => void; onDone: () => Promise<void> }) {
  const live = useContext(R138Live);
  const grant = useServerFn(grantPersonAccess);
  const [q, setQ] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DbRole>("STAFF");
  const [positions, setPositions] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const results = useMemo(() => {
    const t = fold(q.trim());
    if (t.length < 2) return [];
    return people.people.filter((p) => p.status !== "LEFT" && fold(p.displayName).includes(t)).slice(0, 8);
  }, [q, people.people]);
  const person = people.people.find((p) => p.id === personId) ?? null;
  const roles = grantableRoles(actorRole);

  async function submit() {
    if (!personId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await grant({ data: { personId, email, role, positions, note } });
      setMessage(res.message);
      if (res.ok) await onDone();
    } catch {
      setMessage("Controlla l'e-mail e riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Dai accesso a una persona" onClose={onClose}>
      <label className="flex flex-col gap-1 text-[15px] font-semibold">
        Persona
        <span className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] px-3">
          <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome" className="h-11 w-full bg-transparent text-[15px] font-normal outline-none" />
        </span>
      </label>
      {person && <p className="mt-2 text-[14.5px]"><b>{person.displayName}</b>{person.birthYear ? ` · ${person.birthYear}` : ""} · {person.kind === "staff" ? person.roles.map((r) => r.label).join(", ") : person.kind}</p>}
      {results.length > 0 && (
        <ul className="m-0 mt-2 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { setPersonId(p.id); setQ(""); if (p.kind === "staff") setRole(p.roles.some((r) => r.kind === "MISTER") ? "MISTER" : "MANAGER"); if (p.kind === "atleta") setRole("ATHLETE"); }} className="scd-focus flex min-h-11 w-full items-center justify-between gap-2 border-t border-[var(--in-line)] px-3 text-left text-[14.5px] first:border-t-0 hover:bg-[#f7fbff]">
                <span className="truncate">{p.displayName}{p.minor ? " · minore" : ""}</span>
                <span className="text-[13px] text-[var(--in-sub)]">{p.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {person?.minor && <p className="mt-2 rounded-xl bg-[#fff3c4] px-3 py-2 text-[14px] text-[#7a5200]">È minorenne: sotto i 14 anni l'accesso va al genitore (si collega dalla registrazione o dalle famiglie), dai 14 ai 17 serve il consenso della famiglia.</p>}

      <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
        E-mail per entrare
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" className={`${inputCls} font-normal`} />
      </label>
      <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
        Ruolo
        <select value={role} onChange={(e) => setRole(e.target.value as DbRole)} className={`${inputCls} font-normal`}>
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}{OFFICE_ROLES.includes(r) ? " (ufficio)" : ""}</option>)}
        </select>
      </label>
      <div className="mt-4"><PositionsPicker value={positions} onChange={setPositions} allowed={grantablePositions(actorRole, live)} /></div>
      <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
        Motivo
        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Es. nuovo dirigente accompagnatore U15" className={`${inputCls} font-normal`} />
      </label>
      <button type="button" disabled={busy || !personId || !email} onClick={() => void submit()} className="scd-focus mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[16px] font-semibold text-white disabled:opacity-50">
        <UserPlus className="size-[18px]" aria-hidden="true" />{busy ? "Attivo…" : "Attiva l'accesso"}
      </button>
      <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
    </Sheet>
  );
}
