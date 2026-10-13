import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ticket, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";

import {
  ContabilitaNav,
  Figure,
  MonthSwitch,
  contabilitaHead,
} from "@/components/scd/contabilita";
import {
  Card,
  Chip,
  SourceLine,
  useRomeNow,
} from "@/components/scd/interior-ui";
import {
  EmptyState,
  SourcesBox,
  WorkAreaGateView,
  WorkAreaShell,
} from "@/components/scd/work-area-ui";
import { titleCase } from "@/lib/board-data";
import { euro } from "@/lib/fees";
import {
  SITE_LABEL,
  buildIncassiMonth,
  incassiTotals,
  unattributedPos,
  type DayTill,
  type IncassiDay,
} from "@/lib/incassi-calendar";
import { getLedgerBoard, type LedgerData } from "@/lib/ledger.functions";
import { TICKETING } from "@/lib/match-extras";
import { buildPrimaNota, plural } from "@/lib/prima-nota";
import { loadCalendar, type PublicGroup } from "@/lib/public-snapshots";
import { WORK_AREAS } from "@/lib/work-areas";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

const PATH = "/tesoreria/calendario-incassi";
const DESCRIPTION =
  "Calendario degli incassi: partite in casa con biglietteria e giorni Club House di Colico e Dervio, con incassi registrati o da registrare. Riservato.";

function validateSearch(raw: Record<string, unknown>): { mese?: string } {
  return typeof raw["mese"] === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(raw["mese"])
    ? { mese: raw["mese"] }
    : {};
}

/** Calendario incassi (Direzione 13/10): home matches and Club House days of the month. Direzione and Tesoreria. */
export const Route = createFileRoute("/tesoreria_/calendario-incassi")({
  validateSearch,
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "movimenti" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const data: LedgerData = await getLedgerBoard();
    return {
      gate,
      interior: true as const,
      groups: cal.groups,
      events: cal.events.filter((e) => e.homeAway === "CASA"),
      data,
    };
  },
  head: ({ loaderData }) =>
    contabilitaHead("Calendario incassi", DESCRIPTION, loaderData?.gate),
  component: IncassiRoute,
});

function IncassiRoute() {
  const d = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <WorkAreaGateView id="movimenti" gate={d.gate}>
      {d.interior && (
        <IncassiPage
          preview={d.gate.preview}
          groups={d.groups}
          events={d.events}
          data={d.data}
          month={search.mese ?? null}
        />
      )}
    </WorkAreaGateView>
  );
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const officeOf = (kind: DayTill["kind"]) =>
  (kind === "biglietteria"
    ? WORK_AREAS.biglietteria.insertRoles
    : WORK_AREAS["club-house"].insertRoles
  ).join(" o ");
const TILL_LABEL: Readonly<Record<DayTill["kind"], string>> = {
  biglietteria: "Biglietteria",
  "club-house": "Club House",
};

function IncassiPage({
  preview,
  groups,
  events,
  data,
  month: asked,
}: {
  preview: boolean;
  groups: PublicGroup[];
  events: ReturnType<typeof loadCalendar>["events"];
  data: LedgerData;
  month: string | null;
}) {
  const now = useRomeNow();
  const navigate = useNavigate();
  const today = now.date;
  const month = asked ?? today.slice(0, 7);
  const rows = useMemo(
    () => buildPrimaNota(data.board?.entries ?? []).rows,
    [data.board],
  );
  const days = useMemo(
    () => buildIncassiMonth(month, events, rows, today),
    [month, events, rows, today],
  );
  const totals = useMemo(() => incassiTotals(days), [days]);
  const pos = useMemo(() => unattributedPos(rows, month), [rows, month]);
  const byGroup = useMemo(
    () => new Map(groups.map((g) => [g.id, g.label])),
    [groups],
  );
  const weeks = useMemo(() => {
    const out: IncassiDay[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);
  const active = days.filter(
    (d) => d.inMonth && (d.matches.length > 0 || d.tills.length > 0),
  );
  const ledgerOk = data.connected && !data.error && !!data.board;

  return (
    <WorkAreaShell
      id="movimenti"
      path={PATH}
      title="Calendario incassi"
      preview={preview}
      highlights={[
        { value: totals.matches, label: "partite in casa nel mese" },
        { value: totals.ticketedMatches, label: "con biglietteria" },
        { value: totals.toRegister, label: "incassi da registrare" },
        { value: totals.planned, label: "giornate in programma" },
      ]}
      note={
        <>
          Giorni Club House <b>presunti</b> dalle gare in casa; nessun incasso
          stimato.
        </>
      }
    >
      <ContabilitaNav current="calendario-incassi" />
      <Card
        id="ci-mese"
        title="Incassi del mese"
        sub={
          ledgerOk
            ? "Incassi registrati = movimenti del registro con centro biglietteria o Club House."
            : "Registro dei movimenti non leggibile con questo accesso: si vedono solo partite e giorni."
        }
        aside={
          <MonthSwitch
            month={month}
            onChange={(m) =>
              void navigate({
                to: PATH as never,
                search: { mese: m } as never,
                replace: true,
              })
            }
          />
        }
      >
        <div
          className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-5 sm:px-[18px]"
          data-testid="ci-totals"
        >
          <Figure
            label="Biglietteria registrata"
            value={ledgerOk ? euro(totals.ticketing) : "—"}
            tone="ok"
          />
          <Figure
            label="Club House registrata"
            value={ledgerOk ? euro(totals.clubHouse) : "—"}
            tone="ok"
          />
          <Figure
            label="Giornate da registrare"
            value={totals.toRegister}
            tone={totals.toRegister ? "warn" : "mute"}
          />
          <Figure
            label="Giornate in programma"
            value={totals.planned}
            tone="mute"
          />
          <Figure
            label="Accrediti POS non attribuiti"
            value={ledgerOk ? euro(pos.total) : "—"}
            tone="info"
            hint={
              ledgerOk
                ? plural(pos.count, "accredito SumUp", "accrediti SumUp")
                : undefined
            }
          />
        </div>
      </Card>

      <div className="flex min-w-0 flex-col gap-[18px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card
            id="ci-calendario"
            title="Calendario"
            sub="Per ogni giorno: partite in casa, casse aperte e stato dell'incasso."
          >
            <div className="hidden px-[18px] pb-4 lg:block">
              <table
                className="w-full table-fixed border-collapse text-[13px]"
                data-testid="ci-grid"
              >
                <caption className="sr-only">
                  Calendario del mese con partite in casa, casse e incassi;
                  ultima colonna: totale della settimana
                </caption>
                <thead>
                  <tr>
                    {WEEKDAYS.map((w) => (
                      <th
                        key={w}
                        scope="col"
                        className="py-1.5 text-left text-[12.5px] font-semibold text-[var(--in-sub)]"
                      >
                        {w}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="w-[110px] py-1.5 text-right text-[12.5px] font-semibold text-[var(--in-sub)]"
                    >
                      Settimana
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => {
                    const wt = incassiTotals(w);
                    return (
                      <tr key={w[0]?.date} className="align-top">
                        {w.map((d) => (
                          <DayCell
                            key={d.date}
                            d={d}
                            today={today}
                            byGroup={byGroup}
                          />
                        ))}
                        <td className="border border-[var(--in-line)] bg-[#f7fbff] p-1.5 text-right">
                          <b className="block tabular-nums">
                            {ledgerOk && wt.registered
                              ? euro(wt.registered)
                              : "—"}
                          </b>
                          {wt.toRegister > 0 && (
                            <span className="block text-[12px] font-semibold text-[var(--in-warn)]">
                              {wt.toRegister} da registrare
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden">
              {active.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState title="Nessuna giornata con incassi">
                    Nel mese non ci sono partite in casa nel calendario.
                  </EmptyState>
                </div>
              ) : (
                <ol className="m-0 list-none p-0" data-testid="ci-list">
                  {active.map((d) => (
                    <DayItem key={d.date} d={d} byGroup={byGroup} />
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>
        <div className="grid min-w-0 grid-cols-1 items-start gap-[18px] lg:grid-cols-3">
          <Card id="ci-tariffe" title="Tariffe 2026/27" sub={TICKETING.where}>
            <ul className="m-0 list-none p-0" data-testid="ci-tariffs">
              {Object.values(TICKETING.tariffs).map((t) => (
                <li
                  key={t.label}
                  className="flex items-center justify-between gap-2 border-t border-[var(--in-line)] px-4 py-2 text-[14.5px] sm:px-[18px]"
                >
                  <span>{t.label}</span>
                  <b className="tabular-nums">
                    {euro(t.intero)} · rid. {euro(t.ridotto)}
                  </b>
                </li>
              ))}
            </ul>
            <p className="m-0 border-t border-[var(--in-line)] px-4 py-2.5 text-[14px] leading-snug sm:px-[18px]">
              Tesserati: {TICKETING.membersShort}. {TICKETING.cup}.
            </p>
            <SourceLine>{TICKETING.source}.</SourceLine>
          </Card>
          <Card id="ci-uffici" title="Chi registra">
            <ul className="m-0 grid list-none gap-2 px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
              <li className="flex gap-2">
                <Ticket
                  className="mt-0.5 size-4 flex-none text-[var(--in-info)]"
                  aria-hidden="true"
                />
                <span>
                  <b>Biglietteria:</b> {officeOf("biglietteria")}: chiusura di
                  cassa a fine partita (biglietti interi, ridotti, omaggi).
                </span>
              </li>
              <li className="flex gap-2">
                <UtensilsCrossed
                  className="mt-0.5 size-4 flex-none text-[var(--in-info)]"
                  aria-hidden="true"
                />
                <span>
                  <b>Club House:</b> {officeOf("club-house")}: chiusura del bar
                  a fine giornata, sede per sede.
                </span>
              </li>
              <li className="rounded-lg bg-[#fff3c4] px-3 py-2 text-[#5a4500]">
                Il registro di cassa di biglietteria e Club House non è ancora
                collegato: finché non c'è, l'incasso risulta “da registrare”.
              </li>
            </ul>
          </Card>
          <SourcesBox id="biglietteria" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

/** Compact till state inside a calendar cell: icon + amount or state, full label for assistive tech. */
function TillChip({ t }: { t: DayTill }) {
  const Icon = t.kind === "biglietteria" ? Ticket : UtensilsCrossed;
  const label = `${TILL_LABEL[t.kind]} ${SITE_LABEL[t.site]}`;
  const tone =
    t.state === "registrato"
      ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]"
      : t.state === "da-registrare"
        ? "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"
        : "bg-[#eef3f9] text-[var(--in-sub)]";
  const text =
    t.state === "registrato"
      ? euro(t.registered ?? 0)
      : t.state === "da-registrare"
        ? "da registrare"
        : "in programma";
  return (
    <span
      className={`mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${tone}`}
      title={`${label}: ${text}`}
    >
      <Icon className="size-3.5 flex-none" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="truncate tabular-nums">
        {t.site === "dervio" ? "Dervio · " : ""}
        {text}
      </span>
    </span>
  );
}

function TillLine({ t }: { t: DayTill }) {
  const label = `${TILL_LABEL[t.kind]} ${SITE_LABEL[t.site]}`;
  if (t.state === "registrato")
    return (
      <span className="block text-[12.5px]">
        <b>{label}</b>{" "}
        <span className="font-bold text-[var(--in-ok)] tabular-nums">
          {euro(t.registered ?? 0)}
        </span>
      </span>
    );
  if (t.state === "da-registrare")
    return (
      <span className="block text-[12.5px]">
        <b>{label}</b>{" "}
        <span className="font-semibold text-[var(--in-warn)]">
          da registrare
        </span>
      </span>
    );
  return (
    <span className="block text-[12.5px] text-[var(--in-sub)]">
      {label} · in programma
    </span>
  );
}

function DayCell({
  d,
  today,
  byGroup,
}: {
  d: IncassiDay;
  today: string;
  byGroup: Map<string, string>;
}) {
  const day = Number(d.date.slice(8, 10));
  return (
    <td
      className={`h-[96px] border border-[var(--in-line)] p-1.5 ${d.inMonth ? "bg-white" : "bg-[#f4f7fb] text-[var(--in-sub)]"} ${d.date === today ? "outline outline-2 -outline-offset-2 outline-[#F8D000]" : ""}`}
      data-day={d.date}
    >
      <span className="block font-title text-[16px] font-black leading-none">
        {day}
      </span>
      {d.inMonth &&
        d.matches.map((m) => (
          <span
            key={m.match.id}
            className="mt-1 block truncate text-[12px] leading-tight"
            title={`${byGroup.get(m.match.group) ?? m.match.group} – ${titleCase(m.match.opponent)} ${m.match.time}`}
          >
            <b>{byGroup.get(m.match.group) ?? m.match.group}</b> {m.match.time}
            {m.office === "biglietteria" ? " · €" : ""}
          </span>
        ))}
      {d.inMonth &&
        d.tills.map((t) => <TillChip key={`${t.kind}-${t.site}`} t={t} />)}
    </td>
  );
}

function DayItem({
  d,
  byGroup,
}: {
  d: IncassiDay;
  byGroup: Map<string, string>;
}) {
  return (
    <li className="border-t border-[var(--in-line)] px-4 py-3">
      <b className="block text-[15px] capitalize">
        {new Intl.DateTimeFormat("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        }).format(new Date(`${d.date}T12:00:00Z`))}
      </b>
      <ul className="m-0 mt-1 grid list-none gap-1 p-0">
        {d.matches.map((m) => (
          <li
            key={m.match.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]"
          >
            <span className="min-w-0">
              <b>{byGroup.get(m.match.group) ?? m.match.group}</b> –{" "}
              {titleCase(m.match.opponent || "avversario da definire")} ·{" "}
              {m.match.time || "orario da confermare"}
            </span>
            {m.office === "biglietteria" && m.tariff ? (
              <Chip tone={m.cup ? "warn" : "info"}>
                {m.cup
                  ? "coppa"
                  : `${euro(m.tariff.intero)} / ${euro(m.tariff.ridotto)}`}
              </Chip>
            ) : (
              <Chip tone="mute">ingresso gratuito</Chip>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-1.5 grid gap-0.5">
        {d.tills.map((t) => (
          <TillLine key={`${t.kind}-${t.site}`} t={t} />
        ))}
        {d.tills.some((t) => t.state === "da-registrare") && (
          <span className="text-[12px] text-[var(--in-sub)]">
            Registra:{" "}
            {[
              ...new Set(
                d.tills
                  .filter((t) => t.state === "da-registrare")
                  .map((t) => officeOf(t.kind)),
              ),
            ].join("; ")}
          </span>
        )}
      </div>
    </li>
  );
}
