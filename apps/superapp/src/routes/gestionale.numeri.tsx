import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import {
  EmptyState,
  WorkAreaGateView,
  WorkAreaShell,
  workAreaHead,
} from "@/components/scd/work-area-ui";
import {
  DEVICE_LABEL,
  SOURCE_LABEL,
  STATS_PERIODS,
  pageLabel,
  type AppStatsSummary,
  type StatsPeriod,
} from "@/lib/page-views";
import {
  NUMERI_READ_FAILED,
  emptyAppStatsDesk,
  getAppStats,
  numeriSearchSchema,
  type AppStatsDesk,
  type NumeriSearch,
} from "@/lib/page-views.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Numeri dell'app (UD-167, Francesco 16/10/2026 22:34: «area dove dobbiamo sapere quanti accessi sono stati fatti,
 * quanti sono arrivati sopra all'app… capiamo come migliorare»). Direzione only. Anonymous daily totals of the public
 * pages (public.scd_app_page_views_daily, r141 STAGED). Until r141 is applied the page says "Funzione in preparazione"
 * and shows no number. Period 7/30/90 days in the URL (?giorni=), so a view can be shared.
 */
export const NUMERI_PRIVACY_NOTE =
  "Contiamo solo numeri totali: niente cookie, niente dati delle persone, niente dati dei minori. Non contiamo i visitatori unici.";

/** Every figure on the page counts opened pages, not people, and is computed from the daily totals. */
export const NUMERI_FIGURES_LABEL =
  "Pagine aperte, non persone · dato calcolato";
export const NUMERI_NOTE = `${NUMERI_PRIVACY_NOTE} Chi attiva «Do Not Track» o «Global Privacy Control» nel browser non viene contato. ${NUMERI_FIGURES_LABEL}.`;

export const Route = createFileRoute("/gestionale/numeri")({
  validateSearch: (raw: Record<string, unknown>): NumeriSearch =>
    numeriSearchSchema.catch({}).parse(raw),
  loaderDeps: ({ search }) => ({ ...search }),
  loader: async ({ deps }): Promise<AppStatsDesk & { interior: boolean }> => {
    const gate = await getWorkAreaGate({ data: { area: "numeri" } });
    // Closed gate: only the access screen, inside the public chrome. Open page: its own interior shell.
    if (gate.view !== "page")
      return { ...emptyAppStatsDesk(gate, deps.giorni ?? 30), interior: false };
    return { ...(await getAppStats({ data: deps })), interior: true };
  },
  head: ({ loaderData }) => workAreaHead("numeri", loaderData?.gate),
  component: NumeriRoute,
});

function NumeriRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="numeri" gate={data.gate}>
      {data.gate.view === "page" && <NumeriPage data={data} />}
    </WorkAreaGateView>
  );
}

const fmt = (n: number) => n.toLocaleString("it-IT");

export function NumeriPage({ data }: { data: AppStatsDesk }) {
  const s = data.summary;
  const readFailed =
    data.connected && !data.ready && data.message === NUMERI_READ_FAILED;
  return (
    <WorkAreaShell
      id="numeri"
      preview={data.gate.preview}
      status={
        data.ready ? (
          <Chip tone="ok">Collegata al database del club</Chip>
        ) : readFailed ? (
          <Chip tone="crit">Lettura non riuscita</Chip>
        ) : (
          <Chip tone="warn">Funzione in preparazione</Chip>
        )
      }
      note={NUMERI_NOTE}
      highlights={[
        {
          value: s ? s.total : null,
          label: `pagine aperte negli ultimi ${data.period} giorni`,
        },
        { value: s ? s.today : null, label: "pagine aperte oggi" },
        { value: s ? s.socialPct : null, label: "% arrivate dai social" },
        { value: s ? s.phonePct : null, label: "% da telefono" },
      ]}
    >
      <div className="flex flex-col gap-3 lg:gap-[18px]">
        <Card
          id="numeri-periodo"
          title="Periodo"
          sub="Scegli quanti giorni guardare. Oggi è compreso."
        >
          <div
            role="group"
            aria-label="Periodo"
            className="flex flex-wrap items-center gap-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
          >
            {STATS_PERIODS.map((p) => (
              <PeriodPill key={p} period={p} active={p === data.period} />
            ))}
          </div>
        </Card>

        {!s ? (
          <EmptyState
            title={
              !data.connected
                ? "Entra con il tuo account"
                : readFailed
                  ? "Lettura non riuscita"
                  : "Funzione in preparazione"
            }
          >
            {data.message ??
              "Il conteggio parte quando la Direzione applica la migrazione r141. Fino ad allora non si conta e non si legge nulla."}
          </EmptyState>
        ) : s.total === 0 ? (
          <EmptyState title="Ancora nessuna visita contata in questo periodo">
            Le visite si contano dal giorno in cui il conteggio è stato
            attivato. Riprova tra qualche giorno.
          </EmptyState>
        ) : (
          <NumeriBoards s={s} />
        )}

        <Card
          id="numeri-come"
          title="Come contiamo"
          sub="Per capire come migliorare l'app, senza seguire le persone"
        >
          <ul className="m-0 list-none p-0 text-[14px] leading-snug">
            {[
              NUMERI_PRIVACY_NOTE,
              "Una visita è una pagina pubblica aperta. Le aree riservate (gestionale, Direzione, famiglie, staff) non si contano.",
              "Da dove arrivano: dal link con utm_source, dal QR (?src=qr) o dal sito che ha mandato la persona. Senza indicazioni: «Diretto o link salvato».",
              "Chi ha attivato «Do Not Track» o «Global Privacy Control» nel browser non viene contato.",
              `${NUMERI_FIGURES_LABEL}: una persona che apre tre pagine conta tre volte.`,
              "I numeri si cancellano da soli dopo 25 mesi.",
            ].map((t) => (
              <li
                key={t}
                className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]"
              >
                {t}
              </li>
            ))}
          </ul>
          <SourceLine>
            Fonte: database del club, totali giornalieri per pagina, provenienza
            e dispositivo (r141).
          </SourceLine>
        </Card>
      </div>
    </WorkAreaShell>
  );
}

function PeriodPill({
  period,
  active,
}: {
  period: StatsPeriod;
  active: boolean;
}) {
  return (
    <Link
      to="/gestionale/numeri"
      search={{ giorni: period }}
      aria-current={active ? "true" : undefined}
      className={`scd-focus inline-flex h-10 items-center rounded-full px-4 text-[14.5px] font-semibold ${
        active
          ? "bg-[var(--in-info)] text-white"
          : "border border-[#b9d5ef] bg-white text-[var(--in-info)]"
      }`}
    >
      {period} giorni
    </Link>
  );
}

function Bar({
  label,
  value,
  pct,
  max,
}: {
  label: string;
  value: number;
  pct?: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value * 100) / max)) : 0;
  return (
    <li className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
      <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
        <span className="min-w-0 truncate font-semibold">{label}</span>
        <span className="flex-none tabular-nums text-[var(--in-sub)]">
          {fmt(value)}
          {pct !== undefined && <> · {pct}%</>}
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 rounded-full bg-[var(--in-info-bg)]"
        aria-hidden="true"
      >
        <div
          className="h-2.5 rounded-full bg-[var(--in-info)]"
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

export function NumeriBoards({ s }: { s: AppStatsSummary }) {
  const topMax = s.topPages[0]?.views ?? 0;
  const srcMax = Math.max(0, ...s.bySource.map((x) => x.views));
  const devMax = Math.max(0, ...s.byDevice.map((x) => x.views));
  const dayMax = Math.max(0, ...s.trend.map((x) => x.views));
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-[18px]">
      <Card
        id="numeri-pagine"
        title="Pagine più aperte"
        sub={`Le 10 pagine pubbliche più aperte nel periodo · ${NUMERI_FIGURES_LABEL}`}
      >
        <ol className="m-0 list-none p-0" aria-label="Pagine più aperte">
          {s.topPages.map((p) => (
            <Bar
              key={p.path}
              label={pageLabel(p.path)}
              value={p.views}
              max={topMax}
            />
          ))}
        </ol>
      </Card>

      <div className="flex min-w-0 flex-col gap-3 lg:gap-[18px]">
        <Card
          id="numeri-fonti"
          title="Da dove arrivano"
          sub={`Social, Google, QR o link diretto · ${NUMERI_FIGURES_LABEL}`}
        >
          <ul className="m-0 list-none p-0" aria-label="Da dove arrivano">
            {s.bySource.map((x) => (
              <Bar
                key={x.key}
                label={SOURCE_LABEL[x.key]}
                value={x.views}
                pct={x.pct}
                max={srcMax}
              />
            ))}
          </ul>
        </Card>
        <Card
          id="numeri-dispositivi"
          title="Con quale dispositivo"
          sub={`Dalla larghezza dello schermo · ${NUMERI_FIGURES_LABEL}`}
        >
          <ul className="m-0 list-none p-0" aria-label="Con quale dispositivo">
            {s.byDevice.map((x) => (
              <Bar
                key={x.key}
                label={DEVICE_LABEL[x.key]}
                value={x.views}
                pct={x.pct}
                max={devMax}
              />
            ))}
          </ul>
        </Card>
      </div>

      <Card
        id="numeri-andamento"
        title="Giorno per giorno"
        sub={`Pagine aperte ogni giorno, dal primo giorno con dati nel periodo · ${NUMERI_FIGURES_LABEL}`}
        className="lg:col-span-2"
      >
        <ul className="m-0 list-none p-0" aria-label="Visite giorno per giorno">
          {s.trend.map((d) => (
            <Bar
              key={d.day}
              label={dayLabel(d.day)}
              value={d.views}
              max={dayMax}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

const WEEKDAY = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
