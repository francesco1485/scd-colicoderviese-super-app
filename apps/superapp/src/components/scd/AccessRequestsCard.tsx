import { useServerFn } from "@tanstack/react-start";
import { Check, Search, UserCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  CREATOR_POSITIONS,
  GRANTABLE_ROLES,
  MATCH_LABEL,
  ageOn,
  baseRoleFor,
  cardToKeep,
  isSeatPosition,
  type GrantableRole,
} from "@/lib/access-requests";
import {
  approveAccessRequestMulti,
  getAccessCandidates,
  getAccessRequests,
  rejectAccessRequest,
  type AccessCandidate,
  type AccessRequestRow,
} from "@/lib/access-requests.functions";
import { itDate, type PersonRow } from "@/lib/people";
import { POSITION_GROUP_LABEL, type CatalogPosition } from "@/lib/position-catalog";
import { getPositionCatalog } from "@/lib/position-catalog.functions";

/**
 * Office queue of self-registrations (r64). Direzione / Segreteria verify who the person is and record EVERYTHING the
 * person is in the club (UD-189, r121): the cards of the same human are merged into one, then parent of one or more
 * children, athlete, and any organigram positions from the FIGC/LND/SGS/RASD catalogue. The app account gets the
 * highest base level; sections stay closed until the Direzione opens them (r100).
 */
export function AccessRequestsCard({ people, today, canWrite, onChanged }: { people: PersonRow[]; today: string; canWrite: boolean; onChanged: () => Promise<void> }) {
  const load = useServerFn(getAccessRequests);
  const [rows, setRows] = useState<AccessRequestRow[] | null>(null);
  const [open, setOpen] = useState<AccessRequestRow | null>(null);
  const [showDone, setShowDone] = useState(false);

  async function refresh() {
    try {
      setRows(await load());
    } catch {
      setRows([]);
    }
  }
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = (rows ?? []).filter((r) => r.status === "PENDING");
  const done = (rows ?? []).filter((r) => r.status !== "PENDING").slice(0, 20);

  return (
    <Card id="persone-richieste" title="Richieste di accesso" sub={rows === null ? "Carico le richieste…" : pending.length ? `${pending.length} da verificare` : "Nessuna richiesta da verificare."}>
      <div className="flex flex-col gap-2 px-4 pb-4 sm:px-[18px]">
        {rows !== null && pending.length === 0 && (
          <EmptyState title="Tutto in ordine">Chi si registra da "Registrati" compare qui. Puoi anche compilare il modulo per conto di una persona.</EmptyState>
        )}
        {pending.length > 0 && (
          <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0">
            {pending.map((r) => {
              const age = ageOn(r.birthDate, today);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r)} className="scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[#f7fbff]">
                    <span className="min-w-0">
                      <b className="block truncate text-[15.5px]">{r.firstName} {r.lastName}</b>
                      <small className="block truncate text-[13px] text-[var(--in-sub)]">{age !== null ? `${age} anni` : ""} · {r.email} · arrivata il {itDate(r.createdAt.slice(0, 10))}</small>
                    </span>
                    <span className="flex gap-1">{r.minor && <Chip tone="warn">14-17 anni</Chip>}<Chip tone="info">Verifica</Chip></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {done.length > 0 && (
          <button type="button" onClick={() => setShowDone((v) => !v)} className="scd-focus justify-self-start text-[14px] font-semibold text-[var(--in-info)] underline-offset-2 hover:underline">
            {showDone ? "Nascondi" : "Mostra"} le ultime gestite ({done.length})
          </button>
        )}
        {showDone && (
          <ul className="m-0 list-none p-0 text-[14px]">
            {done.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 border-t border-[var(--in-line)] py-2">
                <span className="min-w-0 truncate">{r.firstName} {r.lastName}{r.reviewNote ? ` · ${r.reviewNote}` : ""}</span>
                <Chip tone={r.status === "APPROVED" ? "ok" : "mute"}>{r.status === "APPROVED" ? `Attivato · ${GRANTABLE_ROLES.find((g) => g.id === r.grantedRole)?.label ?? r.grantedRole}` : "Rifiutato"}</Chip>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && (
        <ReviewDialog
          request={open}
          people={people}
          today={today}
          canWrite={canWrite}
          onClose={() => setOpen(null)}
          onDone={async () => {
            setOpen(null);
            await refresh();
            await onChanged();
          }}
        />
      )}
    </Card>
  );
}

const BASE_LABEL: Readonly<Record<GrantableRole, string>> = {
  FAMILY: "Famiglia",
  ATHLETE: "Atleta",
  MISTER: "Mister",
  MANAGER: "Dirigente",
  STAFF: "Staff",
};

interface PickedPosition {
  code: string;
  label: string;
  roleKind: string;
  teamCode: string | null;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const sectionTitle = "mb-2 text-[15px] font-semibold";
const box = "rounded-xl border border-[var(--in-line)] px-3 py-2";

function ReviewDialog({ request, people, today, canWrite, onClose, onDone }: { request: AccessRequestRow; people: PersonRow[]; today: string; canWrite: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const candidatesFn = useServerFn(getAccessCandidates);
  const catalogFn = useServerFn(getPositionCatalog);
  const approve = useServerFn(approveAccessRequestMulti);
  const reject = useServerFn(rejectAccessRequest);
  const [candidates, setCandidates] = useState<AccessCandidate[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogPosition[] | null>(null);
  const [same, setSame] = useState<string[]>([]);
  const [keepId, setKeepId] = useState<string | null>(null);
  const [parent, setParent] = useState(false);
  const [athlete, setAthlete] = useState(request.minor);
  const [children, setChildren] = useState<string[]>([]);
  const [childQuery, setChildQuery] = useState("");
  const [positions, setPositions] = useState<PickedPosition[]>([]);
  const [posQuery, setPosQuery] = useState("");
  const [note, setNote] = useState("");
  const [mergeOk, setMergeOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const age = ageOn(request.birthDate, today);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  useEffect(() => {
    void candidatesFn({ data: { id: request.id } })
      .then((c) => {
        setCandidates(c);
        // Nothing is ticked by itself: a parent's request often matches the child's card by e-mail (review 17/10).
        setSame([]);
      })
      .catch(() => setCandidates([]));
    void catalogFn()
      .then((v) => setCatalog(v.positions.filter((p) => p.status === "ACTIVE" && isSeatPosition(p.code))))
      .catch(() => setCatalog([]));
  }, [request.id, candidatesFn, catalogFn]);

  const ticked = useMemo(
    () => (candidates ?? []).filter((c) => same.includes(c.personId)).map((c) => ({ ...c, roleCount: byId.get(c.personId)?.roles.length ?? 0 })),
    [candidates, same, byId],
  );
  const keep = ticked.find((c) => c.personId === keepId) ?? cardToKeep(ticked);
  const mergeIds = ticked.filter((c) => c.personId !== keep?.personId).map((c) => c.personId);
  // Roles the human already holds on any of the ticked cards (shown, never duplicated).
  const held = ticked.flatMap((c) => byId.get(c.personId)?.roles ?? []);
  const heldKinds = held.map((r) => r.kind as string);

  const base = baseRoleFor({ parent, athlete, positionKinds: [...heldKinds, ...positions.map((p) => p.roleKind)] });
  const teams = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of people) for (const t of p.teams) m.set(t.code, t.name);
    for (const p of people) for (const r of p.roles) if (r.teamCode && r.teamName) m.set(r.teamCode, r.teamName);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "it"));
  }, [people]);

  const childResults = useMemo(() => {
    const q = fold(childQuery.trim());
    if (q.length < 2) return [];
    return people.filter((p) => p.kind === "atleta" && p.status !== "LEFT" && !children.includes(p.id) && fold(p.displayName).includes(q)).slice(0, 8);
  }, [childQuery, people, children]);
  const posResults = useMemo(() => {
    const q = fold(posQuery.trim());
    if (!catalog || q.length < 2) return [];
    return catalog.filter((p) => !positions.some((x) => x.code === p.code) && (fold(p.label).includes(q) || p.code.includes(q))).slice(0, 10);
  }, [posQuery, catalog, positions]);

  const missingChild = parent && children.length === 0;
  const requestYear = Number(request.birthDate.slice(0, 4)) || null;
  /** A card that cannot be the requester: another birth year, or an athlete card with no year for an adult's request. */
  const notRequester = (c: AccessCandidate) =>
    (c.birthYear !== null && requestYear !== null && c.birthYear !== requestYear) || (c.birthYear === null && c.kind === "atleta" && !request.minor);
  const canApprove = canWrite && !busy && base !== null && !missingChild && (mergeIds.length === 0 || mergeOk);

  async function doApprove() {
    if (!base) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await approve({
        data: {
          id: request.id,
          personId: keep?.personId ?? null,
          mergeIds,
          role: base,
          positions: positions.map((p) => ({ code: p.code, teamCode: p.teamCode })),
          childIds: parent ? children : [],
          note,
        },
      });
      setMessage(res.message);
      if (res.ok) await onDone();
    } catch {
      setMessage("Autorizzazione non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }
  async function doReject() {
    setBusy(true);
    try {
      const res = await reject({ data: { id: request.id, note } });
      setMessage(res.message);
      if (res.ok) await onDone();
    } catch {
      setMessage("Operazione non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#021433]/50 sm:items-center" role="dialog" aria-modal="true" aria-label={`Verifica ${request.firstName} ${request.lastName}`}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[19px] font-bold">{request.firstName} {request.lastName}</h3>
            <p className="m-0 mt-1 text-[14px] text-[var(--in-sub)]">Nato/a il {itDate(request.birthDate)}{age !== null ? ` (${age} anni)` : ""}</p>
            <p className="m-0 break-all text-[14px] text-[var(--in-sub)]">{request.email} · {request.phone}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="scd-focus flex size-11 shrink-0 items-center justify-center rounded-lg"><X className="size-5" aria-hidden="true" /></button>
        </div>

        {request.minor && (
          <p className="mt-3 rounded-xl bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#7a5200]">Ha tra 14 e 17 anni: prima di attivare verifica il consenso di un genitore. Un minorenne non ha cariche nell'organigramma.</p>
        )}

        {/* 1. Chi è */}
        <fieldset className="mt-4 min-w-0 border-0 p-0">
          <legend className={sectionTitle}>1 · Chi è nel database</legend>
          {candidates === null ? (
            <p className="text-[14px] text-[var(--in-sub)]">Cerco corrispondenze…</p>
          ) : candidates.length === 0 ? (
            <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessuna scheda simile: ne creo una nuova.</p>
          ) : (
            <div className="grid gap-1.5">
              <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Spunta tutte le schede che sono questa stessa persona: diventano una sola, con tutti i suoi ruoli.</p>
              {candidates.map((c) => {
                const on = same.includes(c.personId);
                const roles = byId.get(c.personId)?.roles ?? [];
                const other = notRequester(c);
                return (
                  <label key={c.personId} className={`flex min-h-11 items-center gap-3 ${box} text-[14.5px] ${other ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${on ? "border-[var(--scd-blue)] bg-[#f3f8ff]" : ""}`}>
                    <input type="checkbox" checked={on} disabled={other} onChange={() => { setMergeOk(false); setSame((s) => (on ? s.filter((x) => x !== c.personId) : [...s, c.personId])); }} className="size-5 accent-[var(--scd-blue)]" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{c.displayName}{c.birthYear ? ` · ${c.birthYear}` : ""}</b>
                      <small className="block text-[13px] text-[var(--in-sub)]">{c.kind}{c.teamCodes.length ? ` · ${c.teamCodes.join(", ")}` : ""} · {MATCH_LABEL[c.match] ?? c.match}</small>
                      {roles.length > 0 && <small className="block text-[13px] text-[#0b2a5b]">Ha già: {roles.map((r) => r.label + (r.teamName ? ` (${r.teamName})` : "")).join(", ")}</small>}
                      {other ? (
                        <small className="block text-[13px] font-semibold text-[#9a1d14]">Non è questa persona: {c.birthYear !== null ? "anno di nascita diverso" : "atleta senza anno"} (forse un figlio: collegalo sotto, come genitore).</small>
                      ) : (
                        c.match !== "NAME" && !on && <small className="block text-[13px] font-semibold text-[#7a5200]">Probabile stessa persona: controlla e spunta.</small>
                      )}
                    </span>
                  </label>
                );
              })}
              {ticked.length > 1 && keep && (
                <label className="mt-1 flex flex-col gap-1 text-[14px] font-semibold">
                  Scheda che resta (le altre si uniscono qui)
                  <select value={keep.personId} onChange={(e) => setKeepId(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[15px] font-normal">
                    {ticked.map((c) => <option key={c.personId} value={c.personId}>{c.displayName}{c.birthYear ? ` · ${c.birthYear}` : ""} · {c.kind}</option>)}
                  </select>
                </label>
              )}
              {mergeIds.length > 0 && (
                <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#7a5200]">
                  <input type="checkbox" checked={mergeOk} onChange={() => setMergeOk((v) => !v)} className="mt-0.5 size-5 shrink-0 accent-[var(--scd-blue)]" />
                  <span>Ho verificato che {ticked.length} schede sono la stessa persona. L'unione non si può annullare: ruoli, figli e documenti passano sulla scheda che resta.</span>
                </label>
              )}
              {ticked.length === 0 && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Nessuna spuntata: creo una scheda nuova (solo se è davvero un'altra persona, per esempio un omonimo).</p>}
            </div>
          )}
        </fieldset>

        {/* 2. Cosa fa nel club */}
        <fieldset className="mt-5 min-w-0 border-0 p-0">
          <legend className={sectionTitle}>2 · Cosa fa nel club (anche più cose)</legend>
          <div className="grid gap-1.5">
            <label className={`flex min-h-11 cursor-pointer items-center gap-3 ${box} text-[14.5px]`}>
              <input type="checkbox" checked={parent} onChange={() => setParent((v) => !v)} className="size-5 accent-[var(--scd-blue)]" />
              Genitore / tutore
            </label>
            {parent && (
              <div className="ml-2 border-l-2 border-[var(--in-line)] pl-3">
                {children.map((id) => {
                  const ch = byId.get(id);
                  return (
                    <p key={id} className="m-0 flex min-h-9 items-center justify-between gap-2 text-[14.5px]">
                      <span className="flex items-center gap-2"><Check className="size-4 text-[#15803d]" aria-hidden="true" />{ch?.displayName ?? "Figlio"}{ch?.birthYear ? ` · ${ch.birthYear}` : ""}</span>
                      <button type="button" onClick={() => setChildren((c) => c.filter((x) => x !== id))} aria-label={`Togli ${ch?.displayName ?? "figlio"}`} className="scd-focus flex size-9 items-center justify-center rounded-lg"><X className="size-4" aria-hidden="true" /></button>
                    </p>
                  );
                })}
                <span className="mt-1 flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] px-3">
                  <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                  <input type="search" aria-label="Cerca il figlio per nome" value={childQuery} onChange={(e) => setChildQuery(e.target.value)} placeholder={children.length ? "Aggiungi un altro figlio" : "Cerca il figlio per nome"} className="h-11 w-full bg-transparent text-[15px] outline-none" />
                </span>
                {childResults.length > 0 && (
                  <ul className="m-0 mt-1 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
                    {childResults.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => { setChildren((c) => [...c, p.id]); setChildQuery(""); }} className="scd-focus flex min-h-11 w-full items-center justify-between gap-2 border-t border-[var(--in-line)] px-3 text-left text-[14.5px] first:border-t-0 hover:bg-[#f7fbff]">
                          <span className="truncate">{p.displayName}</span>
                          <span className="text-[13px] text-[var(--in-sub)]">{p.birthYear ?? ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {missingChild && <p className="m-0 mt-1 text-[13.5px] text-[#9a1d14]">Scegli almeno un figlio.</p>}
              </div>
            )}
            <label className={`flex min-h-11 cursor-pointer items-center gap-3 ${box} text-[14.5px]`}>
              <input type="checkbox" checked={athlete} onChange={() => setAthlete((v) => !v)} className="size-5 accent-[var(--scd-blue)]" />
              Atleta
            </label>
          </div>

          {!request.minor && (
            <div className="mt-3">
              <p className="m-0 mb-1 text-[14.5px] font-semibold">Ruoli nell'organigramma</p>
              {held.length > 0 && (
                <p className="m-0 mb-1 flex flex-wrap gap-1">
                  {held.map((r) => <Chip key={r.id} tone="ok">{r.label}{r.teamName ? ` · ${r.teamName}` : ""} · già</Chip>)}
                </p>
              )}
              {positions.map((p) => (
                <div key={p.code} className={`mb-1.5 flex flex-wrap items-center gap-2 ${box} text-[14.5px]`}>
                  <span className="min-w-0 flex-1 font-semibold">{p.label}</span>
                  {(p.roleKind === "MISTER" || p.roleKind === "DIRIGENTE") && (
                    <select aria-label={`Squadra per ${p.label}`} value={p.teamCode ?? ""} onChange={(e) => setPositions((all) => all.map((x) => (x.code === p.code ? { ...x, teamCode: e.target.value || null } : x)))} className="h-10 max-w-[12rem] rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14px]">
                      <option value="">Tutto il club</option>
                      {teams.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setPositions((all) => all.filter((x) => x.code !== p.code))} aria-label={`Togli ${p.label}`} className="scd-focus flex size-10 items-center justify-center rounded-lg"><X className="size-4" aria-hidden="true" /></button>
                  {CREATOR_POSITIONS.includes(p.code) && <small className="basis-full text-[12.5px] text-[var(--in-sub)]">Lo assegnano solo il Presidente o il Direttore generale.</small>}
                </div>
              ))}
              <span className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] px-3">
                <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                <input type="search" aria-label="Cerca un ruolo" value={posQuery} onChange={(e) => setPosQuery(e.target.value)} placeholder={catalog === null ? "Carico il catalogo dei ruoli…" : "Cerca un ruolo: presidente, consigliere, dirigente…"} disabled={catalog === null} className="h-11 w-full bg-transparent text-[15px] outline-none" />
              </span>
              {posResults.length > 0 && (
                <ul className="m-0 mt-1 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
                  {posResults.map((p) => (
                    <li key={p.code}>
                      <button type="button" onClick={() => { setPositions((all) => [...all, { code: p.code, label: p.label, roleKind: p.roleKind, teamCode: null }]); setPosQuery(""); }} className="scd-focus flex min-h-11 w-full items-center justify-between gap-2 border-t border-[var(--in-line)] px-3 text-left text-[14.5px] first:border-t-0 hover:bg-[#f7fbff]">
                        <span className="min-w-0 truncate">{p.label}</span>
                        <span className="shrink-0 text-[12.5px] text-[var(--in-sub)]">{POSITION_GROUP_LABEL[p.group]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {catalog !== null && catalog.length === 0 && <p className="m-0 mt-1 text-[13.5px] text-[var(--in-sub)]">Catalogo dei ruoli non leggibile ora: puoi aggiungere i ruoli dopo, dall'organigramma.</p>}
            </div>
          )}
        </fieldset>

        {/* 3. Accesso */}
        <div className="mt-5 rounded-xl bg-[#f3f8ff] px-3 py-2.5 text-[14px] leading-snug">
          <b className="block text-[15px]">3 · Accesso all'app</b>
          {base ? (
            <span>Entra come <b>{BASE_LABEL[base]}</b>: è il livello più alto tra i suoi ruoli. Le altre sezioni le apri tu da Direzione → Accessi, una per una.</span>
          ) : (
            <span>Spunta almeno una cosa che fa nel club.</span>
          )}
        </div>

        <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
          Nota della verifica
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Es. verificato al telefono (niente dati sanitari)" className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal" />
        </label>

        {!canWrite && <p className="mt-3 text-[14px] text-[var(--in-sub)]">Solo Direzione e Segreteria possono autorizzare.</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy || !canWrite} onClick={() => void doReject()} className="scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#b42318] bg-white text-[15.5px] font-semibold text-[#9a1d14] disabled:opacity-50">
            <X className="size-[18px]" aria-hidden="true" />Rifiuta
          </button>
          <button type="button" disabled={!canApprove} onClick={() => void doApprove()} className="scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[15.5px] font-semibold text-white disabled:opacity-50">
            <UserCheck className="size-[18px]" aria-hidden="true" />{mergeIds.length ? "Unisci e autorizza" : "Autorizza"}
          </button>
        </div>
        <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
      </div>
    </div>
  );
}
