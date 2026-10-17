import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Trophy } from "lucide-react";
import { useMemo } from "react";

import { Card, Chip, SourceLine, useRomeNow } from "@/components/scd/interior-ui";
import { DrillsBoard, SessionsBoard } from "@/components/scd/TrainingArea";
import { EmptyState, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import type { WorkAreaGate } from "@/lib/access";
import { findSessions, freshnessLabel, loadCalendar, type PublicEvent, type PublicGroup, type TrainingSlot } from "@/lib/public-snapshots";
import { dayLabel, teamSummaries } from "@/lib/quadro";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { groupForTeamCode, rosterTeams, teamCodeForGroup } from "@/lib/roster";
import { getMyRoster, type MyRoster } from "@/lib/roster.functions";
import { AREA_ALLENAMENTI_LIVE } from "@/lib/team-area";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Area allenamenti per squadra (UD-181): the weekly quadro (Drive snapshot, the public timetable) plus, with r118,
 * the mister's sessions (theme, private notes, a note shared with the team, Google Meet link for a «live»),
 * attendance present / absent / justified and the «dinamiche di gioco» library. Same access as the Mister area.
 */
export const Route = createFileRoute("/gestionale/allenamenti")({
  validateSearch: (s: Record<string, unknown>): { squadra?: string } =>
    typeof s["squadra"] === "string" && /^[a-z0-9-]{1,32}$/i.test(s["squadra"]) ? { squadra: s["squadra"] } : {},
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "mister" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const [{ quadro: q }, roster] = await Promise.all([getTrainingQuadro(), getMyRoster()]);
    return { gate, interior: true as const, roster, groups: cal.groups, events: cal.events, slots: q.slots, quadroUTC: q.generatedUTC };
  },
  head: ({ loaderData }) => {
    const h = workAreaHead("mister", loaderData?.gate);
    return loaderData?.gate.view === "page" ? { ...h, meta: [{ title: "Area allenamenti — SCD Dentro · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] } : h;
  },
  component: AllenamentiRoute,
});

interface Loaded {
  gate: WorkAreaGate;
  roster: MyRoster;
  groups: PublicGroup[];
  events: PublicEvent[];
  slots: TrainingSlot[];
  quadroUTC: string;
}

function AllenamentiRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="mister" gate={data.gate}>
      {data.interior && <AllenamentiPage data={data} />}
    </WorkAreaGateView>
  );
}

function AllenamentiPage({ data }: { data: Loaded }) {
  const { squadra } = Route.useSearch();
  const navigate = useNavigate({ from: "/gestionale/allenamenti" });
  const now = useRomeNow();
  const teams = useMemo(() => teamSummaries(data.groups, data.events, data.slots, now.date, now.time).filter((t) => t.id !== "other"), [data.groups, data.events, data.slots, now.date, now.time]);
  const own = useMemo(() => rosterTeams(data.roster.rows).map((t) => groupForTeamCode(t.code)), [data.roster.rows]);
  const team = teams.find((t) => t.id === squadra) ?? teams.find((t) => own.includes(t.id)) ?? teams[0];
  const quadro = useMemo(() => (team?.trainingKey ? findSessions([...data.slots], team.trainingKey) : []), [team, data.slots]);
  const squadKnown = data.roster.state === "ok" && team !== undefined && own.includes(team.id);

  return (
    <WorkAreaShell
      id="mister"
      path="/gestionale/allenamenti"
      title={team ? `Area allenamenti · ${team.tag}` : "Area allenamenti"}
      preview={data.gate.preview}
      editable={AREA_ALLENAMENTI_LIVE && data.roster.state === "ok"}
      status={AREA_ALLENAMENTI_LIVE ? undefined : <Chip tone="warn">Sedute e presenze in arrivo (serve r118)</Chip>}
      highlights={[
        { value: team?.weeklySessions ?? null, label: `allenamenti ${team?.tag ?? ""} in settimana`.replace(/\s+/g, " ") },
        { value: quadro.length || null, label: "sedute nel quadro" },
        { value: null, label: "presenze: dalla prima seduta registrata" },
      ]}
      note={<>Quadro: copia del {freshnessLabel(data.quadroUTC)}.</>}
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-wrap items-center gap-3 text-[15px] font-semibold">
            Squadra
            <select value={team?.id ?? ""} onChange={(e) => void navigate({ search: { squadra: e.target.value }, replace: true })}
              className="scd-focus h-11 min-w-[220px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-medium">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <Link to="/gestionale/partite" search={team ? { squadra: team.id } : {}} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-semibold">
            <Trophy className="size-4" aria-hidden="true" />Area partite
          </Link>
        </div>

        {!team ? (
          <EmptyState title="Nessuna squadra nel calendario" />
        ) : (
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="all-sedute" title="Sedute e presenze" sub="Ogni allenamento: tema, appunti del mister, nota per la squadra, live e chi c'era.">
                <div className="px-4 pb-4 sm:px-[18px]">
                  {squadKnown || !AREA_ALLENAMENTI_LIVE ? (
                    <SessionsBoard teamCode={teamCodeForGroup(team.id)} tag={team.tag} quadro={quadro} />
                  ) : (
                    <EmptyState title={`Non sei collegato alla ${team.tag}`}>Sedute e presenze le gestiscono lo staff della squadra, la Segreteria e la Direzione.</EmptyState>
                  )}
                </div>
              </Card>
              {squadKnown && <DrillsBoard teamCode={teamCodeForGroup(team.id)} />}
            </div>
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="all-quadro" title="Settimana dal quadro" sub="Orari e campi ufficiali della settimana.">
                {quadro.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Nessun allenamento collegato">Nel quadro non c'è un gruppo che corrisponde con certezza a questa squadra.</EmptyState></div>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {quadro.map((s) => (
                      <li key={`${s.day}-${s.timeLabel}-${s.field}`} className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]">
                        <CalendarDays className="size-[18px] flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
                        <b className="w-[104px] flex-none">{dayLabel(s.day)}</b>
                        <span className="flex-1">{s.timeLabel}</span>
                        <Chip tone="info">{s.field === "C1" ? "Campo 1" : "Campo 2"}</Chip>
                      </li>
                    ))}
                  </ul>
                )}
                <SourceLine>Quadro settimanale allenamenti, copia del {freshnessLabel(data.quadroUTC)}. Per i cambi vale l'avviso del mister.</SourceLine>
              </Card>
              <Card id="all-ragazzi" title="Ragazzi partecipi" sub="Cosa vedono atleti e famiglie della squadra.">
                <ul className="m-0 flex list-disc flex-col gap-1 px-8 pb-4 text-[14.5px] leading-snug">
                  <li>Le loro convocazioni, con presa visione o impedimento motivato.</li>
                  <li>La nota che scegli di condividere, il tema e il link del live.</li>
                  <li>Le dinamiche che condividi con la squadra (solo testo).</li>
                  <li>Le proprie presenze, mai quelle degli altri.</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
    </WorkAreaShell>
  );
}
