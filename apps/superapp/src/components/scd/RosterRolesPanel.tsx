import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ROLE_LABEL, type RosterRole } from "@/lib/public-roster";
import type { RosterRow } from "@/lib/roster";
import { getMyTeamRoles, saveMyTeamRoles } from "@/lib/team-roles.functions";
import { changedRoles, ROLE_CHOICES } from "@/lib/team-roles";

/**
 * «Ruoli della rosa» (UD-168, r142): the mister of the team taps Portiere, Difensore, Centrocampista or Attaccante for
 * each player and saves once. The role feeds the public showcase of Prima Squadra, Juniores U19 Élite and Allievi
 * U16 Élite and the Fantacalcio. The database decides who may save (mister of that team or Direzione).
 */
export function RosterRolesPanel({
  teamId,
  squad,
  tag,
}: {
  teamId: string;
  squad: readonly RosterRow[];
  tag: string;
}) {
  const load = useServerFn(getMyTeamRoles);
  const save = useServerFn(saveMyTeamRoles);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [saved, setSaved] = useState<Record<string, RosterRole | null>>({});
  const [draft, setDraft] = useState<Record<string, RosterRole | null>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const players = useMemo(() => squad.filter((p) => p.athleteId !== "" && p.teamId === teamId), [squad, teamId]);

  useEffect(() => {
    let live = true;
    setState("loading");
    load({ data: { teamId } })
      .then((r) => {
        if (!live) return;
        setState(r.state === "ok" ? "ok" : "error");
        setSaved(r.roles);
        setDraft(r.roles);
      })
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, [load, teamId]);

  const changes = useMemo(() => changedRoles(saved, draft, players.map((p) => p.athleteId)), [saved, draft, players]);
  const withRole = players.filter((p) => (draft[p.athleteId] ?? null) !== null).length;

  const submit = async () => {
    if (changes.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await save({ data: { teamId, rows: changes } });
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok) setSaved({ ...draft });
    } catch {
      setMessage({ ok: false, text: "Ruoli non salvati. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  };

  if (players.length === 0)
    return <p className="m-0 text-[15px] text-[var(--in-sub)]">Nessun atleta in rosa per {tag}.</p>;
  if (state === "loading") return <p className="m-0 text-[15px] text-[var(--in-sub)]">Carico i ruoli…</p>;

  return (
    <div className="flex flex-col gap-3" data-testid="roster-roles">
      <p className="m-0 text-[14px] text-[var(--in-sub)]">
        {withRole} di {players.length} con un ruolo
        {state === "error" ? " · lettura dei ruoli salvati non riuscita: parti dai ruoli vuoti" : ""}
      </p>
      <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0" aria-label={`Ruoli della rosa ${tag}`}>
        {players.map((p) => {
          const current = draft[p.athleteId] ?? null;
          return (
            <li
              key={p.athleteId}
              className="flex flex-wrap items-center gap-2 border-t border-[var(--in-line)] px-3 py-2 first:border-t-0"
            >
              <b className="min-w-[140px] flex-1 truncate text-[15px] font-semibold">{p.displayName}</b>
              <span role="radiogroup" aria-label={`Ruolo di ${p.displayName}`} className="flex gap-1">
                {ROLE_CHOICES.map((r) => {
                  const on = current === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      title={ROLE_LABEL[r]}
                      aria-label={ROLE_LABEL[r]}
                      onClick={() => setDraft((d) => ({ ...d, [p.athleteId]: on ? null : r }))}
                      className={`scd-focus grid size-11 place-items-center rounded-[10px] border text-[15px] font-bold ${
                        on
                          ? "border-[var(--scd-blue)] bg-[var(--scd-blue)] text-white"
                          : "border-[var(--in-line)] bg-white text-[var(--in-ink,#0b1e3a)]"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || changes.length === 0}
          className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
          {changes.length > 0 ? `Salva ${changes.length} ${changes.length === 1 ? "ruolo" : "ruoli"}` : "Nessuna modifica"}
        </button>
        <span className="text-[13px] text-[var(--in-sub)]">P portiere · D difensore · C centrocampista · A attaccante. Tocca di nuovo per togliere.</span>
      </div>
      {message && (
        <p role="status" className={`m-0 text-[14px] font-semibold ${message.ok ? "text-[var(--in-ok,#1b7f3b)]" : "text-[var(--in-warn)]"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
