import { useServerFn } from "@tanstack/react-start";
import { Check, ClipboardCopy, ClipboardList, Plus, Printer, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Chip } from "@/components/scd/interior-ui";
import { RESPONSE_LABEL } from "@/lib/callups";
import {
  STAFF_ROLES,
  STAFF_ROLE_LABEL,
  sheetText,
  sortPlayers,
  suggestShirt,
  validateSheet,
  type SheetDraft,
  type SheetPlayer,
  type StaffRole,
} from "@/lib/match-sheet";
import { getMatchSheet, saveMatchSheet, type MatchSheetData } from "@/lib/match-sheet.functions";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * Pre-distinta (UD-069): among the athletes called up, the mister picks who goes on the match sheet, with shirt
 * numbers, starters, captain, vice and the adults on the bench. The club officer copies it into the LND portal
 * (mandatory "lista di presentazione" for youth championships) or prints it where paper is allowed.
 */
export function MatchSheetPanel({ eventId, heading, refreshKey }: { eventId: string; heading: string; refreshKey: number }) {
  const load = useServerFn(getMatchSheet);
  const save = useServerFn(saveMatchSheet);
  const [data, setData] = useState<MatchSheetData | null>(null);
  const [draft, setDraft] = useState<SheetDraft>({ players: [], staff: [], captain: null, vice: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCopy, setShowCopy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const d = await load({ data: { eventId } });
      setData(d);
      setDraft({ players: d.players, staff: d.staff.map((s) => ({ personId: s.personId, role: s.role })), captain: d.captain, vice: d.vice });
    } catch {
      setData((prev) => prev ?? null);
    }
  }, [eventId, load]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const calledIds = useMemo(() => new Set((data?.calledUp ?? []).map((c) => c.athleteId)), [data]);
  const nameOf = useMemo(() => new Map((data?.calledUp ?? []).map((c) => [c.athleteId, c.displayName])), [data]);
  const staffName = useMemo(() => new Map((data?.candidates ?? []).map((c) => [c.personId, c.displayName])), [data]);

  if (!data) return <p className="m-0 text-[14px] text-[var(--in-sub)]" role="status">Carico la distinta…</p>;
  if (data.state !== "ok") {
    return (
      <p className="m-0 rounded-xl bg-[#f6f9fd] px-3 py-3 text-[14.5px] text-[var(--in-sub)]">
        {data.state === "no-match" ? "La distinta si prepara dopo aver inviato la convocazione: si sceglie tra i convocati." : data.state === "signed-out" ? "Accedi per preparare la distinta." : "Distinta non disponibile, riprova tra poco."}
      </p>
    );
  }

  const rules = data.rules;
  const hasStarters = rules.maxStarters !== null;
  const errors = validateSheet(draft, rules, calledIds, false);
  const readyErrors = validateSheet(draft, rules, calledIds, true);
  const listed = new Map(draft.players.map((p) => [p.athleteId, p]));
  const starters = draft.players.filter((p) => p.starter).length;
  const locked = data.locked;

  const setPlayers = (fn: (prev: SheetPlayer[]) => SheetPlayer[]) => setDraft((d) => {
    const players = fn(d.players);
    const ids = new Set(players.map((p) => p.athleteId));
    return { ...d, players, captain: d.captain && ids.has(d.captain) ? d.captain : null, vice: d.vice && ids.has(d.vice) ? d.vice : null };
  });

  const toggleListed = (athleteId: string, lastShirt: number | null) =>
    setPlayers((prev) => {
      if (prev.some((p) => p.athleteId === athleteId)) return prev.filter((p) => p.athleteId !== athleteId);
      const taken = new Set(prev.map((p) => p.shirt));
      const starter = hasStarters ? prev.filter((p) => p.starter).length < (rules.maxStarters ?? 0) : false;
      return [...prev, { athleteId, shirt: suggestShirt(lastShirt, taken), starter }];
    });

  const patchPlayer = (athleteId: string, patch: Partial<SheetPlayer>) => setPlayers((prev) => prev.map((p) => (p.athleteId === athleteId ? { ...p, ...patch } : p)));

  const submit = async (ready: boolean) => {
    const errs = validateSheet(draft, rules, calledIds, ready);
    if (errs.length) {
      setMessage({ ok: false, text: errs.join(" ") });
      return;
    }
    if (!data.matchId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await save({ data: { matchId: data.matchId, players: draft.players, staff: draft.staff, captain: draft.captain, vice: draft.vice, ready, note: "" } });
      setMessage({ ok: res.ok, text: res.message });
      if (res.ok) {
        await reload();
        if (ready) setShowCopy(true);
      }
    } catch {
      setMessage({ ok: false, text: "Salvataggio non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  };

  const text = sheetText(draft, rules, (id) => nameOf.get(id) ?? "—", (id) => staffName.get(id) ?? "—", heading);

  const print = () => {
    const w = window.open("", "_blank", "noopener,width=820,height=900");
    if (!w) return;
    const sorted = sortPlayers(draft.players);
    const tag = (id: string) => (id === draft.captain ? "C" : id === draft.vice ? "VC" : "");
    const rows = sorted.map((p) => `<tr><td>${p.shirt}</td><td>${escapeHtml(nameOf.get(p.athleteId) ?? "—")}</td>${hasStarters ? `<td>${p.starter ? "Titolare" : "Riserva"}</td>` : ""}<td>${tag(p.athleteId)}</td><td class="blank"></td></tr>`).join("");
    const staffRows = draft.staff.map((s) => `<tr><td>${escapeHtml(STAFF_ROLE_LABEL[s.role])}</td><td>${escapeHtml(staffName.get(s.personId) ?? "—")}</td><td class="blank"></td></tr>`).join("");
    w.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Pre-distinta</title><style>
      body{font:14px/1.4 system-ui,sans-serif;color:#0d1b3e;margin:24px}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 12px;color:#455}
      table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{border:1px solid #9aa9c0;padding:6px 8px;text-align:left}th{background:#eef3f9}
      td.blank{width:28%}@media print{body{margin:10mm}}</style></head><body>
      <h1>${escapeHtml(heading)}</h1><p>Pre-distinta preparata nell'app S.C.D. ColicoDerviese. Non sostituisce la lista ufficiale del portale LND: tessere e documenti si verificano lì.</p>
      <table><thead><tr><th>N°</th><th>Giocatore</th>${hasStarters ? "<th>Ruolo</th>" : ""}<th>C/VC</th><th>Tessera / documento</th></tr></thead><tbody>${rows}</tbody></table>
      ${staffRows ? `<table><thead><tr><th>Panchina</th><th>Nome</th><th>Tessera</th></tr></thead><tbody>${staffRows}</tbody></table>` : ""}
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ ok: true, text: "Testo copiato." });
    } catch {
      setMessage({ ok: false, text: "Copia non riuscita: seleziona il testo qui sotto." });
    }
  };

  return (
    <div className="flex flex-col gap-3" data-testid="match-sheet">
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <Chip tone={data.status === "READY" ? "ok" : data.status === "DRAFT" ? "warn" : "mute"}>{data.status === "READY" ? "Pronta" : data.status === "DRAFT" ? "Bozza" : "Da preparare"}</Chip>
        <Chip tone={draft.players.length > rules.maxListed ? "crit" : "info"}>In lista {draft.players.length}{rules.maxListed < 40 ? `/${rules.maxListed}` : ""}</Chip>
        {hasStarters && <Chip tone={starters > (rules.maxStarters ?? 0) ? "crit" : "info"}>Titolari {starters}/{rules.maxStarters}</Chip>}
        <button type="button" onClick={() => void reload()} className="scd-focus ml-auto inline-flex h-11 items-center gap-1.5 rounded-[10px] px-2 text-[13.5px] font-semibold text-[var(--in-sub)]" aria-label="Ricarica convocati e distinta">
          <RefreshCw className="size-4" aria-hidden="true" />
          Ricarica
        </button>
      </div>

      {data.calledUp.length === 0 ? (
        <p className="m-0 rounded-xl bg-[#f6f9fd] px-3 py-3 text-[14.5px] text-[var(--in-sub)]">Nessun convocato per questa gara: prima invia la convocazione.</p>
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0" aria-label="Convocati: scegli chi va in distinta">
          {data.calledUp.map((c) => {
            const p = listed.get(c.athleteId);
            return (
              <li key={c.athleteId} className={`border-t border-[var(--in-line)] px-3 py-2 first:border-t-0 ${p ? "" : "bg-[#fbfcfe]"}`}>
                <div className="flex min-h-11 items-center gap-3">
                  <label className="-ml-3 flex size-11 flex-none cursor-pointer items-center justify-center">
                    <input type="checkbox" checked={Boolean(p)} disabled={locked} onChange={() => toggleListed(c.athleteId, c.lastShirt)} className="scd-focus size-5 accent-[var(--scd-blue)]" aria-label={`${c.displayName} in distinta`} />
                  </label>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px] font-semibold">{c.displayName}</b>
                    <span className="block text-[13px] text-[var(--in-sub)]">{c.birthYear ?? "anno non indicato"} · {RESPONSE_LABEL[c.response]}</span>
                  </span>
                  {p && (
                    <label className="flex items-center gap-1 text-[13px] font-semibold text-[var(--in-sub)]">
                      N°
                      <input type="number" inputMode="numeric" min={1} max={99} value={p.shirt} disabled={locked} onChange={(e) => patchPlayer(c.athleteId, { shirt: Number(e.target.value) })} className="scd-focus h-11 w-14 rounded-[8px] border border-[var(--in-line)] bg-white px-2 text-center text-[15px] font-semibold text-[var(--in-ink)] tabular-nums" />
                    </label>
                  )}
                </div>
                {p && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-8">
                    {hasStarters && (
                      <span className="inline-flex overflow-hidden rounded-[8px] border border-[var(--in-line)]" role="group" aria-label="Titolare o riserva">
                        {([true, false] as const).map((st) => (
                          <button key={String(st)} type="button" disabled={locked} aria-pressed={p.starter === st} onClick={() => patchPlayer(c.athleteId, { starter: st })} className={`scd-focus h-11 px-3 text-[13px] font-semibold ${p.starter === st ? "bg-[var(--in-info)] text-white" : "bg-white text-[var(--in-ink)]"}`}>
                            {st ? "Titolare" : "Riserva"}
                          </button>
                        ))}
                      </span>
                    )}
                    {(["captain", "vice"] as const).map((k) => (
                      <button key={k} type="button" disabled={locked} aria-pressed={draft[k] === c.athleteId} onClick={() => setDraft((d) => ({ ...d, [k]: d[k] === c.athleteId ? null : c.athleteId, ...(k === "captain" && d.vice === c.athleteId ? { vice: null } : {}), ...(k === "vice" && d.captain === c.athleteId ? { captain: null } : {}) }))} className={`scd-focus h-11 min-w-11 rounded-[8px] border px-2.5 text-[13px] font-bold ${draft[k] === c.athleteId ? "border-[var(--scd-yellow,#f5c400)] bg-[var(--scd-yellow,#f5c400)] text-[#0d1b3e]" : "border-[var(--in-line)] bg-white text-[var(--in-sub)]"}`}>
                        {k === "captain" ? "C" : "VC"}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <fieldset className="m-0 min-w-0 rounded-xl border border-[var(--in-line)] p-3">
        <legend className="px-1 text-[15px] font-semibold">Panchina</legend>
        {draft.staff.length === 0 && <p className="m-0 mb-2 text-[13.5px] text-[var(--in-sub)]">Serve almeno il dirigente accompagnatore ufficiale.</p>}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {draft.staff.map((s, i) => (
            <li key={`${s.role}-${i}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <select value={s.role} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, staff: d.staff.map((x, j) => (j === i ? { ...x, role: e.target.value as StaffRole } : x)) }))} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Ruolo in panchina">
                {STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>)}
              </select>
              <select value={s.personId} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, staff: d.staff.map((x, j) => (j === i ? { ...x, personId: e.target.value } : x)) }))} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Persona">
                {data.candidates.map((c) => <option key={c.personId} value={c.personId}>{c.displayName}{c.roleLabel ? ` · ${c.roleLabel}` : ""}</option>)}
              </select>
              <button type="button" disabled={locked} onClick={() => setDraft((d) => ({ ...d, staff: d.staff.filter((_, j) => j !== i) }))} className="scd-focus grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--in-line)] bg-white" aria-label="Togli dalla panchina">
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {!locked && data.candidates.length > 0 && draft.staff.length < 10 && (
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, staff: [...d.staff, { role: d.staff.some((x) => x.role === "DIRIGENTE_ACCOMPAGNATORE") ? "ALLENATORE" : "DIRIGENTE_ACCOMPAGNATORE", personId: data.candidates[0]?.personId ?? "" }] }))}
            className="scd-focus mt-2 inline-flex h-11 items-center gap-1.5 rounded-[10px] px-2 text-[14px] font-semibold text-[var(--in-info)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Aggiungi in panchina
          </button>
        )}
        {data.candidates.length === 0 && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Nessun dirigente o allenatore collegato a questa squadra nell'organigramma.</p>}
      </fieldset>

      {errors.length > 0 && (
        <ul className="m-0 list-none rounded-xl border border-[#f1d3a5] bg-[#fff8ec] px-3 py-2 text-[14px]" role="alert">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      {locked ? (
        <p className="m-0 text-[14px] text-[var(--in-sub)]">La gara è iniziata: la distinta resta come salvata.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || errors.length > 0} onClick={() => void submit(false)} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--scd-blue)] bg-white px-4 text-[15px] font-semibold text-[var(--scd-blue)] disabled:opacity-50">
            Salva bozza
          </button>
          <button type="button" disabled={busy || readyErrors.length > 0} onClick={() => void submit(true)} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white disabled:opacity-50" data-testid="sheet-ready" title={readyErrors.join(" ")}>
            <Check className="size-4" aria-hidden="true" />
            Segna pronta
          </button>
        </div>
      )}
      {!locked && readyErrors.length > 0 && errors.length === 0 && draft.players.length > 0 && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Per segnarla pronta: {readyErrors.join(" ").toLowerCase()}</p>}

      <div role="status" aria-live="polite">
        {message && <p className={`m-0 rounded-xl border px-3 py-2 text-[14.5px] font-semibold ${message.ok ? "border-[#b7e0c2] bg-[#f1faf3]" : "border-[#f1d3a5] bg-[#fff8ec]"}`}>{message.text}</p>}
      </div>

      {draft.players.length > 0 && (
        <details className="rounded-xl border border-[var(--in-line)]" open={showCopy} onToggle={(e) => setShowCopy(e.currentTarget.open)}>
          <summary className="scd-focus flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            <ClipboardList className="size-4" aria-hidden="true" />
            Copia per il portale LND o stampa
          </summary>
          <div className="flex flex-col gap-2 border-t border-[var(--in-line)] p-3">
            <pre className="m-0 max-h-72 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#f6f9fd] p-3 text-[13.5px] leading-relaxed">{text}</pre>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copy()} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold">
                <ClipboardCopy className="size-4" aria-hidden="true" />
                Copia testo
              </button>
              <button type="button" onClick={print} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold">
                <Printer className="size-4" aria-hidden="true" />
                Stampa
              </button>
            </div>
            <p className="m-0 text-[13px] text-[var(--in-sub)]">Per Allievi e Giovanissimi la lista ufficiale si fa sul portale LND (lista di presentazione). Tessere e documenti si verificano lì: l'app non li conserva.</p>
          </div>
        </details>
      )}
    </div>
  );
}
