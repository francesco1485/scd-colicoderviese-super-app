import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Dumbbell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CallupPanel } from "@/components/scd/CallupPanel";
import { GapRequestsCard } from "@/components/scd/GapRequestsCard";
import { Card, Chip, SourceLine, useRomeNow } from "@/components/scd/interior-ui";
import { MatchAreaPanel } from "@/components/scd/MatchAreaPanel";
import { MatchReportPanel } from "@/components/scd/MatchReportPanel";
import { MatchSheetPanel } from "@/components/scd/MatchSheetPanel";
import { EmptyState, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import type { WorkAreaGate } from "@/lib/access";
import { titleCase, venueCase } from "@/lib/board-data";
import { freshnessLabel, loadCalendar, type PublicEvent, type PublicGroup } from "@/lib/public-snapshots";
import { teamSummaries } from "@/lib/quadro";
import { groupForTeamCode, otherAnnate, rosterOf, rosterTeams, teamCodeForGroup } from "@/lib/roster";
import { getMyRoster, type MyRoster } from "@/lib/roster.functions";
import { AREA_PARTITE_LIVE, TABELLINO_LABEL, scoreOf, tabellinoState } from "@/lib/team-area";
import { getTeamMatchStatus, type MatchStatus } from "@/lib/team-area.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Area partite per squadra (UD-181). Every match of the season of the chosen team, from the official calendar copy;
 * per match the team staff does convocazione (r62), distinta (r70), tabellino (r92) and, with r117, resoconto,
 * opponents, referto and distinte of both teams. Same access as the Mister area: the database checks the team scope.
 * No team list is hard-coded: the teams are the calendar groups, so a team created later appears by itself.
 */
export const Route = createFileRoute("/gestionale/partite")({
  validateSearch: (s: Record<string, unknown>): { squadra?: string; gara?: string } => ({
    ...(typeof s["squadra"] === "string" && /^[a-z0-9-]{1,32}$/i.test(s["squadra"]) ? { squadra: s["squadra"] } : {}),
    ...(typeof s["gara"] === "string" && /^[A-Za-z0-9._:-]{3,120}$/.test(s["gara"]) ? { gara: s["gara"] } : {}),
  }),
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "mister" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const roster = await getMyRoster();
    return { gate, interior: true as const, roster, groups: cal.groups, events: cal.events, sourceModifiedAt: cal.sourceModifiedAt };
  },
  head: ({ loaderData }) => {
    const h = workAreaHead("mister", loaderData?.gate);
    return loaderData?.gate.view === "page" ? { ...h, meta: [{ title: "Area partite — SCD Dentro · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] } : h;
  },
  component: PartiteRoute,
});

interface Loaded {
  gate: WorkAreaGate;
  roster: MyRoster;
  groups: PublicGroup[];
  events: PublicEvent[];
  sourceModifiedAt: string;
}

function PartiteRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="mister" gate={data.gate}>
      {data.interior && <PartitePage data={data} />}
    </WorkAreaGateView>
  );
}

function isPlayed(e: PublicEvent, today: string, now: string): boolean {
  return e.date < today || (e.date === today && e.time !== "" && e.time <= now);
}

function shortDay(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function monthTitle(ym: string): string {
  const s = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PartitePage({ data }: { data: Loaded }) {
  const { squadra, gara } = Route.useSearch();
  const navigate = useNavigate({ from: "/gestionale/partite" });
  const now = useRomeNow();
  const teams = useMemo(() => teamSummaries(data.groups, data.events, [], now.date, now.time).filter((t) => t.id !== "other"), [data.groups, data.events, now.date, now.time]);
  const own = useMemo(() => rosterTeams(data.roster.rows).map((t) => groupForTeamCode(t.code)), [data.roster.rows]);
  const team = teams.find((t) => t.id === squadra) ?? teams.find((t) => own.includes(t.id)) ?? teams[0];
  const matches = useMemo(() => (team ? data.events.filter((e) => e.group === team.id) : []), [team, data.events]);
  const selected =
    matches.find((e) => e.id === gara) ??
    matches.find((e) => !isPlayed(e, now.date, now.time)) ??
    [...matches].reverse().find((e) => isPlayed(e, now.date, now.time)) ??
    null;
  const squadKnown = data.roster.state === "ok" && team !== undefined && own.includes(team.id);
  const squad = useMemo(() => (team ? rosterOf(data.roster.rows, teamCodeForGroup(team.id)) : []), [team, data.roster.rows]);
  const others = useMemo(() => (team && squadKnown ? otherAnnate(data.roster.rows, teamCodeForGroup(team.id)) : []), [team, squadKnown, data.roster.rows]);
  const [sheetKey, setSheetKey] = useState(0);

  const loadStatus = useServerFn(getTeamMatchStatus);
  const [status, setStatus] = useState<Map<string, MatchStatus>>(new Map());
  useEffect(() => {
    if (!AREA_PARTITE_LIVE || !squadKnown || matches.length === 0) return;
    let alive = true;
    void loadStatus({ data: { eventIds: matches.map((m) => m.id).slice(0, 400) } })
      .then((r) => alive && setStatus(new Map(r.rows.map((x) => [x.eventId, x]))))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loadStatus, squadKnown, matches]);

  const byMonth = useMemo(() => {
    const m = new Map<string, PublicEvent[]>();
    for (const e of matches) {
      const k = e.date.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [matches]);
  const played = matches.filter((e) => isPlayed(e, now.date, now.time)).length;
  const selPlayed = selected ? isPlayed(selected, now.date, now.time) : false;
  const heading = selected && team ? `${team.tag} – ${titleCase(selected.opponent || "avversario da definire")} · ${shortDay(selected.date)}${selected.time ? `, ${selected.time}` : ""}` : "";

  return (
    <WorkAreaShell
      id="mister"
      path="/gestionale/partite"
      title={team ? `Area partite · ${team.tag}` : "Area partite"}
      preview={data.gate.preview}
      editable={data.roster.state === "ok"}
      highlights={[
        { value: matches.length || null, label: `gare ${team?.tag ?? ""} in calendario`.replace(/\s+/g, " ") },
        { value: played || null, label: "già giocate" },
        { value: matches.length - played || null, label: "da giocare" },
      ]}
      note={<>Calendario ufficiale FIGC/LND e SCD, copia del {freshnessLabel(data.sourceModifiedAt)}.</>}
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-wrap items-center gap-3 text-[15px] font-semibold">
            Squadra
            <select
              value={team?.id ?? ""}
              onChange={(e) => void navigate({ search: { squadra: e.target.value }, replace: true })}
              className="scd-focus h-11 min-w-[220px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-medium"
            >
              {teams.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <Link to="/gestionale/allenamenti" search={team ? { squadra: team.id } : {}} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-semibold">
            <Dumbbell className="size-4" aria-hidden="true" />Area allenamenti
          </Link>
        </div>

        {!team ? (
          <EmptyState title="Nessuna squadra nel calendario">Il calendario di questa copia non ha squadre con partite.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card id="par-elenco" title="Gare della stagione" sub="Tocca una gara per convocare, fare la distinta, il tabellino e il resoconto.">
              <div className="max-h-[70vh] overflow-y-auto">
                {byMonth.map(([ym, list]) => (
                  <section key={ym} aria-label={monthTitle(ym)}>
                    <h3 className="m-0 bg-[#f7fbff] px-4 py-1.5 text-[13px] font-bold uppercase tracking-wide text-[var(--in-sub)] sm:px-[18px]">{monthTitle(ym)}</h3>
                    <ul className="m-0 list-none p-0">
                      {list.map((e) => {
                        const st = status.get(e.id);
                        const done = isPlayed(e, now.date, now.time);
                        const active = selected?.id === e.id;
                        return (
                          <li key={e.id} className="border-t border-[var(--in-line)]">
                            <Link
                              to="/gestionale/partite"
                              search={{ squadra: team.id, gara: e.id }}
                              replace
                              aria-current={active ? "true" : undefined}
                              className={`flex min-h-12 items-center gap-3 px-4 py-2.5 text-[14.5px] sm:px-[18px] ${active ? "bg-[var(--in-info-bg)]" : ""}`}
                            >
                              <span className="w-[78px] flex-none text-[var(--in-sub)]">{shortDay(e.date)}</span>
                              <span className="min-w-0 flex-1">
                                <b className="block truncate">{titleCase(e.opponent || "Avversario da definire")}</b>
                                <span className="block text-[12.5px] text-[var(--in-sub)]">
                                  {e.homeAway === "CASA" ? "casa" : e.homeAway === "FUORI" ? "trasferta" : "—"} · {e.type.toLowerCase()}
                                  {st && done ? ` · ${st.hasReferto ? "referto ok" : "referto da caricare"}` : ""}
                                </span>
                              </span>
                              {done ? <Chip tone={st?.tabellino ? "ok" : "mute"}>{st?.tabellino ? `${st.goalsFor}–${st.goalsAgainst}` : "giocata"}</Chip> : <Chip tone="info">{e.time || "ora da definire"}</Chip>}
                              <ChevronRight className="size-4 flex-none text-[var(--in-sub)]" aria-hidden="true" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
              <SourceLine>Gare dalla copia del calendario ufficiale: nessun risultato inventato. I risultati ufficiali restano quelli LND.</SourceLine>
            </Card>

            <div className="flex min-w-0 flex-col gap-[18px]">
              <GapRequestsCard teamCode={teamCodeForGroup(team.id)} />
              {!selected ? (
                <EmptyState title="Nessuna gara per questa squadra" />
              ) : (
                <>
                  <Card
                    id="par-gara"
                    title={heading}
                    sub={<>{selected.time || "orario da definire"} · {venueCase(titleCase(selected.venue.split(",")[0] ?? "")) || "sede da definire"} · {selected.homeAway === "CASA" ? "in casa" : selected.homeAway === "FUORI" ? "in trasferta" : "—"}</>}
                    aside={selPlayed ? <StatusChip st={status.get(selected.id)} /> : <Chip tone="info">Da giocare</Chip>}
                  >
                    <div className="px-4 pb-4 sm:px-[18px]">
                      {!squadKnown ? (
                        <EmptyState title={`Non sei collegato alla ${team.tag}`}>
                          La gara la gestiscono lo staff della squadra, la Segreteria e la Direzione. Se manca la tua squadra, scrivi alla segreteria.
                        </EmptyState>
                      ) : !selPlayed && squad.length > 0 ? (
                        <CallupPanel key={selected.id} eventId={selected.id} eventDate={selected.date}
                          defaultPlace={selected.homeAway === "CASA" ? venueCase(titleCase(selected.venue.split(",")[0] ?? "")) : ""}
                          squad={squad} others={others} tag={team.tag} onChanged={() => setSheetKey((k) => k + 1)} />
                      ) : (
                        <p className="m-0 text-[14.5px] text-[var(--in-sub)]">{selPlayed ? "Gara giocata: la convocazione non si modifica più." : "Rosa vuota: nessun atleta da convocare."}</p>
                      )}
                    </div>
                  </Card>
                  {squadKnown && !selPlayed && (
                    <Card id="par-distinta" title="Distinta SCD" sub="Alla gara scegli tra i convocati chi va in lista. Poi il dirigente la ricopia sul portale LND.">
                      <div className="px-4 pb-4 sm:px-[18px]">
                        <MatchSheetPanel key={selected.id} eventId={selected.id} refreshKey={sheetKey} home={selected.homeAway === "CASA"} heading={heading} />
                      </div>
                    </Card>
                  )}
                  {squadKnown && selPlayed && (
                    <Card id="par-tabellino" title="Tabellino" sub="Risultato, minuti, gol, assist e cartellini dei nostri, dalla rosa. Resta «Provvisorio» finché non coincide con il risultato ufficiale LND.">
                      <div className="px-4 pb-4 sm:px-[18px]">
                        <MatchReportPanel key={selected.id} eventId={selected.id} heading={heading} />
                      </div>
                    </Card>
                  )}
                  {squadKnown && (
                    <Card id="par-resoconto" title="Resoconto, avversari e documenti" sub="Quello che resta della gara: per la squadra, la Segreteria e la Direzione.">
                      <div className="px-4 pb-4 sm:px-[18px]">
                        <MatchAreaPanel key={selected.id} eventId={selected.id} played={selPlayed} heading={heading} />
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkAreaShell>
  );
}

function StatusChip({ st }: { st: MatchStatus | undefined }) {
  if (!AREA_PARTITE_LIVE) return <Chip tone="mute">Giocata</Chip>;
  const s = tabellinoState(st?.tabellino ? scoreOf(st.goalsFor, st.goalsAgainst) : null, scoreOf(st?.officialFor, st?.officialAgainst));
  return <Chip tone={s === "CONFERMATO" ? "ok" : s === "DIVERSO" ? "crit" : s === "PROVVISORIO" ? "warn" : "mute"}>{TABELLINO_LABEL[s]}</Chip>;
}
