import { getTrainingQuadro } from "@/lib/quadro.functions";
import { StagingBanner, WorkAreaGateView } from "@/components/scd/work-area-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { EMPTY_QUADRO } from "@/lib/public-snapshots";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  MapPinned,
} from "lucide-react";
import { useMemo, useState } from "react";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { areaBadgeFor } from "@/lib/internal-badges";
import {
  Card,
  Chip,
  FutureLink,
  ScrollRegion,
  SnapshotNotice,
  SourceLine,
  TeamDot,
  TeamTag,
  useRomeNow,
  useRouteExists,
} from "@/components/scd/interior-ui";
import {
  addDays,
  dateParts,
  titleCase,
  trainingRowsFor,
  venueCase,
  weekRange,
} from "@/lib/board-data";
import {
  freshnessLabel,
  loadCalendar,
  type PublicEvent,
} from "@/lib/public-snapshots";
import {
  IMPIANTI_PATH,
  MISTER_PATH,
  findOverlaps,
  fromMinutes,
  groupIdForText,
  groupOverlaps,
  joinDays,
  matchSplit,
  quadroEntries,
  readableOnWhite,
  teamSummaries,
  type TeamSummary,
} from "@/lib/quadro";

/** Rail role set: only areas open to every staff role appear (the page itself is behind the work-area gate). */
const PREVIEW_ROLES: ReadonlySet<string> = new Set();
const R20_PENDING = "dato da collegare a R20";

export const Route = createFileRoute("/gestionale/")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "gestionale" } });
    // Closed gate: nothing of the board is read or serialised, only the access screen renders.
    const cal = loadCalendar();
    const { quadro: q } = gate.view === "page" ? await getTrainingQuadro() : { quadro: EMPTY_QUADRO };
    if (gate.view !== "page") return { gate, interior: false, groups: [], events: [], sourceModifiedAt: cal.sourceModifiedAt, season: cal.season, slots: q.slots, days: q.days, quadroUTC: q.generatedUTC, quadroNote: q.note };
    return {
      gate,
      interior: gate.view === "page",
      groups: cal.groups,
      events: cal.events,
      sourceModifiedAt: cal.sourceModifiedAt,
      season: cal.season,
      slots: q.slots,
      days: q.days,
      quadroUTC: q.generatedUTC,
      quadroNote: q.note,
    };
  },
  head: () => ({
    meta: [
      { title: "Gestionale sportivo — SCD Dentro · S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Squadre, prossime gare, allenamenti della settimana e contatori di stagione dal calendario ufficiale e dal quadro allenamenti. Anteprima di sola lettura, non live.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GestionalePageGate,
});

const shortDate = (iso: string) => {
  const p = dateParts(iso);
  return `${p.weekday.charAt(0)}${p.weekday.slice(1).toLowerCase()} ${p.day} ${p.month.toLowerCase()}`;
};
/** "COLICO - CAMPO 1" -> "Campo 1"; other venues keep their readable form. */
const homeSpot = (venue: string) => {
  const m = /^(?:colico|dervio)\s*-\s*(.+)$/i.exec(venue.trim());
  return venueCase(
    m ? `${m[1]!.charAt(0)}${m[1]!.slice(1).toLowerCase()}` : venue,
  );
};

function GestionalePage() {
  const {
    groups,
    events,
    sourceModifiedAt,
    season,
    slots,
    days,
    quadroUTC,
    quadroNote,
  } = Route.useLoaderData();
  const now = useRomeNow();
  const [offset, setOffset] = useState(0);
  const impiantiLive = useRouteExists(IMPIANTI_PATH);

  const teams = useMemo(
    () => teamSummaries(groups, events, slots, now.date, now.time),
    [groups, events, slots, now.date, now.time],
  );
  const colorById = useMemo(
    () => new Map(groups.map((g) => [g.id, readableOnWhite(g.color)])),
    [groups],
  );
  const tagById = useMemo(
    () => new Map(teams.map((t) => [t.id, t.tag])),
    [teams],
  );
  const entries = useMemo(() => quadroEntries(slots), [slots]);
  const overlapGroups = useMemo(
    () => groupOverlaps(findOverlaps(entries), days),
    [entries, days],
  );
  const seasonSplit = useMemo(() => matchSplit(events), [events]);
  const weekUnknown = /settimana a\/b non determinabile/i.test(quadroNote);

  const week = weekRange(now.date, offset);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week.from, i));
  const weekMatches = events.filter(
    (e) => e.date >= week.from && e.date <= week.to,
  );
  const thisWeek = weekRange(now.date, 0);
  const thisWeekMatches = events.filter(
    (e) => e.date >= thisWeek.from && e.date <= thisWeek.to,
  );

  return (
    <InteriorShell
      title="Gestionale sportivo"
      path="/gestionale"
      activeAreaId="gestionale"
      badge={areaBadgeFor("gestionale")}
      roles={PREVIEW_ROLES}
      roleLabel="Anteprima staff"
      highlights={[
        {
          value: entries.length || null,
          label: "allenamenti da lunedì a venerdì",
        },
        { value: thisWeekMatches.length, label: "partite in questa settimana" },
        {
          value: thisWeekMatches.filter((e) => e.homeAway === "CASA").length,
          label: "in casa questa settimana",
        },
      ]}
    >
      <div className="flex flex-col gap-[18px]">
        <SnapshotNotice>
          Calendario ufficiale {season}: copia del{" "}
          {freshnessLabel(sourceModifiedAt)} · Quadro allenamenti: copia del{" "}
          {freshnessLabel(quadroUTC)}. Sola lettura.
        </SnapshotNotice>

        <ImpiantiEntry live={impiantiLive} />
        <PlanningEntry />

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card
            id="gest-squadre"
            title="Squadre"
            sub="Gruppi del calendario, prossima gara e allenamenti"
            className="lg:self-start"
          >
            <ul className="m-0 list-none p-0">
              {teams.map((t) => (
                <TeamRow key={t.id} team={t} />
              ))}
              {teams.length === 0 && (
                <li className="border-t border-[var(--in-line)] px-4 py-3 text-[14px] text-[var(--in-sub)]">
                  Nessuna squadra nel calendario di questa anteprima.
                </li>
              )}
            </ul>
            <SourceLine>
              Squadre e gare: Calendario FIGC/LND e SCD. Allenamenti: quadro
              settimanale, solo se il gruppo vi compare con lo stesso nome o
              anno.
            </SourceLine>
          </Card>

          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card
              id="gest-settimana"
              title={`Settimana ${week.label}`}
              sub="Allenamenti dal quadro settimanale (con i suoi nomi di gruppo), partite dal calendario ufficiale. Fondo giallo: partita."
              aside={
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOffset((o) => o - 1)}
                    aria-label="Settimana precedente"
                    className="scd-focus flex size-10 items-center justify-center rounded-[10px] border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
                  >
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOffset(0)}
                    disabled={offset === 0}
                    className="scd-focus h-10 rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[15px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)] disabled:cursor-default disabled:opacity-60"
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => setOffset((o) => o + 1)}
                    aria-label="Settimana successiva"
                    className="scd-focus flex size-10 items-center justify-center rounded-[10px] border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
                  >
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </div>
              }
            >
              <ScrollRegion
                label={`Settimana ${week.label}`}
                className="px-4 pb-4 pt-1 sm:px-4"
              >
                <ol
                  className="m-0 grid min-w-[700px] list-none grid-cols-7 gap-2 p-0"
                  aria-live="polite"
                >
                  {weekDays.map((iso) => {
                    const trainings = trainingRowsFor(iso, slots);
                    const matches = weekMatches.filter((e) => e.date === iso);
                    const weekend =
                      trainings.length === 0 && matches.length > 0;
                    const isToday = iso === now.date;
                    return (
                      <li key={iso} className="flex min-w-0 flex-col gap-1.5">
                        <h3
                          className={`m-0 px-0.5 pb-1 text-[14px] font-bold ${weekend ? "text-[var(--in-warn)]" : ""}`}
                        >
                          {shortDate(iso)}
                          {isToday && (
                            <span className="ml-1 rounded-full bg-[var(--in-action)] px-1.5 text-[11px] font-bold text-[var(--in-ink)]">
                              oggi
                            </span>
                          )}
                        </h3>
                        {trainings.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-[9px] border border-[var(--in-line)] bg-white px-2 py-[7px]"
                          >
                            <div className="flex items-center gap-[5px] text-[12px] text-[var(--in-sub)]">
                              <TeamDot
                                color={colorOrNull(
                                  colorById,
                                  groupIdForText(r.text),
                                )}
                              />
                              {r.time}
                            </div>
                            {r.teams.split(" + ").map((t) => (
                              <div
                                key={t}
                                className="text-[13.5px] font-semibold leading-tight"
                              >
                                {t}
                              </div>
                            ))}
                          </div>
                        ))}
                        {matches.map((e) => (
                          <MatchChip
                            key={e.id}
                            e={e}
                            tag={tagById.get(e.group) ?? e.category}
                            color={colorOrNull(colorById, e.group)}
                          />
                        ))}
                        {trainings.length === 0 && matches.length === 0 && (
                          <p className="m-0 px-0.5 text-[13px] text-[var(--in-sub)]">
                            —
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </ScrollRegion>
              <SourceLine>
                Quadro allenamenti 2026/27 (copia del{" "}
                {freshnessLabel(quadroUTC)}) · Calendario FIGC/LND (copia del{" "}
                {freshnessLabel(sourceModifiedAt)}). Il quadro è settimanale:
                festività e variazioni non sono incluse.
              </SourceLine>
            </Card>

            <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_300px]">
              <Card
                id="gest-stagione"
                className="xl:self-start"
                title={`Stagione ${season}`}
                sub="Solo quello che dice il calendario di questa anteprima; il resto arriva da R20."
              >
                <dl className="m-0 grid grid-cols-1 gap-px bg-[var(--in-line)] sm:grid-cols-3">
                  <Counter
                    label="Partite in calendario"
                    value={seasonSplit.total}
                  />
                  <Counter label="In casa" value={seasonSplit.home} />
                  <Counter label="In trasferta" value={seasonSplit.away} />
                </dl>
                <dl className="m-0 grid grid-cols-1 gap-px border-t border-[var(--in-line)] bg-[var(--in-line)] sm:grid-cols-2">
                  <Pending label="Risultati e classifiche" />
                  <Pending label="Tesserati per squadra" />
                  <Pending label="Presenze agli allenamenti" />
                  <Pending label="Convocazioni" />
                </dl>
                <SourceLine>
                  Calendario ufficiale (gare CAMPIONATO, COPPA, TORNEO e
                  AMICHEVOLE della copia), esclusi gli eventi ritirati o
                  annullati.
                </SourceLine>
              </Card>
              <div className="flex min-w-0 flex-col gap-[18px] xl:self-start">
                <Card
                  id="gest-risolvere"
                  title="Da risolvere"
                  aside={
                    weekUnknown ? <Chip tone="crit">1 urgente</Chip> : undefined
                  }
                >
                  <ul className="m-0 list-none p-0">
                    {weekUnknown && (
                      <li className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3.5">
                        <Chip
                          tone="crit"
                          className="w-7 flex-none justify-center !px-0"
                        >
                          <Clock3
                            className="size-3.5"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Chip>
                        <div className="min-w-0">
                          <b className="block text-[15px] leading-snug">
                            Settimana A o B della rotazione non determinabile
                          </b>
                          <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
                            Il quadro non indica quale settimana è in corso:
                            chiedilo al responsabile del quadro.
                          </p>
                        </div>
                      </li>
                    )}
                    {overlapGroups.map((g) => (
                      <li
                        key={g.key}
                        className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3.5"
                      >
                        <Chip
                          tone="warn"
                          className="w-7 flex-none justify-center !px-0"
                        >
                          <AlertTriangle
                            className="size-3.5"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Chip>
                        <div className="min-w-0">
                          <b className="block text-[15px] leading-snug">
                            {g.teams[0]} e {g.teams[1]}, {joinDays(g.days)}
                          </b>
                          <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
                            {g.minutes} minuti sullo stesso campo,{" "}
                            {fromMinutes(g.from)}–{fromMinutes(g.to)}.
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-[var(--in-line)] px-4 py-3 text-[15px]">
                    <Link
                      to="/quadro"
                      className="scd-focus font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
                    >
                      Apri il quadro settimanale
                    </Link>
                  </div>
                </Card>

                <Card
                  id="gest-mister"
                  title="Area mister"
                  sub="Convocazioni con conferma di lettura, lavagna e moduli, video."
                >
                  <div className="px-4 pb-4 text-[15px]">
                    <FutureLink path={MISTER_PATH}>
                      Apri l'area mister
                    </FutureLink>
                  </div>
                </Card>

                <Card
                  id="gest-salute"
                  title="Salute del club"
                  sub="Infermeria e nutrizionista: riservate a chi ha l'abilitazione."
                >
                  <div className="flex flex-col gap-2 px-4 pb-4 text-[15px]">
                    <Link
                      to="/infermeria"
                      className="scd-focus font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
                    >
                      Infermeria: certificati, cassette e DAE
                    </Link>
                    <Link
                      to="/nutrizionista"
                      className="scd-focus font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
                    >
                      Nutrizionista: consigli e richieste di consulenza
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InteriorShell>
  );
}

const colorOrNull = (m: Map<string, string>, id: string | null) =>
  id ? (m.get(id) ?? null) : null;

/** Prominent entry to the facility planner (rotations, simulations, third-party rentals, events). */
function ImpiantiEntry({ live }: { live: boolean }) {
  const body = (
    <>
      <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-[var(--in-action)] text-[var(--in-ink)]">
        <MapPinned className="size-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-title text-[24px] font-extrabold leading-none text-white sm:text-[26px]">
          Impianti e campi
        </span>
        <span className="mt-1.5 block text-[15px] leading-snug text-[#d6ebfb]">
          Rotazioni, simulazioni, affitti a terzi, eventi
        </span>
      </span>
      <span className="flex-none">
        {live ? (
          <span className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)]">
            Apri{" "}
            <ChevronRight
              className="size-4"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </span>
        ) : (
          <span className="inline-flex h-9 items-center rounded-full bg-white/14 px-3 text-[14px] font-semibold text-white">
            presto
          </span>
        )}
      </span>
    </>
  );
  const cls =
    "flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--in-rail)] px-4 py-4 shadow-[var(--in-card-shadow)] sm:flex-nowrap sm:px-6";
  return live ? (
    <Link
      to={IMPIANTI_PATH as never}
      className={`scd-focus ${cls} transition-transform duration-150 active:scale-[0.99]`}
      aria-label="Impianti e campi: rotazioni, simulazioni, affitti a terzi, eventi"
    >
      {body}
    </Link>
  ) : (
    <div
      className={cls}
      data-future-path={IMPIANTI_PATH}
      aria-label="Impianti e campi: rotazioni, simulazioni, affitti a terzi, eventi (presto)"
    >
      {body}
    </div>
  );
}

/** Entry to the season planning (matches, tournaments and events, deadlines from 01/07/2026 to 30/06/2027). */
function PlanningEntry() {
  return (
    <Link
      to="/gestionale/planning"
      className="scd-focus flex items-center gap-4 rounded-2xl border border-[var(--in-line)] bg-white px-4 py-3.5 shadow-[var(--in-card-shadow)] transition-colors duration-150 hover:bg-[var(--in-info-bg)] sm:px-6"
    >
      <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-[var(--in-info-bg)] text-[var(--in-info)]">
        <CalendarRange className="size-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[18px] font-bold leading-tight">Planning annuale</span>
        <span className="mt-1 block text-[14.5px] leading-snug text-[var(--in-sub)]">
          La stagione 2026/27 in una pagina: gare, tornei ed eventi, scadenze del club e federali
        </span>
      </span>
      <ChevronRight className="size-5 flex-none text-[var(--in-info)]" strokeWidth={2.2} aria-hidden="true" />
    </Link>
  );
}

function TeamRow({ team: t }: { team: TeamSummary }) {
  const n = t.next;
  return (
    <li className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3">
      <TeamTag tag={t.tag} color={t.color} title={t.label} />
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] leading-snug">{t.label}</b>
        <span className="block text-[13px] text-[var(--in-sub)]">
          {t.category ?? "Categoria: —"}
        </span>
        <p className="m-0 mt-1.5 text-[13.5px] leading-snug">
          {n ? (
            <>
              <span className="font-semibold">
                {shortDate(n.date)} · {n.time || "ora —"}
              </span>
              {" · "}
              {n.homeAway === "CASA"
                ? "in casa"
                : n.homeAway === "FUORI"
                  ? "in trasferta"
                  : "sede da definire"}
              {n.opponent && <> con {titleCase(n.opponent)}</>}
              <span className="block text-[13px] text-[var(--in-sub)]">
                {n.venue ? venueCase(n.venue) : "Campo: —"}
              </span>
            </>
          ) : (
            <span className="text-[var(--in-sub)]">
              — · Nessuna gara in calendario
            </span>
          )}
        </p>
        <p className="m-0 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-[var(--in-sub)]">
          <span>
            <LayoutGrid
              className="mr-1 inline size-3.5 align-[-2px]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            {t.weeklySessions === null ? (
              <>
                Allenamenti: —{" "}
                <span className="sr-only">
                  (nessuna corrispondenza verificata nel quadro)
                </span>
              </>
            ) : (
              <>{t.weeklySessions} allenamenti a settimana</>
            )}
          </span>
          <span>
            {t.split.total} gare · {t.split.home} casa · {t.split.away} fuori
          </span>
        </p>
      </div>
    </li>
  );
}

function MatchChip({
  e,
  tag,
  color,
}: {
  e: PublicEvent;
  tag: string;
  color: string | null;
}) {
  const home = e.homeAway === "CASA";
  return (
    <div className="rounded-[9px] border border-[#f1dc7a] bg-[#fffbe6] px-2 py-[7px]">
      <div className="flex items-center gap-[5px] text-[12px] text-[var(--in-sub)]">
        <TeamDot color={color} />
        {e.time || "—"}
      </div>
      <div className="text-[13.5px] font-semibold leading-tight">{tag}</div>
      <div className="text-[13px] leading-tight text-[var(--in-sub)]">
        {home ? homeSpot(e.venue) : "trasferta"}
      </div>
      <span className="sr-only">
        {home ? "Partita in casa" : "Partita in trasferta"}
        {e.opponent ? ` con ${titleCase(e.opponent)}` : ""}
      </span>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <dt className="text-[13px] font-semibold text-[var(--in-sub)]">
        {label}
      </dt>
      <dd className="m-0 mt-1 font-title text-[34px] font-black leading-none text-[var(--in-ink)]">
        {value === null ? "—" : value}
      </dd>
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[13px] font-semibold text-[var(--in-sub)]">
        {label}
      </dt>
      <dd className="m-0 mt-0.5 text-[15px]">
        <span
          className="font-title text-[22px] font-black text-[var(--in-sub)]"
          aria-hidden="true"
        >
          —
        </span>{" "}
        <span className="text-[13.5px] text-[var(--in-sub)]">
          {R20_PENDING}
        </span>
      </dd>
    </div>
  );
}

/** Staff only (Direzione 15/10/2026): without an allowed session the area's access screen, never the preview. */
function GestionalePageGate() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="gestionale" gate={gate}>
      {gate.preview && <StagingBanner />}
      <GestionalePage />
    </WorkAreaGateView>
  );
}
