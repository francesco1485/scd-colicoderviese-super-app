import { useServerFn } from "@tanstack/react-start";
import { Merge, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/scd/interior-ui";
import { duplicateNamePairs } from "@/lib/access-requests";
import { mergePeopleCards } from "@/lib/access-requests.functions";
import type { PersonRow } from "@/lib/people";

/**
 * «Schede doppie» (UD-189, r121): the office merges two cards of the same human that already exist (e.g. the
 * Presidente from the tesserati master and the same person as a parent from the registrations). Suggestions are
 * pairs with the same name; the database decides if the merge is safe (different birth dates, two accounts, a minor
 * with an account, Presidente/DG cards only by them: refused, nothing changes).
 */
export function MergeCardsCard({ people, canWrite, onChanged }: { people: PersonRow[]; canWrite: boolean; onChanged: () => Promise<void> }) {
  const merge = useServerFn(mergePeopleCards);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [keepA, setKeepA] = useState(true);
  const [q, setQ] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const allPairs = useMemo(() => duplicateNamePairs(people), [people]);
  const pairs = allPairs.slice(0, 8);
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const results = useMemo(() => {
    const t = fold(q.trim());
    if (t.length < 2) return [];
    return people.filter((p) => p.status !== "LEFT" && p.id !== a && p.id !== b && fold(p.displayName).includes(t)).slice(0, 8);
  }, [q, people, a, b]);

  if (!canWrite) return null;
  const pa = a ? byId.get(a) : null;
  const pb = b ? byId.get(b) : null;
  const pick = (id: string) => {
    setMessage(null);
    setOk(false);
    if (!a) setA(id);
    else if (!b) setB(id);
    setQ("");
  };
  const reset = () => {
    setA(null);
    setB(null);
    setOk(false);
    setKeepA(true);
  };
  const describe = (p: PersonRow) =>
    [p.kind, p.birthYear ? String(p.birthYear) : null, p.roles.map((r) => r.label).join(", ") || null, p.teams.map((t) => t.name).join(", ") || null]
      .filter(Boolean)
      .join(" · ");

  async function doMerge() {
    if (!a || !b) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await merge({ data: { keepId: keepA ? a : b, dropId: keepA ? b : a, note: "schede doppie" } });
      setMessage(res.message);
      if (res.ok) {
        reset();
        await onChanged();
      }
    } catch {
      setMessage("Unione non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="persone-doppie" title="Schede doppie" sub="Una persona = una scheda, con tutti i suoi ruoli. Unisci due schede della stessa persona.">
      <div className="flex flex-col gap-2 px-4 pb-4 sm:px-[18px]" data-testid="merge-cards">
        {!a && pairs.length > 0 && (
          <div className="grid gap-1">
            <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Stesso nome, da controllare:</p>
            {pairs.map(([x, y]) => (
              <button key={`${x.id}-${y.id}`} type="button" onClick={() => { setA(x.id); setB(y.id); setMessage(null); }} className="scd-focus flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[var(--in-line)] px-3 text-left text-[14.5px] hover:bg-[#f7fbff]">
                <span className="min-w-0 truncate font-semibold">{x.displayName}</span>
                <span className="shrink-0 text-[13px] text-[var(--in-sub)]">{x.kind} + {y.kind}</span>
              </button>
            ))}
            {allPairs.length > pairs.length && <p className="m-0 text-[13px] text-[var(--in-sub)]">E altre {allPairs.length - pairs.length}: cerca per nome.</p>}
          </div>
        )}
        {(!a || !b) && (
          <span className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] px-3">
            <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
            <input type="search" aria-label="Cerca una scheda per nome" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a ? "Cerca la seconda scheda" : "Cerca una scheda per nome"} className="h-11 w-full bg-transparent text-[15px] outline-none" />
          </span>
        )}
        {results.length > 0 && (
          <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => pick(p.id)} className="scd-focus flex min-h-11 w-full items-center justify-between gap-2 border-t border-[var(--in-line)] px-3 text-left text-[14.5px] first:border-t-0 hover:bg-[#f7fbff]">
                  <span className="min-w-0 truncate">{p.displayName}</span>
                  <span className="shrink-0 text-[13px] text-[var(--in-sub)]">{describe(p)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pa && (
          <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
            <legend className="mb-1 text-[14.5px] font-semibold">Quale scheda resta</legend>
            {[pa, pb].map((p, i) =>
              p ? (
                <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--in-line)] px-3 py-2 text-[14.5px]">
                  <input type="radio" name="keep" checked={keepA === (i === 0)} onChange={() => setKeepA(i === 0)} className="size-5 accent-[var(--scd-blue)]" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{p.displayName}</b>
                    <small className="block text-[13px] text-[var(--in-sub)]">{describe(p)}</small>
                  </span>
                </label>
              ) : null,
            )}
            {pb && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#7a5200]">
                <input type="checkbox" checked={ok} onChange={() => setOk((v) => !v)} className="mt-0.5 size-5 shrink-0 accent-[var(--scd-blue)]" />
                <span>Ho verificato che è la stessa persona. L'unione non si può annullare.</span>
              </label>
            )}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button type="button" onClick={reset} className="scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white text-[15px] font-semibold">
                <X className="size-4" aria-hidden="true" />Annulla
              </button>
              <button type="button" disabled={!pb || !ok || busy} onClick={() => void doMerge()} className="scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[15px] font-semibold text-white disabled:opacity-50">
                <Merge className="size-4" aria-hidden="true" />Unisci
              </button>
            </div>
          </fieldset>
        )}
        <p role="status" aria-live="polite" className="m-0 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
      </div>
    </Card>
  );
}
