import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Info, Send } from "lucide-react";
import { useState } from "react";

import { EraNutritionCard } from "@/components/scd/EraNutritionCard";
import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  CONSULT_MESSAGE,
  NUTRITION_DISCLAIMER,
  NUTRITION_GROUPS,
  NUTRITION_GUIDANCE,
  R136_PENDING,
  REQUEST_STATUS_LABEL,
  groupsForFamily,
  type ConsultOutcome,
  type NutritionGroupId,
} from "@/lib/health-areas";
import { getNutrition, requestNutritionConsult, updateNutritionRequest, type NutritionData } from "@/lib/nutrizionista.functions";
import { itDate } from "@/lib/people";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Nutrizionista (DG 15/10/2026): Era's general guidance by age group and consultation requests. Reserved:
 * - families and athletes see ONLY the guidance of their own children's age groups and can ask for a consultation
 *   (it lands in the existing work queue as "Richiesta consulenza nutrizionista · squadra", nothing else);
 * - the nutritionist and the Direzione see the open requests.
 * Public visitors get the access screen and nothing is read. No personal plan, diet or therapy, ever.
 */
export const Route = createFileRoute("/nutrizionista")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "nutrizionista" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const data = await getNutrition();
    return { gate, interior: true as const, data };
  },
  head: ({ loaderData }) => workAreaHead("nutrizionista", loaderData?.gate),
  component: NutrizionistaRoute,
});

function NutrizionistaRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="nutrizionista" gate={d.gate}>
      {d.interior && (d.data.view === "family" ? <FamilyView data={d.data} /> : <StaffView initial={d.data} preview={d.gate.preview} />)}
    </WorkAreaGateView>
  );
}

function GuidanceCard({ group }: { group: NutritionGroupId }) {
  const g = NUTRITION_GROUPS.find((x) => x.id === group)!;
  return (
    <Card id={`nut-${group}`} title={g.label} sub="Consigli generali di Era, uguali per tutta la fascia.">
      <ul className="m-0 grid list-none gap-3 px-4 pb-4 sm:px-[18px] md:grid-cols-3">
        {NUTRITION_GUIDANCE[group].map((t) => (
          <li key={t.id} className="rounded-[14px] bg-[#f3f8fe] p-3.5">
            <b className="block text-[15.5px] leading-snug text-[#0b2a5b]">{t.title}</b>
            <p className="m-0 mt-1 text-[14.5px] leading-snug text-[var(--in-ink)]">{t.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Disclaimer() {
  return (
    <p className="m-0 flex gap-2 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]">
      <Info className="mt-[1px] size-[18px] flex-none" strokeWidth={1.8} aria-hidden="true" />
      {NUTRITION_DISCLAIMER}
    </p>
  );
}

function FamilyView({ data }: { data: NutritionData }) {
  const groups = groupsForFamily(data.children);
  const ask = useServerFn(requestNutritionConsult);
  const [personId, setPersonId] = useState(data.children[0]?.personId ?? "");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ConsultOutcome | null>(null);

  async function send() {
    if (!personId || busy) return;
    setBusy(true);
    try {
      setOutcome((await ask({ data: { personId } })).outcome);
    } catch {
      setOutcome("ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkAreaShell id="nutrizionista" preview={false} editable status={<Chip tone="info">Consigli generali, mai piani personali</Chip>}>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {data.familyState === "error" ? (
            <EmptyState title="Non riusciamo a leggere la vostra famiglia">Riprovate più tardi o scrivete alla segreteria.</EmptyState>
          ) : groups.length === 0 ? (
            <EmptyState title="Nessun ragazzo collegato al vostro account">I consigli per fascia d'età compaiono quando la segreteria collega i vostri figli all'account.</EmptyState>
          ) : (
            groups.map((g) => <GuidanceCard key={g} group={g} />)
          )}
          <EraNutritionCard />
        </div>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="nut-figli" title="I vostri ragazzi" sub="Vedete solo i consigli delle loro fasce.">
            <ul className="m-0 list-none px-4 pb-4 sm:px-[18px]">
              {data.children.map((c) => (
                <li key={c.personId} className="flex items-center justify-between gap-2 py-1.5">
                  <b className="text-[15px]">{c.name}</b>
                  <Chip tone="info">{NUTRITION_GROUPS.find((g) => g.id === c.group)?.label ?? "Fascia non nota"}</Chip>
                </li>
              ))}
              {data.children.length === 0 && <li className="text-[14px] text-[var(--in-sub)]">Nessuno.</li>}
            </ul>
          </Card>
          <Card id="nut-consulenza" title="Chiedi una consulenza" sub="La società vi ricontatta per fissarla con la nutrizionista.">
            <div className="grid gap-3 px-4 pb-4 sm:px-[18px]">
              {data.children.length > 0 ? (
                <>
                  <label className="grid gap-1 text-[14px] font-semibold">
                    Per
                    <select value={personId} onChange={(e) => { setPersonId(e.target.value); setOutcome(null); }} className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[16px]">
                      {data.children.map((c) => (
                        <option key={c.personId} value={c.personId}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Non scrivete qui sintomi o esigenze di salute: ne parlate di persona con la nutrizionista.</p>
                  <button type="button" onClick={send} disabled={busy || !personId} className="scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--in-action)] px-4 text-[16px] font-bold text-[var(--in-ink)] disabled:opacity-50" data-testid="nut-ask">
                    <Send className="size-4" aria-hidden="true" /> {busy ? "Invio…" : "Chiedi la consulenza"}
                  </button>
                  {outcome && (
                    <p role="status" className={`m-0 text-[14.5px] font-semibold ${outcome === "RECEIVED" ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`}>{CONSULT_MESSAGE[outcome]}</p>
                  )}
                </>
              ) : (
                <p className="m-0 text-[14px] text-[var(--in-sub)]">Serve un ragazzo collegato al vostro account.</p>
              )}
            </div>
          </Card>
          <Disclaimer />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function StaffView({ initial, preview }: { initial: NutritionData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const reload = useServerFn(getNutrition);
  const update = useServerFn(updateNutritionRequest);
  const [msg, setMsg] = useState<string | null>(null);
  const applied = data.engine === "applied";

  async function act(id: string, action: "take" | "close") {
    setMsg(null);
    try {
      const r = await update({ data: { id, action } });
      setMsg(r.message);
      if (r.ok) setData(await reload());
    } catch {
      setMsg("Operazione non riuscita, riprova.");
    }
  }

  return (
    <WorkAreaShell
      id="nutrizionista"
      preview={preview}
      editable={applied}
      status={applied ? undefined : <Chip tone="warn">{R136_PENDING}</Chip>}
      highlights={[
        { value: applied ? data.requests.length : null, label: "richieste di consulenza aperte" },
        { value: applied ? data.requests.filter((r) => r.status === "NEW").length : null, label: "nuove, da prendere in carico" },
        { value: applied ? data.requests.filter((r) => r.mine).length : null, label: "prese in carico da te" },
      ]}
      note={<>Nella coda di lavoro compare solo "richiesta consulenza nutrizionista · squadra".</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="nut-richieste" title="Richieste di consulenza" sub="Chi richiamare: sempre il genitore, mai il ragazzo.">
            <div className="px-4 pb-4 sm:px-[18px]">
              {!data.connected ? (
                <EmptyState title="Collegamento al database non attivo">Entra con l'account della nutrizionista o della Direzione.</EmptyState>
              ) : !applied ? (
                <EmptyState title={R136_PENDING}>La Direzione deve dare l'OK ("applica") alla migrazione r136. Fino ad allora le famiglie non possono inviare richieste.</EmptyState>
              ) : data.requests.length === 0 ? (
                <p className="m-0 text-[14.5px] text-[var(--in-sub)]">Nessuna richiesta aperta.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0" data-testid="nut-requests">
                  {data.requests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span className="min-w-0">
                        <b className="block text-[15px]">{r.title}</b>
                        <small className="block text-[13px] text-[var(--in-sub)]">
                          {r.createdAt ? `arrivata il ${itDate(r.createdAt.slice(0, 10))}` : ""} · da richiamare: {r.contact ?? "genitore (chiedi alla segreteria)"}
                        </small>
                      </span>
                      <span className="flex items-center gap-2">
                        <Chip tone={r.status === "NEW" ? "warn" : "info"}>{REQUEST_STATUS_LABEL[r.status]}</Chip>
                        {data.canWrite && r.status === "NEW" && (
                          <button type="button" onClick={() => act(r.id, "take")} className="scd-focus h-11 rounded-[10px] bg-[#e7f0fb] px-3 text-[14px] font-semibold text-[#0b2a5b]">Prendo io</button>
                        )}
                        {data.canWrite && (
                          <button type="button" onClick={() => act(r.id, "close")} className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-[var(--in-info)] px-3 text-[14px] font-bold text-white">
                            <Check className="size-4" aria-hidden="true" /> Fissata
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {msg && <p role="status" className="m-0 mt-2 text-[14px] font-semibold text-[var(--in-sub)]">{msg}</p>}
            </div>
          </Card>
          <h2 className="m-0 font-title text-[28px] font-extrabold">Cosa vedono le famiglie</h2>
          {NUTRITION_GROUPS.map((g) => <GuidanceCard key={g.id} group={g.id} />)}
          <EraNutritionCard />
        </div>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Disclaimer />
          <SourcesBox id="nutrizionista" />
        </div>
      </div>
    </WorkAreaShell>
  );
}
