/**
 * Direzione → Ruoli (r111, Francesco 15/10/2026). One tab per platform (SCD ONE, CORE, GROW); in each tab the first
 * action is "Crea ruolo vuoto" (every section at "Nessuno"), then "Parti da un modello". Only the Presidente and the
 * Direttore Generale create, edit or deactivate; everyone else in the Direzione sees the list read-only. A role
 * opens nothing: it is loaded on a person from her checklist (Direzione → Accessi → persona → "Carica un ruolo").
 * Until migration r111 is applied the page is a preview: drafts work on screen, nothing is saved.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, Eye, Lock, Pencil, Plus, Power, Save, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { TONES, type Tone } from "@/components/home/tones";
import { Card, Chip } from "@/components/scd/interior-ui";
import { POSITION_GROUPS, POSITION_GROUP_LABEL } from "@/lib/position-catalog";
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
  PLATFORM_TONE,
  ROLE_PRESETS,
  ROLE_RULES_IT,
  byPlatform,
  cleanLabel,
  labelProblem,
  narrowestPerimeter,
  platformSections,
  positionLabelOf,
  presetGrants,
  rolesBanner,
  sortGrants,
  templateLines,
  templateProblem,
  type Platform,
  type PositionOption,
  type RoleTemplate,
  type RolesBanner,
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
  /** r112: organigram position the role is meant for ("" = none). */
  positionCode: string;
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
      setMessage("Non riesco a ricaricare i ruoli: aggiorna la pagina.");
    }
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = PLATFORMS.indexOf(tab);
    const next = e.key === "ArrowRight" ? PLATFORMS[(i + 1) % PLATFORMS.length] : e.key === "ArrowLeft" ? PLATFORMS[(i + PLATFORMS.length - 1) % PLATFORMS.length] : e.key === "Home" ? PLATFORMS[0] : e.key === "End" ? PLATFORMS[PLATFORMS.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    setEditing((x) => (x && x.platform !== next ? null : x));
    document.getElementById(`roles-tab-${next}`)?.focus();
  }

  function startEmpty(platform: Platform) {
    setMessage(null);
    setEditing({ id: null, platform, label: "", description: "", grants: [], from: null, positionCode: "" });
  }
  function startPreset(platform: Platform, code: string) {
    const p = ROLE_PRESETS[platform].find((x) => x.code === code);
    if (!p) return;
    setMessage(null);
    setEditing({ id: null, platform, label: p.label, description: "", grants: presetGrants(platform, code), from: p.label, positionCode: "" });
  }
  function startEdit(t: RoleTemplate) {
    setMessage(null);
    setTab(t.platform);
    setEditing({ id: t.id, platform: t.platform, label: t.label, description: t.description, grants: [...t.grants], from: null, positionCode: t.positionCode ?? "" });
  }

  async function submit(e: Editing, note: string) {
    setBusy(true);
    setMessage(null);
    try {
      // The position is sent only when r112 is applied; otherwise the role saves without it.
      const position = data.positionLink === "applied" ? { positionCode: e.positionCode || null } : {};
      const payload = { platform: e.platform, label: cleanLabel(e.label), description: e.description, grants: sortGrants(e.grants), ...position };
      const res = e.id ? await save({ data: { id: e.id, ...payload, note } }) : await create({ data: payload });
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

  const banner = rolesBanner(data);
  const tone = PLATFORM_TONE[tab];
  const T = TONES[tone];

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
      <header data-testid="roles-hero" className="scd-band relative overflow-hidden rounded-2xl px-4 py-5 text-white sm:px-6 sm:py-6">
        <Link to="/direzione/accessi" className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] text-[14.5px] font-semibold text-[#dbe5f7] underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Accessi e permessi
        </Link>
        <p className="m-0 mt-1 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#ffd84a]">Direzione · Deleghe</p>
        <h2 className="m-0 mt-1 text-[26px] font-extrabold leading-tight sm:text-[30px]">Ruoli per piattaforma</h2>
        <p className="m-0 mt-2 max-w-[62ch] text-[15px] leading-snug text-[#dbe5f7]">
          Ogni ruolo vale per una sola piattaforma e si può sempre creare vuoto. Lo carichi su una persona dalla sua scheda: arriva come proposta e conta solo quando confermi.
        </p>
        <p data-testid="roles-banner" data-banner={banner} className="m-0 mt-3 inline-flex min-h-9 flex-wrap items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[14px] font-semibold text-white ring-1 ring-white/25">
          {banner === "creator" ? <><ShieldCheck className="size-4 text-[#ffd84a]" aria-hidden="true" />Puoi creare, modificare e disattivare i ruoli</> : banner === "read-only" ? <><Lock className="size-4 text-[#ffd84a]" aria-hidden="true" />Sola lettura: i ruoli li creano Presidente e Direttore Generale</> : banner === "not-applied" ? <><ShieldAlert className="size-4 text-[#ffd84a]" aria-hidden="true" />Da attivare: serve «applica r111»</> : banner === "unknown" ? <><ShieldAlert className="size-4 text-[#ffd84a]" aria-hidden="true" />Stato del database da confermare: non si salva nulla</> : <><Eye className="size-4 text-[#ffd84a]" aria-hidden="true" />Anteprima senza database</>}
        </p>
      </header>

      {banner === "not-applied" && (
        <div role="note" data-testid="roles-not-applied" className="flex items-start gap-3 rounded-2xl border border-[#f1dc7a] bg-[var(--in-warn-bg)] px-4 py-3 text-[15px] leading-snug text-[var(--in-ink)]">
          <ShieldAlert className="mt-0.5 size-5 flex-none text-[var(--in-warn)]" aria-hidden="true" />
          <span>
            <b className="block text-[16px]">Da attivare: serve «applica r111».</b>
            Puoi provare a comporre un ruolo e vedere cosa conterrebbe, ma non si salva nulla e nessuno riceve accessi.
          </span>
        </div>
      )}

      {banner === "read-only" && (
        <p role="note" data-testid="roles-read-only" className="m-0 flex items-start gap-2 rounded-xl bg-[var(--in-info-bg)] px-3 py-2 text-[14.5px] leading-snug text-[var(--in-ink)]">
          <Lock className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
          Solo il Presidente e il Direttore Generale creano e modificano i ruoli. Tu li vedi e li carichi sulle persone dalla loro scheda.
        </p>
      )}

      <div role="tablist" aria-label="Piattaforme" className="grid grid-cols-3 gap-2 sm:gap-3">
        {PLATFORMS.map((p) => {
          const on = tab === p;
          const pt = TONES[PLATFORM_TONE[p]];
          const n = grouped[p].filter((t) => t.active).length;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              id={`roles-tab-${p}`}
              data-tone={PLATFORM_TONE[p]}
              aria-selected={on}
              aria-controls={`roles-panel-${p}`}
              tabIndex={on ? 0 : -1}
              onKeyDown={onTabKey}
              onClick={() => { setTab(p); setEditing((e) => (e && e.platform !== p ? null : e)); }}
              className={`scd-focus relative flex min-h-[72px] min-w-0 flex-col items-start justify-between gap-1 overflow-hidden rounded-2xl px-3 py-2.5 text-left sm:min-h-[92px] sm:px-4 sm:py-3 ${on ? `${pt.band} shadow-[0_8px_20px_-12px_rgb(15_29_61/0.8)]` : "border border-[var(--in-line)] bg-white text-[var(--in-ink)] hover:bg-[#f7fbff]"}`}
            >
              {!on && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: TONE_BAR[PLATFORM_TONE[p]] }} />}
              <span className="flex w-full items-center justify-between gap-2">
                <b className="min-w-0 leading-tight">
                  <span className={`block text-[11.5px] font-bold uppercase tracking-[0.12em] sm:hidden ${on ? pt.kicker : "text-[var(--in-sub)]"}`}>SCD</span>
                  <span className="block text-[17px] sm:hidden">{p}</span>
                  <span className="hidden truncate text-[17px] sm:block">{PLATFORM_LABEL[p]}</span>
                </b>
                <span className={`flex-none rounded-full px-2 text-[13px] font-bold ${on ? (PLATFORM_TONE[p] === "sole" ? "bg-[#13254d]/10" : "bg-white/20") : "bg-[var(--in-info-bg)] text-[var(--in-info)]"}`}>
                  {data.connected && applied ? <>{n}<span className="sr-only"> ruoli attivi</span></> : <><span aria-hidden="true">–</span><span className="sr-only">ruoli attivi da confermare</span></>}
                </span>
              </span>
              <span className={`hidden text-[13px] leading-snug sm:block ${on ? pt.body : "text-[var(--in-sub)]"}`}>{PLATFORM_HINT[p]}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`roles-panel-${tab}`} aria-labelledby={`roles-tab-${tab}`} className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <section id="roles-create" aria-labelledby="roles-create-title" data-tone={tone} className={`${T.band} relative overflow-hidden rounded-2xl px-4 py-4 sm:px-[18px]`}>
            <p className={`m-0 text-[12.5px] font-bold uppercase tracking-[0.12em] ${T.kicker}`}>{PLATFORM_LABEL[tab]}</p>
            <h2 id="roles-create-title" className="m-0 mt-0.5 text-[20px] font-bold leading-tight">Nuovo ruolo</h2>
            <p className={`m-0 mt-1 text-[14.5px] leading-snug ${T.body}`}>{PLATFORM_HINT[tab]}</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <button type="button" data-testid="roles-create-empty" disabled={!data.actor.isCreator && data.connected} onClick={() => startEmpty(tab)} className={`${T.cta} scd-focus inline-flex h-12 items-center gap-2 rounded-[12px] px-4 text-[16px] font-bold disabled:cursor-not-allowed disabled:opacity-60`}>
                <Plus className="size-[18px]" aria-hidden="true" />Crea ruolo vuoto
              </button>
              {ROLE_PRESETS[tab].length > 0 && (
                <label className={`flex min-w-[200px] flex-1 flex-col gap-1 text-[14px] font-semibold ${T.body}`}>
                  Oppure parti da un modello
                  <select value="" disabled={!data.actor.isCreator && data.connected} onChange={(e) => e.target.value && startPreset(tab, e.target.value)} className={`${inputCls} font-normal disabled:opacity-70`}>
                    <option value="">Scegli un modello…</option>
                    {ROLE_PRESETS[tab].map((p) => <option key={p.code} value={p.code}>{p.label} ({p.grants.length} sezioni)</option>)}
                  </select>
                </label>
              )}
            </div>
            <p className={`m-0 mt-2 text-[13.5px] leading-snug ${T.muted}`}>Il ruolo vuoto parte con tutte le sezioni su “Nessuno”: aggiungi solo quelle che servono.</p>
          </section>

          {editing && editing.platform === tab && (
            <RoleEditor
              key={editing.id ?? `new-${editing.from ?? "empty"}`}
              editing={editing}
              others={data.templates}
              canSave={applied && canEdit}
              banner={banner}
              positions={data.positions}
              positionLink={data.positionLink}
              busy={busy}
              onCancel={() => setEditing(null)}
              onChange={setEditing}
              onSubmit={(note) => void submit(editing, note)}
            />
          )}

          <Card id="roles-list" title={`Ruoli di ${PLATFORM_LABEL[tab]}`} sub="Si caricano sulle persone da Accessi → scheda della persona → “Carica un ruolo”.">
            <div className="px-4 pb-4 sm:px-[18px]">
              {data.readError ? (
                <p role="alert" className="m-0 rounded-xl bg-[var(--in-crit-bg)] px-3 py-2 text-[14.5px] text-[var(--in-crit)]">Lettura dei ruoli non riuscita: aggiorna la pagina tra poco.</p>
              ) : grouped[tab].length === 0 ? (
                <EmptyState title="Nessun ruolo ancora">{applied ? (canEdit ? "Crea il primo con “Crea ruolo vuoto”." : "Il Presidente o il Direttore Generale li creano qui.") : data.connected ? "I ruoli salvati compariranno qui dopo «applica r111»." : "Anteprima senza database: i ruoli arrivano con l'accesso Direzione."}</EmptyState>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="roles-items">
                  {grouped[tab].map((t) => {
                    const pos = positionLabelOf(t.positionCode, data.positions);
                    return (
                      <li key={t.id} className={`relative flex flex-col gap-2 overflow-hidden rounded-xl border border-[var(--in-line)] py-3 pl-5 pr-3 ${t.active ? "bg-white" : "bg-[#f6f8fb]"}`}>
                        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.active ? TONE_BAR[tone] : "#b8c5dd" }} />
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-[16px]">{t.label}</b>
                          <Chip tone={t.active ? "ok" : "mute"}>{t.active ? "Attivo" : "Disattivato"}</Chip>
                          <span className="text-[13.5px] text-[var(--in-sub)]">{t.grants.length ? `${t.grants.length} ${t.grants.length === 1 ? "sezione" : "sezioni"}` : "vuoto"}</span>
                        </div>
                        {pos && <p className="m-0 flex items-center gap-1.5 text-[14px] text-[var(--in-ink)]"><BadgeCheck className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />Per chi ricopre: <b>{pos}</b></p>}
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
                    );
                  })}
                </ul>
              )}
              <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[14px] text-[var(--in-sub)]">{message}</p>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <section id="roles-rules" aria-labelledby="roles-rules-title" className="overflow-hidden rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)]">
            <div className="scd-band px-4 py-3 text-white sm:px-[18px]">
              <h2 id="roles-rules-title" className="m-0 text-[18px] font-bold leading-tight">Come funzionano</h2>
              <p className="m-0 mt-0.5 text-[13.5px] text-[#b4c3de]">Decisioni di Francesco del 15/10/2026. Le applica il database.</p>
            </div>
            <ol className="m-0 list-none px-4 py-2 sm:px-[18px]">
              {ROLE_RULES_IT.map((r, i) => (
                <li key={r} className="flex gap-3 border-t border-[var(--in-line)] py-2.5 text-[14.5px] leading-snug first:border-t-0">
                  <span aria-hidden="true" className="scd-gold flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-extrabold">{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-label="Colori delle piattaforme" className="rounded-2xl border border-[var(--in-line)] bg-white px-4 py-3 sm:px-[18px]">
            <p className="m-0 text-[14px] font-semibold text-[var(--in-ink)]">Un colore per piattaforma</p>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-[14px]">
              {PLATFORMS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span aria-hidden="true" className={`${TONES[PLATFORM_TONE[p]].band} mt-0.5 size-5 flex-none rounded-md`} />
                  <span className="min-w-0"><b className="whitespace-nowrap">{PLATFORM_LABEL[p]}</b> <span className="text-[var(--in-sub)]">· {PLATFORM_HINT[p]}</span></span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </WorkAreaShell>
  );
}

/** Solid accent of each tone for thin bars (decorative, never behind text). */
const TONE_BAR: Readonly<Record<Tone, string>> = { navy: "#13254d", azzurro: "#1266b8", sole: "#f6cc3a" };

function RoleEditor({
  editing,
  others,
  canSave,
  banner,
  positions,
  positionLink,
  busy,
  onCancel,
  onChange,
  onSubmit,
}: {
  editing: Editing;
  others: readonly RoleTemplate[];
  canSave: boolean;
  banner: RolesBanner;
  positions: readonly PositionOption[];
  positionLink: string;
  busy: boolean;
  onCancel: () => void;
  onChange: (e: Editing) => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(Boolean(editing.label));
  const sections = platformSections(editing.platform);
  const byCode = new Map(editing.grants.map((g) => [g.sectionCode, g]));
  const nameProblem = labelProblem(editing.label, editing.platform, others, editing.id ?? undefined);
  const contentProblem = templateProblem(editing.platform, editing.grants);
  const problem = nameProblem ?? contentProblem;
  const shownProblem = touched ? problem : contentProblem;

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
            <input value={editing.label} maxLength={80} onChange={(e) => { setTouched(true); onChange({ ...editing, label: e.target.value }); }} onBlur={() => setTouched(true)} placeholder="Es. Dirigente accompagnatore" className={`${inputCls} font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-[15px] font-semibold">
            Descrizione (facoltativa)
            <input value={editing.description} maxLength={300} onChange={(e) => onChange({ ...editing, description: e.target.value })} placeholder="A chi serve" className={`${inputCls} font-normal`} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[15px] font-semibold">
          Per chi ricopre questa posizione (facoltativo)
          <select data-testid="roles-position" value={editing.positionCode} disabled={positionLink !== "applied" || positions.length === 0} onChange={(e) => onChange({ ...editing, positionCode: e.target.value })} className={`${inputCls} font-normal disabled:bg-[#f6f8fb] disabled:text-[var(--in-sub)]`}>
            <option value="">Nessuna posizione</option>
            {groupedPositions(positions).map(([group, list]) => (
              <optgroup key={group} label={POSITION_GROUP_TEXT[group] ?? group}>
                {list.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              </optgroup>
            ))}
          </select>
          <span className="text-[13px] font-normal leading-snug text-[var(--in-sub)]">
            {positionLink === "applied"
              ? "Dal catalogo ruoli dell'organigramma. Serve solo a proporre questo ruolo per primo a chi ricopre la posizione: non apre nulla."
              : "Collegamento al catalogo ruoli dell'organigramma da attivare: serve «applica r112». Il ruolo si salva lo stesso."}
          </span>
        </label>

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
                    <li key={s.code} className={`relative grid grid-cols-2 gap-2 py-2.5 pl-4 pr-3 ${cur ? "bg-[#f7fbff]" : ""}`}>
                      {cur && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: TONE_BAR[PLATFORM_TONE[editing.platform]] }} />}
                      <span className="col-span-2 min-w-0 text-[14.5px] leading-snug">
                        <b className="block">{s.label}{s.sensitive ? <Lock role="img" className="ml-1 inline size-3.5 text-[var(--in-warn)]" aria-label="dati riservati" /> : null}</b>
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
        {shownProblem && <p role="alert" className="m-0 rounded-xl bg-[var(--in-crit-bg)] px-3 py-2 text-[14px] text-[var(--in-crit)]">{shownProblem}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="roles-save" disabled={!canSave || busy || problem !== null} onClick={() => onSubmit(note)} className="scd-focus inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[16px] font-semibold text-white disabled:opacity-50">
            <Save className="size-[18px]" aria-hidden="true" />{busy ? "Salvo…" : editing.id ? "Salva il ruolo" : "Crea il ruolo"}
          </button>
          <button type="button" onClick={onCancel} className="scd-focus inline-flex h-12 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold">
            <X className="size-4" aria-hidden="true" />Annulla
          </button>
        </div>
        {!canSave && (
          <p data-testid="roles-save-off" className="m-0 text-[13.5px] text-[var(--in-sub)]">
            {banner === "read-only"
              ? "Solo il Presidente e il Direttore Generale salvano i ruoli."
              : banner === "not-applied"
                ? "Anteprima: il salvataggio si accende dopo «applica r111», solo per il Presidente e il Direttore Generale."
                : "Anteprima: senza collegamento al database del club non si salva nulla."}
          </p>
        )}
      </div>
    </Card>
  );
}


/** Group labels of the organigram catalogue (r138), in the catalogue order. */
const POSITION_GROUP_TEXT: Readonly<Record<string, string>> = POSITION_GROUP_LABEL;

function groupedPositions(list: readonly PositionOption[]): Array<[string, PositionOption[]]> {
  const out = new Map<string, PositionOption[]>();
  for (const g of POSITION_GROUPS) out.set(g, []);
  for (const p of list) {
    if (!out.has(p.group)) out.set(p.group, []);
    out.get(p.group)!.push(p);
  }
  return [...out.entries()].filter(([, l]) => l.length > 0);
}
