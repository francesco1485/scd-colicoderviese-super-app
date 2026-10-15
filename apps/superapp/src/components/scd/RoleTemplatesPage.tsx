/**
 * Direzione → Ruoli (r111, Francesco 15/10/2026). One tab per platform (SCD ONE, CORE, GROW); in each tab the first
 * action is "Crea ruolo vuoto" (every section at "Nessuno"), then "Parti da un modello". Only the Presidente and the
 * Direttore Generale create, edit or deactivate; everyone else in the Direzione sees the list read-only. A role
 * opens nothing: it is loaded on a person from her checklist (Direzione → Accessi → persona → "Carica un ruolo").
 * Until migration r111 is applied the page is a preview: drafts work on screen, nothing is saved.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, Layers, Lock, Pencil, Plus, Power, Save, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, WorkAreaShell } from "@/components/scd/work-area-ui";
import {
  LEVEL_LABEL,
  PERIMETER_LABEL,
  SECTION_GROUPS,
  type Level,
  type Perimeter,
  type SectionDef,
} from "@/lib/person-grants";
import {
  PLATFORMS,
  PLATFORM_HINT,
  PLATFORM_LABEL,
  ROLE_PRESETS,
  ROLE_RULES_IT,
  byPlatform,
  cleanLabel,
  labelProblem,
  narrowestPerimeter,
  platformSections,
  presetGrants,
  sortGrants,
  templateLines,
  templateProblem,
  type Platform,
  type RoleTemplate,
  type TemplateGrant,
} from "@/lib/role-templates";
import {
  createRoleTemplate,
  getRoleTemplates,
  saveRoleTemplate,
  setRoleTemplateActive,
  type RoleTemplatesData,
} from "@/lib/role-templates.functions";

const inputCls = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";
const LABELS = { level: LEVEL_LABEL, perimeter: PERIMETER_LABEL };

interface Editing {
  id: string | null;
  platform: Platform;
  label: string;
  description: string;
  grants: TemplateGrant[];
  from: string | null;
}

export function RoleTemplatesPage({ initial }: { initial: RoleTemplatesData }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Platform>("CORE");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getRoleTemplates);
  const create = useServerFn(createRoleTemplate);
  const save = useServerFn(saveRoleTemplate);
  const toggle = useServerFn(setRoleTemplateActive);

  const applied = data.engine === "applied";
  const canEdit = data.connected && data.actor.isCreator;
  const grouped = useMemo(() => byPlatform(data.templates), [data.templates]);
  const activeCount = data.templates.filter((t) => t.active).length;

  async function refresh() {
    try {
      setData(await reload());
    } catch {
      /* keep the current screen */
    }
  }

  function startEmpty(platform: Platform) {
    setMessage(null);
    setEditing({ id: null, platform, label: "", description: "", grants: [], from: null });
  }
  function startPreset(platform: Platform, code: string) {
    const p = ROLE_PRESETS[platform].find((x) => x.code === code);
    if (!p) return;
    setMessage(null);
    setEditing({ id: null, platform, label: p.label, description: "", grants: presetGrants(platform, code), from: p.label });
  }
  function startEdit(t: RoleTemplate) {
    setMessage(null);
    setTab(t.platform);
    setEditing({ id: t.id, platform: t.platform, label: t.label, description: t.description, grants: [...t.grants], from: null });
  }

  async function submit(e: Editing, note: string) {
    setBusy(true);
    setMessage(null);
    try {
      let id = e.id;
      if (!id) {
        const res = await create({ data: { platform: e.platform, label: cleanLabel(e.label), description: e.description, preset: null } });
        if (!res.ok || !res.id) {
          setMessage(res.message);
          return;
        }
        id = res.id;
        if (e.grants.length === 0) {
          setMessage(res.message);
          setEditing(null);
          await refresh();
          return;
        }
      }
      const res = await save({ data: { id, platform: e.platform, label: cleanLabel(e.label), description: e.description, grants: sortGrants(e.grants), note } });
      setMessage(res.message);
      if (res.ok) {
        setEditing(null);
        await refresh();
      }
    } catch {
      setMessage("Salvataggio non riuscito, riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(t: RoleTemplate, active: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await toggle({ data: { id: t.id, active, note: "" } });
      setMessage(res.message);
      if (res.ok) await refresh();
    } catch {
      setMessage("Modifica non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkAreaShell
      id="accessi"
      title="Ruoli"
      path="/direzione/ruoli"
      preview={data.gate.preview}
      editable
      status={applied ? undefined : <Chip tone="warn">Anteprima: non si salva nulla</Chip>}
      highlights={[
        { value: data.connected && applied ? activeCount : null, label: "ruoli attivi" },
        { value: PLATFORMS.length, label: "piattaforme" },
      ]}
      note={<>Un ruolo è un gruppo di sezioni pronto da caricare su una persona. Da solo non apre nulla.</>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/direzione/accessi" className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-[15px] font-semibold text-[var(--in-info)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Accessi e permessi
        </Link>
      </div>

      {!applied && (
        <div role="note" data-testid="roles-not-applied" className="flex items-start gap-3 rounded-2xl border border-[#f1dc7a] bg-[var(--in-warn-bg)] px-4 py-3 text-[15px] leading-snug text-[var(--in-ink)]">
          <ShieldAlert className="mt-0.5 size-5 flex-none text-[var(--in-warn)]" aria-hidden="true" />
          <span>
            <b className="block text-[16px]">Da attivare: serve «applica r111».</b>
            Puoi provare a comporre un ruolo e vedere cosa conterrebbe, ma non si salva nulla e nessuno riceve accessi.
          </span>
        </div>
      )}

      {data.connected && !data.actor.isCreator && (
        <p role="note" data-testid="roles-read-only" className="m-0 flex items-start gap-2 rounded-xl bg-[var(--in-info-bg)] px-3 py-2 text-[14.5px] leading-snug text-[var(--in-ink)]">
          <Lock className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
          Solo il Presidente e il Direttore Generale creano e modificano i ruoli. Tu li vedi e li carichi sulle persone dalla loro scheda.
        </p>
      )}

      <div role="tablist" aria-label="Piattaforme" className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`roles-tab-${p}`}
            aria-selected={tab === p}
            aria-controls={`roles-panel-${p}`}
            onClick={() => { setTab(p); setEditing((e) => (e && e.platform !== p ? null : e)); }}
            className={`scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold ${tab === p ? "border-[var(--scd-blue)] bg-[var(--scd-blue)] text-white" : "border-[var(--in-line)] bg-white text-[var(--in-ink)]"}`}
          >
            {PLATFORM_LABEL[p]}
            <span className={`rounded-full px-2 text-[12.5px] ${tab === p ? "bg-white/20" : "bg-[var(--in-info-bg)] text-[var(--in-info)]"}`}>{grouped[p].filter((t) => t.active).length}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`roles-panel-${tab}`} aria-labelledby={`roles-tab-${tab}`} className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="roles-create" title={`Nuovo ruolo in ${PLATFORM_LABEL[tab]}`} sub={PLATFORM_HINT[tab]}>
            <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
              <div className="flex flex-wrap items-end gap-2">
                <button type="button" data-testid="roles-create-empty" disabled={!data.actor.isCreator && data.connected} onClick={() => startEmpty(tab)} className="scd-focus inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[16px] font-semibold text-white disabled:opacity-50">
                  <Plus className="size-[18px]" aria-hidden="true" />Crea ruolo vuoto
                </button>
                {ROLE_PRESETS[tab].length > 0 && (
                  <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[14px] font-semibold text-[var(--in-sub)]">
                    Oppure parti da un modello
                    <select value="" disabled={!data.actor.isCreator && data.connected} onChange={(e) => e.target.value && startPreset(tab, e.target.value)} className={`${inputCls} font-normal`}>
                      <option value="">Scegli un modello…</option>
                      {ROLE_PRESETS[tab].map((p) => <option key={p.code} value={p.code}>{p.label} ({p.grants.length} sezioni)</option>)}
                    </select>
                  </label>
                )}
              </div>
              <p className="m-0 text-[13.5px] leading-snug text-[var(--in-sub)]">Il ruolo vuoto parte con tutte le sezioni su “Nessuno”: aggiungi solo quelle che servono.</p>
            </div>
          </Card>

          {editing && editing.platform === tab && (
            <RoleEditor
              key={editing.id ?? `new-${editing.from ?? "empty"}`}
              editing={editing}
              others={data.templates}
              canSave={applied && canEdit}
              busy={busy}
              onCancel={() => setEditing(null)}
              onChange={setEditing}
              onSubmit={(note) => void submit(editing, note)}
            />
          )}

          <Card id="roles-list" title={`Ruoli di ${PLATFORM_LABEL[tab]}`} sub="Si caricano sulle persone da Accessi → scheda della persona → “Carica un ruolo”.">
            <div className="px-4 pb-4 sm:px-[18px]">
              {grouped[tab].length === 0 ? (
                <EmptyState title="Nessun ruolo ancora">{applied ? "Crea il primo con “Crea ruolo vuoto”." : data.connected ? "I ruoli salvati compariranno qui dopo «applica r111»." : "Anteprima senza database: i ruoli arrivano con l'accesso Direzione."}</EmptyState>
              ) : (
                <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0" data-testid="roles-items">
                  {grouped[tab].map((t) => (
                    <li key={t.id} className="flex flex-col gap-2 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-[16px]">{t.label}</b>
                        <Chip tone={t.active ? "ok" : "mute"}>{t.active ? "Attivo" : "Disattivato"}</Chip>
                        <span className="text-[13.5px] text-[var(--in-sub)]">{t.grants.length ? `${t.grants.length} ${t.grants.length === 1 ? "sezione" : "sezioni"}` : "vuoto"}</span>
                      </div>
                      {t.description && <p className="m-0 text-[14px] text-[var(--in-sub)]">{t.description}</p>}
                      {t.grants.length > 0 && <ul className="m-0 list-disc pl-5 text-[14px] leading-snug">{templateLines(t, LABELS).map((l) => <li key={l}>{l}</li>)}</ul>}
                      {canEdit && (
                        <div className="flex flex-wrap gap-2">
                          {t.active && (
                            <button type="button" disabled={busy} onClick={() => startEdit(t)} className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-info)] disabled:opacity-50">
                              <Pencil className="size-4" aria-hidden="true" />Modifica
                            </button>
                          )}
                          <button type="button" disabled={busy} onClick={() => void setActive(t, !t.active)} className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14.5px] font-semibold disabled:opacity-50">
                            <Power className="size-4" aria-hidden="true" />{t.active ? "Disattiva" : "Riattiva"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="roles-rules" title="Come funzionano" sub="Decisioni del 15/10/2026.">
            <ul className="m-0 list-none px-4 pb-4 sm:px-[18px]">
              {ROLE_RULES_IT.map((r) => (
                <li key={r} className="flex gap-2 border-t border-[var(--in-line)] py-2 text-[14.5px] leading-snug first:border-t-0">
                  <Layers className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </WorkAreaShell>
  );
}


function RoleEditor({
  editing,
  others,
  canSave,
  busy,
  onCancel,
  onChange,
  onSubmit,
}: {
  editing: Editing;
  others: readonly RoleTemplate[];
  canSave: boolean;
  busy: boolean;
  onCancel: () => void;
  onChange: (e: Editing) => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const sections = platformSections(editing.platform);
  const byCode = new Map(editing.grants.map((g) => [g.sectionCode, g]));
  const nameProblem = labelProblem(editing.label, editing.platform, others, editing.id ?? undefined);
  const contentProblem = templateProblem(editing.platform, editing.grants);
  const problem = nameProblem ?? contentProblem;

  function setGrant(s: SectionDef, level: Level | "NONE", perimeter?: Perimeter) {
    const rest = editing.grants.filter((g) => g.sectionCode !== s.code);
    if (level === "NONE") return onChange({ ...editing, grants: rest });
    const cur = byCode.get(s.code);
    const p = perimeter ?? cur?.perimeter ?? narrowestPerimeter(s);
    onChange({ ...editing, grants: [...rest, { sectionCode: s.code, level, perimeter: p }] });
  }

  return (
    <Card id="roles-editor" title={editing.id ? `Modifica: ${editing.label || "ruolo"}` : editing.from ? `Nuovo ruolo dal modello “${editing.from}”` : "Nuovo ruolo vuoto"} sub={`${PLATFORM_LABEL[editing.platform]} · ${editing.grants.length} ${editing.grants.length === 1 ? "sezione" : "sezioni"} su ${sections.length}`}>
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[15px] font-semibold">
            Nome del ruolo
            <input value={editing.label} maxLength={80} onChange={(e) => onChange({ ...editing, label: e.target.value })} placeholder="Es. Dirigente accompagnatore" className={`${inputCls} font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-[15px] font-semibold">
            Descrizione (facoltativa)
            <input value={editing.description} maxLength={300} onChange={(e) => onChange({ ...editing, description: e.target.value })} placeholder="A chi serve" className={`${inputCls} font-normal`} />
          </label>
        </div>

        {SECTION_GROUPS.map((g) => {
          const list = sections.filter((s) => s.group === g.code);
          if (!list.length) return null;
          return (
            <fieldset key={g.code} className="m-0 border-0 p-0">
              <legend className="mb-1 text-[15px] font-semibold text-[var(--in-ink)]">{g.label}</legend>
              <ul className="m-0 list-none divide-y divide-[var(--in-line)] rounded-xl border border-[var(--in-line)] p-0">
                {list.map((s) => {
                  const cur = byCode.get(s.code);
                  const id = `role-${editing.platform}-${s.code}`;
                  return (
                    <li key={s.code} className="grid grid-cols-2 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_170px_170px] sm:items-center">
                      <span className="col-span-2 min-w-0 text-[14.5px] leading-snug sm:col-span-1">
                        <b className="block">{s.label}{s.sensitive ? <Lock className="ml-1 inline size-3.5 text-[var(--in-warn)]" aria-label="dati riservati" /> : null}</b>
                        {s.sees && <span className="text-[13px] text-[var(--in-sub)]">{s.sees}</span>}
                      </span>
                      <label className="sr-only" htmlFor={`${id}-level`}>{s.label}: livello</label>
                      <select id={`${id}-level`} value={cur?.level ?? "NONE"} onChange={(e) => setGrant(s, e.target.value as Level | "NONE")} className={`${inputCls} ${cur ? "border-[var(--in-info)] font-semibold" : ""}`}>
                        <option value="NONE">Nessuno</option>
                        {s.levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                      </select>
                      <label className="sr-only" htmlFor={`${id}-perimeter`}>{s.label}: su cosa</label>
                      <select id={`${id}-perimeter`} value={cur?.perimeter ?? ""} disabled={!cur} onChange={(e) => cur && setGrant(s, cur.level, e.target.value as Perimeter)} className={`${inputCls} disabled:bg-[#f6f8fb] disabled:text-[var(--in-sub)]`}>
                        {!cur && <option value="">—</option>}
                        {s.perimeters.map((p) => <option key={p} value={p}>{PERIMETER_LABEL[p]}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}

        <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold"><Eye className="size-4 text-[var(--in-info)]" aria-hidden="true" />Chi riceve questo ruolo vedrà</p>
          {editing.grants.length === 0 ? (
            <p className="m-0 mt-1 text-[14px] text-[var(--in-sub)]">Solo la base (pagine pubbliche, profilo, tessera): il ruolo è vuoto.</p>
          ) : (
            <ul className="m-0 mt-1 list-disc pl-5 text-[14px] leading-snug">{templateLines(editing, LABELS).map((l) => <li key={l}>{l}</li>)}</ul>
          )}
          <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">“Sue annate” e “Sua sede” si scelgono quando carichi il ruolo su una persona.</p>
        </div>

        <label className="flex flex-col gap-1 text-[15px] font-semibold">
          Motivo (facoltativo)
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Es. nuovo incarico deciso in consiglio" className={`${inputCls} font-normal`} />
        </label>
        {problem && <p role="alert" className="m-0 rounded-xl bg-[var(--in-crit-bg)] px-3 py-2 text-[14px] text-[var(--in-crit)]">{problem}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="roles-save" disabled={!canSave || busy || problem !== null} onClick={() => onSubmit(note)} className="scd-focus inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[16px] font-semibold text-white disabled:opacity-50">
            <Save className="size-[18px]" aria-hidden="true" />{busy ? "Salvo…" : editing.id ? "Salva il ruolo" : "Crea il ruolo"}
          </button>
          <button type="button" onClick={onCancel} className="scd-focus inline-flex h-12 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold">
            <X className="size-4" aria-hidden="true" />Annulla
          </button>
        </div>
        {!canSave && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Anteprima: il salvataggio si accende dopo «applica r111», solo per il Presidente e il Direttore Generale.</p>}
      </div>
    </Card>
  );
}

