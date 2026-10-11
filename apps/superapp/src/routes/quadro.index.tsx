import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock3, Info } from "lucide-react";
import { useMemo } from "react";

import { InteriorShell } from "@/components/scd/InteriorShell";
import {
  Card,
  Chip,
  FutureLink,
  ScrollRegion,
  SnapshotNotice,
  SourceLine,
  TeamDot,
} from "@/components/scd/interior-ui";
import {
  freshnessLabel,
  loadCalendar,
  loadQuadro,
} from "@/lib/public-snapshots";
import {
  FIELD_LABEL,
  IMPIANTI_PATH,
  ROOM_IDS,
  ZONE_IDS,
  dayLabel,
  findOverlaps,
  fromMinutes,
  groupByDay,
  groupIdForText,
  groupOverlaps,
  joinDays,
  quadroEntries,
  readableOnWhite,
  roomCount,
  roomsFor,
  rotationFor,
  rotationSplit,
  zoneConflicts,
  type Week,
} from "@/lib/quadro";

type Search = { settimana?: Week | undefined };

/** Role set of this preview: no login yet, so only areas open to every staff role appear in the rail. */
const PREVIEW_ROLES: ReadonlySet<string> = new Set();

export const Route = createFileRoute("/quadro/")({
  staticData: { interior: true },
  validateSearch: (s: Record<string, unknown>): Search =>
    s["settimana"] === "A" || s["settimana"] === "B"
      ? { settimana: s["settimana"] }
      : {},
  loader: () => {
    const q = loadQuadro();
    const cal = loadCalendar();
    return { ...q, groups: cal.groups };
  },
  head: () => ({
    meta: [
      { title: "Quadro settimanale — SCD Dentro · S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Quadro settimanale allenamenti a Colico: campi, zone e spogliatoi dal lunedì al venerdì, rotazione A/B e sovrapposizioni. Anteprima di sola lettura, non live.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuadroPage,
});

const ZONE_LABEL: Record<(typeof ZONE_IDS)[number], string> = {
  C1_A: "C1 · A",
  C1_B: "C1 · B",
  C1_C: "C1 · C",
  C2_A: "C2 · A",
  C2_B: "C2 · B",
};
const range = (from: number, to: number) =>
  `${fromMinutes(from)}–${fromMinutes(to)}`;

function QuadroPage() {
  const { days, slots, rotations, rooms, generatedUTC, note, groups } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const week: Week = search.settimana ?? "A";
  const setWeek = (w: Week) =>
    void navigate({
      search: w === "A" ? {} : { settimana: w },
      replace: true,
      resetScroll: false,
    });

  const colorOf = useMemo(() => {
    const byId = new Map(groups.map((g) => [g.id, readableOnWhite(g.color)]));
    return (text: string) => {
      const id = groupIdForText(text);
      return id ? (byId.get(id) ?? null) : null;
    };
  }, [groups]);

  const entries = useMemo(() => quadroEntries(slots), [slots]);
  const byDay = useMemo(() => groupByDay(days, entries), [days, entries]);
  const overlaps = useMemo(() => findOverlaps(entries), [entries]);
  const overlapGroups = useMemo(
    () => groupOverlaps(overlaps, days),
    [overlaps, days],
  );
  const flagged = useMemo(
    () => new Set(overlapGroups.flatMap((g) => g.entryIds)),
    [overlapGroups],
  );
  const rotationByDay = useMemo(
    () =>
      days.map((d) => ({
        day: d,
        rows: rotationFor(rotations, week, d, overlaps),
      })),
    [days, rotations, week, overlaps],
  );
  const zoneIssues = useMemo(() => {
    const out: { week: Week; day: string; zone: string; text: string }[] = [];
    for (const w of ["A", "B"] as const) {
      for (const d of days) {
        for (const c of zoneConflicts(rotationFor(rotations, w, d))) {
          out.push({
            week: w,
            day: d,
            zone: c.zone,
            text: `${c.a.zones[c.zone]} (${c.a.timeLabel}) e ${c.b.zones[c.zone]} (${c.b.timeLabel})`,
          });
        }
      }
    }
    return out;
  }, [days, rotations]);
  const zoneIssueKeys = useMemo(
    () =>
      new Set(
        zoneIssues
          .filter((z) => z.week === week)
          .map((z) => `${z.day}|${z.zone}`),
      ),
    [zoneIssues, week],
  );
  const roomByDay = useMemo(
    () => days.map((d) => ({ day: d, rooms: roomsFor(rooms, week, d) })),
    [days, rooms, week],
  );

  const snapshot = freshnessLabel(generatedUTC);
  const issues = overlapGroups.length + zoneIssues.length;

  return (
    <InteriorShell
      title="Quadro settimanale"
      path="/quadro"
      activeAreaId="quadro"
      roles={PREVIEW_ROLES}
      roleLabel="Anteprima staff"
      highlights={[
        {
          value: entries.length || null,
          label: "allenamenti da lunedì a venerdì",
        },
        { value: issues, label: "sovrapposizioni da verificare" },
        { value: roomCount(slots, rooms), label: "spogliatoi a Colico" },
      ]}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <SnapshotNotice>
            Quadro settimanale allenamenti 2026/27, copia del {snapshot}. Sola
            lettura: le modifiche passano dal responsabile del quadro.
          </SnapshotNotice>

          <Card
            id="quadro-grid"
            title="Quadro allenamenti · Colico"
            sub="Da lunedì a venerdì, con campo e spogliatoi. I colori sono quelli delle squadre."
            aside={<Chip tone="warn">Settimana A o B: da indicare</Chip>}
          >
            <ScrollRegion
              label="Quadro allenamenti, da lunedì a venerdì"
              className="px-4 pb-4 pt-0.5 sm:px-[18px]"
            >
              <div className="grid gap-x-2.5 gap-y-5 md:min-w-[760px] md:grid-cols-5 md:gap-y-2.5">
                {byDay.map(({ day, entries: list }) => (
                  <div key={day} className="flex min-w-0 flex-col gap-2">
                    <h3 className="m-0 px-0.5 pb-0.5 text-[15px] font-bold">
                      {dayLabel(day)}
                    </h3>
                    {list.length === 0 && (
                      <p className="m-0 rounded-[10px] border border-dashed border-[#b9d5ef] px-2.5 py-2 text-[13px] text-[var(--in-sub)]">
                        Nessun allenamento nel quadro
                      </p>
                    )}
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {list.map((e) => {
                        const warn = flagged.has(e.id);
                        return (
                          <li
                            key={e.id}
                            className={`rounded-[10px] border px-2.5 py-[9px] ${warn ? "border-[#e0b100] bg-[#fffbe6]" : "border-[var(--in-line)] bg-white"}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[12.5px] text-[var(--in-sub)]">
                              <span className="flex items-center gap-[5px] whitespace-nowrap">
                                <TeamDot color={colorOf(e.text)} />
                                {e.timeLabel}
                              </span>
                              <b className="whitespace-nowrap text-[var(--in-info)]">
                                {FIELD_LABEL[e.field]}
                              </b>
                            </div>
                            <p className="m-0 mt-[3px] text-[14px] font-semibold leading-[1.3]">
                              {e.text}
                            </p>
                            <p className="m-0 mt-1 text-[12.5px] text-[var(--in-sub)]">
                              {e.rooms.length ? (
                                <>
                                  Spogliatoi{" "}
                                  {e.rooms.map((r) => r.id).join(", ")}
                                </>
                              ) : (
                                "Spogliatoi: —"
                              )}
                            </p>
                            {warn && (
                              <p className="m-0 mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-[var(--in-warn)]">
                                <AlertTriangle
                                  className="size-3.5 flex-none"
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                                Sovrapposizione sul campo
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollRegion>
            <SourceLine>
              Quadro settimanale allenamenti 2026/27 (foglio QUADRO
              ALLENAMENTI), copia del {snapshot}.
            </SourceLine>
          </Card>

          <Card
            id="quadro-rotazione"
            title={`Rotazione delle zone · Settimana ${week}`}
            sub="Campo 1 diviso in tre zone (A, B, C), campo 2 in due. Le righe A/B valgono in entrambe le settimane."
            aside={<WeekSwitch week={week} onChange={setWeek} />}
          >
            <ScrollRegion
              label={`Rotazione delle zone, settimana ${week}`}
              className="px-4 pb-4 sm:px-[18px]"
            >
              <table className="w-full min-w-[720px] border-collapse text-left">
                <caption className="sr-only">
                  Rotazione delle zone dei campi, settimana {week}, per giorno e
                  orario
                </caption>
                <thead>
                  <tr className="border-b border-[var(--in-line)] text-[13px] font-semibold text-[var(--in-sub)]">
                    <th scope="col" className="w-[110px] py-2.5 pr-3">
                      Giorno
                    </th>
                    <th scope="col" className="w-[110px] py-2.5 pr-3">
                      Orario
                    </th>
                    {ZONE_IDS.map((z) => (
                      <th key={z} scope="col" className="py-2.5 pr-3">
                        {ZONE_LABEL[z]}
                      </th>
                    ))}
                  </tr>
                </thead>
                {rotationByDay.map(({ day, rows }) => (
                  <tbody
                    key={day}
                    className="border-b border-[var(--in-line)] last:border-b-0"
                  >
                    {rows.length === 0 && (
                      <tr>
                        <th
                          scope="row"
                          className="py-2.5 pr-3 text-[14px] font-bold"
                        >
                          {dayLabel(day)}
                        </th>
                        <td
                          colSpan={6}
                          className="py-2.5 text-[14px] text-[var(--in-sub)]"
                        >
                          —
                        </td>
                      </tr>
                    )}
                    {rows.map((r, i) => (
                      <tr key={r.id} className="align-top">
                        {i === 0 && (
                          <th
                            scope="rowgroup"
                            rowSpan={rows.length}
                            className="py-2.5 pr-3 text-[14px] font-bold"
                          >
                            {dayLabel(day)}
                          </th>
                        )}
                        <td className="whitespace-nowrap py-2.5 pr-3 text-[14px] text-[var(--in-sub)]">
                          {r.timeLabel}
                          {r.week === "A/B" && (
                            <span className="ml-1.5 text-[12px] font-semibold">
                              A/B
                            </span>
                          )}
                        </td>
                        {ZONE_IDS.map((z) => {
                          const text = r.zones[z] ?? "";
                          const shared = r.conflictZones.includes(z);
                          const twice =
                            zoneIssueKeys.has(`${day}|${z}`) &&
                            text.trim() !== "" &&
                            text.trim() !== "—";
                          return (
                            <td key={z} className="py-1.5 pr-2">
                              <span
                                className={`block rounded-lg px-2 py-1 text-[13.5px] leading-snug ${twice ? "bg-[var(--in-crit-bg)] font-semibold text-[var(--in-crit)]" : shared ? "bg-[var(--in-warn-bg)] font-semibold text-[var(--in-warn)]" : text && text !== "—" ? "text-[var(--in-ink)]" : "text-[var(--in-sub)]"}`}
                              >
                                {text || "—"}
                                {twice ? (
                                  <span className="sr-only">
                                    {" "}
                                    (zona assegnata due volte)
                                  </span>
                                ) : shared ? (
                                  <span className="sr-only">
                                    {" "}
                                    (campo condiviso durante una
                                    sovrapposizione)
                                  </span>
                                ) : null}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </ScrollRegion>
            <div className="flex flex-wrap gap-2 px-4 pb-3 text-[13px] sm:px-[18px]">
              <Chip tone="warn">
                Giallo: campo condiviso durante una sovrapposizione
              </Chip>
              <Chip tone="crit">Rosso: stessa zona assegnata a due gruppi</Chip>
            </div>
            <SourceLine>
              Foglio ROTAZIONE CAMPI del quadro, copia del {snapshot}. {note}
            </SourceLine>
          </Card>

          <Card
            id="quadro-spogliatoi"
            title={`Spogliatoi · Settimana ${week}`}
            sub="Chi usa SP1–SP4 a Colico, giorno per giorno."
          >
            <ScrollRegion
              label={`Spogliatoi, settimana ${week}`}
              className="px-4 pb-4 sm:px-[18px]"
            >
              <table className="w-full min-w-[680px] border-collapse text-left">
                <caption className="sr-only">
                  Spogliatoi SP1–SP4 per giorno, settimana {week}
                </caption>
                <thead>
                  <tr className="border-b border-[var(--in-line)] text-[13px] font-semibold text-[var(--in-sub)]">
                    <th scope="col" className="w-[110px] py-2.5 pr-3">
                      Giorno
                    </th>
                    {ROOM_IDS.map((id) => (
                      <th key={id} scope="col" className="py-2.5 pr-3">
                        {id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roomByDay.map(({ day, rooms: byRoom }) => (
                    <tr
                      key={day}
                      className="border-b border-[var(--in-line)] align-top last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="py-2.5 pr-3 text-[14px] font-bold"
                      >
                        {dayLabel(day)}
                      </th>
                      {ROOM_IDS.map((id) => (
                        <td
                          key={id}
                          className="py-2.5 pr-3 text-[13.5px] leading-snug"
                        >
                          {byRoom[id].length === 0 ? (
                            <span className="text-[var(--in-sub)]">—</span>
                          ) : (
                            <ul className="m-0 flex list-none flex-col gap-1 p-0">
                              {byRoom[id].map((r) => (
                                <li key={`${r.start}-${r.group}`}>
                                  <span className="text-[var(--in-sub)]">
                                    {range(r.start, r.end)}
                                  </span>{" "}
                                  <b className="font-semibold">{r.group}</b>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
            <SourceLine>
              Foglio SPOGLIATOI SETT del quadro, copia del {snapshot}.
            </SourceLine>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px] lg:self-start">
          <Card
            id="quadro-sistemare"
            title="Da sistemare"
            aside={
              issues > 0 ? (
                <Chip tone="warn">{issues} da verificare</Chip>
              ) : undefined
            }
          >
            <ul className="m-0 list-none p-0">
              {overlapGroups.map((g) => {
                const split = rotationSplit(g, rotations, overlaps);
                const splitWeeks = split
                  .filter((s) => s.split)
                  .map((s) => s.week);
                return (
                  <li
                    key={g.key}
                    className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
                  >
                    <IssueIcon tone="warn" />
                    <div className="min-w-0">
                      <b className="block text-[15px] leading-snug">
                        {g.teams[0]} e {g.teams[1]}, {joinDays(g.days)}
                      </b>
                      <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
                        {g.minutes} minuti insieme sul{" "}
                        {FIELD_LABEL[g.field].toLowerCase()}, dalle{" "}
                        {fromMinutes(g.from)} alle {fromMinutes(g.to)}.{" "}
                        {splitWeeks.length === 2
                          ? "La rotazione li mette in zone diverse in entrambe le settimane."
                          : splitWeeks.length === 1
                            ? `La rotazione li separa solo nella settimana ${splitWeeks[0]}.`
                            : "La rotazione non indica zone separate."}
                      </p>
                    </div>
                  </li>
                );
              })}
              {zoneIssues.map((z) => (
                <li
                  key={`${z.week}-${z.day}-${z.zone}`}
                  className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
                >
                  <IssueIcon tone="crit" />
                  <div className="min-w-0">
                    <b className="block text-[15px] leading-snug">
                      Zona{" "}
                      {ZONE_LABEL[z.zone as (typeof ZONE_IDS)[number]] ??
                        z.zone}
                      , {dayLabel(z.day).toLowerCase()} settimana {z.week}
                    </b>
                    <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
                      Assegnata due volte nel foglio rotazione: {z.text}.
                    </p>
                  </div>
                </li>
              ))}
              <li className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                <IssueIcon tone="info" />
                <div className="min-w-0">
                  <b className="block text-[15px] leading-snug">
                    Rotazione A/B
                  </b>
                  <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
                    Il foglio non dice quale settimana è in corso: scegli A o B
                    per vedere zone e spogliatoi.
                  </p>
                </div>
              </li>
            </ul>
          </Card>

          <Card
            id="quadro-link"
            title="Rotazione campi"
            sub="Simulazioni, affitti a terzi ed eventi sui campi vivono nel gestionale."
          >
            <div className="px-4 pb-4 text-[15px] sm:px-[18px]">
              <FutureLink path={IMPIANTI_PATH}>Rotazione campi</FutureLink>
            </div>
          </Card>
        </div>
      </div>
    </InteriorShell>
  );
}

function IssueIcon({ tone }: { tone: "warn" | "crit" | "info" }) {
  const Icon =
    tone === "info" ? Clock3 : tone === "crit" ? Info : AlertTriangle;
  return (
    <Chip tone={tone} className="w-7 flex-none justify-center !px-0">
      <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
    </Chip>
  );
}

/** Week A/B switch (radio group semantics, keyboard: arrows move, Space/Enter select). */
function WeekSwitch({
  week,
  onChange,
}: {
  week: Week;
  onChange: (w: Week) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Settimana della rotazione"
      className="inline-flex rounded-[10px] border border-[#b9d5ef] bg-white p-[3px]"
    >
      {(["A", "B"] as const).map((w) => {
        const on = w === week;
        return (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(w)}
            onKeyDown={(e) => {
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                const next = w === "A" ? "B" : "A";
                onChange(next);
                (
                  e.currentTarget.parentElement?.querySelector(
                    `[data-week="${next}"]`,
                  ) as HTMLElement | null
                )?.focus();
              }
            }}
            data-week={w}
            className={`scd-focus h-[38px] min-w-[104px] rounded-[8px] px-3 text-[15px] font-semibold transition-colors duration-150 ${on ? "bg-[var(--in-rail)] text-white" : "text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"}`}
          >
            Settimana {w}
          </button>
        );
      })}
    </div>
  );
}
