/**
 * "Carica un ruolo" on a person's checklist (r111, Direzione 15/10/2026). The Direzione picks a role made by the
 * Presidente or the Direttore Generale, chooses this person's teams or site, and the role's sections arrive as
 * yellow proposals: nothing counts until they are confirmed and saved with "Rivedi e salva" (r100).
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Layers } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/scd/interior-ui";
import { SITES, SITE_LABEL, type Grant, type Site } from "@/lib/person-grants";
import { PLATFORM_LABEL, applyPlan, needsSite, needsTeams, orderSuggestedFirst, type RoleTemplate } from "@/lib/role-templates";
import { getActiveRoleTemplates } from "@/lib/role-templates.functions";

const selectCls = "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";

export function RoleLoader({
  personId,
  connected,
  locked,
  minor,
  teams,
  onLoad,
}: {
  /** The person of the checklist: with r112 applied, roles meant for her organigram positions come first. */
  personId?: string;
  connected: boolean;
  locked: boolean;
  minor: boolean | null;
  teams: ReadonlyArray<{ id: string; name: string }>;
  onLoad: (proposals: Array<Grant & { reason: string }>) => void;
}) {
  const load = useServerFn(getActiveRoleTemplates);
  const [templates, setTemplates] = useState<RoleTemplate[] | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [engine, setEngine] = useState<string>("unknown");
  const [pickedId, setPickedId] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const picked = templates?.find((t) => t.id === pickedId) ?? null;

  async function open() {
    setMessage(null);
    try {
      const res = await load({ data: personId ? { personId } : {} });
      setEngine(res.engine);
      setSuggested(res.suggested);
      setTemplates(orderSuggestedFirst(res.templates, res.suggested));
      if (res.readError) setMessage("Lettura dei ruoli non riuscita, riprova.");
      else if (res.engine !== "applied") setMessage("I ruoli si caricano dopo «applica r111».");
      else if (!res.templates.length) setMessage("Nessun ruolo attivo: li crea il Presidente o il Direttore Generale in Direzione → Ruoli.");
    } catch {
      setMessage("Lettura dei ruoli non riuscita, riprova.");
    }
  }

  function loadRole() {
    if (!picked) return;
    const plan = applyPlan(picked, { teamIds, site, minor });
    if (plan.missing) {
      setMessage(plan.missing);
      return;
    }
    onLoad(plan.proposals);
    const skipped = plan.skipped.length ? ` Non caricate: ${plan.skipped.length} (${plan.skipped.map((s) => s.reason).join("; ")}).` : "";
    setMessage(`${plan.proposals.length} ${plan.proposals.length === 1 ? "sezione caricata" : "sezioni caricate"} come proposte gialle: confermale e salva.${skipped}`);
  }

  return (
    <Card id="grants-role" title="Carica un ruolo" sub="Un ruolo è un gruppo di sezioni già pronto. Arriva come proposta: decidi tu.">
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
        {templates === null ? (
          <button type="button" disabled={locked || !connected} onClick={() => void open()} className="scd-focus inline-flex min-h-11 items-center gap-2 self-start rounded-[10px] border border-[var(--in-info)] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-info)] disabled:opacity-50">
            <Layers className="size-4" aria-hidden="true" />Scegli un ruolo
          </button>
        ) : engine === "applied" && templates.length > 0 ? (
          <>
            <label className="flex flex-col gap-1 text-[15px] font-semibold">
              Ruolo
              <select value={pickedId} onChange={(e) => { setPickedId(e.target.value); setTeamIds([]); setSite(null); setMessage(null); }} className={`${selectCls} font-normal`}>
                <option value="">Scegli…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{suggested.includes(t.id) ? "★ Consigliato · " : ""}{PLATFORM_LABEL[t.platform]} · {t.label} ({t.grants.length})</option>
                ))}
              </select>
            </label>
            {suggested.length > 0 && (
              <p data-testid="role-suggested" className="m-0 text-[13.5px] leading-snug text-[var(--in-sub)]">★ Consigliato: ruolo pensato per una posizione che questa persona ricopre nell'organigramma. Resta una proposta.</p>
            )}
            {picked && needsTeams(picked) && (
              <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
                <legend className="mb-1 text-[15px] font-semibold">Squadre di questa persona</legend>
                {teams.length === 0 && <p className="m-0 text-[14px] text-[var(--in-warn)]">Nessuna squadra attiva: senza squadre questo ruolo non si può caricare.</p>}
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => {
                    const on = teamIds.includes(t.id);
                    return (
                      <label key={t.id} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-[14px] ${on ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"}`}>
                        <input type="checkbox" checked={on} onChange={() => setTeamIds((x) => (on ? x.filter((y) => y !== t.id) : [...x, t.id]))} className="size-4 accent-[var(--scd-blue)]" />
                        {t.name}
                      </label>
                    );
                  })}
                </div>
                <span className="text-[13px] text-[var(--in-sub)]">Un incarico di squadra vede solo le squadre scelte qui. Per un responsabile scegline più di una.</span>
              </fieldset>
            )}
            {picked && needsSite(picked) && (
              <label className="flex flex-col gap-1 text-[15px] font-semibold">
                Sede
                <select value={site ?? ""} onChange={(e) => setSite((e.target.value || null) as Site | null)} className={`${selectCls} font-normal`}>
                  <option value="">Scegli…</option>
                  {SITES.map((s) => <option key={s} value={s}>{SITE_LABEL[s]}</option>)}
                </select>
              </label>
            )}
            <button type="button" disabled={locked || !picked} onClick={loadRole} className="scd-focus inline-flex min-h-11 items-center gap-2 self-start rounded-[10px] bg-[var(--in-info)] px-3 text-[14.5px] font-semibold text-white disabled:opacity-50">
              <Layers className="size-4" aria-hidden="true" />Carica come proposte
            </button>
          </>
        ) : null}
        <p role="status" aria-live="polite" className="m-0 min-h-[1.2em] text-[13.5px] text-[var(--in-sub)]">{message}</p>
        <Link to="/direzione/ruoli" className="scd-focus inline-flex min-h-11 items-center text-[14px] font-semibold text-[var(--in-info)]">Vai a Direzione → Ruoli</Link>
      </div>
    </Card>
  );
}
