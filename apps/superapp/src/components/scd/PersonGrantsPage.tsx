/**
 * Abilitazioni sezione per sezione (r100, UD-112). The Direzione ticks each section for one person, choosing
 * "Vede / Modifica / Approva" and the perimeter. Helpers ("Proponi in base al ruolo", "Copia da…") only propose:
 * proposals stay yellow until confirmed one by one, and a save writes only confirmed rows. Until migration r100 is
 * applied the page is a simulation: "Vedrà" works, saving and copying are off ("Da attivare").
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Copy, Eye, Lock, Save, Search, ShieldAlert, Sparkles, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, WorkAreaShell } from "@/components/scd/work-area-ui";
import { RoleLoader } from "@/components/scd/RoleLoader";
import { roleLabelOf } from "@/lib/access-admin";
import {
  BASE_SECTIONS,
  LEVEL_LABEL,
  PERIMETER_HINT,
  PERIMETER_LABEL,
  SECTION_GROUPS,
  SECTIONS,
  SITES,
  SITE_LABEL,
  applyProposals,
  copyPlan,
  defaultRow,
  diffGrants,
  diffIsEmpty,
  discardProposals,
  draftFromGrants,
  editRefusal,
  grantLine,
  grantProblem,
  grantsToSave,
  isGrantable,
  offeredPerimeters,
  pendingProposals,
  willSee,
  type CopyPlan,
  type Draft,
  type DraftRow,
  type GrantRow,
  type Level,
  type Perimeter,
  type SectionDef,
  type Site,
} from "@/lib/person-grants";
import { copyPersonGrants, getGrantsOf, getPersonGrants, savePersonGrants, type PersonGrantsData } from "@/lib/person-grants.functions";

const inputCls = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";

export function PersonGrantsPage({ initial, personId }: { initial: PersonGrantsData; personId: string }) {
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => draftFromGrants(initial.grants));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getPersonGrants);
  const save = useServerFn(savePersonGrants);

  const applied = data.engine === "applied";
  const target = { minor: data.person?.minor ?? null };
  const refusal = data.connected
    ? data.person
      ? editRefusal({ isDirection: data.actor.isDirection, personIds: data.actor.personIds }, { personId: data.person.id, isClubAccount: data.isClubAccount })
      : "Persona non trovata."
    : null;
  /** Ticks are allowed as a simulation even before r100; refusals (self, club, not Direzione) lock the list. */
  const locked = refusal !== null;
  const canSave = applied && !locked && data.connected;

  const teamName = (id: string) => data.teams.find((t) => t.id === id)?.name ?? "squadra";
  const next = useMemo(() => grantsToSave(draft), [draft]);
  const diff = useMemo(() => diffGrants(data.grants, next), [data.grants, next]);
  const problems = useMemo(
    () => [...diff.added, ...diff.changed.map((c) => c.after)].map((g) => grantProblem(g, target, note)).filter((p): p is string => p !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diff, note, data.person?.minor],
  );
  const pending = pendingProposals(draft);
  const sees = useMemo(() => willSee(next, teamName), [next, data.teams]); // eslint-disable-line react-hooks/exhaustive-deps

  function setRow(code: string, row: DraftRow | null) {
    setDraft((d) => {
      const out: Record<string, DraftRow> = { ...d };
      if (row) out[code] = row;
      else delete out[code];
      return out;
    });
  }

  async function refresh() {
    try {
      const fresh = await reload({ data: { personId } });
      setData(fresh);
      setDraft(draftFromGrants(fresh.grants));
    } catch {
      /* keep the current screen */
    }
  }

  async function submit() {
    if (!data.person) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await save({ data: { personId: data.person.id, grants: next.map((g) => ({ ...g, teamIds: [...g.teamIds] })), note } });
      setMessage(res.message);
      if (res.ok) {
        setConfirming(false);
        setNote("");
        await refresh();
      }
    } catch {
      setMessage("Salvataggio non riuscito, riprova.");
    } finally {
      setBusy(false);
    }
  }

  const title = data.person ? `Abilitazioni · ${data.person.name}` : "Abilitazioni";
  const activeTeams = data.teams.filter((t) => t.status !== "WITHDRAWN");

  return (
    <WorkAreaShell
      id="accessi"
      title={title}
      path={`/direzione/accessi/${personId}`}
      preview={data.gate.preview}
      editable
      status={applied ? undefined : <Chip tone="warn">Simulazione: non si salva nulla</Chip>}
      highlights={[
        { value: data.connected && applied ? next.length : null, label: "sezioni abilitate" },
        { value: data.connected ? pending.length : null, label: "proposte da confermare" },
        { value: BASE_SECTIONS.length, label: "sezioni base per tutti" },
      ]}
      note={<>Il ruolo è solo una descrizione: non apre nulla. Ogni sezione la abilita la Direzione, persona per persona.</>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/direzione/accessi" className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-[15px] font-semibold text-[var(--in-info)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Tutti gli accessi
        </Link>
      </div>

      {!applied && (
        <div role="note" data-testid="grants-not-applied" className="flex items-start gap-3 rounded-2xl border border-[#f1dc7a] bg-[var(--in-warn-bg)] px-4 py-3 text-[15px] leading-snug text-[var(--in-ink)]">
          <ShieldAlert className="mt-0.5 size-5 flex-none text-[var(--in-warn)]" aria-hidden="true" />
          <span>
            <b className="block text-[16px]">Da attivare: serve l'OK della Direzione per applicare r100.</b>
            Finché non è applicata l'app funziona esattamente come oggi: puoi provare le spunte e vedere cosa vedrebbe la persona, ma non si salva nulla e nessuno riceve accessi.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <PersonCard data={data} refusal={refusal} />

          {SECTION_GROUPS.map((g) => {
            const sections = SECTIONS.filter((s) => s.group === g.code);
            if (!sections.length) return null;
            return (
              <Card key={g.code} id={`grants-${g.code}`} title={g.label} sub={groupSub(g.code)}>
                <ul className="m-0 list-none divide-y divide-[var(--in-line)] px-4 pb-2 sm:px-[18px]">
                  {sections.map((s) => (
                    <li key={s.code} className="py-3">
                      <SectionRow
                        section={s}
                        row={draft[s.code] ?? null}
                        locked={locked}
                        minor={data.person?.minor ?? null}
                        teams={activeTeams}
                        teamName={teamName}
                        onChange={(r) => setRow(s.code, r)}
                        onDiscard={() => setRow(s.code, draftFromGrants(data.grants)[s.code] ?? null)}
                        target={target}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}

          <Card id="grants-save" title="Salva" sub="Prima di salvare vedi l'elenco delle modifiche e confermi.">
            <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
              {pending.length > 0 && (
                <p className="m-0 rounded-xl bg-[var(--in-warn-bg)] px-3 py-2 text-[14.5px] text-[var(--in-warn)]">
                  {pending.length === 1 ? "1 proposta non è confermata" : `${pending.length} proposte non sono confermate`}: non verranno salvate finché non le confermi.
                </p>
              )}
              <label className="flex flex-col gap-1 text-[15px] font-semibold">
                Motivo della modifica
                <input value={note} maxLength={300} disabled={locked} onChange={(e) => setNote(e.target.value)} placeholder="Es. dirigente accompagnatore U15 dal 14/10" className={`${inputCls} font-normal`} />
                <span className="text-[13px] font-normal text-[var(--in-sub)]">Obbligatorio per i dati riservati (segnati con il lucchetto giallo).</span>
              </label>
              {problems.length > 0 && (
                <ul className="m-0 list-none rounded-xl bg-[var(--in-crit-bg)] px-3 py-2 text-[14px] text-[var(--in-crit)]">
                  {problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
              <button
                type="button"
                disabled={!canSave || diffIsEmpty(diff) || problems.length > 0 || busy}
                onClick={() => setConfirming(true)}
                className="scd-focus inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[16px] font-semibold text-white disabled:opacity-50"
              >
                <Save className="size-[18px]" aria-hidden="true" />
                Rivedi e salva
              </button>
              <p role="status" aria-live="polite" className="m-0 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">
                {message ?? (!applied ? "Salvataggio spento: r100 non è ancora applicata." : locked ? refusal : diffIsEmpty(diff) ? "Nessuna modifica rispetto a quanto salvato." : `${diff.added.length + diff.changed.length + diff.removed.length} modifiche pronte.`)}
              </p>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <RoleLoader
            connected={data.connected}
            locked={locked}
            minor={data.person?.minor ?? null}
            teams={activeTeams}
            onLoad={(rows) => setDraft((d) => applyProposals(d, rows, "role"))}
          />
          <HelpersCard
            data={data}
            draft={draft}
            locked={locked}
            onPropose={(rows) => setDraft((d) => applyProposals(d, rows, "suggested"))}
            onConfirmAll={() => setDraft((d) => Object.fromEntries(Object.entries(d).map(([k, r]) => [k, r.on ? { ...r, confirmed: true } : r])))}
            onDiscardAll={() => setDraft((d) => discardProposals(d, data.grants))}
            onCopied={refresh}
          />
          <Card id="grants-preview" title="Vedrà" sub="Cosa vedrà questa persona con le spunte confermate.">
            <ul className="m-0 list-none px-4 pb-4 sm:px-[18px]" data-testid="grants-will-see">
              {sees.map((l) => (
                <li key={l.code} className="flex gap-2 border-t border-[var(--in-line)] py-2 text-[14.5px] leading-snug first:border-t-0">
                  <Eye className={`mt-0.5 size-4 flex-none ${l.base ? "text-[var(--in-sub)]" : "text-[var(--in-info)]"}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <b className="block">{l.label}{l.base ? <span className="ml-1.5 text-[12.5px] font-semibold text-[var(--in-sub)]">base</span> : null}</b>
                    <span className="text-[var(--in-sub)]">{l.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 px-4 pb-4 text-[13px] leading-snug text-[var(--in-sub)] sm:px-[18px]">Le parti protette (salute dei minori, Safeguarding) non compaiono mai qui.</p>
          </Card>
          <GrantAuditCard data={data} />
        </div>
      </div>

      {confirming && (
        <Dialog title="Confermi queste modifiche?" onClose={() => setConfirming(false)} testId="grants-confirm">
          <p className="mt-2 text-[14.5px] text-[var(--in-sub)]">{data.person?.name} · valgono dal prossimo caricamento della sua pagina e restano nello storico.</p>
          <DiffList title="Abilita" tone="ok" lines={diff.added.map((g) => grantLine(g, teamName))} />
          <DiffList title="Cambia" tone="info" lines={diff.changed.map((c) => `${grantLine(c.before, teamName)} → ${grantLine(c.after, teamName)}`)} />
          <DiffList title="Toglie" tone="crit" lines={diff.removed.map((g) => grantLine(g, teamName))} />
          {note.trim() && <p className="mt-3 text-[14px]">Motivo: “{note.trim()}”</p>}
          <button type="button" disabled={busy} onClick={() => void submit()} className="scd-focus mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[16px] font-semibold text-white disabled:opacity-50">
            <Check className="size-[18px]" aria-hidden="true" />
            {busy ? "Salvo…" : "Conferma e salva"}
          </button>
          <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
        </Dialog>
      )}
    </WorkAreaShell>
  );
}

function groupSub(code: string): string {
  if (code === "base") return "Sempre incluse per ogni account: non servono spunte.";
  if (code === "protetto") return "Non si abilitano da qui, per nessuno.";
  return "Spunta la sezione, poi scegli cosa può fare e su cosa.";
}

function PersonCard({ data, refusal }: { data: PersonGrantsData; refusal: string | null }) {
  if (!data.connected) {
    return (
      <Card id="grants-person" title="Persona" sub="Anteprima senza database.">
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Nessuna persona caricata">In anteprima la lista delle sezioni è quella vera; la persona, le sue abilitazioni e lo storico arrivano con l'accesso Direzione e il database del club.</EmptyState>
        </div>
      </Card>
    );
  }
  if (!data.person) {
    return (
      <Card id="grants-person" title="Persona">
        <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Persona non trovata">Torna all'elenco e apri la persona da "Persone collegate".</EmptyState></div>
      </Card>
    );
  }
  const p = data.person;
  const roles = data.roleFacts.structureRoles.map((r) => r.label);
  return (
    <Card id="grants-person" title={p.name} sub={roles.length ? `Ruolo: ${roles.join(", ")} (solo descrizione)` : "Nessun ruolo nell'organigramma"}>
      <div className="flex flex-col gap-2 px-4 pb-4 sm:px-[18px]">
        <div className="flex flex-wrap gap-1.5">
          {p.minor === true && <Chip tone="warn">Minorenne: solo “Solo sé”</Chip>}
          {p.minor === null && <Chip tone="mute">Data di nascita mancante</Chip>}
          {data.roleFacts.isGuardian && <Chip tone="ok">Genitore o tutore</Chip>}
          {data.roleFacts.isAthlete && <Chip tone="ok">Atleta</Chip>}
          {data.isClubAccount && <Chip tone="crit">Account del club</Chip>}
        </div>
        {data.accounts.length ? (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">
            Entra con: {data.accounts.map((a) => `${a.email} (${roleLabelOf(a.role)}${a.active ? "" : ", sospeso"})`).join(" · ")}
          </p>
        ) : (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessun accesso collegato: le abilitazioni valgono quando la persona avrà un accesso collegato.</p>
        )}
        {refusal && (
          <p role="alert" className="m-0 flex items-start gap-2 rounded-xl bg-[var(--in-warn-bg)] px-3 py-2 text-[14.5px] leading-snug text-[var(--in-warn)]">
            <Lock className="mt-0.5 size-4 flex-none" aria-hidden="true" />
            {refusal}
          </p>
        )}
      </div>
    </Card>
  );
}

function SectionRow({
  section: s,
  row,
  locked,
  minor,
  teams,
  teamName,
  onChange,
  onDiscard,
  target,
}: {
  section: SectionDef;
  row: DraftRow | null;
  locked: boolean;
  minor: boolean | null;
  teams: PersonGrantsData["teams"];
  teamName: (id: string) => string;
  onChange: (r: DraftRow | null) => void;
  onDiscard: () => void;
  target: { minor: boolean | null };
}) {
  const id = `sec-${s.code}`;
  if (s.base) {
    return (
      <div className="flex items-center gap-3">
        <span className="grid size-6 flex-none place-items-center rounded-md bg-[var(--in-ok-bg)] text-[var(--in-ok)]"><Check className="size-4" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1 text-[15.5px] font-semibold">{s.label}</span>
        <Chip tone="ok">Sempre</Chip>
      </div>
    );
  }
  if (!isGrantable(s)) {
    return (
      <div className="flex items-start gap-3">
        <span className="grid size-6 flex-none place-items-center rounded-md bg-[#eef3f9] text-[var(--in-sub)]"><Lock className="size-4" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <b className="block text-[15.5px]">{s.label}</b>
          <span className="text-[13.5px] text-[var(--in-sub)]">{s.blockReason}</span>
        </span>
        <Chip tone={s.hardBlocked ? "crit" : "mute"}>{s.hardBlocked ? "Bloccata" : "Solo Direzione"}</Chip>
      </div>
    );
  }
  const on = Boolean(row?.on);
  const proposal = on && row && !row.confirmed;
  const offered = offeredPerimeters(s);
  const minorBlocked = minor === true && !offered.includes("SELF");
  const toggle = () => {
    if (on) onChange(null);
    else onChange({ ...defaultRow(s, target), on: true });
  };
  return (
    <div className={proposal ? "-mx-2 rounded-xl bg-[#fffbe6] px-2 py-1" : ""}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={on}
          disabled={locked || minorBlocked}
          onChange={toggle}
          className="mt-0.5 size-6 flex-none accent-[var(--scd-blue)]"
          aria-describedby={proposal ? `${id}-why` : undefined}
        />
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
          <b className="block text-[15.5px] leading-tight">{s.label}</b>
          {minorBlocked && <span className="text-[13.5px] text-[var(--in-sub)]">Non per i minorenni.</span>}
        </label>
        {s.sensitive && (
          <span title="Dato riservato: serve il motivo" className="flex-none">
            <Chip tone="warn"><Lock className="size-3.5" aria-hidden="true" />Riservato</Chip>
          </span>
        )}
      </div>
      {proposal && row && (
        <div id={`${id}-why`} className="mt-2 flex flex-wrap items-center gap-2 pl-9 text-[13.5px] text-[var(--in-warn)]">
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="min-w-0 flex-1">{row.origin === "copied" ? "Da copia" : row.origin === "role" ? "Dal ruolo" : "Suggerito"}{row.reason ? `: ${row.reason}` : ""}. Non conta finché non confermi.</span>
          <button type="button" disabled={locked} onClick={() => onChange({ ...row, confirmed: true })} className="scd-focus inline-flex min-h-10 items-center gap-1 rounded-lg bg-[var(--in-info)] px-3 font-semibold text-white disabled:opacity-50">
            <Check className="size-4" aria-hidden="true" />Conferma
          </button>
          <button type="button" onClick={onDiscard} className="scd-focus inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--in-line)] bg-white px-3 font-semibold text-[var(--in-ink)]">
            <X className="size-4" aria-hidden="true" />Scarta
          </button>
        </div>
      )}
      {on && row && (
        <div className="mt-3 grid gap-3 pl-9 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-1 text-[13px] font-semibold text-[var(--in-sub)]">Può</legend>
            <div className="inline-flex flex-wrap overflow-hidden rounded-[10px] border border-[var(--in-line)]" role="radiogroup">
              {s.levels.map((l: Level) => (
                <label key={l} className={`flex min-h-11 cursor-pointer items-center px-3.5 text-[14.5px] font-semibold ${row.level === l ? "bg-[var(--in-info)] text-white" : "bg-white text-[var(--in-ink)]"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}>
                  <input type="radio" name={`${id}-level`} value={l} checked={row.level === l} disabled={locked} onChange={() => onChange({ ...row, level: l, confirmed: true, origin: row.origin === "saved" ? "saved" : "manual" })} className="sr-only" />
                  {LEVEL_LABEL[l]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex min-w-0 flex-col gap-2">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--in-sub)]">
              Su cosa
              <select
                value={row.perimeter}
                disabled={locked}
                onChange={(e) => onChange({ ...row, perimeter: e.target.value as Perimeter, teamIds: [], site: null, confirmed: true, origin: row.origin === "saved" ? "saved" : "manual" })}
                className={`${inputCls} h-11 font-normal`}
              >
                {(row.perimeter && !offered.includes(row.perimeter) ? [...offered, row.perimeter] : offered).map((p) => (
                  <option key={p} value={p} disabled={minor === true && p !== "SELF"}>{PERIMETER_LABEL[p]} — {lowerFirst(PERIMETER_HINT[p].replace(/\.$/, ""))}</option>
                ))}
              </select>
            </label>
            {row.perimeter === "OWN_TEAMS" && (
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-1 text-[13px] font-semibold text-[var(--in-sub)]">Squadre</legend>
                {teams.length === 0 ? (
                  <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Squadre non disponibili senza database.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((t) => {
                      const sel = row.teamIds.includes(t.id);
                      return (
                        <label key={t.id} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[14px] ${sel ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"} ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                          <input type="checkbox" checked={sel} disabled={locked} onChange={() => onChange({ ...row, teamIds: sel ? row.teamIds.filter((x) => x !== t.id) : [...row.teamIds, t.id], confirmed: true })} className="size-4 accent-[var(--scd-blue)]" />
                          {t.name}
                        </label>
                      );
                    })}
                  </div>
                )}
                {row.teamIds.length > 0 && <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">Scelte: {row.teamIds.map(teamName).join(", ")}</p>}
              </fieldset>
            )}
            {row.perimeter === "OWN_SITE" && (
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-1 text-[13px] font-semibold text-[var(--in-sub)]">Sede</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {SITES.map((site: Site) => (
                    <label key={site} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[14px] ${row.site === site ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"} ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                      <input type="radio" name={`${id}-site`} checked={row.site === site} disabled={locked} onChange={() => onChange({ ...row, site, confirmed: true })} className="size-4 accent-[var(--scd-blue)]" />
                      {SITE_LABEL[site]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpersCard({
  data,
  draft,
  locked,
  onPropose,
  onConfirmAll,
  onDiscardAll,
  onCopied,
}: {
  data: PersonGrantsData;
  draft: Draft;
  locked: boolean;
  onPropose: (rows: PersonGrantsData["suggestions"]) => void;
  onConfirmAll: () => void;
  onDiscardAll: () => void;
  onCopied: () => Promise<void>;
}) {
  const loadGrants = useServerFn(getGrantsOf);
  const copy = useServerFn(copyPersonGrants);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<{ id: string; name: string } | null>(null);
  const [plan, setPlan] = useState<CopyPlan | null>(null);
  const [copyNote, setCopyNote] = useState("");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = pendingProposals(draft).length;
  const applied = data.engine === "applied";
  const teamName = (id: string) => data.teams.find((t) => t.id === id)?.name ?? "squadra";
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const results = useMemo(() => {
    const t = fold(q.trim());
    if (t.length < 2) return [];
    return data.people.filter((p) => fold(p.name).includes(t)).slice(0, 6);
  }, [q, data.people]);

  async function pick(p: { id: string; name: string }) {
    setFrom(p);
    setQ("");
    setPlan(null);
    setCopyMsg(null);
    try {
      const res = await loadGrants({ data: { personId: p.id } });
      if (res.engine !== "applied") {
        setCopyMsg("Le abilitazioni delle altre persone si leggono dopo l'attivazione di r100.");
        return;
      }
      setPlan(copyPlan(res.grants as GrantRow[], { minor: data.person?.minor ?? null }));
    } catch {
      setCopyMsg("Lettura non riuscita, riprova.");
    }
  }

  async function doCopy() {
    if (!from || !data.person) return;
    setBusy(true);
    try {
      const res = await copy({ data: { fromPersonId: from.id, toPersonId: data.person.id, note: copyNote } });
      setCopyMsg(res.message);
      if (res.ok) {
        setConfirmCopy(false);
        setFrom(null);
        setPlan(null);
        await onCopied();
      }
    } catch {
      setCopyMsg("Copia non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="grants-helpers" title="Aiuti" sub="Propongono e basta: decidi tu, una spunta alla volta.">
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px]">
        <div>
          <p className="m-0 mb-1 text-[15px] font-semibold">Proponi in base al ruolo</p>
          <p className="m-0 mb-2 text-[13.5px] leading-snug text-[var(--in-sub)]">
            {data.suggestions.length
              ? `${data.suggestions.length} ${data.suggestions.length === 1 ? "proposta" : "proposte"} dai ruoli della persona. Restano gialle finché non le confermi.`
              : data.connected
                ? "Nessuna proposta: i ruoli di questa persona non suggeriscono sezioni."
                : "Le proposte arrivano dai ruoli della persona, con il database collegato."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={locked || data.suggestions.length === 0} onClick={() => onPropose(data.suggestions)} className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-info)] disabled:opacity-50">
              <Sparkles className="size-4" aria-hidden="true" />Mostra le proposte
            </button>
            {pending > 0 && (
              <>
                <button type="button" disabled={locked} onClick={onConfirmAll} className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3 text-[14.5px] font-semibold text-white disabled:opacity-50">
                  <Check className="size-4" aria-hidden="true" />Conferma tutte ({pending})
                </button>
                <button type="button" onClick={onDiscardAll} className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14.5px] font-semibold">
                  <Undo2 className="size-4" aria-hidden="true" />Scarta le proposte
                </button>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--in-line)] pt-4">
          <p className="m-0 mb-1 text-[15px] font-semibold">Copia abilitazioni da…</p>
          <p className="m-0 mb-2 text-[13.5px] leading-snug text-[var(--in-sub)]">Scegli una persona: vedi cosa verrebbe copiato e confermi. Le sezioni che lei non ha restano come sono.</p>
          <label className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
            <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
            <input type="search" value={q} disabled={locked || !data.connected} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome" aria-label="Cerca la persona da cui copiare" className="h-11 w-full bg-transparent text-[15px] outline-none" />
          </label>
          {results.length > 0 && (
            <ul className="m-0 mt-2 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => void pick(p)} className="scd-focus flex min-h-11 w-full items-center border-t border-[var(--in-line)] px-3 text-left text-[14.5px] first:border-t-0 hover:bg-[#f7fbff]">{p.name}</button>
                </li>
              ))}
            </ul>
          )}
          {from && (
            <div className="mt-3 rounded-xl border border-[var(--in-line)] p-3 text-[14px]">
              <p className="m-0 font-semibold">Da {from.name}</p>
              {plan && (
                <>
                  {plan.apply.length === 0 ? (
                    <p className="m-0 mt-1 text-[var(--in-sub)]">Nessuna abilitazione da copiare.</p>
                  ) : (
                    <ul className="m-0 mt-1 list-disc pl-5">{plan.apply.map((g) => <li key={g.sectionCode}>{grantLine(g, teamName)}</li>)}</ul>
                  )}
                  {plan.skipped.length > 0 && (
                    <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">Non copiate: {plan.skipped.map((s) => `${grantLine(s.grant, teamName)} (${s.reason})`).join("; ")}</p>
                  )}
                  {plan.apply.length > 0 && (
                    <button type="button" disabled={locked || !applied} onClick={() => setConfirmCopy(true)} className="scd-focus mt-2 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3 font-semibold text-white disabled:opacity-50">
                      <Copy className="size-4" aria-hidden="true" />Copia queste {plan.apply.length}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[13.5px] text-[var(--in-sub)]">{copyMsg}</p>
        </div>
      </div>
      {confirmCopy && from && plan && (
        <Dialog title="Copiare queste abilitazioni?" onClose={() => setConfirmCopy(false)} testId="grants-copy-confirm">
          <p className="mt-2 text-[14.5px] text-[var(--in-sub)]">Da {from.name} a {data.person?.name}. È un'azione della Direzione e resta nello storico.</p>
          <ul className="m-0 mt-2 list-disc pl-5 text-[14.5px]">{plan.apply.map((g) => <li key={g.sectionCode}>{grantLine(g, teamName)}</li>)}</ul>
          <label className="mt-3 flex flex-col gap-1 text-[15px] font-semibold">
            Motivo
            <input value={copyNote} maxLength={300} onChange={(e) => setCopyNote(e.target.value)} placeholder="Es. secondo dirigente U15" className={`${inputCls} font-normal`} />
          </label>
          <button type="button" disabled={busy} onClick={() => void doCopy()} className="scd-focus mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] text-[16px] font-semibold text-white disabled:opacity-50">
            <Copy className="size-[18px]" aria-hidden="true" />{busy ? "Copio…" : "Conferma e copia"}
          </button>
          <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{copyMsg}</p>
        </Dialog>
      )}
    </Card>
  );
}

function DiffList({ title, tone, lines }: { title: string; tone: "ok" | "info" | "crit"; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="mt-3">
      <Chip tone={tone}>{title} · {lines.length}</Chip>
      <ul className="m-0 mt-1 list-disc pl-5 text-[14.5px] leading-snug">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

function GrantAuditCard({ data }: { data: PersonGrantsData }) {
  const [all, setAll] = useState(false);
  const rows = all ? data.audit : data.audit.slice(0, 8);
  return (
    <Card id="grants-storico" title="Storico abilitazioni" sub={data.engine !== "applied" ? "Si riempie dopo l'attivazione di r100." : data.audit.length ? "Chi ha cambiato cosa, e quando." : "Ancora nessuna modifica."}>
      <ul className="m-0 list-none px-4 pb-3 sm:px-[18px]">
        {rows.map((e) => (
          <li key={e.id} className="border-t border-[var(--in-line)] py-2 text-[14px] first:border-t-0">
            <b className="block">{e.summary}</b>
            <span className="block text-[13px] text-[var(--in-sub)]">
              {new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(e.createdAt))}
              {e.actorEmail ? ` · da ${e.actorEmail}` : ""}
              {e.note ? ` · “${e.note}”` : ""}
            </span>
          </li>
        ))}
      </ul>
      {data.audit.length > 8 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="scd-focus mx-4 mb-4 text-[14px] font-semibold text-[var(--in-info)] sm:mx-[18px]">{all ? "Mostra meno" : `Mostra tutte (${data.audit.length})`}</button>
      )}
    </Card>
  );
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
