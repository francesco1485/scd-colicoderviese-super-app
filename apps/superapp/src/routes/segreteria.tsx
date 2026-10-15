import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Users } from "lucide-react";
import { useMemo } from "react";

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
import { dateParts, titleCase } from "@/lib/board-data";
import {
  freshnessLabel,
  loadCalendar,
  type PublicEvent,
  type PublicGroup,
} from "@/lib/public-snapshots";
import { readableOnWhite, teamTag } from "@/lib/quadro";
import { getSecretariatDesk, type DeskData } from "@/lib/people.functions";
import { deskHeadline, deskLines, type DeskTone } from "@/lib/secretariat-desk";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { weekendMatches } from "@/lib/work-areas";
import { StatTile } from "@/components/scd/work-area-ui";
import { CastPresence } from "@/components/scd/CastPresence";
import { TESSERATI, itDate, sortedCounts } from "@/lib/roster-aggregates";
import { ClubDeadlinesCard } from "@/components/scd/ClubDeadlines";
import { searchKnowledge, type KbData } from "@/lib/knowledge.functions";

/** Segreteria (board Segreteria.dc.html): work queues as honest empty states, weekend matches, masters. */
export const Route = createFileRoute("/segreteria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "segreteria" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const cal = loadCalendar();
    const [desk, due] = await Promise.all([
      getSecretariatDesk(),
      searchKnowledge({ data: { onlyDue: true, limit: 12 } }),
    ]);
    return {
      gate,
      interior: true as const,
      groups: cal.groups,
      events: cal.events,
      sourceModifiedAt: cal.sourceModifiedAt,
      desk,
      due,
    };
  },
  head: ({ loaderData }) => workAreaHead("segreteria", loaderData?.gate),
  component: SegreteriaRoute,
});

function SegreteriaRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="segreteria" gate={data.gate}>
      {data.interior && (
        <SegreteriaPage
          groups={data.groups}
          events={data.events}
          sourceModifiedAt={data.sourceModifiedAt}
          preview={data.gate.preview}
          desk={data.desk}
          due={data.due}
        />
      )}
    </WorkAreaGateView>
  );
}

const FORMS = [
  "Lettera di preavviso al Comune",
  "Richiesta variazione gara LND",
  "Distinta di gara",
];

const TONE_CLS: Record<DeskTone, string> = {
  urgent: "bg-[var(--in-crit-bg,#fdecec)] text-[var(--in-crit,#b3261e)]",
  todo: "bg-[var(--in-warn-bg,#fff3c4)] text-[var(--in-warn,#7a5200)]",
  info: "bg-[var(--in-info-bg)] text-[var(--in-info)]",
};

/** r73: the day's queue as counts with a link each — no names on this page. */
function DeskCard({ desk }: { desk: DeskData }) {
  const lines = desk.counts ? deskLines(desk.counts) : [];
  const asOf = desk.counts?.as_of ? new Date(desk.counts.as_of) : null;
  return (
    <Card
      id="seg-scrivania"
      title="Scrivania del giorno"
      sub={
        desk.counts
          ? deskHeadline(lines)
          : desk.connected
            ? "Solo Direzione e Segreteria vedono le code."
            : "Database del club non collegato su questo server."
      }
      className="lg:self-start"
    >
      {desk.error && (
        <p className="px-4 pb-3 text-[14px] text-[var(--in-crit,#b3261e)] sm:px-[18px]">
          {desk.error}
        </p>
      )}
      {desk.counts && lines.length === 0 && (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Nessuna coda aperta">
            Richieste, tesseramenti, certificati e convocazioni sono tutti a
            posto per oggi.
          </EmptyState>
        </div>
      )}
      {lines.length > 0 && (
        <ul className="m-0 list-none p-0" data-testid="desk-lines">
          {lines.map((l) => (
            <li key={l.id}>
              <Link
                to={l.href as never}
                className="scd-focus grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]"
              >
                <span
                  className={`grid min-w-[44px] place-items-center rounded-[10px] px-2 py-1 font-title text-[20px] font-black tabular-nums ${TONE_CLS[l.tone]}`}
                >
                  {l.count}
                </span>
                <span className="min-w-0">{l.label.replace(/^\d+\s/, "")}</span>
                <ChevronRight
                  className="size-5 text-[var(--in-sub)]"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <SourceLine>
        Database del club, solo conteggi
        {asOf
          ? `, alle ${asOf.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" })}`
          : ""}
        . I nomi stanno in Persone, Certificati e Accessi.
      </SourceLine>
    </Card>
  );
}

function SegreteriaPage({
  groups,
  events,
  sourceModifiedAt,
  preview,
  desk,
  due,
}: {
  groups: PublicGroup[];
  events: PublicEvent[];
  sourceModifiedAt: string;
  preview: boolean;
  desk: DeskData;
  due: KbData;
}) {
  const now = useRomeNow();
  const matches = useMemo(
    () => weekendMatches(events, now.date),
    [events, now.date],
  );
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const deskLinesN = desk.counts ? deskLines(desk.counts).length : null;

  return (
    <WorkAreaShell
      id="segreteria"
      preview={preview}
      highlights={[
        { value: deskLinesN, label: "code aperte oggi" },
        { value: matches.length, label: "distinte per il weekend" },
        {
          value: desk.counts ? desk.counts.athletes_without_team : null,
          label: "atleti senza squadra",
        },
      ]}
      note={
        <>
          Partite: calendario ufficiale, copia del{" "}
          {freshnessLabel(sourceModifiedAt)}. Code dal database del club;
          scadenze dal Cervellone.
        </>
      }
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
        <DeskCard desk={desk} />
        <ClubDeadlinesCard
          id="seg-scadenze"
          due={due}
          today={now.date}
          title="Scadenze"
          sub="In ordine di data: documenti, bandi, obblighi federali e comunali. Rosso entro 15 giorni."
          className="lg:self-start"
        />

        <Card
          id="seg-weekend"
          title="Partite del weekend"
          sub={`${matches.length} ${matches.length === 1 ? "gara" : "gare"} tra sabato e domenica. Mister e dirigenti preparano convocazione e distinta nell'app; la segreteria la ricopia sul portale LND.`}
          className="lg:self-start"
        >
          {matches.length === 0 ? (
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessuna gara nel prossimo weekend">
                Il calendario ufficiale di questa copia non ha gare per sabato e
                domenica.
              </EmptyState>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {matches.map((e) => {
                const g = byId.get(e.group);
                const p = dateParts(e.date);
                return (
                  <li
                    key={e.id}
                    className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
                  >
                    <span className="text-[14px] text-[var(--in-sub)]">
                      {p.weekday.charAt(0)}
                      {p.weekday.slice(1, 3).toLowerCase()} {p.day} ·{" "}
                      <b className="text-[var(--in-ink)]">{e.time || "—"}</b>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamTag
                        tag={g ? teamTag(g) : "—"}
                        color={readableOnWhite(g?.color ?? "#3b5683")}
                        title={g?.label ?? "Squadra"}
                      />
                      <span className="min-w-0">
                        <b className="block truncate text-[15px]">
                          {titleCase(e.opponent || "Avversario da definire")}
                        </b>
                        <span className="block text-[13px] text-[var(--in-sub)]">
                          {e.homeAway === "CASA"
                            ? "In casa"
                            : e.homeAway === "FUORI"
                              ? "Trasferta"
                              : "—"}
                        </span>
                      </span>
                    </span>
                    <Link
                      to="/gestionale/mister"
                      className="scd-focus inline-flex h-11 items-center rounded-full border border-[var(--in-line)] bg-white px-3.5 text-[14px] font-semibold"
                    >
                      Distinta
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <SourceLine>
            Calendario ufficiale FIGC/LND, copia del{" "}
            {freshnessLabel(sourceModifiedAt)}.
          </SourceLine>
        </Card>

        <div className="flex min-w-0 flex-col gap-[18px] lg:col-span-2 xl:col-span-1">
          <CastPresence id="vera" />
          <Card
            id="seg-tesseramenti"
            title="Tesseramenti"
            sub={`Dal Master Tesserati, solo conteggi, dato al ${itDate(TESSERATI.asOf)}.`}
            aside={
              <span className="flex flex-wrap gap-2">
                <Link
                  to="/segreteria/persone"
                  className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3.5 text-[14.5px] font-bold text-white"
                  data-testid="seg-persone-link"
                >
                  <Users className="size-4" aria-hidden="true" />
                  Persone
                </Link>
                <Link
                  to="/segreteria/certificati"
                  className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3.5 text-[14.5px] font-bold text-[var(--in-info)]"
                  data-testid="seg-certificati-link"
                >
                  Certificati
                </Link>
                <Link
                  to="/segreteria/storia"
                  className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3.5 text-[14.5px] font-bold text-[var(--in-info)]"
                  data-testid="seg-storia-link"
                >
                  Storia
                </Link>
                <Link
                  to="/segreteria/richieste"
                  className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3.5 text-[14.5px] font-bold text-[var(--in-info)]"
                  data-testid="seg-richieste-link"
                >
                  Richieste
                </Link>
                <Link
                  to="/direzione/accessi"
                  className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3.5 text-[14.5px] font-bold text-[var(--in-info)]"
                  data-testid="seg-accessi-link"
                >
                  Accessi
                </Link>
                <Link
                  to="/gestionale/posta"
                  className="scd-focus inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3.5 text-[14.5px] font-bold text-[var(--in-info)]"
                  data-testid="seg-posta-link"
                >
                  Posta del club
                </Link>
              </span>
            }
          >
            <div
              className="grid grid-cols-3 gap-2 px-4 pb-3 sm:px-[18px]"
              data-testid="tesseramenti-tiles"
            >
              <StatTile
                value={TESSERATI.byStatus["ATTIVO"] ?? 0}
                of={TESSERATI.records}
                label="atleti attivi su record"
              />
              <StatTile
                value={TESSERATI.figcPractice["COMPLETA"] ?? 0}
                of={TESSERATI.records}
                label="pratiche FIGC complete"
              />
              <StatTile value={TESSERATI.minors} label="minorenni" />
            </div>
            <dl className="m-0 grid gap-1.5 border-t border-[var(--in-line)] px-4 py-3 text-[14px] sm:px-[18px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--in-sub)]">Firme da verificare</dt>
                <dd className="m-0 font-semibold">
                  {TESSERATI.signature["DA VERIFICARE"] ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--in-sub)]">
                  Da contattare per la pratica FIGC
                </dt>
                <dd className="m-0 font-semibold">
                  {TESSERATI.figcPractice["DA CONTATTARE"] ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--in-sub)]">Annata da verificare</dt>
                <dd className="m-0 font-semibold">
                  {TESSERATI.byGroup["DA VERIFICARE"] ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--in-sub)]">In attesa</dt>
                <dd className="m-0 font-semibold">
                  {TESSERATI.byStatus["IN ATTESA"] ?? 0}
                </dd>
              </div>
            </dl>
            <div
              className="flex flex-wrap gap-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
              aria-label="Atleti per gruppo"
            >
              {sortedCounts(TESSERATI.byGroup)
                .filter(([g]) => g !== "DA VERIFICARE")
                .map(([g, n]) => (
                  <Chip key={g} tone="info">
                    {g.replace(/ \d{4}(-\d{4})?$/, "")} · {n}
                  </Chip>
                ))}
            </div>
            <SourceLine>
              {TESSERATI.source}. Nomi, recapiti e codici restano nel master:
              qui solo i numeri.
            </SourceLine>
          </Card>
          <Card id="seg-certificati" title="Certificati medici">
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Scadenze non ancora caricate">
                {TESSERATI.medicalCertificate.note} Sconosciuto non vuol dire
                zero. Quando le date saranno nel master, qui compariranno solo
                le scadenze e partiranno gli avvisi a 30 e 7 giorni, mai dati
                sanitari.
              </EmptyState>
            </div>
          </Card>
          <Card id="seg-moduli" title="Modulistica">
            <ul className="m-0 list-none p-0">
              {FORMS.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]"
                >
                  <FileText
                    className="size-[18px] flex-none text-[var(--in-sub)]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">{f}</span>
                </li>
              ))}
            </ul>
            <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[14px] text-[var(--in-sub)] sm:px-[18px]">
              I moduli firmati arrivano dalla pre-iscrizione online; i documenti
              del club sono in{" "}
              <Link
                to="/documenti"
                className="font-semibold text-[var(--in-info)] underline"
              >
                Documenti
              </Link>
              .
            </p>
          </Card>
          <SourcesBox id="segreteria" />
        </div>
      </div>
    </WorkAreaShell>
  );
}
