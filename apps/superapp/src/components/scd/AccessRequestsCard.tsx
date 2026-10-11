import { useServerFn } from "@tanstack/react-start";
import { Check, Search, UserCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { GRANTABLE_ROLES, MATCH_LABEL, ageOn, type GrantableRole } from "@/lib/access-requests";
import { approveAccessRequest, getAccessCandidates, getAccessRequests, rejectAccessRequest, type AccessCandidate, type AccessRequestRow } from "@/lib/access-requests.functions";
import { itDate, type PersonRow } from "@/lib/people";

/**
 * Office queue of self-registrations (r64). Direzione / Segreteria verify who the person is,
 * link the request to an existing person (or create one), pick the role and, for a parent, the child.
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

function ReviewDialog({ request, people, today, canWrite, onClose, onDone }: { request: AccessRequestRow; people: PersonRow[]; today: string; canWrite: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const candidatesFn = useServerFn(getAccessCandidates);
  const approve = useServerFn(approveAccessRequest);
  const reject = useServerFn(rejectAccessRequest);
  const [candidates, setCandidates] = useState<AccessCandidate[] | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [role, setRole] = useState<GrantableRole>(request.minor ? "ATHLETE" : "FAMILY");
  const [childId, setChildId] = useState<string | null>(null);
  const [childQuery, setChildQuery] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const age = ageOn(request.birthDate, today);

  useEffect(() => {
    void candidatesFn({ data: { id: request.id } }).then((c) => {
      setCandidates(c);
      const best = c.find((x) => x.match !== "NAME");
      if (best) {
        setPersonId(best.personId);
        if (best.kind === "atleta") setRole("ATHLETE");
        if (best.kind === "staff") setRole("MANAGER");
      }
    });
  }, [request.id, candidatesFn]);

  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const childResults = useMemo(() => {
    const q = fold(childQuery.trim());
    if (q.length < 2) return [];
    return people.filter((p) => p.kind === "atleta" && p.status !== "LEFT" && fold(p.displayName).includes(q)).slice(0, 8);
  }, [childQuery, people]);
  const child = people.find((p) => p.id === childId) ?? null;

  async function doApprove() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await approve({ data: { id: request.id, personId, role, childPersonId: role === "FAMILY" ? childId : null, note } });
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#021433]/50 sm:items-center" role="dialog" aria-modal="true" aria-label={`Verifica ${request.firstName} ${request.lastName}`}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-[19px] font-bold">{request.firstName} {request.lastName}</h3>
            <p className="m-0 mt-1 text-[14px] text-[var(--in-sub)]">Nato/a il {itDate(request.birthDate)}{age !== null ? ` (${age} anni)` : ""}</p>
            <p className="m-0 text-[14px] text-[var(--in-sub)]">{request.email} · {request.phone}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="scd-focus flex size-11 items-center justify-center rounded-lg"><X className="size-5" aria-hidden="true" /></button>
        </div>

        {request.minor && (
          <p className="mt-3 rounded-xl bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#7a5200]">Ha tra 14 e 17 anni: prima di attivare verifica il consenso di un genitore.</p>
        )}

        <fieldset className="mt-4 min-w-0 border-0 p-0">
          <legend className="mb-2 text-[15px] font-semibold">Chi è nel database</legend>
          {candidates === null ? (
            <p className="text-[14px] text-[var(--in-sub)]">Cerco corrispondenze…</p>
          ) : (
            <div className="grid gap-1.5">
              {candidates.map((c) => (
                <label key={c.personId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--in-line)] px-3 py-2 text-[14.5px]">
                  <input type="radio" name="person" checked={personId === c.personId} onChange={() => setPersonId(c.personId)} className="size-5 accent-[var(--scd-blue)]" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{c.displayName}{c.birthYear ? ` · ${c.birthYear}` : ""}</b>
                    <small className="text-[13px] text-[var(--in-sub)]">{c.kind}{c.teamCodes.length ? ` · ${c.teamCodes.join(", ")}` : ""} · {MATCH_LABEL[c.match] ?? c.match}</small>
                  </span>
                </label>
              ))}
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--in-line)] px-3 py-2 text-[14.5px]">
                <input type="radio" name="person" checked={personId === null} onChange={() => setPersonId(null)} className="size-5 accent-[var(--scd-blue)]" />
                <span>Nessuna di queste: crea una nuova scheda</span>
              </label>
            </div>
          )}
        </fieldset>

        <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
          Ruolo nell'app
          <select value={role} onChange={(e) => setRole(e.target.value as GrantableRole)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[15px] font-normal">
            {GRANTABLE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <small className="font-normal text-[var(--in-sub)]">Mister e dirigenti vedono la squadra del loro ruolo nell'organigramma. I ruoli di Direzione e Segreteria non si danno da qui.</small>
        </label>

        {role === "FAMILY" && (
          <div className="mt-4">
            <label className="flex flex-col gap-1 text-[15px] font-semibold">
              Figlio da collegare
              <span className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] px-3">
                <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                <input type="search" value={childQuery} onChange={(e) => setChildQuery(e.target.value)} placeholder="Cerca per nome" className="h-11 w-full bg-transparent text-[15px] font-normal outline-none" />
              </span>
            </label>
            {child && <p className="mt-2 flex items-center gap-2 text-[14.5px]"><Check className="size-4 text-[#15803d]" aria-hidden="true" />{child.displayName}{child.birthYear ? ` · ${child.birthYear}` : ""}</p>}
            {childResults.length > 0 && (
              <ul className="m-0 mt-2 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
                {childResults.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setChildId(p.id); setChildQuery(""); }} className="scd-focus flex min-h-11 w-full items-center justify-between gap-2 border-t border-[var(--in-line)] px-3 text-left text-[14.5px] first:border-t-0 hover:bg-[#f7fbff]">
                      <span className="truncate">{p.displayName}</span>
                      <span className="text-[13px] text-[var(--in-sub)]">{p.birthYear ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label className="mt-4 flex flex-col gap-1 text-[15px] font-semibold">
          Nota della verifica
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Es. verificato al telefono" className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal" />
        </label>

        {!canWrite && <p className="mt-3 text-[14px] text-[var(--in-sub)]">Solo Direzione e Segreteria possono autorizzare.</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy || !canWrite} onClick={() => void doReject()} className="scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#b42318] bg-white text-[15.5px] font-semibold text-[#9a1d14] disabled:opacity-50">
            <X className="size-[18px]" aria-hidden="true" />Rifiuta
          </button>
          <button type="button" disabled={busy || !canWrite || (role === "FAMILY" && !childId)} onClick={() => void doApprove()} className="scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[15.5px] font-semibold text-white disabled:opacity-50">
            <UserCheck className="size-[18px]" aria-hidden="true" />Autorizza
          </button>
        </div>
        <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
      </div>
    </div>
  );
}
