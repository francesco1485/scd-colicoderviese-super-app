import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CircleCheck,
  Clapperboard,
  MapPin,
  Presentation,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Card,
  Chip,
  SourceLine,
  TeamTag,
  useRomeNow,
} from "@/components/scd/interior-ui";
import {
  EmptyState,
  SourcesBox,
  WorkAreaGateView,
  WorkAreaShell,
  workAreaHead,
} from "@/components/scd/work-area-ui";
import { dateParts, titleCase, venueCase } from "@/lib/board-data";
import type { WorkAreaGate } from "@/lib/access";
import {
  findSessions,
  freshnessLabel,
  loadCalendar,
  type PublicEvent,
  type PublicGroup,
  type TrainingSlot,
} from "@/lib/public-snapshots";
import { dayLabel, teamSummaries, type TeamSummary } from "@/lib/quadro";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { certificateState, type CertState } from "@/lib/people";
import {
  groupForTeamCode,
  otherAnnate,
  registrationLabel,
  rosterOf,
  rosterSummary,
  rosterTeams,
  teamCodeForGroup,
  type RosterRow,
} from "@/lib/roster";
import { getMyRoster, type MyRoster } from "@/lib/roster.functions";
import { CallupPanel } from "@/components/scd/CallupPanel";
import { MatchSheetPanel } from "@/components/scd/MatchSheetPanel";
import { MatchReportPanel } from "@/components/scd/MatchReportPanel";

/**
 * Mister (boards Mister.dc.html + Mister-Oggi.dc.html): today panel of one team from the calendar
 * and training-board snapshots. The squad comes from the database after login (r61): only the
 * teams of the caller's own structure roles, only name, birth year, registration and certificate.
 */
export const Route = createFileRoute("/gestionale/mister")({
  validateSearch: (s: Record<string, unknown>): { squadra?: string } =>
    typeof s["squadra"] === "string" && /^[a-z0-9-]{1,32}$/i.test(s["squadra"])
      ? { squadra: s["squadra"] }
      : {},
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "mister" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const { quadro: q } = await getTrainingQuadro();
    const roster = await getMyRoster();
    return {
      gate,
      interior: true as const,
      roster,
      groups: cal.groups,
      events: cal.events,
      sourceModifiedAt: cal.sourceModifiedAt,
      slots: q.slots,
      quadroUTC: q.generatedUTC,
    };
  },
  head: ({ loaderData }) => workAreaHead("mister", loaderData?.gate),
  component: MisterRoute,
});

interface Loaded {
  gate: WorkAreaGate;
  roster: MyRoster;
  groups: PublicGroup[];
  events: PublicEvent[];
  sourceModifiedAt: string;
  slots: TrainingSlot[];
  quadroUTC: string;
}

function MisterRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="mister" gate={data.gate}>
      {data.interior && <MisterPage data={data} />}
    </WorkAreaGateView>
  );
}

function MisterPage({ data }: { data: Loaded }) {
  const { squadra } = Route.useSearch();
  const navigate = useNavigate({ from: "/gestionale/mister" });
  const now = useRomeNow();
  const teams = useMemo(
    () =>
      teamSummaries(
        data.groups,
        data.events,
        data.slots,
        now.date,
        now.time,
      ).filter((t) => t.id !== "other"),
    [data.groups, data.events, data.slots, now.date, now.time],
  );
  const own = useMemo(
    () => rosterTeams(data.roster.rows).map((t) => groupForTeamCode(t.code)),
    [data.roster.rows],
  );
  const team: TeamSummary | undefined =
    teams.find((t) => t.id === squadra) ??
    teams.find((t) => own.includes(t.id)) ??
    teams[0];
  const squad = useMemo(
    () => (team ? rosterOf(data.roster.rows, teamCodeForGroup(team.id)) : []),
    [team, data.roster.rows],
  );
  const squadKnown =
    data.roster.state === "ok" && team !== undefined && own.includes(team.id);
  const others = useMemo(
    () =>
      team && squadKnown
        ? otherAnnate(data.roster.rows, teamCodeForGroup(team.id))
        : [],
    [team, squadKnown, data.roster.rows],
  );
  const sessions = useMemo(
    () =>
      team?.trainingKey ? findSessions([...data.slots], team.trainingKey) : [],
    [team, data.slots],
  );
  const upcoming = useMemo(
    () =>
      team
        ? data.events
            .filter(
              (e) =>
                e.group === team.id &&
                (e.date > now.date ||
                  (e.date === now.date &&
                    (e.time === "" || e.time >= now.time))),
            )
            .slice(0, 4)
        : [],
    [team, data.events, now.date, now.time],
  );
  const next = team?.next ?? null;
  const lastPlayed = useMemo(
    () =>
      team
        ? ([...data.events]
            .filter(
              (e) =>
                e.group === team.id &&
                (e.date < now.date ||
                  (e.date === now.date && e.time !== "" && e.time <= now.time)),
            )
            .pop() ?? null)
        : null,
    [team, data.events, now.date, now.time],
  );
  const [sheetKey, setSheetKey] = useState(0);

  return (
    <WorkAreaShell
      id="mister"
      title={team ? `Mister · ${team.tag}` : "Mister"}
      preview={data.gate.preview}
      editable={data.roster.state === "ok"}
      highlights={[
        {
          value: team?.weeklySessions ?? null,
          label: `allenamenti ${team?.tag ?? ""} in settimana`.replace(
            /\s+/g,
            " ",
          ),
        },
        {
          value: squadKnown ? squad.length : null,
          label: squadKnown
            ? `in rosa ${team?.tag ?? ""}`.trim()
            : "rosa visibile dopo l'accesso",
        },
        {
          value: team ? team.split.total : null,
          label: "gare in calendario nella stagione",
        },
      ]}
      note={
        <>
          Calendario: copia del {freshnessLabel(data.sourceModifiedAt)} ·
          Quadro: copia del {freshnessLabel(data.quadroUTC)}. Nessun nome di
          atleti.
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <label className="flex flex-wrap items-center gap-3 text-[15px] font-semibold">
          Squadra
          <select
            value={team?.id ?? ""}
            onChange={(e) =>
              void navigate({
                search: { squadra: e.target.value },
                replace: true,
              })
            }
            className="scd-focus h-11 min-w-[220px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-medium"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {!team ? (
          <EmptyState title="Nessuna squadra nel calendario">
            Il calendario di questa copia non ha squadre con partite.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card
                id="mis-gara"
                title={
                  next
                    ? `${team.tag} contro ${titleCase(next.opponent || "avversario da definire")}`
                    : `${team.tag}: nessuna gara in programma`
                }
                sub={
                  next ? (
                    <>
                      {longDate(next.date)}, {next.time || "orario da definire"}{" "}
                      ·{" "}
                      {venueCase(titleCase(next.venue.split(",")[0] ?? "")) ||
                        "sede da definire"}{" "}
                      ·{" "}
                      {next.homeAway === "CASA"
                        ? "in casa"
                        : next.homeAway === "FUORI"
                          ? "in trasferta"
                          : "—"}
                    </>
                  ) : (
                    "Il calendario di questa copia non ha altre gare per la squadra."
                  )
                }
                aside={
                  next ? (
                    next.timeConfirmed && next.venueConfirmed ? (
                      <Chip tone="ok">
                        <CircleCheck
                          className="size-3.5"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        Gara confermata FIGC/LND
                      </Chip>
                    ) : (
                      <Chip tone="warn">
                        <TriangleAlert
                          className="size-3.5"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        Orario o sede da verificare
                      </Chip>
                    )
                  ) : undefined
                }
              >
                <div className="grid grid-cols-3 gap-2 px-4 pb-4 sm:px-[18px]">
                  <Fact label="Ritrovo" value="da fissare" tone="warn" />
                  <Fact label="Spogliatoio" value="da assegnare" />
                  <Fact
                    label="In rosa"
                    value={squadKnown ? String(squad.length) : "—"}
                  />
                </div>
                <div className="px-4 pb-4 sm:px-[18px]">
                  {squadKnown && next && squad.length > 0 ? (
                    <CallupPanel
                      key={next.id}
                      eventId={next.id}
                      eventDate={next.date}
                      defaultPlace={
                        next.homeAway === "CASA"
                          ? venueCase(titleCase(next.venue.split(",")[0] ?? ""))
                          : ""
                      }
                      squad={squad}
                      others={others}
                      tag={team.tag}
                      onChanged={() => setSheetKey((k) => k + 1)}
                    />
                  ) : (
                    <SquadPanel
                      roster={data.roster}
                      squad={squad}
                      known={squadKnown}
                      tag={team.tag}
                      today={now.date}
                    />
                  )}
                </div>
                {!(squadKnown && next) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                    <span className="text-[14px] text-[var(--in-sub)]">
                      Le convocazioni si inviano dalla rosa della tua squadra,
                      dopo l'accesso.
                    </span>
                  </div>
                )}
              </Card>

              {squadKnown && next && squad.length > 0 && (
                <Card
                  id="mis-distinta"
                  title="Distinta"
                  sub="Alla gara scegli tra i convocati chi va in lista. Poi il dirigente la ricopia sul portale LND."
                >
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <MatchSheetPanel
                      key={next.id}
                      eventId={next.id}
                      refreshKey={sheetKey}
                      home={next.homeAway === "CASA"}
                      heading={`${team.tag} – ${titleCase(next.opponent || "avversario da definire")} · ${longDate(next.date)}${next.time ? `, ${next.time}` : ""}`}
                    />
                  </div>
                </Card>
              )}

              {squadKnown && lastPlayed && (
                <Card
                  id="mis-tabellino"
                  title="Tabellino"
                  sub="Dopo la gara: risultato, minuti, gol, assist e cartellini. Aggiorna i punti del Fantacalcio SCD."
                >
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <MatchReportPanel
                      key={lastPlayed.id}
                      eventId={lastPlayed.id}
                      heading={`${team?.tag ?? ""} – ${titleCase(lastPlayed.opponent || "avversario")} · ${longDate(lastPlayed.date)}`}
                    />
                  </div>
                </Card>
              )}

              <Card
                id="mis-settimana"
                title="Allenamenti della settimana"
                sub="Dal quadro allenamenti, solo se la squadra vi compare con lo stesso nome o anno."
              >
                {sessions.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <EmptyState title="Nessun allenamento collegato">
                      Nel quadro non c'è un gruppo che corrisponde con certezza
                      a questa squadra.
                    </EmptyState>
                  </div>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {sessions.map((s) => (
                      <li
                        key={`${s.day}-${s.timeLabel}-${s.field}`}
                        className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]"
                      >
                        <CalendarDays
                          className="size-[18px] flex-none text-[var(--in-info)]"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        <b className="w-[104px] flex-none">{dayLabel(s.day)}</b>
                        <span className="flex-1">{s.timeLabel}</span>
                        <Chip tone="info">
                          {s.field === "C1" ? "Campo 1" : "Campo 2"}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
                <SourceLine>
                  Quadro settimanale allenamenti, copia del{" "}
                  {freshnessLabel(data.quadroUTC)}.
                </SourceLine>
              </Card>

              <Card id="mis-gare" title="Prossime gare">
                {upcoming.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <EmptyState title="Nessuna gara in programma" />
                  </div>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {upcoming.map((e) => {
                      const p = dateParts(e.date);
                      return (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]"
                        >
                          <span className="w-[86px] flex-none text-[var(--in-sub)]">
                            {p.weekday.charAt(0)}
                            {p.weekday.slice(1, 3).toLowerCase()} {p.day}{" "}
                            {p.month.toLowerCase()}
                          </span>
                          <TeamTag
                            tag={team.tag}
                            color={team.color}
                            title={team.label}
                          />
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {titleCase(e.opponent || "Avversario da definire")}
                          </span>
                          <span className="flex-none text-[14px] text-[var(--in-sub)]">
                            {e.homeAway === "CASA"
                              ? "casa"
                              : e.homeAway === "FUORI"
                                ? "trasferta"
                                : "—"}{" "}
                            · {e.time || "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <SourceLine>
                  <MapPin className="mr-1 inline size-3.5" aria-hidden="true" />
                  Calendario ufficiale FIGC/LND e SCD, copia del{" "}
                  {freshnessLabel(data.sourceModifiedAt)}.
                </SourceLine>
              </Card>
            </div>

            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card
                id="mis-strumenti"
                title="Strumenti del mister"
                sub="Tutto quello che serve prima e dopo la gara."
              >
                <ul className="m-0 list-none p-0">
                  {[
                    {
                      to: "/calendario",
                      label: "Calendario della squadra",
                      icon: CalendarDays,
                    },
                    {
                      to: "/allenamenti",
                      label: "Quadro allenamenti e campi",
                      icon: Presentation,
                    },
                    {
                      to: "/pulmini",
                      label: "Pulmini per le trasferte",
                      icon: UsersRound,
                    },
                    {
                      to: "/impianti",
                      label: "Mappa dei campi e ingressi",
                      icon: MapPin,
                    },
                    {
                      to: "/crea",
                      label: "Pubblica un post per la squadra",
                      icon: Clapperboard,
                    },
                    {
                      to: "/fantacalcio",
                      label: "Fantacalcio SCD (punti dal tabellino)",
                      icon: CircleCheck,
                    },
                  ].map((t) => (
                    <li key={t.to} className="border-t border-[var(--in-line)]">
                      <Link
                        to={t.to}
                        className="flex min-h-12 items-center gap-3 px-4 py-3 text-[15px] font-semibold sm:px-[18px]"
                      >
                        <t.icon
                          className="size-[18px] flex-none text-[var(--in-info)]"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        <span className="flex-1">{t.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <SourcesBox id="mister" />
            </div>
          </div>
        )}
      </div>
    </WorkAreaShell>
  );
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`min-w-0 rounded-xl px-3 py-2.5 ${tone === "warn" ? "bg-[var(--in-warn-bg)]" : "bg-[var(--in-info-bg)]"}`}
    >
      <span
        className={`block text-[13px] ${tone === "warn" ? "text-[var(--in-warn)]" : "text-[var(--in-sub)]"}`}
      >
        {label}
      </span>
      <b
        className={`block text-[16px] leading-tight ${tone === "warn" ? "text-[var(--in-warn)]" : ""}`}
      >
        {value}
      </b>
    </div>
  );
}

function longDate(iso: string): string {
  const s = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Short chip text; the unknown state is counted once in the summary instead of on every row. */
const CERT_SHORT: Readonly<Record<CertState, string>> = {
  scaduto: "Certificato scaduto",
  "in-scadenza": "Certificato in scadenza",
  ok: "Certificato valido",
  sconosciuto: "",
};
const CERT_TONE: Readonly<Record<CertState, "ok" | "warn" | "mute" | "info">> =
  { scaduto: "warn", "in-scadenza": "warn", ok: "ok", sconosciuto: "mute" };

/** Squad of the selected team, or the reason it is not shown. Names stay inside the reserved area. */
function SquadPanel({
  roster,
  squad,
  known,
  tag,
  today,
}: {
  roster: MyRoster;
  squad: RosterRow[];
  known: boolean;
  tag: string;
  today: string;
}) {
  if (roster.state === "signed-out" || roster.state === "unconfigured") {
    return (
      <EmptyState
        title={`Rosa ${tag}`}
        action={
          <Link
            to="/accedi"
            search={{ next: "/gestionale/mister" }}
            className="scd-focus inline-flex h-11 items-center rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white"
          >
            Accedi con la tua e-mail
          </Link>
        }
      >
        I nomi dei ragazzi li vedono solo il mister e i dirigenti della squadra,
        dopo l'accesso.
      </EmptyState>
    );
  }
  if (roster.state === "error")
    return (
      <EmptyState title="Rosa non disponibile">
        Lettura dal database non riuscita. Riprova tra poco.
      </EmptyState>
    );
  if (roster.state === "no-organization" || !known) {
    return (
      <EmptyState title={`Non sei collegato alla ${tag}`}>
        Vedi la rosa delle squadre in cui hai un ruolo nell'organigramma. Se
        manca la tua, scrivi alla segreteria: collega il tuo accesso alla tua
        scheda.
      </EmptyState>
    );
  }
  if (squad.length === 0)
    return (
      <EmptyState title={`Rosa ${tag} vuota`}>
        Nessun atleta iscritto a questa squadra per la stagione.
      </EmptyState>
    );
  const sum = rosterSummary(squad, today);
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 flex flex-wrap gap-2 text-[14px]">
        <Chip tone="info">{sum.total} in rosa</Chip>
        {sum.registrationToCheck > 0 && (
          <Chip tone="mute">
            {sum.registrationToCheck} tesseramenti da verificare
          </Chip>
        )}
        {sum.certificate.scaduto + sum.certificate["in-scadenza"] > 0 && (
          <Chip tone="warn">
            {sum.certificate.scaduto + sum.certificate["in-scadenza"]}{" "}
            certificati da rinnovare
          </Chip>
        )}
        {sum.certificate.sconosciuto > 0 && (
          <Chip tone="mute">
            {sum.certificate.sconosciuto} certificati senza data
          </Chip>
        )}
      </p>
      <ul
        className="m-0 list-none overflow-hidden rounded-xl border border-[var(--in-line)] p-0"
        aria-label={`Rosa ${tag}`}
      >
        {squad.map((p) => {
          const cert = certificateState(p.certificateExpiresAt, today);
          return (
            <li
              key={p.personId}
              className="flex min-h-12 items-center gap-3 border-t border-[var(--in-line)] px-3 py-2 text-[15px] first:border-t-0"
            >
              <span className="min-w-0 flex-1">
                <b className="block truncate font-semibold">{p.displayName}</b>
                <span className="block text-[13px] text-[var(--in-sub)]">
                  {p.birthYear ?? "anno non indicato"} ·{" "}
                  {registrationLabel(p.registrationStatus)}
                </span>
              </span>
              {cert !== "sconosciuto" && (
                <Chip tone={CERT_TONE[cert]}>{CERT_SHORT[cert]}</Chip>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
